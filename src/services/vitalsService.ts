import { store, updateVitals, setServerSynced, VitalsReadingPoint } from '../store/store';

export interface VitalsTelemetryPayload {
  heartRate: number;
  spo2: number;
  status: 'live' | 'offline' | 'syncing';
  postureAngle?: number;
  deviceId?: string;
  timestamp?: string;
}

export interface VitalsServerSummary {
  restingHeartRate: number;
  avgHeartRate: number;
  avgSpo2: number;
  minHeartRate: number;
  maxHeartRate: number;
  totalReadings: number;
  stressIndex: number;
  hrvEstimate: number;
}

export interface VitalsApiResponse {
  success: boolean;
  reading?: VitalsReadingPoint;
  summary?: VitalsServerSummary;
}

class VitalsService {
  private syncQueue: VitalsTelemetryPayload[] = [];
  private isFlushing = false;
  private syncTimer: any = null;

  constructor() {
    // Start periodic background synchronization to backend
    if (typeof window !== 'undefined') {
      this.syncTimer = setInterval(() => {
        this.flushQueue();
      }, 5000);
    }
  }

  /**
   * Log a new vitals telemetry reading.
   * Updates local Redux state immediately and queues server sync.
   */
  public logTelemetry(payload: VitalsTelemetryPayload) {
    const validHr = Math.max(30, Math.min(220, Math.round(payload.heartRate)));
    const validSpo2 = Math.max(70, Math.min(100, Math.round(payload.spo2)));

    // Update local store
    store.dispatch(updateVitals({
      heartRate: validHr,
      spo2: validSpo2,
      status: payload.status,
    }));

    // Queue for backend transmission
    this.syncQueue.push({
      heartRate: validHr,
      spo2: validSpo2,
      status: payload.status,
      postureAngle: payload.postureAngle,
      deviceId: payload.deviceId || 'wearable-pod-01',
      timestamp: payload.timestamp || new Date().toISOString()
    });

    if (this.syncQueue.length >= 3) {
      this.flushQueue();
    }
  }

  /**
   * Flush queued readings to backend /api/vitals/telemetry
   */
  public async flushQueue(): Promise<void> {
    if (this.isFlushing || this.syncQueue.length === 0) return;
    this.isFlushing = true;

    const batch = [...this.syncQueue];
    this.syncQueue = [];

    try {
      // Send the latest reading with aggregate context
      const latest = batch[batch.length - 1];
      const response = await fetch('/api/vitals/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(latest)
      });

      if (response.ok) {
        store.dispatch(setServerSynced(true));
      } else {
        // Re-queue on non-200 failure
        this.syncQueue.unshift(...batch);
      }
    } catch (err) {
      console.warn('Vitals sync to backend skipped (offline / network):', err);
      // Re-queue for next attempt
      this.syncQueue.unshift(...batch.slice(-10));
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Retrieve historical telemetry logs from backend
   */
  public async getHistory(): Promise<{ history: VitalsReadingPoint[]; summary: VitalsServerSummary | null }> {
    try {
      const response = await fetch('/api/vitals/history');
      if (!response.ok) throw new Error('Failed to fetch vitals history');
      const data = await response.json();
      return data;
    } catch (err) {
      console.warn('Could not fetch server vitals history:', err);
      return { history: [], summary: null };
    }
  }

  /**
   * Run Gemini Biomechanical & Cardiovascular correlation analysis
   */
  public async analyzeCorrelation(params: {
    heartRate: number;
    spo2: number;
    postureAngle: number;
    postureScore: number;
    vitalsHistory: VitalsReadingPoint[];
  }): Promise<string> {
    try {
      const response = await fetch('/api/vitals/analyze-correlation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error('Correlation analysis failed');
      }

      const data = await response.json();
      return data.analysis || 'Correlation complete.';
    } catch (err: any) {
      console.error('Error analyzing vitals correlation:', err);
      return 'Biomechanical correlation analysis is currently unavailable. Please verify connection.';
    }
  }

  /**
   * Cardiovascular Physiological Zone Classification
   */
  public getHeartRateZone(bpm: number): {
    zone: 'Resting' | 'Warmup / Relaxed' | 'Cardio Focus' | 'Elevated / Stress';
    color: string;
    description: string;
  } {
    if (bpm < 60) {
      return {
        zone: 'Resting',
        color: '#3B82F6',
        description: 'Deep parasympathetic state or highly conditioned athlete baseline.'
      };
    }
    if (bpm <= 75) {
      return {
        zone: 'Warmup / Relaxed',
        color: '#10B981',
        description: 'Optimal desk ergonomics zone. Normal autonomic balance.'
      };
    }
    if (bpm <= 95) {
      return {
        zone: 'Cardio Focus',
        color: '#F59E0B',
        description: 'Mild physiological alertness, light cognitive engagement, or postural compensation.'
      };
    }
    return {
      zone: 'Elevated / Stress',
      color: '#EF4444',
      description: 'Sympathetic arousal or thoracic diaphragm compression from forward head slouching.'
    };
  }

  /**
   * Blood Oxygenation Clinical Category
   */
  public getSpo2Category(spo2: number): {
    category: 'Optimal' | 'Acceptable' | 'Mild Hypoxia Warning' | 'Critical';
    color: string;
    description: string;
  } {
    if (spo2 >= 97) {
      return {
        category: 'Optimal',
        color: '#10B981',
        description: 'Full arterial blood oxygen saturation (97% - 100%).'
      };
    }
    if (spo2 >= 95) {
      return {
        category: 'Acceptable',
        color: '#3B82F6',
        description: 'Clinically normal desk sitting baseline (95% - 96%).'
      };
    }
    if (spo2 >= 90) {
      return {
        category: 'Mild Hypoxia Warning',
        color: '#F59E0B',
        description: 'Sub-optimal shallow breathing. Check posture and expand chest volume.'
      };
    }
    return {
      category: 'Critical',
      color: '#EF4444',
      description: 'Below 90%. Seek medical advice or recalibrate pulse oximeter.'
    };
  }
}

export const vitalsService = new VitalsService();
