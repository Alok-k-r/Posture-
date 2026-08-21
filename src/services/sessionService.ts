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

    // 3. If no sessions exist in local or Firestore, return empty array without seeding dummy data
    if (mergedList.length === 0) {
      return [];
    }

    // 4. Sort Descending by Date
    mergedList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 5. Cache back to LocalStorage for instant sync across all services
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
    
    // Seed realistic daily sessions covering the last 7 calendar days
    const mockSessions: Partial<UnifiedSession>[] = [
      // Day 0: Today (Session 1 - Afternoon)
      {
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 15, 0).toISOString(),
        duration: 2400, // 40 mins
        score: 88,
        slouches: 3,
        goodSessionSeconds: 2112,
        warnSessionSeconds: 288,
        maxFocusStreak: 1200,
        status: 'Excellent',
        avgLoadLbs: 12.5,
        peakLoadLbs: 24.0,
        fatigueScore: 18,
        stabilityScore: 89,
        complianceRate: 92
      },
      // Day 0: Today (Session 2 - Morning)
      {
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30, 0).toISOString(),
        duration: 1800, // 30 mins
        score: 85,
        slouches: 2,
        goodSessionSeconds: 1530,
        warnSessionSeconds: 270,
        maxFocusStreak: 950,
        status: 'Excellent',
        avgLoadLbs: 13.1,
        peakLoadLbs: 25.0,
        fatigueScore: 16,
        stabilityScore: 88,
        complianceRate: 90
      },
      // Day 1: Yesterday
      {
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 15, 0, 0).toISOString(),
        duration: 3600, // 60 mins
        score: 82,
        slouches: 5,
        goodSessionSeconds: 2952,
        warnSessionSeconds: 648,
        maxFocusStreak: 1500,
        status: 'Fair',
        avgLoadLbs: 16.2,
        peakLoadLbs: 32.0,
        fatigueScore: 28,
        stabilityScore: 81,
        complianceRate: 85
      },
      // Day 2: 2 days ago
      {
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 11, 45, 0).toISOString(),
        duration: 4200, // 70 mins
        score: 90,
        slouches: 2,
        goodSessionSeconds: 3780,
        warnSessionSeconds: 420,
        maxFocusStreak: 1800,
        status: 'Excellent',
        avgLoadLbs: 11.5,
        peakLoadLbs: 22.0,
        fatigueScore: 14,
        stabilityScore: 91,
        complianceRate: 94
      },
      // Day 3: 3 days ago
      {
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3, 16, 20, 0).toISOString(),
        duration: 4800, // 80 mins
        score: 91,
        slouches: 2,
        goodSessionSeconds: 4368,
        warnSessionSeconds: 432,
        maxFocusStreak: 2100,
        status: 'Excellent',
        avgLoadLbs: 11.8,
        peakLoadLbs: 22.0,
        fatigueScore: 15,
        stabilityScore: 92,
        complianceRate: 95
      },
      // Day 4: 4 days ago
      {
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 4, 13, 10, 0).toISOString(),
        duration: 2700, // 45 mins
        score: 79,
        slouches: 6,
        goodSessionSeconds: 2133,
        warnSessionSeconds: 567,
        maxFocusStreak: 850,
        status: 'Fair',
        avgLoadLbs: 18.0,
        peakLoadLbs: 35.0,
        fatigueScore: 32,
        stabilityScore: 78,
        complianceRate: 79
      },
      // Day 5: 5 days ago
      {
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 5, 14, 0, 0).toISOString(),
        duration: 1800, // 30 mins
        score: 75,
        slouches: 7,
        goodSessionSeconds: 1350,
        warnSessionSeconds: 450,
        maxFocusStreak: 600,
        status: 'Fair',
        avgLoadLbs: 21.0,
        peakLoadLbs: 42.0,
        fatigueScore: 38,
        stabilityScore: 72,
        complianceRate: 70
      },
      // Day 6: 6 days ago
      {
        date: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 10, 0, 0).toISOString(),
        duration: 3000, // 50 mins
        score: 86,
        slouches: 4,
        goodSessionSeconds: 2580,
        warnSessionSeconds: 420,
        maxFocusStreak: 1400,
        status: 'Excellent',
        avgLoadLbs: 13.8,
        peakLoadLbs: 27.0,
        fatigueScore: 21,
        stabilityScore: 85,
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
  },

  /**
   * Mathematically compute user's consecutive day streak from real recorded sessions.
   * If a user recorded a session today, streak counts from today.
   * If a user has 0 sessions today but recorded yesterday, the active streak from yesterday remains intact.
   * If no session was recorded yesterday or today, the streak is 0.
   */
  calculateRealStreak(sessions: UnifiedSession[]): { current: number; longest: number } {
    if (!sessions || sessions.length === 0) {
      return { current: 0, longest: 0 };
    }

    // Get unique valid dates (YYYY-MM-DD)
    const dateMap = new Map<string, boolean>();
    sessions.forEach(s => {
      if (s.date && (s.duration > 0 || s.score > 0)) {
        const d = new Date(s.date);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          dateMap.set(key, true);
        }
      }
    });

    const uniqueDates = Array.from(dateMap.keys()).sort().reverse();
    if (uniqueDates.length === 0) return { current: 0, longest: 0 };

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    let currentStreak = 0;
    let checkDate: Date | null = null;

    if (dateMap.has(todayKey)) {
      checkDate = new Date(today);
    } else if (dateMap.has(yesterdayKey)) {
      checkDate = new Date(yesterday);
    }

    if (checkDate) {
      while (true) {
        const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        if (dateMap.has(key)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Longest historical consecutive streak
    const sortedAsc = Array.from(dateMap.keys()).sort();
    let longestStreak = 0;
    let tempStreak = 0;
    for (let i = 0; i < sortedAsc.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prev = new Date(sortedAsc[i - 1]);
        const curr = new Date(sortedAsc[i]);
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    }

    return {
      current: currentStreak,
      longest: Math.max(longestStreak, currentStreak)
    };
  }
};


