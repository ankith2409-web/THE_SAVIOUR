import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
  Unsubscribe,
  Timestamp,
} from 'firebase/firestore';
import { db, firebaseReady } from './firebaseConfig';
import { PatientCase } from '../types';

/**
 * FIRESTORE CLOUD SERVICE — Real-time patient case persistence.
 * All patient cases are stored in the "cases" collection.
 * Each document ID = PatientCase.id for fast lookup and updates.
 */

const CASES_COLLECTION = 'cases';

export class FirestoreService {

  /**
   * Check if Firestore is available and configured.
   */
  static isAvailable(): boolean {
    return firebaseReady && db !== null;
  }

  /**
   * Push (overwrite) all active cases to Firestore via batch write.
   * Used for full-state sync operations.
   */
  static async pushCases(cases: PatientCase[]): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const batch = writeBatch(db);
    const casesRef = collection(db, CASES_COLLECTION);

    // Filter to last 24 hours or active cases (same logic as SyncService.pack)
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const relevantCases = cases.filter(
      (c) =>
        now - c.timestamp < TWENTY_FOUR_HOURS ||
        c.status === 'pending' ||
        c.status === 'dispatched'
    );

    for (const c of relevantCases) {
      const docRef = doc(casesRef, c.id);
      batch.set(docRef, {
        ...c,
        _updatedAt: Timestamp.now(),
      });
    }

    await batch.commit();
  }

  /**
   * Pull all cases from Firestore.
   */
  static async pullCases(): Promise<PatientCase[]> {
    if (!db) throw new Error('Firestore not initialized');

    const casesRef = collection(db, CASES_COLLECTION);
    const q = query(casesRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      // Strip the Firestore-specific _updatedAt field
      const { _updatedAt, ...caseData } = data;
      return caseData as PatientCase;
    });
  }

  /**
   * Add or update a single patient case in Firestore.
   */
  static async upsertCase(patientCase: PatientCase): Promise<void> {
    if (!db) throw new Error('Firestore not initialized');

    const docRef = doc(db, CASES_COLLECTION, patientCase.id);
    await setDoc(docRef, {
      ...patientCase,
      _updatedAt: Timestamp.now(),
    });
  }

  /**
   * Subscribe to real-time updates on the cases collection.
   * Fires the callback whenever any case is added, modified, or removed.
   * Returns an unsubscribe function.
   */
  static subscribeToChanges(
    callback: (cases: PatientCase[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    if (!db) {
      console.error('Firestore not initialized — cannot subscribe');
      return () => {};
    }

    const casesRef = collection(db, CASES_COLLECTION);
    const q = query(casesRef, orderBy('timestamp', 'desc'));

    return onSnapshot(
      q,
      (snapshot) => {
        const cases: PatientCase[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          const { _updatedAt, ...caseData } = data;
          return caseData as PatientCase;
        });
        callback(cases);
      },
      (error) => {
        console.error('🔥 Firestore real-time listener error:', error);
        if (onError) onError(error);
      }
    );
  }
}
