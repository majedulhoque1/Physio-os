import { createContext, useContext, useEffect, useState } from "react";
import { DEMO_CLINIC_ID } from "@/lib/demo";
import {
  createInitialMockClinicData,
  normalizeMockClinicData,
  type MockClinicData,
} from "@/lib/mockClinic";
import type {
  AppointmentStatus,
  BillingStatus,
  PatientStatus,
  TherapistStatus,
} from "@/types";

const STORAGE_KEY = "physio-os-demo-data-v1";

interface MockClinicContextValue {
  createAppointment: (input: {
    duration_mins?: number;
    notes?: string | null;
    patient_id: string;
    scheduled_at: string;
    session_number?: number | null;
    status?: AppointmentStatus;
    therapist_id: string;
  }) => { id: string };
  createBillingRecord: (input: {
    amount: number;
    appointment_id?: string | null;
    package_name?: string | null;
    patient_id: string;
    payment_method?: "cash" | "bkash" | "nagad" | "card";
    sessions_included?: number | null;
    status?: BillingStatus;
  }) => { id: string };
  createPatient: (input: {
    age?: number | null;
    assigned_therapist?: string | null;
    diagnosis?: string | null;
    gender?: string | null;
    name: string;
    phone: string;
    status?: PatientStatus;
    total_sessions?: number | null;
  }) => { id: string };
  createSessionNote: (input: {
    appointment_id: string;
    clinic_id: string;
    exercises_done?: string[] | null;
    mobility_score?: number | null;
    next_plan?: string | null;
    pain_scale?: number | null;
    patient_id: string;
    progress_notes?: string | null;
    therapist_id: string;
  }) => { id: string };
  createTherapist: (input: {
    name: string;
    phone?: string | null;
    specialization?: string | null;
    status?: TherapistStatus;
  }) => { id: string };
  data: MockClinicData;
  markBillingPaid: (recordId: string) => void;
  resetDemoData: () => void;
  updateAppointmentStatus: (appointmentId: string, status: AppointmentStatus) => void;
  updateBillingStatus: (recordId: string, status: BillingStatus) => void;
  updatePatient: (
    patientId: string,
    input: {
      assigned_therapist?: string | null;
      diagnosis?: string | null;
      status?: PatientStatus;
      total_sessions?: number | null;
    },
  ) => void;
  updateTherapist: (
    therapistId: string,
    input: {
      name?: string;
      phone?: string | null;
      specialization?: string | null;
      status?: TherapistStatus;
    },
  ) => void;
}

const MockClinicContext = createContext<MockClinicContextValue | null>(null);

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadInitialData() {
  if (typeof window === "undefined") {
    return createInitialMockClinicData();
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createInitialMockClinicData();
  }

  try {
    return normalizeMockClinicData(JSON.parse(raw) as MockClinicData);
  } catch {
    return createInitialMockClinicData();
  }
}

export function MockClinicProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<MockClinicData>(() => loadInitialData());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  function updateData(updater: (current: MockClinicData) => MockClinicData) {
    setData((current) => normalizeMockClinicData(updater(current)));
  }

  function createPatient(input: MockClinicContextValue["createPatient"] extends (
    arg: infer T,
  ) => unknown
    ? T
    : never) {
    const id = createId("patient");

    updateData((current) => ({
      ...current,
      patients: [
        {
          age: input.age ?? null,
          assigned_therapist: input.assigned_therapist ?? null,
          clinic_id: DEMO_CLINIC_ID,
          completed_sessions: 0,
          created_at: new Date().toISOString(),
          diagnosis: input.diagnosis ?? null,
          gender: input.gender ?? null,
          id,
          lead_id: null,
          name: input.name.trim(),
          phone: input.phone.trim(),
          status: input.status ?? "active",
          total_sessions: input.total_sessions ?? 0,
        },
        ...current.patients,
      ],
    }));

    return { id };
  }

  function updatePatient(
    patientId: string,
    input: MockClinicContextValue["updatePatient"] extends (
      first: string,
      second: infer T,
    ) => unknown
      ? T
      : never,
  ) {
    updateData((current) => ({
      ...current,
      patients: current.patients.map((patient) =>
        patient.id === patientId
          ? {
              ...patient,
              assigned_therapist:
                input.assigned_therapist === undefined
                  ? patient.assigned_therapist
                  : input.assigned_therapist,
              diagnosis:
                input.diagnosis === undefined ? patient.diagnosis : input.diagnosis,
              status: input.status ?? patient.status,
              total_sessions:
                input.total_sessions === undefined
                  ? patient.total_sessions
                  : input.total_sessions,
            }
          : patient,
      ),
    }));
  }

  function createTherapist(
    input: MockClinicContextValue["createTherapist"] extends (arg: infer T) => unknown
      ? T
      : never,
  ) {
    const id = createId("therapist");

    updateData((current) => ({
      ...current,
      therapists: [
        ...current.therapists,
        {
          clinic_id: DEMO_CLINIC_ID,
          created_at: new Date().toISOString(),
          id,
          name: input.name.trim(),
          phone: input.phone ?? null,
          specialization: input.specialization ?? null,
          status: input.status ?? "active",
          user_id: null,
        },
      ],
    }));

    return { id };
  }

  function updateTherapist(
    therapistId: string,
    input: MockClinicContextValue["updateTherapist"] extends (
      first: string,
      second: infer T,
    ) => unknown
      ? T
      : never,
  ) {
    updateData((current) => ({
      ...current,
      therapists: current.therapists.map((therapist) =>
        therapist.id === therapistId
          ? {
              ...therapist,
              name: input.name?.trim() ?? therapist.name,
              phone: input.phone === undefined ? therapist.phone : input.phone,
              specialization:
                input.specialization === undefined
                  ? therapist.specialization
                  : input.specialization,
              status: input.status ?? therapist.status,
            }
          : therapist,
      ),
    }));
  }

  function createAppointment(
    input: MockClinicContextValue["createAppointment"] extends (arg: infer T) => unknown
      ? T
      : never,
  ) {
    const id = createId("appointment");

    updateData((current) => ({
      ...current,
      appointments: [
        ...current.appointments,
        {
          clinic_id: DEMO_CLINIC_ID,
          created_at: new Date().toISOString(),
          duration_mins: input.duration_mins ?? 45,
          id,
          notes: input.notes ?? null,
          patient_id: input.patient_id,
          scheduled_at: input.scheduled_at,
          session_number: input.session_number ?? null,
          status: input.status ?? "scheduled",
          therapist_id: input.therapist_id,
        },
      ],
    }));

    return { id };
  }

  function updateAppointmentStatus(appointmentId: string, status: AppointmentStatus) {
    updateData((current) => ({
      ...current,
      appointments: current.appointments.map((appointment) =>
        appointment.id === appointmentId ? { ...appointment, status } : appointment,
      ),
    }));
  }

  function createBillingRecord(
    input: MockClinicContextValue["createBillingRecord"] extends (arg: infer T) => unknown
      ? T
      : never,
  ) {
    const id = createId("billing");
    const paidAt = input.status === "paid" ? new Date().toISOString() : null;

    updateData((current) => ({
      ...current,
      billing: [
        {
          amount: input.amount,
          appointment_id: input.appointment_id ?? null,
          clinic_id: DEMO_CLINIC_ID,
          created_at: new Date().toISOString(),
          id,
          package_name: input.package_name ?? null,
          paid_at: paidAt,
          patient_id: input.patient_id,
          payment_method: input.payment_method ?? "cash",
          sessions_included: input.sessions_included ?? null,
          sessions_used: 0,
          status: input.status ?? "due",
        },
        ...current.billing,
      ],
    }));

    return { id };
  }

  function updateBillingStatus(recordId: string, status: BillingStatus) {
    updateData((current) => ({
      ...current,
      billing: current.billing.map((record) =>
        record.id === recordId
          ? {
              ...record,
              paid_at: status === "paid" ? new Date().toISOString() : record.paid_at,
              status,
            }
          : record,
      ),
    }));
  }

  function markBillingPaid(recordId: string) {
    updateBillingStatus(recordId, "paid");
  }

  function createSessionNote(
    input: MockClinicContextValue["createSessionNote"] extends (arg: infer T) => unknown
      ? T
      : never,
  ) {
    const id = createId("session-note");

    updateData((current) => ({
      ...current,
      sessionNotes: [
        {
          appointment_id: input.appointment_id,
          clinic_id: input.clinic_id,
          created_at: new Date().toISOString(),
          exercises_done: input.exercises_done ?? null,
          id,
          mobility_score: input.mobility_score ?? null,
          next_plan: input.next_plan ?? null,
          pain_scale: input.pain_scale ?? null,
          patient_id: input.patient_id,
          progress_notes: input.progress_notes ?? null,
          therapist_id: input.therapist_id,
        },
        ...current.sessionNotes.filter(
          (note) => note.appointment_id !== input.appointment_id,
        ),
      ],
    }));

    return { id };
  }

  function resetDemoData() {
    setData(createInitialMockClinicData());
  }

  return (
    <MockClinicContext.Provider
      value={{
        createAppointment,
        createBillingRecord,
        createPatient,
        createSessionNote,
        createTherapist,
        data,
        markBillingPaid,
        resetDemoData,
        updateAppointmentStatus,
        updateBillingStatus,
        updatePatient,
        updateTherapist,
      }}
    >
      {children}
    </MockClinicContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMockClinic() {
  const context = useContext(MockClinicContext);
  if (!context) {
    throw new Error("useMockClinic must be used within MockClinicProvider");
  }

  return context;
}
