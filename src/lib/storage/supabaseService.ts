/**
 * VitalLens Storage - Supabase Sync Service
 *
 * Handles bi-directional synchronization, remote persistence, and queries
 * between local IndexedDB storage and external Supabase PostgreSQL database.
 */

import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import type { VitalsRecord } from './vitalsDb';
import { getAllRecordsDB, saveRecordDB } from './vitalsDb';

export interface SupabaseVitalsRow {
  id: string;
  timestamp: number;
  scan_type: 'fingertip' | 'face';
  heart_rate: number;
  spo2: number;
  respiratory_rate: number;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  signal_quality: string | null;
  confidence: number | null;
  waveform_snippet: number[] | null;
  notes: string | null;
  sqi_score: number | null;
  hrv_rmssd: number | null;
  hrv_sdnn: number | null;
  stress_index: number | null;
  stress_category: string | null;
  recovery_score: number | null;
  rhythm_regularity: string | null;
  user_id?: string | null;
}

/**
 * Transforms an internal VitalsRecord to a Supabase PostgreSQL row format.
 */
export function recordToSupabaseRow(record: VitalsRecord): SupabaseVitalsRow {
  return {
    id: record.id,
    timestamp: record.timestamp,
    scan_type: record.scanType,
    heart_rate: record.heartRate,
    spo2: record.spo2,
    respiratory_rate: record.respiratoryRate,
    systolic_bp: record.systolicBp ?? null,
    diastolic_bp: record.diastolicBp ?? null,
    signal_quality: record.signalQuality ?? null,
    confidence: record.confidence ?? null,
    waveform_snippet: record.waveformSnippet ?? null,
    notes: record.notes ?? null,
    sqi_score: record.sqiScore ?? null,
    hrv_rmssd: record.hrvRmssd ?? null,
    hrv_sdnn: record.hrvSdnn ?? null,
    stress_index: record.stressIndex ?? null,
    stress_category: record.stressCategory ?? null,
    recovery_score: record.recoveryScore ?? null,
    rhythm_regularity: record.rhythmRegularity ?? null,
  };
}

/**
 * Transforms a Supabase PostgreSQL row back to an internal VitalsRecord.
 */
export function supabaseRowToRecord(row: any): VitalsRecord {
  return {
    id: row.id,
    timestamp: Number(row.timestamp),
    scanType: row.scan_type,
    heartRate: Number(row.heart_rate),
    spo2: Number(row.spo2),
    respiratoryRate: Number(row.respiratory_rate),
    systolicBp: row.systolic_bp != null ? Number(row.systolic_bp) : 120,
    diastolicBp: row.diastolic_bp != null ? Number(row.diastolic_bp) : 80,
    signalQuality: row.signal_quality || 'fair',
    confidence: Number(row.confidence ?? 85),
    waveformSnippet: Array.isArray(row.waveform_snippet) ? row.waveform_snippet : undefined,
    notes: row.notes || undefined,
    sqiScore: row.sqi_score != null ? Number(row.sqi_score) : undefined,
    hrvRmssd: row.hrv_rmssd != null ? Number(row.hrv_rmssd) : undefined,
    hrvSdnn: row.hrv_sdnn != null ? Number(row.hrv_sdnn) : undefined,
    stressIndex: row.stress_index != null ? Number(row.stress_index) : undefined,
    stressCategory: row.stress_category || undefined,
    recoveryScore: row.recovery_score != null ? Number(row.recovery_score) : undefined,
    rhythmRegularity: row.rhythm_regularity || undefined,
  };
}

/**
 * Persists a vitals record into external Supabase database.
 */
export async function saveRecordToSupabase(record: VitalsRecord): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase is not configured' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client unavailable' };
  }

  try {
    const row = recordToSupabaseRow(record);
    const { error } = await client.from('vitals_records').upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase upsert warning:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Failed to save to Supabase:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

/**
 * Deletes a vitals record from Supabase by ID.
 */
export async function deleteRecordFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('vitals_records').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetches all vitals records from Supabase, ordered descending by timestamp.
 */
export async function fetchRecordsFromSupabase(): Promise<{ data: VitalsRecord[] | null; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase is not configured' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: 'Supabase client unavailable' };
  }

  try {
    const { data, error } = await client
      .from('vitals_records')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    const records = (data || []).map(supabaseRowToRecord);
    return { data: records };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Network error' };
  }
}

/**
 * Pushes all local IndexedDB records to Supabase.
 */
export async function syncAllLocalToSupabase(): Promise<{
  total: number;
  uploaded: number;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return { total: 0, uploaded: 0, error: 'Supabase is not configured.' };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { total: 0, uploaded: 0, error: 'Client unavailable.' };
  }

  try {
    const localRecords = await getAllRecordsDB();
    if (localRecords.length === 0) {
      return { total: 0, uploaded: 0 };
    }

    const rows = localRecords.map(recordToSupabaseRow);
    const { error } = await client.from('vitals_records').upsert(rows, { onConflict: 'id' });

    if (error) {
      return { total: localRecords.length, uploaded: 0, error: error.message };
    }

    return { total: localRecords.length, uploaded: localRecords.length };
  } catch (err: any) {
    return { total: 0, uploaded: 0, error: err?.message || 'Sync failed.' };
  }
}

/**
 * Pulls all records from Supabase into local IndexedDB and localStorage.
 */
export async function syncSupabaseToLocal(): Promise<{
  downloaded: number;
  error?: string;
}> {
  const result = await fetchRecordsFromSupabase();
  if (result.error || !result.data) {
    return { downloaded: 0, error: result.error || 'Failed to fetch from cloud' };
  }

  let count = 0;
  for (const record of result.data) {
    await saveRecordDB(record);
    count++;
  }

  return { downloaded: count };
}
