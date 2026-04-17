// =============================================================================
// Prescription Builder — Types + Chip Constants
// =============================================================================

export interface PrescriptionRow {
  id: string;
  clinic_id: string;
  appointment_id: string;
  patient_id: string;
  therapist_id: string;
  treatment_plan_id: string | null;
  chief_complaints: string[];
  body_parts: string[];
  pain_vas: number | null;
  diagnosis: string | null;
  modalities: string[];
  exercises: string[];
  advice_en: string[];
  advice_bn: string[];
  notes: string | null;
  template_used_id: string | null;
  cloned_from_id: string | null;
  handwriting_svg: string | null;
  handwriting_url: string | null;
  created_at: string;
  updated_at: string;
}

export type PrescriptionInsert = Omit<PrescriptionRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type PrescriptionUpdate = Partial<Omit<PrescriptionRow, "id" | "clinic_id" | "created_at">>;

// ---------------------------------------------------------------------------

export interface ProtocolTemplateRow {
  id: string;
  clinic_id: string | null;
  name: string;
  diagnosis: string | null;
  default_modalities: string[];
  default_exercises: string[];
  default_advice_en: string[];
  default_advice_bn: string[];
  default_body_parts: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ProtocolTemplateInsert = Omit<ProtocolTemplateRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type ProtocolTemplateUpdate = Partial<Omit<ProtocolTemplateRow, "id" | "created_at">>;

// ---------------------------------------------------------------------------

export interface BanglaAdviceRow {
  id: string;
  clinic_id: string | null;
  category: string;
  text_bn: string;
  text_en: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export type BanglaAdviceInsert = Omit<BanglaAdviceRow, "id" | "created_at"> & {
  id?: string;
  created_at?: string;
};

export type BanglaAdviceUpdate = Partial<Omit<BanglaAdviceRow, "id" | "created_at">>;

// ---------------------------------------------------------------------------
// Chip constants
// ---------------------------------------------------------------------------

export type AdviceCategory =
  | "posture"
  | "diabetes"
  | "exercise"
  | "follow_up"
  | "lifestyle"
  | "medication"
  | "diet"
  | "rest";

export const ADVICE_CATEGORY_LABELS: Record<AdviceCategory, string> = {
  posture: "Posture",
  diabetes: "Diabetes / BP",
  exercise: "Exercise",
  follow_up: "Follow-up",
  lifestyle: "Lifestyle",
  medication: "Medication",
  diet: "Diet",
  rest: "Rest",
};

export const CHIEF_COMPLAINTS = [
  "Pain",
  "Stiffness",
  "Numbness",
  "Radiating pain",
  "Weakness",
  "Tingling",
  "Swelling",
] as const;

export const BODY_PARTS = [
  "Neck",
  "Shoulder",
  "Upper Back",
  "Elbow",
  "Wrist",
  "Lower Back",
  "Hip",
  "Knee",
  "Ankle",
] as const;

export const MODALITIES = [
  "UST",
  "TENS",
  "IFT",
  "SWD",
  "MWD",
  "Cryo",
  "Wax",
  "Hot Pack",
  "Traction",
  "LASER",
] as const;

export const DEFAULT_EXERCISES = [
  "Pendulum exercise",
  "Codman's exercise",
  "Wall climbing",
  "Pelvic tilt",
  "Bridging",
  "Knee to chest",
  "McKenzie extension",
  "Straight leg raise",
  "Quadriceps isometrics",
  "Hamstring stretch",
  "Piriformis stretch",
  "Neck isometrics",
  "Chin tuck",
  "Shoulder shrug",
  "Passive ROM",
] as const;
