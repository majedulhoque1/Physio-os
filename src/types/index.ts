import type { LucideIcon } from "lucide-react";

export interface NavItem {
  badge?: number;
  breadcrumbs: string[];
  end?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  mobileLabel?: string;
  title: string;
}

export interface RouteMeta {
  breadcrumbs: string[];
  title: string;
}

export type StatusTone =
  | "blue"
  | "green"
  | "red"
  | "yellow"
  | "indigo"
  | "purple"
  | "orange"
  | "gray";

export type LeadSource = "manual" | "facebook" | "whatsapp" | "referral";
export type LeadStatus =
  | "new"
  | "contacted"
  | "booked"
  | "visited"
  | "ongoing"
  | "completed"
  | "lost";
export type TherapistStatus = "active" | "inactive";
export type PatientStatus = "active" | "completed" | "dropped";
export type TreatmentPlanStatus = "active" | "completed" | "abandoned" | "paused";
export type MessageType = "thank_you" | "session_reminder" | "missed_session" | "followup" | "custom";
export type MessageChannel = "whatsapp" | "sms" | "email";
export type MessageStatus = "pending" | "sent" | "delivered" | "failed" | "read";
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "missed"
  | "cancelled";
export type PaymentMethod = "cash" | "bkash" | "nagad" | "card";
export type BillingStatus = "due" | "paid" | "partial";
export type ClinicStaffRole = "clinic_admin" | "therapist" | "receptionist";
export type MembershipStatus = "active" | "invited" | "suspended";
export type SubscriptionPlanKey = "starter" | "pro" | "enterprise";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "incomplete";
export type InvoiceStatus = "draft" | "open" | "paid" | "void" | "uncollectible";

export interface ClinicRow {
  created_at: string | null;
  id: string;
  name: string;
  owner_user_id: string | null;
  slug: string;
  updated_at: string | null;
}

export interface UserProfileRow {
  avatar_url: string | null;
  created_at: string | null;
  default_clinic_id: string | null;
  full_name: string | null;
  id: string;
  phone: string | null;
  updated_at: string | null;
}

export interface ClinicMembershipRow {
  clinic_id: string;
  created_at: string | null;
  id: string;
  invited_by: string | null;
  role: ClinicStaffRole;
  status: MembershipStatus;
  updated_at: string | null;
  user_id: string;
}

export interface ClinicInvitationRow {
  accepted_at: string | null;
  clinic_id: string;
  created_at: string | null;
  email: string;
  expires_at: string | null;
  id: string;
  invited_by: string | null;
  revoked_at: string | null;
  role: ClinicStaffRole;
  token: string;
  updated_at: string | null;
}

export interface SubscriptionPlanRow {
  appointment_limit_monthly: number | null;
  created_at: string | null;
  id: string;
  monthly_price_cents: number;
  name: string;
  patient_limit: number | null;
  plan_key: SubscriptionPlanKey;
  therapist_limit: number | null;
  updated_at: string | null;
}

export interface ClinicSubscriptionRow {
  clinic_id: string;
  created_at: string | null;
  current_period_end: string | null;
  current_period_start: string | null;
  id: string;
  plan_key: SubscriptionPlanKey;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  updated_at: string | null;
  upgrade_requested_at: string | null;
}

export interface ClinicSubscriptionExtRow {
  plan_key: string;
  status: SubscriptionStatus;
  trial_ends_at: string | null;
  current_period_end: string | null;
  upgrade_requested_at: string | null;
  is_locked: boolean;
  allowed_message_types: string[];
}

export interface UpgradeRequestItem {
  clinic_id: string;
  clinic_name: string;
  owner_email: string | null;
  plan_key: string;
  subscription_status: string;
  upgrade_requested_at: string;
}

export interface SAInvoiceRow {
  id: string;
  clinic_id: string;
  clinic_name: string;
  status: string;
  amount_due_cents: number;
  currency: string;
  due_at: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface SubscriptionInvoiceRow {
  amount_due_cents: number;
  amount_paid_cents: number;
  clinic_id: string;
  created_at: string | null;
  currency: string;
  due_at: string | null;
  hosted_invoice_url: string | null;
  id: string;
  invoice_pdf_url: string | null;
  paid_at: string | null;
  status: InvoiceStatus;
  stripe_invoice_id: string | null;
  subscription_id: string | null;
  updated_at: string | null;
}

export interface TherapistRow {
  clinic_id?: string | null;
  created_at: string | null;
  id: string;
  name: string;
  phone: string | null;
  specialization: string | null;
  status: TherapistStatus | null;
  user_id?: string | null;
}

export interface LeadRow {
  assigned_to: string | null;
  clinic_id?: string | null;
  condition: string | null;
  created_at: string | null;
  id: string;
  name: string;
  notes: string | null;
  phone: string;
  source: LeadSource | null;
  status: LeadStatus | null;
  updated_at: string | null;
}

export interface PatientRow {
  age: number | null;
  assigned_therapist: string | null;
  clinic_id?: string | null;
  created_at: string | null;
  diagnosis: string | null;
  gender: string | null;
  id: string;
  lead_id: string | null;
  name: string;
  phone: string;
  status: PatientStatus | null;
}

export interface AppointmentRow {
  clinic_id?: string | null;
  created_at: string | null;
  duration_mins: number | null;
  id: string;
  notes: string | null;
  patient_id: string;
  scheduled_at: string;
  session_number: number | null;
  status: AppointmentStatus | null;
  therapist_id: string;
  treatment_plan_id: string | null;
}

export interface AppointmentWithRelations extends AppointmentRow {
  patients: { name: string; phone: string } | null;
  therapists: { name: string } | null;
}

export interface SessionNoteRow {
  appointment_id: string;
  clinic_id?: string | null;
  created_at: string | null;
  exercises_done: string[] | null;
  id: string;
  mobility_score: number | null;
  next_plan: string | null;
  pain_scale: number | null;
  patient_id: string;
  progress_notes: string | null;
  therapist_id: string;
}

export interface BillingRow {
  amount: number;
  appointment_id: string | null;
  clinic_id?: string | null;
  created_at: string | null;
  id: string;
  package_name: string | null;
  paid_at: string | null;
  patient_id: string;
  payment_method: PaymentMethod | null;
  sessions_included: number | null;
  sessions_used: number | null;
  status: BillingStatus | null;
  treatment_plan_id: string | null;
}

export interface TreatmentPlanRow {
  abandoned_at: string | null;
  clinic_id: string;
  completed_at: string | null;
  completed_sessions: number;
  created_at: string | null;
  diagnosis: string | null;
  fee_per_session: number | null;
  frequency_per_week: number | null;
  id: string;
  interventions: string[] | null;
  long_term_goals: string | null;
  notes: string | null;
  package_name: string | null;
  patient_id: string;
  patient_instructions: string | null;
  precautions: string | null;
  reassessment_date: string | null;
  short_term_goals: string | null;
  started_at: string | null;
  status: TreatmentPlanStatus;
  therapist_id: string;
  total_fee: number | null;
  total_sessions: number;
  updated_at: string | null;
}

export interface MessageLogRow {
  id: string;
  clinic_id: string;
  patient_id: string;
  treatment_plan_id: string | null;
  appointment_id: string | null;
  message_type: MessageType;
  channel: MessageChannel;
  status: MessageStatus;
  sent_at: string | null;
  delivered_at: string | null;
  error_message: string | null;
  message_content: string | null;
  external_message_id: string | null;
  created_at: string | null;
}

export interface ClinicSettingsRow {
  id: string;
  clinic_id: string;
  auto_thank_you_enabled: boolean;
  auto_reminder_enabled: boolean;
  auto_missed_alert_enabled: boolean;
  auto_followup_enabled: boolean;
  thank_you_delay_minutes: number;
  reminder_hours_before: number;
  followup_delay_days: number;
  abandoned_threshold_days: number;
  thank_you_template: string | null;
  reminder_template: string | null;
  missed_template: string | null;
  followup_template: string | null;
  default_session_duration_mins: number;
  currency: string;
  timezone: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ClientProfileRow {
  address: string | null;
  clinic_id: string;
  contraindications: string | null;
  created_at: string | null;
  created_by: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  goals: string | null;
  id: string;
  intake_notes: string | null;
  medical_history: string | null;
  occupation: string | null;
  patient_id: string;
  updated_at: string | null;
}

export interface Database {
  public: {
    CompositeTypes: Record<string, never>;
    Enums: Record<string, never>;
    Functions: Record<string, never>;
    Tables: {
      clinic_invitations: {
        Insert: Omit<ClinicInvitationRow, "accepted_at" | "created_at" | "id" | "revoked_at" | "updated_at"> & {
          accepted_at?: string | null;
          created_at?: string | null;
          id?: string;
          revoked_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
        Row: ClinicInvitationRow;
        Update: Partial<ClinicInvitationRow>;
      };
      clinic_memberships: {
        Insert: Omit<ClinicMembershipRow, "created_at" | "id" | "updated_at"> & {
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
        Row: ClinicMembershipRow;
        Update: Partial<ClinicMembershipRow>;
      };
      clinic_subscriptions: {
        Insert: Omit<ClinicSubscriptionRow, "created_at" | "id" | "updated_at"> & {
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
        Row: ClinicSubscriptionRow;
        Update: Partial<ClinicSubscriptionRow>;
      };
      clinics: {
        Insert: Omit<ClinicRow, "created_at" | "id" | "updated_at"> & {
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
        Row: ClinicRow;
        Update: Partial<ClinicRow>;
      };
      client_profiles: {
        Insert: Omit<ClientProfileRow, "created_at" | "id" | "updated_at"> & {
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
        Row: ClientProfileRow;
        Update: Partial<ClientProfileRow>;
      };
      appointments: {
        Insert: Omit<AppointmentRow, "created_at" | "id"> & {
          created_at?: string | null;
          id?: string;
        };
        Relationships: [];
        Row: AppointmentRow;
        Update: Partial<AppointmentRow>;
      };
      billing: {
        Insert: Omit<BillingRow, "created_at" | "id" | "paid_at"> & {
          created_at?: string | null;
          id?: string;
          paid_at?: string | null;
        };
        Relationships: [];
        Row: BillingRow;
        Update: Partial<BillingRow>;
      };
      clinic_settings: {
        Insert: Omit<ClinicSettingsRow, "created_at" | "id" | "updated_at"> & {
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
        Row: ClinicSettingsRow;
        Update: Partial<ClinicSettingsRow>;
      };
      message_log: {
        Insert: Omit<MessageLogRow, "created_at" | "id"> & {
          created_at?: string | null;
          id?: string;
        };
        Relationships: [];
        Row: MessageLogRow;
        Update: Partial<MessageLogRow>;
      };
      treatment_plans: {
        Insert: Omit<TreatmentPlanRow, "completed_sessions" | "created_at" | "id" | "updated_at"> & {
          completed_sessions?: number;
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
        Row: TreatmentPlanRow;
        Update: Partial<TreatmentPlanRow>;
      };
      leads: {
        Insert: Omit<LeadRow, "created_at" | "id" | "updated_at"> & {
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
        Row: LeadRow;
        Update: Partial<LeadRow>;
      };
      patients: {
        Insert: Omit<PatientRow, "created_at" | "id"> & {
          created_at?: string | null;
          id?: string;
        };
        Relationships: [];
        Row: PatientRow;
        Update: Partial<PatientRow>;
      };
      session_notes: {
        Insert: Omit<SessionNoteRow, "created_at" | "id"> & {
          created_at?: string | null;
          id?: string;
        };
        Relationships: [];
        Row: SessionNoteRow;
        Update: Partial<SessionNoteRow>;
      };
      subscription_invoices: {
        Insert: Omit<SubscriptionInvoiceRow, "created_at" | "id" | "updated_at"> & {
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
        Row: SubscriptionInvoiceRow;
        Update: Partial<SubscriptionInvoiceRow>;
      };
      subscription_plans: {
        Insert: Omit<SubscriptionPlanRow, "created_at" | "id" | "updated_at"> & {
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
        Row: SubscriptionPlanRow;
        Update: Partial<SubscriptionPlanRow>;
      };
      therapists: {
        Insert: Omit<TherapistRow, "created_at" | "id"> & {
          created_at?: string | null;
          id?: string;
        };
        Relationships: [];
        Row: TherapistRow;
        Update: Partial<TherapistRow>;
      };
      user_profiles: {
        Insert: Omit<UserProfileRow, "created_at" | "updated_at"> & {
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
        Row: UserProfileRow;
        Update: Partial<UserProfileRow>;
      };
      prescriptions: {
        Insert: import("./prescription").PrescriptionInsert;
        Relationships: [];
        Row: import("./prescription").PrescriptionRow;
        Update: import("./prescription").PrescriptionUpdate;
      };
      protocol_templates: {
        Insert: import("./prescription").ProtocolTemplateInsert;
        Relationships: [];
        Row: import("./prescription").ProtocolTemplateRow;
        Update: import("./prescription").ProtocolTemplateUpdate;
      };
      bangla_advice_library: {
        Insert: import("./prescription").BanglaAdviceInsert;
        Relationships: [];
        Row: import("./prescription").BanglaAdviceRow;
        Update: import("./prescription").BanglaAdviceUpdate;
      };
    };
    Views: Record<string, never>;
  };
}

export * from "./prescription";

export interface DashboardKpis {
  activePatients: number;
  missedSessions: number;
  todayAppointments: number;
  weekRevenue: number;
}

export interface DashboardTrend {
  direction: "down" | "up";
  value: string;
}

export interface DashboardAppointmentItem {
  appointmentId: string;
  patientId: string;
  patientName: string;
  status: AppointmentStatus;
  therapist: string;
  time: string;
}

export interface DashboardPatientStatusItem {
  count: number;
  label: string;
  tone: StatusTone;
}

export interface DashboardRecentPatientItem {
  createdLabel: string;
  id: string;
  name: string;
  status: PatientStatus;
}

export interface DashboardAttentionItem {
  badge: string;
  detail: string;
  title: string;
  tone: StatusTone;
}

export interface DashboardData {
  appointments: DashboardAppointmentItem[];
  attentionItems: DashboardAttentionItem[];
  kpis: DashboardKpis;
  patientStatuses: DashboardPatientStatusItem[];
  recentPatients: DashboardRecentPatientItem[];
  trends: {
    activePatients: DashboardTrend;
    missedSessions: DashboardTrend;
    todayAppointments: DashboardTrend;
    weekRevenue: DashboardTrend;
  };
}

export interface SAPatientRow {
  id: string;
  name: string;
  phone: string;
  age: number | null;
  gender: string | null;
  diagnosis: string | null;
  status: string;
  total_sessions: number;
  completed_sessions: number;
  assigned_therapist_name: string | null;
  created_at: string;
}

export interface SATherapistRow {
  id: string;
  name: string;
  phone: string | null;
  specialization: string | null;
  status: string;
  created_at: string;
}

export interface SAAppointmentRow {
  id: string;
  patient_name: string;
  therapist_name: string;
  scheduled_at: string;
  status: string;
  duration_mins: number;
  session_number: number | null;
  notes: string | null;
  created_at: string;
}

export interface SATreatmentPlanRow {
  id: string;
  patient_name: string;
  therapist_name: string;
  diagnosis: string | null;
  status: string;
  total_sessions: number | null;
  completed_sessions: number;
  fee_per_session: number | null;
  total_fee: number | null;
  started_at: string | null;
  created_at: string;
}
