import { PatientCase, EmergencyType, HospitalPreference } from '../types';
import { FirestoreService } from './FirestoreService';

/**
 * TACTICAL UNIVERSAL SYNC SERVICE - V5 (Firebase + Fallback)
 * Primary: Firebase Firestore for real-time cloud persistence.
 * Fallback: Public key-value API for environments without Firebase.
 */

const EMERGENCY_MAP: Record<string, number> = {
  [EmergencyType.HEART]: 0,
  [EmergencyType.ACCIDENT]: 1,
  [EmergencyType.INJURY]: 2,
  [EmergencyType.EMERGENCY]: 3,
  [EmergencyType.PREGNANCY]: 4,
  [EmergencyType.OTHERS]: 5
};

const STATUS_MAP: Record<string, number> = {
  'pending': 0,
  'accepted': 1,
  'dispatched': 2,
  'completed': 3,
  'canceled': 4
};

const PREF_MAP: Record<HospitalPreference, number> = {
  'GOVERNMENT': 0,
  'PRIVATE': 1,
  'BOTH': 2
};

const REV_EMERGENCY_MAP: Record<number, EmergencyType> = Object.fromEntries(
  Object.entries(EMERGENCY_MAP).map(([k, v]) => [v, k as EmergencyType])
);

const REV_STATUS_MAP: Record<number, PatientCase['status']> = Object.fromEntries(
  Object.entries(STATUS_MAP).map(([k, v]) => [v, k as PatientCase['status']])
);

const REV_PREF_MAP: Record<number, HospitalPreference> = Object.fromEntries(
  Object.entries(PREF_MAP).map(([k, v]) => [v, k as HospitalPreference])
);

// Module-level BroadcastChannel mapping to ensure standard JS scope execution, avoiding TS class static block transpile issues
const saviourChannel = typeof window !== 'undefined' && window.BroadcastChannel 
  ? new BroadcastChannel('saviour_sync_channel_v2') 
  : null;

if (saviourChannel) {
  saviourChannel.onmessage = (event) => {
    if (event.data && event.data.type === 'SYNC_CASES') {
      SyncService.updateCacheFromBroadcast(event.data.cases);
    }
  };
}

export class SyncService {
  private static APP_TOKEN = 'SAVIOUR_GLOBAL_V1';
  private static PUBLIC_BASE_URL = 'https://keyvalue.immanuel.co/api/KeyVal';
  private static GLOBAL_NODE_ID = 'SAVIOUR_EMERGENCY_GRID';

  private static cachedCases: PatientCase[] = [];
  private static lastSuccessfulTimestamp: number = 0;
  private static realtimeCallback: ((cases: PatientCase[]) => void) | null = null;

  /**
   * Deduplicate cases by ID, keeping the latest version (by timestamp).
   */
  private static deduplicate(cases: PatientCase[]): PatientCase[] {
    const map = new Map<string, PatientCase>();
    for (const c of cases) {
      const existing = map.get(c.id);
      if (!existing || c.timestamp >= existing.timestamp) {
        map.set(c.id, c);
      }
    }
    return Array.from(map.values());
  }

  static updateCacheFromBroadcast(cases: PatientCase[]) {
    this.cachedCases = this.deduplicate(cases);
    this.lastSuccessfulTimestamp = Date.now();
    if (this.realtimeCallback) {
      this.realtimeCallback(this.cachedCases);
    }
  }

  // ---------- FIREBASE METHODS (PRIMARY) ----------

  /**
   * Check if Firebase Firestore is available.
   */
  static isFirebaseAvailable(): boolean {
    return FirestoreService.isAvailable();
  }

  /**
   * Subscribe to real-time Firestore updates.
   * Returns an unsubscribe function. Falls back to null if Firebase is not available.
   */
  static subscribeRealtime(
    onCasesUpdate: (cases: PatientCase[]) => void,
    onError?: (error: Error) => void
  ): (() => void) | null {
    this.realtimeCallback = onCasesUpdate;

    if (!FirestoreService.isAvailable()) {
      console.warn('⚠️ Firestore unavailable — using BroadcastChannel & polling fallback for sync');
      return () => {
        this.realtimeCallback = null;
      };
    }

    return FirestoreService.subscribeToChanges(
      (cases) => {
        this.cachedCases = cases;
        this.lastSuccessfulTimestamp = Date.now();
        onCasesUpdate(cases);
        // Also broadcast for good measure
        if (saviourChannel) {
          saviourChannel.postMessage({ type: 'SYNC_CASES', cases });
        }
      },
      onError
    );
  }

  // ---------- LEGACY FALLBACK METHODS ----------

  private static pack(cases: PatientCase[]) {
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    return cases
      .filter(c => (now - c.timestamp) < TWENTY_FOUR_HOURS || c.status === 'pending' || c.status === 'dispatched')
      .slice(0, 30) 
      .map(c => ({
        i: c.id,
        p: c.patientName.substring(0, 15),
        n: c.phoneNumber.replace(/\D/g, '').substring(0, 10),
        e: EMERGENCY_MAP[c.emergencyType] ?? 3,
        l: [
          parseFloat(c.location.lat.toFixed(5)), 
          parseFloat(c.location.lng.toFixed(5))
        ],
        s: STATUS_MAP[c.status] ?? 0,
        h: c.hospitalName?.substring(0, 15) || '',
        d: c.ambulanceDriver?.substring(0, 15) || '',
        dn: c.ambulanceDriverNumber?.replace(/\D/g, '') || '',
        o: c.officerName?.substring(0, 15) || '',
        t: Math.floor(c.timestamp / 1000),
        pr: c.hospitalPreference ? PREF_MAP[c.hospitalPreference] : 2
      }));
  }

  private static unpack(packed: any[]): PatientCase[] {
    if (!Array.isArray(packed)) return [];
    return packed.map(p => ({
      id: p.i,
      patientName: p.p,
      phoneNumber: p.n,
      emergencyType: REV_EMERGENCY_MAP[p.e] || EmergencyType.EMERGENCY,
      location: { lat: p.l[0], lng: p.l[1] },
      status: REV_STATUS_MAP[p.s] || 'pending',
      hospitalName: p.h || undefined,
      ambulanceDriver: p.d || undefined,
      ambulanceDriverNumber: p.dn || undefined,
      officerName: p.o || undefined,
      timestamp: p.t * 1000,
      hospitalPreference: REV_PREF_MAP[p.pr] || 'BOTH'
    }));
  }

  // ---------- UNIFIED METHODS (Firebase → Fallback) ----------

  static async pushToGlobal(cases: PatientCase[]): Promise<void> {
    // 1. Optimistic Local Update & Broadcast
    this.cachedCases = cases;
    this.lastSuccessfulTimestamp = Date.now();
    if (saviourChannel) {
      saviourChannel.postMessage({ type: 'SYNC_CASES', cases });
    }

    // 2. Background Network Sync
    const doNetworkSync = async () => {
      // Try Firebase first
      if (FirestoreService.isAvailable()) {
        try {
          await FirestoreService.pushCases(cases);
          this.cachedCases = cases;
          this.lastSuccessfulTimestamp = Date.now();
          if (saviourChannel) {
            saviourChannel.postMessage({ type: 'SYNC_CASES', cases });
          }
          return;
        } catch (e) {
          console.warn('⚠️ Firestore push failed, falling back to legacy API:', e);
        }
      }

      // Fallback: Legacy key-value API
      const packed = this.pack(cases);
      const payload = JSON.stringify({ p: packed, t: Date.now() });
      
      try {
        const response = await fetch(`${this.PUBLIC_BASE_URL}/UpdateValue/${this.APP_TOKEN}/${this.GLOBAL_NODE_ID}`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: payload
        });

        if (!response.ok) throw new Error("POST Fail");
        
        this.cachedCases = cases;
        this.lastSuccessfulTimestamp = Date.now();
        if (saviourChannel) {
          saviourChannel.postMessage({ type: 'SYNC_CASES', cases });
        }
      } catch (e) {
        try {
          const encoded = encodeURIComponent(payload);
          const url = `${this.PUBLIC_BASE_URL}/UpdateValue/${this.APP_TOKEN}/${this.GLOBAL_NODE_ID}/${encoded}`;
          await fetch(url, { mode: 'no-cors' }); 
        } catch (err) {
          console.error("Critical Grid Synchronization Failure", err);
        }
      }
    };

    // Fire and forget
    doNetworkSync();
  }

  static async pullFromGlobal(): Promise<{ cases: PatientCase[], timestamp: number }> {
    // Try Firebase first
    if (FirestoreService.isAvailable()) {
      try {
        const cases = await FirestoreService.pullCases();
        this.cachedCases = cases;
        this.lastSuccessfulTimestamp = Date.now();
        return { cases, timestamp: this.lastSuccessfulTimestamp };
      } catch (e) {
        console.warn('⚠️ Firestore pull failed, falling back to legacy API:', e);
      }
    }

    // Fallback: Legacy key-value API
    try {
      const response = await fetch(`${this.PUBLIC_BASE_URL}/GetValue/${this.APP_TOKEN}/${this.GLOBAL_NODE_ID}`, {
        cache: 'no-store'
      });
      if (!response.ok) throw new Error("Pull Fail");
      
      let rawData = await response.text();
      if (!rawData || rawData === 'null' || rawData === '""') {
        return { cases: this.cachedCases, timestamp: this.lastSuccessfulTimestamp };
      }

      if (rawData.startsWith('"') && rawData.endsWith('"')) {
        try { rawData = JSON.parse(rawData); } catch (e) {}
      }
        
      const parsed = JSON.parse(rawData);
      const unpacked = this.unpack(parsed.p || []);
      
      this.cachedCases = unpacked;
      this.lastSuccessfulTimestamp = parsed.t || Date.now();

      return { cases: unpacked, timestamp: this.lastSuccessfulTimestamp };
    } catch (e) {
      return { cases: this.cachedCases, timestamp: this.lastSuccessfulTimestamp };
    }
  }

  static async atomicUpdate(updatedCase: PatientCase): Promise<PatientCase[]> {
    // 1. Optimistic Local Update & Broadcast
    const caseIndex = this.cachedCases.findIndex(c => c.id === updatedCase.id);
    let optimisticCases: PatientCase[];
    if (caseIndex > -1) {
      optimisticCases = this.cachedCases.map(c => c.id === updatedCase.id ? updatedCase : c);
    } else {
      optimisticCases = [updatedCase, ...this.cachedCases];
    }
    
    this.cachedCases = this.deduplicate(optimisticCases);
    this.lastSuccessfulTimestamp = Date.now();
    
    if (saviourChannel) {
      saviourChannel.postMessage({ type: 'SYNC_CASES', cases: optimisticCases });
    }

    // 2. Background Network Sync
    const doNetworkSync = async () => {
      // Try Firebase first
      if (FirestoreService.isAvailable()) {
        try {
          await FirestoreService.upsertCase(updatedCase);
          const cases = await FirestoreService.pullCases();
          this.cachedCases = cases;
          this.lastSuccessfulTimestamp = Date.now();
          if (saviourChannel) {
            saviourChannel.postMessage({ type: 'SYNC_CASES', cases });
          }
          if (this.realtimeCallback) this.realtimeCallback(cases);
          return;
        } catch (e) {
          console.warn('⚠️ Firestore atomic update failed, falling back to legacy API:', e);
        }
      }

      // Fallback: Legacy pull-merge-push
      try {
        const { cases } = await this.pullFromGlobal();
        const cid = cases.findIndex(c => c.id === updatedCase.id);
        let mergedCases: PatientCase[];
        if (cid > -1) {
          mergedCases = cases.map(c => c.id === updatedCase.id ? updatedCase : c);
        } else {
          mergedCases = [updatedCase, ...cases];
        }
        await this.pushToGlobal(mergedCases);
        if (this.realtimeCallback) this.realtimeCallback(mergedCases);
      } catch (e) {
        console.warn('⚠️ Local fallback sync failed', e);
      }
    };

    // Fire and forget
    doNetworkSync();

    return optimisticCases;
  }
}