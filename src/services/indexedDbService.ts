/**
 * On-Device IndexedDB Storage Engine
 * 
 * Replaces localStorage for structured time-series data (sessions, corrections, breaks,
 * slouch hourly patterns) and personal model parameters.
 * Provides a resilient asynchronous database connection with high limits, running
 * off the main thread where possible, with automatic localStorage fallback for sandboxed frames.
 */

const DB_NAME = "PostureCareEdgeDB";
const DB_VERSION = 1;

export interface PersonalModelMetadata {
  version: number;
  lastTrained: string;
  baselineAngle: number;
  fatigueCoefficient: number; // Muscular fatigue multiplier
  sensitivityFactor: number;   // Alert sensitivity threshold
  recoveryRateFactor: number;  // Muscle rehabilitation rate multiplier
  complianceBaseline: number;  // User historical compliance rate
  sessionCountSinceUpdate: number;
}

export class IndexedDbService {
  private static db: IDBDatabase | null = null;

  private static getCurrentUserId(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('current_user_id') || 'guest';
    }
    return 'guest';
  }

  private static getLocalStorageFallback<T>(key: string, defaultValue: T): T {
    try {
      const userId = this.getCurrentUserId();
      const userKey = `${key}_${userId}`;
      const saved = localStorage.getItem(userKey);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private static setLocalStorageFallback(key: string, value: any): void {
    try {
      const userId = this.getCurrentUserId();
      const userKey = `${key}_${userId}`;
      localStorage.setItem(userKey, JSON.stringify(value));
    } catch (e) {
      console.warn("Storage fallback failed:", e);
    }
  }

  public static async initDb(): Promise<IDBDatabase> {
    const userId = this.getCurrentUserId();
    const dbName = `${DB_NAME}_${userId}`;

    if (this.db) {
      if (this.db.name === dbName) {
        return this.db;
      } else {
        this.db.close();
        this.db = null;
      }
    }

    return new Promise((resolve, reject) => {
      try {
        if (typeof window === "undefined" || !window.indexedDB) {
          throw new Error("IndexedDB not supported in this runtime environment.");
        }

        const request = window.indexedDB.open(dbName, DB_VERSION);

        request.onupgradeneeded = (event: any) => {
          const db = event.target.result;

          // Store 1: Historical Sessions
          if (!db.objectStoreNames.contains("historical_sessions")) {
            db.createObjectStore("historical_sessions", { keyPath: "timestamp" });
          }

          // Store 2: Corrections log
          if (!db.objectStoreNames.contains("corrections_log")) {
            db.createObjectStore("corrections_log", { keyPath: "timestamp" });
          }

          // Store 3: Breaks history
          if (!db.objectStoreNames.contains("break_history")) {
            db.createObjectStore("break_history", { keyPath: "id" });
          }

          // Store 4: Slouch hourly time patterns (stored as a single daily profile or multiple day logs)
          if (!db.objectStoreNames.contains("slouch_time_patterns")) {
            db.createObjectStore("slouch_time_patterns", { keyPath: "date" });
          }

          // Store 5: learned model parameters
          if (!db.objectStoreNames.contains("model_metadata")) {
            db.createObjectStore("model_metadata", { keyPath: "key" });
          }
        };

        request.onsuccess = (event: any) => {
          this.db = event.target.result;
          resolve(this.db!);
        };

        request.onerror = (event: any) => {
          console.warn("IndexedDB failed to open, utilizing localStorage fallback...", event.target.error);
          reject(event.target.error);
        };
      } catch (err) {
        console.warn("IndexedDB sandbox block or exclusion. Standard localStorage active:", err);
        reject(err);
      }
    });
  }

  private static async executeTransaction<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest
  ): Promise<T> {
    try {
      const db = await this.initDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const req = operation(store);

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      // Return a rejected promise so caller triggers localStorage fallbacks
      return Promise.reject(e);
    }
  }

  // --- Historical Sessions Store ---
  public static async saveSession(session: any): Promise<void> {
    try {
      const sessions = await this.getSessions();
      const sameDayIdx = sessions.findIndex(s => new Date(s.timestamp).toDateString() === new Date(session.timestamp).toDateString());
      let mergedSession = session;
      if (sameDayIdx !== -1) {
        const existing = sessions[sameDayIdx];
        const totalDur = existing.durationSeconds + session.durationSeconds;
        mergedSession = {
          ...existing,
          durationSeconds: totalDur,
          qualityScore: Math.round(((existing.qualityScore * existing.durationSeconds) + (session.qualityScore * session.durationSeconds)) / totalDur),
          avgLoadLbs: Math.round(((existing.avgLoadLbs * existing.durationSeconds) + (session.avgLoadLbs * session.durationSeconds)) / totalDur * 10) / 10,
          peakLoadLbs: Math.max(existing.peakLoadLbs, session.peakLoadLbs),
          fatigueScore: Math.round(((existing.fatigueScore * existing.durationSeconds) + (session.fatigueScore * session.durationSeconds)) / totalDur),
          stabilityScore: Math.round(((existing.stabilityScore * existing.durationSeconds) + (session.stabilityScore * session.durationSeconds)) / totalDur),
          complianceRate: Math.round(((existing.complianceRate * existing.durationSeconds) + (session.complianceRate * session.durationSeconds)) / totalDur),
        };
        // Re-grade
        const score = mergedSession.qualityScore;
        mergedSession.grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
      }
      await this.executeTransaction("historical_sessions", "readwrite", (store) =>
        store.put(mergedSession)
      );

      // Write-through to localStorage to ensure synchronous fallback access is always up to date
      const updatedSessions = sameDayIdx !== -1 
        ? sessions.map((s, i) => i === sameDayIdx ? mergedSession : s)
        : [session, ...sessions].slice(0, 50);
      this.setLocalStorageFallback("posturecare_historical_sessions_v2", updatedSessions);
    } catch {
      const sessions = this.getLocalStorageFallback("posturecare_historical_sessions_v2", []);
      const sameDayIdx = sessions.findIndex(s => new Date(s.timestamp).toDateString() === new Date(session.timestamp).toDateString());
      if (sameDayIdx !== -1) {
        const existing = sessions[sameDayIdx];
        const totalDur = existing.durationSeconds + session.durationSeconds;
        const mergedSession = {
          ...existing,
          durationSeconds: totalDur,
          qualityScore: Math.round(((existing.qualityScore * existing.durationSeconds) + (session.qualityScore * session.durationSeconds)) / totalDur),
          avgLoadLbs: Math.round(((existing.avgLoadLbs * existing.durationSeconds) + (session.avgLoadLbs * session.durationSeconds)) / totalDur * 10) / 10,
          peakLoadLbs: Math.max(existing.peakLoadLbs, session.peakLoadLbs),
          fatigueScore: Math.round(((existing.fatigueScore * existing.durationSeconds) + (session.fatigueScore * session.durationSeconds)) / totalDur),
          stabilityScore: Math.round(((existing.stabilityScore * existing.durationSeconds) + (session.stabilityScore * session.durationSeconds)) / totalDur),
          complianceRate: Math.round(((existing.complianceRate * existing.durationSeconds) + (session.complianceRate * session.durationSeconds)) / totalDur),
        };
        const score = mergedSession.qualityScore;
        mergedSession.grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
        sessions[sameDayIdx] = mergedSession;
        this.setLocalStorageFallback("posturecare_historical_sessions_v2", sessions);
      } else {
        const updated = [session, ...sessions].slice(0, 50);
        this.setLocalStorageFallback("posturecare_historical_sessions_v2", updated);
      }
    }
  }

  public static async getSessions(): Promise<any[]> {
    try {
      const db = await this.initDb();
      return new Promise((resolve) => {
        const tx = db.transaction("historical_sessions", "readonly");
        const store = tx.objectStore("historical_sessions");
        const req = store.getAll();

        req.onsuccess = () => {
          // Sort descending by timestamp
          const sorted = (req.result || []).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          resolve(sorted);
        };
        req.onerror = () => {
          resolve(this.getLocalStorageFallback("posturecare_historical_sessions_v2", []));
        };
      });
    } catch {
      return this.getLocalStorageFallback("posturecare_historical_sessions_v2", []);
    }
  }

  // --- Corrections Log Store ---
  public static async saveCorrection(correction: any): Promise<void> {
    try {
      await this.executeTransaction("corrections_log", "readwrite", (store) =>
        store.put(correction)
      );
    } catch {
      const logs = this.getLocalStorageFallback("posturecare_corrections_log_v2", []);
      const updated = [correction, ...logs].slice(0, 100);
      this.setLocalStorageFallback("posturecare_corrections_log_v2", updated);
    }
  }

  public static async getCorrections(): Promise<any[]> {
    try {
      const db = await this.initDb();
      return new Promise((resolve) => {
        const tx = db.transaction("corrections_log", "readonly");
        const store = tx.objectStore("corrections_log");
        const req = store.getAll();

        req.onsuccess = () => {
          const sorted = (req.result || []).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          resolve(sorted);
        };
        req.onerror = () => {
          resolve(this.getLocalStorageFallback("posturecare_corrections_log_v2", []));
        };
      });
    } catch {
      return this.getLocalStorageFallback("posturecare_corrections_log_v2", []);
    }
  }

  // --- Breaks History Store ---
  public static async saveBreak(breakRecord: any): Promise<void> {
    try {
      await this.executeTransaction("break_history", "readwrite", (store) =>
        store.put(breakRecord)
      );
    } catch {
      const breaks = this.getLocalStorageFallback("posture_breaks_history", []);
      const updated = [breakRecord, ...breaks].slice(0, 50);
      this.setLocalStorageFallback("posture_breaks_history", updated);
    }
  }

  public static async getBreaks(): Promise<any[]> {
    try {
      const db = await this.initDb();
      return new Promise((resolve) => {
        const tx = db.transaction("break_history", "readonly");
        const store = tx.objectStore("break_history");
        const req = store.getAll();

        req.onsuccess = () => {
          const sorted = (req.result || []).sort(
            (a, b) => new Date(b.timestamp || Date.now()).getTime() - new Date(a.timestamp || Date.now()).getTime()
          );
          resolve(sorted);
        };
        req.onerror = () => {
          resolve(this.getLocalStorageFallback("posture_breaks_history", []));
        };
      });
    } catch {
      return this.getLocalStorageFallback("posture_breaks_history", []);
    }
  }

  // --- Slouch Hourly Time Patterns Store ---
  public static async saveSlouchPatterns(dateStr: string, patterns: any): Promise<void> {
    try {
      await this.executeTransaction("slouch_time_patterns", "readwrite", (store) =>
        store.put({ date: dateStr, patterns })
      );
    } catch {
      this.setLocalStorageFallback("posturecare_historical_hourly_logs_v2_" + dateStr, patterns);
    }
  }

  public static async getSlouchPatterns(dateStr: string): Promise<any | null> {
    try {
      const db = await this.initDb();
      return new Promise((resolve) => {
        const tx = db.transaction("slouch_time_patterns", "readonly");
        const store = tx.objectStore("slouch_time_patterns");
        const req = store.get(dateStr);

        req.onsuccess = () => resolve(req.result ? req.result.patterns : null);
        req.onerror = () => {
          resolve(this.getLocalStorageFallback("posturecare_historical_hourly_logs_v2_" + dateStr, null));
        };
      });
    } catch {
      return this.getLocalStorageFallback("posturecare_historical_hourly_logs_v2_" + dateStr, null);
    }
  }

  // --- Model Metadata Store (Personal Model Versioning) ---
  public static async saveModelMetadata(metadata: PersonalModelMetadata): Promise<void> {
    try {
      await this.executeTransaction("model_metadata", "readwrite", (store) =>
        store.put({ key: "active_user_model", ...metadata })
      );
    } catch {
      this.setLocalStorageFallback("posturecare_user_model_metadata", metadata);
    }
  }

  public static async getModelMetadata(): Promise<PersonalModelMetadata> {
    const defaultModel: PersonalModelMetadata = {
      version: 1,
      lastTrained: new Date().toISOString(),
      baselineAngle: 90,
      fatigueCoefficient: 1.0,
      sensitivityFactor: 1.0,
      recoveryRateFactor: 1.0,
      complianceBaseline: 85.0,
      sessionCountSinceUpdate: 0,
    };

    try {
      const db = await this.initDb();
      return new Promise((resolve) => {
        const tx = db.transaction("model_metadata", "readonly");
        const store = tx.objectStore("model_metadata");
        const req = store.get("active_user_model");

        req.onsuccess = () => {
          if (req.result) {
            resolve(req.result);
          } else {
            // Seed first time
            this.saveModelMetadata(defaultModel).catch(() => {});
            resolve(defaultModel);
          }
        };
        req.onerror = () => {
          resolve(this.getLocalStorageFallback("posturecare_user_model_metadata", defaultModel));
        };
      });
    } catch {
      return this.getLocalStorageFallback("posturecare_user_model_metadata", defaultModel);
    }
  }
}
