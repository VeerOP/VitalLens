/**
 * VitalLens Storage - Native IndexedDB Database Engine
 *
 * Provides persistent asynchronous storage for health scan records, raw waveform snippets,
 * HRV metrics, recovery score, and SQI assessments using IndexedDB.
 */

export interface VitalsRecord {
  id: string;
  timestamp: number;
  scanType: 'fingertip' | 'face';
  heartRate: number;        // BPM
  spo2: number;             // Blood Oxygen %
  respiratoryRate: number;  // Breaths/min
  systolicBp: number;       // mmHg (Experimental)
  diastolicBp: number;      // mmHg (Experimental)
  signalQuality: 'good' | 'fair' | 'poor';
  confidence: number;       // 0-100%
  waveformSnippet?: number[];
  notes?: string;
  sqiScore?: number;
  hrvRmssd?: number;        // RMSSD in ms
  hrvSdnn?: number;         // SDNN in ms
  stressIndex?: number;     // 0-100 Baevsky Index
  stressCategory?: string;  // 'Relaxed' | 'Balanced' | 'Moderate Stress' | 'High Stress'
  recoveryScore?: number;   // 0-100 Recovery Score
  rhythmRegularity?: string;// 'Regular Sinus Rhythm' | 'Physiological Arrhythmia' | 'Irregular Rhythm / Motion'
}

const DB_NAME = 'VitalLensDB';
const DB_VERSION = 2;
const STORE_NAME = 'vitals_records';

/**
 * Open or create IndexedDB connection
 */
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported on this browser/environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('scanType', 'scanType', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Save a new scan record into IndexedDB
 */
export async function saveRecordDB(
  recordData: Omit<VitalsRecord, 'id' | 'timestamp'>
): Promise<VitalsRecord> {
  const newRecord: VitalsRecord = {
    ...recordData,
    id: 'scan-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    timestamp: Date.now(),
  };

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(newRecord);

      req.onsuccess = () => resolve(newRecord);
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback to localStorage
    const history = getLocalStorageFallback();
    const updated = [newRecord, ...history];
    try {
      localStorage.setItem('vitallens_scan_history_v1', JSON.stringify(updated));
    } catch {}
    return newRecord;
  }
}

/**
 * Get all records sorted descending by timestamp
 */
export async function getAllRecordsDB(): Promise<VitalsRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const req = index.openCursor(null, 'prev'); // Descending

      const results: VitalsRecord[] = [];
      req.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results.length > 0 ? results : getLocalStorageFallback());
        }
      };
      req.onerror = () => resolve(getLocalStorageFallback());
    });
  } catch {
    return getLocalStorageFallback();
  }
}

/**
 * Delete a specific record by ID
 */
export async function deleteRecordDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    const history = getLocalStorageFallback();
    const updated = history.filter((r) => r.id !== id);
    try {
      localStorage.setItem('vitallens_scan_history_v1', JSON.stringify(updated));
    } catch {}
  }
}

/**
 * Clear all records from database
 */
export async function clearAllRecordsDB(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => {
        try {
          localStorage.removeItem('vitallens_scan_history_v1');
        } catch {}
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    try {
      localStorage.removeItem('vitallens_scan_history_v1');
    } catch {}
  }
}

// Fallback seed data
function getLocalStorageFallback(): VitalsRecord[] {
  try {
    const raw = localStorage.getItem('vitallens_scan_history_v1');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
