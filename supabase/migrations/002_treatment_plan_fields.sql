-- Migration: Add clinical and operational fields to treatment_plans
ALTER TABLE treatment_plans
  ADD COLUMN IF NOT EXISTS short_term_goals    text,
  ADD COLUMN IF NOT EXISTS long_term_goals     text,
  ADD COLUMN IF NOT EXISTS interventions       text[],
  ADD COLUMN IF NOT EXISTS frequency_per_week  integer,
  ADD COLUMN IF NOT EXISTS precautions         text,
  ADD COLUMN IF NOT EXISTS reassessment_date   date,
  ADD COLUMN IF NOT EXISTS patient_instructions text,
  ADD COLUMN IF NOT EXISTS package_name        text,
  ADD COLUMN IF NOT EXISTS fee_per_session     numeric,
  ADD COLUMN IF NOT EXISTS total_fee           numeric;
