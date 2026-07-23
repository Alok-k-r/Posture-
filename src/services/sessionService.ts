import { db, auth } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  where, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { LocalModelService } from './localModelService';

export interface UnifiedSession {
  id: string;
  date: string;
  startTime?: string;
  endTime?: string;
  duration: number; // total seconds
  score: number; // 0-100 quality score
  slouches: number; // incident count
  goodSessionSeconds: number;
  warnSessionSeconds?: number;
  maxFocusStreak?: number; // max focus duration in seconds
  status?: 'Excellent' | 'Fair' | 'Poor';
  avgLoadLbs?: number;
  peakLoadLbs?: number;
  fatigueScore?: number;
  stabilityScore?: number;
  complianceRate?: number;
  source?: 'firestore' | 'local';
}

function getCurrentUserId(): string {
  if (auth.currentUser) return auth.currentUser.uid;
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('current_user_id') || 'guest';
  }
  return 'guest';
}

export const SessionService = {
  /**
   * Fetches sessions from both LocalStorage and Firestore, deduplicates them,
   * updates LocalStorage cache for synchronous fallback, and returns sorted sessions.
   */
  async fetchUnifiedSessions(overrideUserId?: string): Promise<UnifiedSession[]> {
    const userId = overrideUserId || getCurrentUserId();
    const mergedList: UnifiedSession[] = [];

    // 1. Fetch Local Sessions
    try {
      const localKey = `posture_sessions_${userId}`;
      const rawLocal = localStorage.getItem(localKey);
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed)) {
          parsed.forEach((s: any) => {
            mergedList.push({
              id: s.id || `local-${s.date}`,
              date: s.date || s.startTime || new Date().toISOString(),
              startTime: s.startTime,
              endTime: s.endTime,
              duration: Number(s.duration || s.durationSeconds || 0),
              score: Number(s.score || s.qualityScore || 0),
              slouches: Number(s.slouches ?? s.incidents ?? 0),
              goodSessionSeconds: Number(s.goodSessionSeconds || 0),
              warnSessionSeconds: Number(s.warnSessionSeconds || 0),
              maxFocusStreak: Number(s.maxFocusStreak || s.maxFocusDuration || 0),
              status: s.status || (s.score >= 80 ? 'Excellent' : s.score >= 60 ? 'Fair' : 'Poor'),
              avgLoadLbs: s.avgLoadLbs,
              peakLoadLbs: s.peakLoadLbs,
              fatigueScore: s.fatigueScore,
              stabilityScore: s.stabilityScore,
              complianceRate: s.complianceRate,
              source: 'local'
            });
          });
        }
      }
    } catch (e) {
      console.error('Error reading local sessions in SessionService:', e);
    }

    // 2. Fetch Firestore Sessions if auth is present
    if (auth.currentUser && auth.currentUser.uid === userId) {
      try {
        const sessionsRef = collection(db, 'users', userId, 'sessions');
        const q = query(sessionsRef, orderBy('date', 'desc'), limit(100));
        const snapshot = await getDocs(q);

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const sessionDate = data.date || data.startTime || new Date().toISOString();
          const docDuration = Number(data.duration || 0);

          // Check if already in list by id or date+duration proximity
          const existingIdx = mergedList.findIndex(s => 
            s.id === docSnap.id || 
            (new Date(s.date).toDateString() === new Date(sessionDate).toDateString() && Math.abs(s.duration - docDuration) < 5)
          );

          const firestoreSession: UnifiedSession = {
            id: docSnap.id,
            date: sessionDate,
            startTime: data.startTime,
            endTime: data.endTime,
            duration: docDuration,
            score: Number(data.score || 0),
            slouches: Number(data.slouches ?? data.incidents ?? 0),
            goodSessionSeconds: Number(data.goodSessionSeconds || 0),
            warnSessionSeconds: Number(data.warnSessionSeconds || 0),
            maxFocusStreak: Number(data.maxFocusStreak || data.maxFocusDuration || 0),
            status: data.status || (data.score >= 80 ? 'Excellent' : data.score >= 60 ? 'Fair' : 'Poor'),
            avgLoadLbs: data.avgLoadLbs,
            peakLoadLbs: data.peakLoadLbs,
            fatigueScore: data.fatigueScore,
            stabilityScore: data.stabilityScore,
            complianceRate: data.complianceRate,
            source: 'firestore'
          };

          if (existingIdx !== -1) {
            // Replace local with firestore doc (which is authoritative)
            mergedList[existingIdx] = firestoreSession;
          } else {
            mergedList.push(firestoreSession);
          }
        });
      } catch (err) {
        console.warn('Firestore session fetch warning in SessionService:', err);
      }
    }

    // 3. Sort Descending by Date
    mergedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 4. Cache back to LocalStorage for instant sync across all services
    this.updateLocalStorageCache(userId, mergedList);

    return mergedList;
  },

  /**
   * Subscribe to real-time Firestore session updates and call callback whenever data changes
   */
  subscribeToSessions(userId: string, callback: (sessions: UnifiedSession[]) => void): () => void {
    if (!auth.currentUser || auth.currentUser.uid !== userId) {
      // Fallback: fetch once from local
      this.fetchUnifiedSessions(userId).then(callback);
      return () => {};
    }

    const sessionsRef = collection(db, 'users', userId, 'sessions');
    const q = query(sessionsRef, orderBy('date', 'desc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      this.fetchUnifiedSessions(userId).then((sessions) => {
        callback(sessions);
      });
    }, (error) => {
      console.warn('Firestore real-time subscription error:', error);
      this.fetchUnifiedSessions(userId).then(callback);
    });

    return unsubscribe;
  },

  /**
   * Helper to write back unified sessions into localStorage keys expected by local engines
   */
  updateLocalStorageCache(userId: string, sessions: UnifiedSession[]) {
    try {
      const localKey = `posture_sessions_${userId}`;
      localStorage.setItem(localKey, JSON.stringify(sessions));

      const v2Key = `posturecare_historical_sessions_v2_${userId}`;
      const summaries = sessions.map(s => ({
        timestamp: s.date,
        durationSeconds: s.duration,
        grade: s.score >= 90 ? 'A' : s.score >= 80 ? 'B' : s.score >= 70 ? 'C' : s.score >= 60 ? 'D' : 'F',
        qualityScore: s.score,
        avgLoadLbs: s.avgLoadLbs || 14.0,
        peakLoadLbs: s.peakLoadLbs || 28.0,
        fatigueScore: s.fatigueScore || 22,
        stabilityScore: s.stabilityScore || 82,
        complianceRate: s.complianceRate || 88,
      }));
      localStorage.setItem(v2Key, JSON.stringify(summaries));
    } catch (e) {
      console.error('Failed to update local storage cache:', e);
    }
  },

  /**
   * Inject realistic dummy data into Firestore & LocalStorage for multi-day history testing
   */
  async seedDummyData(userId: string): Promise<UnifiedSession[]> {
    console.log('🌱 Seeding realistic multi-day session data into Firestore and LocalStorage for user:', userId);

    const now = new Date();
    const mockSessions: Partial<UnifiedSession>[] = [
      // Today session
      {
        date: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
        duration: 2400, // 40 mins
        score: 88,
        slouches: 3,
        goodSessionSeconds: 2160,
        warnSessionSeconds: 240,
        maxFocusStreak: 1200,
        status: 'Excellent',
        avgLoadLbs: 12.5,
        peakLoadLbs: 24.0,
        fatigueScore: 18,
        stabilityScore: 89,
        complianceRate: 92
      },
      // Yesterday session
      {
        date: new Date(now.getTime() - 26 * 3600 * 1000).toISOString(),
        duration: 3600, // 60 mins
        score: 82,
        slouches: 5,
        goodSessionSeconds: 3100,
        warnSessionSeconds: 500,
        maxFocusStreak: 1500,
        status: 'Fair',
        avgLoadLbs: 16.2,
        peakLoadLbs: 32.0,
        fatigueScore: 28,
        stabilityScore: 81,
        complianceRate: 85
      },
      // 3 days ago session
      {
        date: new Date(now.getTime() - 72 * 3600 * 1000).toISOString(),
        duration: 4800, // 80 mins
        score: 91,
        slouches: 2,
        goodSessionSeconds: 4400,
        warnSessionSeconds: 400,
        maxFocusStreak: 2100,
        status: 'Excellent',
        avgLoadLbs: 11.8,
        peakLoadLbs: 22.0,
        fatigueScore: 15,
        stabilityScore: 92,
        complianceRate: 95
      },
      // 5 days ago session
      {
        date: new Date(now.getTime() - 120 * 3600 * 1000).toISOString(),
        duration: 1800, // 30 mins
        score: 74,
        slouches: 7,
        goodSessionSeconds: 1300,
        warnSessionSeconds: 500,
        maxFocusStreak: 600,
        status: 'Fair',
        avgLoadLbs: 21.0,
        peakLoadLbs: 42.0,
        fatigueScore: 38,
        stabilityScore: 72,
        complianceRate: 70
      },
      // 8 days ago session
      {
        date: new Date(now.getTime() - 192 * 3600 * 1000).toISOString(),
        duration: 3000, // 50 mins
        score: 85,
        slouches: 4,
        goodSessionSeconds: 2600,
        warnSessionSeconds: 400,
        maxFocusStreak: 1400,
        status: 'Excellent',
        avgLoadLbs: 14.0,
        peakLoadLbs: 28.0,
        fatigueScore: 22,
        stabilityScore: 84,
        complianceRate: 88
      }
    ];

    const activeUid = auth.currentUser ? auth.currentUser.uid : (userId || 'guest');
    
    // First, save into LocalStorage so data is available instantly
    const localSessions: UnifiedSession[] = mockSessions.map((s, idx) => ({
      id: `seed-${Date.now()}-${idx}`,
      date: s.date!,
      startTime: s.date!,
      endTime: new Date(new Date(s.date!).getTime() + (s.duration! * 1000)).toISOString(),
      duration: s.duration!,
      score: s.score!,
      slouches: s.slouches!,
      goodSessionSeconds: s.goodSessionSeconds || 0,
      warnSessionSeconds: s.warnSessionSeconds || 0,
      maxFocusStreak: s.maxFocusStreak || 0,
      status: s.status || 'Excellent',
      avgLoadLbs: s.avgLoadLbs || 12.0,
      peakLoadLbs: s.peakLoadLbs || 24.0,
      fatigueScore: s.fatigueScore || 15,
      stabilityScore: s.stabilityScore || 85,
      complianceRate: s.complianceRate || 90,
      source: 'local'
    }));

    this.updateLocalStorageCache(activeUid, localSessions);

    // Second, if authenticated with Firebase Auth, sync to Firestore user document
    if (auth.currentUser) {
      try {
        const sessionsRef = collection(db, 'users', auth.currentUser.uid, 'sessions');
        for (const s of mockSessions) {
          try {
            await addDoc(sessionsRef, {
              date: s.date!,
              startTime: s.date!,
              endTime: new Date(new Date(s.date!).getTime() + (s.duration! * 1000)).toISOString(),
              duration: s.duration!,
              score: s.score!,
              slouches: s.slouches!,
              goodSessionSeconds: s.goodSessionSeconds || 0,
              warnSessionSeconds: s.warnSessionSeconds || 0,
              maxFocusStreak: s.maxFocusStreak || 0,
              status: s.status || 'Excellent',
              avgLoadLbs: s.avgLoadLbs || 12.0,
              peakLoadLbs: s.peakLoadLbs || 24.0,
              fatigueScore: s.fatigueScore || 15,
              stabilityScore: s.stabilityScore || 85,
              complianceRate: s.complianceRate || 90
            });
          } catch (e: any) {
            console.warn('Firestore dummy session doc write note:', e?.message || e);
          }
        }
      } catch (err: any) {
        console.warn('Firestore collection sync note:', err?.message || err);
      }
    }

    return this.fetchUnifiedSessions(activeUid);
  }
};
