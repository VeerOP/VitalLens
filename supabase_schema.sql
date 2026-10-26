-- ==============================================================================
-- VitalLens — Cloud Database Schema (Supabase / PostgreSQL)
-- 
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. Create table for Vitals Records
CREATE TABLE IF NOT EXISTS public.vitals_records (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  timestamp BIGINT NOT NULL,
  scan_type TEXT NOT NULL,
  heart_rate NUMERIC NOT NULL,
  spo2 NUMERIC NOT NULL,
  respiratory_rate NUMERIC NOT NULL,
  systolic_bp NUMERIC,
  diastolic_bp NUMERIC,
  signal_quality TEXT,
  confidence NUMERIC,
  waveform_snippet JSONB,
  notes TEXT,
  sqi_score NUMERIC,
  hrv_rmssd NUMERIC,
  hrv_sdnn NUMERIC,
  stress_index NUMERIC,
  stress_category TEXT,
  recovery_score NUMERIC,
  rhythm_regularity TEXT,
  user_id TEXT
);

-- Index for fast time-series queries
CREATE INDEX IF NOT EXISTS idx_vitals_timestamp ON public.vitals_records (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vitals_scan_type ON public.vitals_records (scan_type);

-- 2. Create table for Daily Health Logs
CREATE TABLE IF NOT EXISTS public.daily_health_logs (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  date TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  sleep_hours NUMERIC,
  sleep_quality TEXT,
  water_glasses INTEGER,
  energy_level TEXT,
  stress_level TEXT,
  symptoms JSONB,
  notes TEXT,
  medications_taken JSONB,
  user_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_daily_logs_date ON public.daily_health_logs (date DESC);

-- 3. Create table for Medication Schedules
CREATE TABLE IF NOT EXISTS public.medications (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT,
  schedule_time TEXT,
  active BOOLEAN DEFAULT true,
  user_id TEXT
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.vitals_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- 5. Policies for client-side access via Supabase anon / authenticated role
-- Allows reading and writing vital signs and logs with the public anon key:
CREATE POLICY "Allow public read vitals_records" 
  ON public.vitals_records FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Allow public insert vitals_records" 
  ON public.vitals_records FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow public update vitals_records" 
  ON public.vitals_records FOR UPDATE 
  TO anon, authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete vitals_records" 
  ON public.vitals_records FOR DELETE 
  TO anon, authenticated 
  USING (true);

-- Daily Logs policies
CREATE POLICY "Allow public read daily_health_logs" 
  ON public.daily_health_logs FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Allow public insert daily_health_logs" 
  ON public.daily_health_logs FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow public update daily_health_logs" 
  ON public.daily_health_logs FOR UPDATE 
  TO anon, authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete daily_health_logs" 
  ON public.daily_health_logs FOR DELETE 
  TO anon, authenticated 
  USING (true);

-- Medications policies
CREATE POLICY "Allow public read medications" 
  ON public.medications FOR SELECT 
  TO anon, authenticated 
  USING (true);

CREATE POLICY "Allow public insert medications" 
  ON public.medications FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow public update medications" 
  ON public.medications FOR UPDATE 
  TO anon, authenticated 
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete medications" 
  ON public.medications FOR DELETE 
  TO anon, authenticated 
  USING (true);
