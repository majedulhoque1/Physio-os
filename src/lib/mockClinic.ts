import type {
  AppointmentRow,
  AppointmentWithRelations,
  BillingRow,
  ClinicMembershipRow,
  ClinicStaffRole,
  PatientRow,
  SessionNoteRow,
  TherapistRow,
  UserProfileRow,
} from "@/types";
import { DEMO_CLINIC_ID, DEMO_MEMBERSHIPS } from "@/lib/demo";

export interface MockTeamMember extends ClinicMembershipRow {
  profile: Pick<UserProfileRow, "full_name" | "phone"> | null;
}

export interface MockClinicData {
  appointments: AppointmentRow[];
  billing: BillingRow[];
  members: MockTeamMember[];
  patients: PatientRow[];
  sessionNotes: SessionNoteRow[];
  therapists: TherapistRow[];
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function atDayOffset(dayOffset: number, hour: number, minute = 0) {
  const date = startOfToday();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function daysAgo(days: number, hour = 10, minute = 0) {
  return atDayOffset(-days, hour, minute);
}

function daysAhead(days: number, hour = 10, minute = 0) {
  return atDayOffset(days, hour, minute);
}

function syncCompletedSessions(data: MockClinicData): MockClinicData {
  const completedByPatientId = new Map<string, number>();

  for (const appointment of data.appointments) {
    if (appointment.status !== "completed") continue;

    completedByPatientId.set(
      appointment.patient_id,
      (completedByPatientId.get(appointment.patient_id) ?? 0) + 1,
    );
  }

  return {
    ...data,
    patients: data.patients.map((patient) => ({
      ...patient,
      completed_sessions: completedByPatientId.get(patient.id) ?? 0,
    })),
  };
}

export function createInitialMockClinicData(): MockClinicData {
  const therapists: TherapistRow[] = [
    {
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(32, 9, 0),
      id: "demo-therapist-korte",
      name: "Dr. Korte Hobe Pash",
      phone: "01711000001",
      specialization: "Neuro rehabilitation",
      status: "active",
      user_id: "demo-user-therapist",
    },
    {
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(27, 9, 0),
      id: "demo-therapist-tania",
      name: "Dr. Tania Sultana",
      phone: "01711000002",
      specialization: "Musculoskeletal rehab",
      status: "active",
      user_id: null,
    },
    {
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(20, 9, 0),
      id: "demo-therapist-fahim",
      name: "Dr. Fahim Ahmed",
      phone: "01711000003",
      specialization: "Sports injury therapy",
      status: "active",
      user_id: null,
    },
    {
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(14, 9, 0),
      id: "demo-therapist-nadia",
      name: "Dr. Nadia Karim",
      phone: "01711000004",
      specialization: "Post-op recovery",
      status: "inactive",
      user_id: null,
    },
  ];

  const patients: PatientRow[] = [
    {
      age: 38,
      assigned_therapist: "demo-therapist-korte",
      clinic_id: DEMO_CLINIC_ID,
      completed_sessions: 0,
      created_at: minutesAgo(45),
      diagnosis: "Post-stroke gait training",
      gender: "Female",
      id: "demo-patient-farhana",
      lead_id: null,
      name: "Farhana Rahman",
      phone: "01811000001",
      status: "active",
      total_sessions: 12,
    },
    {
      age: 31,
      assigned_therapist: "demo-therapist-korte",
      clinic_id: DEMO_CLINIC_ID,
      completed_sessions: 0,
      created_at: daysAgo(1, 12, 30),
      diagnosis: "Cervical radiculopathy",
      gender: "Male",
      id: "demo-patient-mehedi",
      lead_id: null,
      name: "Mehedi Hasan",
      phone: "01811000002",
      status: "active",
      total_sessions: 8,
    },
    {
      age: 26,
      assigned_therapist: "demo-therapist-tania",
      clinic_id: DEMO_CLINIC_ID,
      completed_sessions: 0,
      created_at: daysAgo(2, 10, 0),
      diagnosis: "ACL rehab",
      gender: "Female",
      id: "demo-patient-nusrat",
      lead_id: null,
      name: "Nusrat Jahan",
      phone: "01811000003",
      status: "active",
      total_sessions: 10,
    },
    {
      age: 47,
      assigned_therapist: "demo-therapist-fahim",
      clinic_id: DEMO_CLINIC_ID,
      completed_sessions: 0,
      created_at: daysAgo(3, 11, 0),
      diagnosis: "Frozen shoulder",
      gender: "Male",
      id: "demo-patient-kamrul",
      lead_id: null,
      name: "Kamrul Islam",
      phone: "01811000004",
      status: "active",
      total_sessions: 6,
    },
    {
      age: 29,
      assigned_therapist: "demo-therapist-tania",
      clinic_id: DEMO_CLINIC_ID,
      completed_sessions: 0,
      created_at: daysAgo(5, 14, 0),
      diagnosis: "Lumbar disc pain",
      gender: "Female",
      id: "demo-patient-sharmeen",
      lead_id: null,
      name: "Sharmeen Akter",
      phone: "01811000005",
      status: "completed",
      total_sessions: 6,
    },
    {
      age: 35,
      assigned_therapist: "demo-therapist-fahim",
      clinic_id: DEMO_CLINIC_ID,
      completed_sessions: 0,
      created_at: daysAgo(7, 15, 0),
      diagnosis: "Ankle mobility restriction",
      gender: "Male",
      id: "demo-patient-rashidul",
      lead_id: null,
      name: "Rashidul Hoque",
      phone: "01811000006",
      status: "active",
      total_sessions: 5,
    },
    {
      age: 41,
      assigned_therapist: "demo-therapist-korte",
      clinic_id: DEMO_CLINIC_ID,
      completed_sessions: 0,
      created_at: daysAgo(8, 16, 30),
      diagnosis: "Post-op knee stiffness",
      gender: "Female",
      id: "demo-patient-sabina",
      lead_id: null,
      name: "Sabina Yasmin",
      phone: "01811000007",
      status: "active",
      total_sessions: 9,
    },
    {
      age: 54,
      assigned_therapist: "demo-therapist-korte",
      clinic_id: DEMO_CLINIC_ID,
      completed_sessions: 0,
      created_at: daysAgo(9, 10, 30),
      diagnosis: null,
      gender: "Male",
      id: "demo-patient-sajjad",
      lead_id: null,
      name: "Sajjad Hossain",
      phone: "01811000008",
      status: "dropped",
      total_sessions: 0,
    },
  ];

  const appointments: AppointmentRow[] = [
    {
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(1, 8, 0),
      duration_mins: 45,
      id: "demo-apt-1",
      notes: "Balance drills",
      patient_id: "demo-patient-farhana",
      scheduled_at: atDayOffset(0, 9, 0),
      session_number: 5,
      status: "completed",
      therapist_id: "demo-therapist-korte",
    },
    {
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(1, 8, 0),
      duration_mins: 45,
      id: "demo-apt-2",
      notes: "Manual therapy + traction",
      patient_id: "demo-patient-mehedi",
      scheduled_at: atDayOffset(0, 10, 0),
      session_number: 3,
      status: "scheduled",
      therapist_id: "demo-therapist-korte",
    },
    {
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(1, 8, 0),
      duration_mins: 60,
      id: "demo-apt-3",
      notes: "Strength progression check",
      patient_id: "demo-patient-nusrat",
      scheduled_at: atDayOffset(0, 11, 30),
      session_number: 4,
      status: "missed",
      therapist_id: "demo-therapist-tania",
    },
    {
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(1, 8, 0),
      duration_mins: 45,
      id: "demo-apt-4",
      notes: null,
      patient_id: "demo-patient-kamrul",
      scheduled_at: atDayOffset(0, 12, 30),
      session_number: 2,
      status: "completed",
      therapist_id: "demo-therapist-fahim",
    },
    {
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(1, 8, 0),
      duration_mins: 45,
      id: "demo-apt-5",
      notes: "Core activation",
      patient_id: "demo-patient-sharmeen",
      scheduled_at: atDayOffset(0, 14, 0),
      session_number: 6,
      status: "scheduled",
      therapist_id: "demo-therapist-tania",
    },
    {
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(1, 8, 0),
      duration_mins: 45,
      id: "demo-apt-6",
      notes: "Mobility follow-up",
      patient_id: "demo-patient-rashidul",
      scheduled_at: atDayOffset(0, 15, 0),
      session_number: 2,
      status: "confirmed",
      therapist_id: "demo-therapist-fahim",
    },
    {
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(1, 8, 0),
      duration_mins: 45,
      id: "demo-apt-7",
      notes: "Scar tissue release",
      patient_id: "demo-patient-sabina",
      scheduled_at: atDayOffset(0, 16, 0),
      session_number: 4,
      status: "scheduled",
      therapist_id: "demo-therapist-korte",
    },
    {
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(1, 8, 0),
      duration_mins: 45,
      id: "demo-apt-8",
      notes: "Review home program",
      patient_id: "demo-patient-mehedi",
      scheduled_at: daysAhead(1, 9, 30),
      session_number: 4,
      status: "scheduled",
      therapist_id: "demo-therapist-korte",
    },
    {
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(3, 8, 0),
      duration_mins: 45,
      id: "demo-apt-9",
      notes: "Completed with good pain control",
      patient_id: "demo-patient-farhana",
      scheduled_at: daysAgo(2, 9, 0),
      session_number: 4,
      status: "completed",
      therapist_id: "demo-therapist-korte",
    },
    {
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(4, 8, 0),
      duration_mins: 45,
      id: "demo-apt-10",
      notes: "ROM restoration",
      patient_id: "demo-patient-sharmeen",
      scheduled_at: daysAgo(4, 15, 0),
      session_number: 5,
      status: "completed",
      therapist_id: "demo-therapist-tania",
    },
  ];

  const billing: BillingRow[] = [
    {
      amount: 3500,
      appointment_id: "demo-apt-1",
      clinic_id: DEMO_CLINIC_ID,
      created_at: atDayOffset(0, 9, 45),
      id: "demo-bill-1",
      package_name: "Neuro rehab follow-up",
      paid_at: atDayOffset(0, 9, 50),
      patient_id: "demo-patient-farhana",
      payment_method: "bkash",
      sessions_included: 1,
      sessions_used: 1,
      status: "paid",
    },
    {
      amount: 24000,
      appointment_id: null,
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(2, 13, 0),
      id: "demo-bill-2",
      package_name: "8-session cervical plan",
      paid_at: null,
      patient_id: "demo-patient-mehedi",
      payment_method: "cash",
      sessions_included: 8,
      sessions_used: 3,
      status: "due",
    },
    {
      amount: 18000,
      appointment_id: null,
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(5, 15, 30),
      id: "demo-bill-3",
      package_name: "ACL recovery package",
      paid_at: daysAgo(4, 10, 15),
      patient_id: "demo-patient-nusrat",
      payment_method: "card",
      sessions_included: 10,
      sessions_used: 4,
      status: "partial",
    },
  ];

  const sessionNotes: SessionNoteRow[] = [
    {
      appointment_id: "demo-apt-9",
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(2, 10, 0),
      exercises_done: ["Gait ladder", "Sit-to-stand", "Single-leg balance"],
      id: "demo-note-1",
      mobility_score: 7,
      next_plan: "Increase resisted gait drills next visit.",
      pain_scale: 3,
      patient_id: "demo-patient-farhana",
      progress_notes: "Walking tolerance improved and confidence is noticeably better.",
      therapist_id: "demo-therapist-korte",
    },
    {
      appointment_id: "demo-apt-10",
      clinic_id: DEMO_CLINIC_ID,
      created_at: daysAgo(4, 16, 0),
      exercises_done: ["ROM mobilization", "Band external rotation"],
      id: "demo-note-2",
      mobility_score: 8,
      next_plan: "Transition to maintenance plan after one more session.",
      pain_scale: 2,
      patient_id: "demo-patient-sharmeen",
      progress_notes: "Shoulder flexion is near functional range with minimal pain.",
      therapist_id: "demo-therapist-tania",
    },
  ];

  const members: MockTeamMember[] = DEMO_MEMBERSHIPS.map((membership) => ({
    ...membership,
    profile:
      membership.user_id === "demo-user-admin"
        ? { full_name: "Majedul Hoque", phone: "01711000010" }
        : membership.user_id === "demo-user-therapist"
          ? { full_name: "Dr. Korte Hobe Pash", phone: "01711000001" }
          : { full_name: "Reception Desk", phone: "01711000020" },
  }));

  return syncCompletedSessions({
    appointments,
    billing,
    members,
    patients,
    sessionNotes,
    therapists,
  });
}

export function normalizeMockClinicData(data: MockClinicData) {
  return syncCompletedSessions(data);
}

export function getVisibleTherapists(data: MockClinicData) {
  return [...data.therapists];
}

function getTherapistPatientIds(data: MockClinicData, therapistId: string) {
  const ids = new Set<string>();

  for (const patient of data.patients) {
    if (patient.assigned_therapist === therapistId) {
      ids.add(patient.id);
    }
  }

  for (const appointment of data.appointments) {
    if (appointment.therapist_id === therapistId) {
      ids.add(appointment.patient_id);
    }
  }

  return ids;
}

export function getVisiblePatients(
  data: MockClinicData,
  role: ClinicStaffRole | null,
  linkedTherapistId: string | null,
) {
  if (role === "therapist" && linkedTherapistId) {
    const patientIds = getTherapistPatientIds(data, linkedTherapistId);
    return data.patients.filter((patient) => patientIds.has(patient.id));
  }

  return [...data.patients];
}

export function getVisibleAppointments(
  data: MockClinicData,
  role: ClinicStaffRole | null,
  linkedTherapistId: string | null,
) {
  if (role === "therapist" && linkedTherapistId) {
    return data.appointments.filter(
      (appointment) => appointment.therapist_id === linkedTherapistId,
    );
  }

  return [...data.appointments];
}

export function getVisibleBilling(
  data: MockClinicData,
  role: ClinicStaffRole | null,
) {
  if (role === "therapist") {
    return [];
  }

  return [...data.billing];
}

export function getVisibleSessionNotes(
  data: MockClinicData,
  role: ClinicStaffRole | null,
  linkedTherapistId: string | null,
) {
  if (role === "therapist" && linkedTherapistId) {
    return data.sessionNotes.filter((note) => note.therapist_id === linkedTherapistId);
  }

  return [...data.sessionNotes];
}

export function buildAppointmentRelations(
  data: MockClinicData,
  appointments: AppointmentRow[],
): AppointmentWithRelations[] {
  return appointments.map((appointment) => {
    const patient = data.patients.find((item) => item.id === appointment.patient_id);
    const therapist = data.therapists.find((item) => item.id === appointment.therapist_id);

    return {
      ...appointment,
      patients: patient
        ? {
            name: patient.name,
            phone: patient.phone,
          }
        : null,
      therapists: therapist
        ? {
            name: therapist.name,
          }
        : null,
    };
  });
}
