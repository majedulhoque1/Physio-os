import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DraggableAttributes,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BadgePlus,
  GripVertical,
  MessageSquareText,
  Phone,
  UserPlus,
  X,
} from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  useForm,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form";
import { z } from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useToast } from "@/components/shared/useToast";
import { useLeads } from "@/hooks/useLeads";
import { useTherapists } from "@/hooks/useTherapists";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { LeadRow, LeadSource, LeadStatus, StatusTone, TherapistRow } from "@/types";

const boardColumns = [
  { key: "new", label: "New", tone: "blue" },
  { key: "contacted", label: "Contacted", tone: "yellow" },
  { key: "booked", label: "Booked", tone: "indigo" },
  { key: "visited", label: "Visited", tone: "purple" },
  { key: "ongoing", label: "Ongoing", tone: "green" },
  { key: "lost", label: "Lost", tone: "red" },
] as const satisfies Array<{
  key: LeadStatus;
  label: string;
  tone: StatusTone;
}>;

const leadFormSchema = z.object({
  assigned_to: z.string().optional(),
  condition: z.string().optional(),
  name: z.string().trim().min(1, "Name is required"),
  notes: z.string().optional(),
  phone: z.string().trim().min(11, "Phone must be at least 11 characters"),
  source: z.enum(["manual", "facebook", "whatsapp", "referral"]),
  status: z.enum(["new", "contacted", "booked", "visited", "ongoing", "lost"]),
});

type LeadFormValues = z.infer<typeof leadFormSchema>;
type BoardLeadStatus = (typeof boardColumns)[number]["key"];

function getBoardStatus(status: LeadStatus | null | undefined): BoardLeadStatus {
  if (!status) {
    return "new";
  }

  const boardStatus = boardColumns.find((column) => column.key === status);
  return boardStatus ? boardStatus.key : "ongoing";
}

function getSourceTone(source: LeadSource | null | undefined): StatusTone {
  switch (source) {
    case "facebook":
      return "blue";
    case "whatsapp":
      return "green";
    case "referral":
      return "purple";
    default:
      return "gray";
  }
}

function getStatusLabel(status: BoardLeadStatus) {
  const matchingStatus = boardColumns.find((column) => column.key === status);
  return matchingStatus?.label ?? "Ongoing";
}

function fieldClassName(hasError: boolean) {
  return cn(
    "mt-2 w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors",
    hasError
      ? "border-danger/40 ring-2 ring-danger/10"
      : "border-border focus:border-primary focus:ring-2 focus:ring-primary/10",
  );
}

function actionButtonClassName(variant: "primary" | "secondary") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
    variant === "primary" && "bg-primary text-white hover:bg-primary/90",
    variant === "secondary" &&
      "border border-border bg-surface text-foreground hover:bg-background",
  );
}

function therapistNameForLead(therapists: TherapistRow[], lead: LeadRow) {
  return therapists.find((therapist) => therapist.id === lead.assigned_to)?.name;
}

function LeadFormFields({
  errors,
  includeStatus,
  register,
  therapists,
}: {
  errors: FieldErrors<LeadFormValues>;
  includeStatus: boolean;
  register: UseFormRegister<LeadFormValues>;
  therapists: TherapistRow[];
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-foreground">
          Name
          <input
            {...register("name")}
            type="text"
            placeholder="Jannatul Ferdous"
            className={fieldClassName(Boolean(errors.name))}
          />
          {errors.name?.message ? (
            <span className="mt-1 block text-xs text-danger">{errors.name.message}</span>
          ) : null}
        </label>

        <label className="text-sm font-medium text-foreground">
          Phone
          <input
            {...register("phone")}
            type="tel"
            placeholder="017XXXXXXXX"
            className={fieldClassName(Boolean(errors.phone))}
          />
          {errors.phone?.message ? (
            <span className="mt-1 block text-xs text-danger">{errors.phone.message}</span>
          ) : null}
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-foreground">
          Condition
          <input
            {...register("condition")}
            type="text"
            placeholder="Low back pain"
            className={fieldClassName(Boolean(errors.condition))}
          />
        </label>

        <label className="text-sm font-medium text-foreground">
          Source
          <select
            {...register("source")}
            className={fieldClassName(Boolean(errors.source))}
          >
            <option value="manual">Manual</option>
            <option value="facebook">Facebook</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="referral">Referral</option>
          </select>
        </label>
      </div>

      <div className={cn("grid gap-4", includeStatus ? "sm:grid-cols-2" : "sm:grid-cols-1")}>
        <label className="text-sm font-medium text-foreground">
          Assigned Therapist
          <select
            {...register("assigned_to")}
            className={fieldClassName(Boolean(errors.assigned_to))}
          >
            <option value="">Unassigned</option>
            {therapists.map((therapist) => (
              <option key={therapist.id} value={therapist.id}>
                {therapist.name}
              </option>
            ))}
          </select>
        </label>

        {includeStatus ? (
          <label className="text-sm font-medium text-foreground">
            Status
            <select
              {...register("status")}
              className={fieldClassName(Boolean(errors.status))}
            >
              {boardColumns.map((column) => (
                <option key={column.key} value={column.key}>
                  {column.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <label className="text-sm font-medium text-foreground">
        Notes
        <textarea
          {...register("notes")}
          rows={4}
          placeholder="Pain started after lifting heavy furniture..."
          className={fieldClassName(Boolean(errors.notes))}
        />
      </label>
    </div>
  );
}

function LeadCardContent({
  dragHandleProps,
  lead,
  onOpen,
  style,
  therapistName,
}: {
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: ReturnType<typeof useDraggable>["listeners"];
  };
  lead: LeadRow;
  onOpen?: (leadId: string) => void;
  style?: CSSProperties;
  therapistName?: string;
}) {
  const boardStatus = getBoardStatus(lead.status);
  const boardTone = boardColumns.find((column) => column.key === boardStatus)?.tone ?? "gray";

  return (
    <article
      style={style}
      className="rounded-lg border border-border bg-surface p-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onOpen?.(lead.id)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-semibold text-foreground">{lead.name}</p>
          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            <span className="truncate">{lead.phone}</span>
          </div>
          <p className="mt-2 text-sm italic text-muted-foreground">
            {lead.condition?.trim() || "Condition not added yet"}
          </p>
        </button>

        {dragHandleProps ? (
          <button
            type="button"
            className="mt-0.5 cursor-grab rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground active:cursor-grabbing"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge label={lead.source ?? "manual"} tone={getSourceTone(lead.source)} />
        <StatusBadge label={getStatusLabel(boardStatus)} tone={boardTone} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>{lead.created_at ? formatRelativeTime(lead.created_at) : "recently"}</span>
        <span className="truncate">{therapistName ?? "Unassigned"}</span>
      </div>
    </article>
  );
}

function DraggableLeadCard({
  lead,
  onOpen,
  therapistName,
}: {
  lead: LeadRow;
  onOpen: (leadId: string) => void;
  therapistName?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: {
      leadId: lead.id,
      status: getBoardStatus(lead.status),
    },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        opacity: isDragging ? 0.5 : 1,
        transform: CSS.Transform.toString(transform),
      }}
    >
      <LeadCardContent
        lead={lead}
        onOpen={onOpen}
        therapistName={therapistName}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
}

function LeadColumn({
  children,
  count,
  isOver,
  label,
  tone,
}: {
  children: ReactNode;
  count: number;
  isOver: boolean;
  label: string;
  tone: StatusTone;
}) {
  return (
    <div className="flex h-full min-w-[296px] flex-col rounded-lg border border-border bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              tone === "blue" && "bg-sky-500",
              tone === "yellow" && "bg-amber-500",
              tone === "indigo" && "bg-indigo-500",
              tone === "purple" && "bg-violet-500",
              tone === "green" && "bg-emerald-500",
              tone === "red" && "bg-rose-500",
            )}
          />
          <h3 className="text-sm font-semibold text-foreground">{label}</h3>
        </div>
        <StatusBadge label={count.toString()} tone={tone} />
      </div>

      <div
        className={cn(
          "flex min-h-[420px] flex-1 flex-col gap-3 rounded-b-lg p-4 transition-colors",
          isOver ? "bg-primary/5" : "bg-slate-50/60",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function DroppableLeadColumn({
  children,
  count,
  label,
  status,
  tone,
}: {
  children: ReactNode;
  count: number;
  label: string;
  status: BoardLeadStatus;
  tone: StatusTone;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div ref={setNodeRef} className="shrink-0">
      <LeadColumn count={count} isOver={isOver} label={label} tone={tone}>
        {children}
      </LeadColumn>
    </div>
  );
}

function AddLeadModal({
  isSaving,
  onClose,
  onSubmit,
  open,
  therapists,
}: {
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (values: LeadFormValues) => Promise<void>;
  open: boolean;
  therapists: TherapistRow[];
}) {
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      assigned_to: "",
      condition: "",
      name: "",
      notes: "",
      phone: "",
      source: "manual",
      status: "new",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        assigned_to: "",
        condition: "",
        name: "",
        notes: "",
        phone: "",
        source: "manual",
        status: "new",
      });
    }
  }, [open, reset]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Add Lead</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Capture the inquiry and drop it straight into the pipeline.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-5 py-5">
          <LeadFormFields
            errors={errors}
            includeStatus={false}
            register={register}
            therapists={therapists}
          />

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className={actionButtonClassName("secondary")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={actionButtonClassName("primary")}
            >
              <UserPlus className="h-4 w-4" />
              {isSaving ? "Saving lead..." : "Add Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LeadDetailDrawer({
  isConverting,
  isSaving,
  lead,
  onClose,
  onConvert,
  onSubmit,
  therapists,
}: {
  isConverting: boolean;
  isSaving: boolean;
  lead: LeadRow | null;
  onClose: () => void;
  onConvert: (lead: LeadRow) => Promise<void>;
  onSubmit: (leadId: string, values: LeadFormValues) => Promise<void>;
  therapists: TherapistRow[];
}) {
  const {
    handleSubmit,
    register,
    reset,
    formState: { errors },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      assigned_to: "",
      condition: "",
      name: "",
      notes: "",
      phone: "",
      source: "manual",
      status: "new",
    },
  });

  useEffect(() => {
    if (!lead) {
      return;
    }

    reset({
      assigned_to: lead.assigned_to ?? "",
      condition: lead.condition ?? "",
      name: lead.name,
      notes: lead.notes ?? "",
      phone: lead.phone,
      source: lead.source ?? "manual",
      status: getBoardStatus(lead.status),
    });
  }, [lead, reset]);

  if (!lead) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close lead details"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-slate-950/30 backdrop-blur-sm"
      />

      <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-xl flex-col border-l border-border bg-surface shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-foreground">{lead.name}</h3>
              <StatusBadge
                label={lead.source ?? "manual"}
                tone={getSourceTone(lead.source)}
              />
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Created {lead.created_at ? formatRelativeTime(lead.created_at) : "recently"}.
              Keep the details current before converting this inquiry into a patient.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <form
            id="lead-detail-form"
            onSubmit={handleSubmit((values) => onSubmit(lead.id, values))}
            className="space-y-5"
          >
            <LeadFormFields
              errors={errors}
              includeStatus
              register={register}
              therapists={therapists}
            />
          </form>

          <div className="mt-6 rounded-lg border border-border bg-background p-4">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <BadgePlus className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Convert to Patient</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  This creates a patient record using the lead name, phone, condition,
                  and assigned therapist, then moves the lead to Ongoing.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isConverting}
              onClick={() => onConvert(lead)}
              className={cn(actionButtonClassName("primary"), "mt-4 w-full")}
            >
              {isConverting ? "Converting lead..." : "Convert to Patient"}
            </button>
          </div>
        </div>

        <div className="border-t border-border px-5 py-4">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className={actionButtonClassName("secondary")}
            >
              Close
            </button>
            <button
              type="submit"
              form="lead-detail-form"
              disabled={isSaving}
              className={actionButtonClassName("primary")}
            >
              {isSaving ? "Saving changes..." : "Save Changes"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function LeadsBoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {boardColumns.map((column) => (
        <div
          key={column.key}
          className="min-w-[296px] rounded-lg border border-border bg-surface shadow-card"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="h-5 w-28 animate-pulse rounded bg-slate-200" />
            <div className="h-6 w-10 animate-pulse rounded-full bg-slate-100" />
          </div>

          <div className="space-y-3 p-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`${column.key}-skeleton-${index}`}
                className="rounded-lg border border-border bg-slate-50 p-4"
              >
                <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-4 w-28 animate-pulse rounded bg-slate-100" />
                <div className="mt-3 h-4 w-40 animate-pulse rounded bg-slate-100" />
                <div className="mt-4 h-5 w-24 animate-pulse rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Leads() {
  const {
    leads,
    error: leadsError,
    isLoading: leadsLoading,
    createLead,
    convertLeadToPatient,
    updateLead,
    updateLeadStatus,
  } = useLeads();
  const {
    therapists,
    error: therapistsError,
    isLoading: therapistsLoading,
  } = useTherapists();
  const { toast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [isSavingLead, setIsSavingLead] = useState(false);
  const [isConvertingLead, setIsConvertingLead] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? null;
  const activeLead = leads.find((lead) => lead.id === activeLeadId) ?? null;

  async function handleAddLead(values: LeadFormValues) {
    setIsSavingLead(true);

    const result = await createLead({
      assigned_to: values.assigned_to || null,
      condition: values.condition,
      name: values.name,
      notes: values.notes,
      phone: values.phone,
      source: values.source,
      status: "new",
    });

    setIsSavingLead(false);

    if (result.error) {
      toast({
        title: "Could not add lead",
        description: result.error,
        variant: "error",
      });
      return;
    }

    setIsAddModalOpen(false);
    toast({
      title: "Lead added",
      description: "The new inquiry is now in your pipeline.",
      variant: "success",
    });
  }

  async function handleSaveLead(leadId: string, values: LeadFormValues) {
    setIsSavingLead(true);

    const result = await updateLead(leadId, {
      assigned_to: values.assigned_to || null,
      condition: values.condition,
      name: values.name,
      notes: values.notes,
      phone: values.phone,
      source: values.source,
      status: values.status,
    });

    setIsSavingLead(false);

    if (result.error) {
      toast({
        title: "Could not save lead",
        description: result.error,
        variant: "error",
      });
      return;
    }

    toast({
      title: "Lead updated",
      description: "The drawer changes were saved.",
      variant: "success",
    });
  }

  async function handleConvertLead(lead: LeadRow) {
    setIsConvertingLead(true);

    const result = await convertLeadToPatient(lead);

    setIsConvertingLead(false);

    if (result.error) {
      toast({
        title: "Could not convert lead",
        description: result.error,
        variant: "error",
      });
      return;
    }

    toast({
      title: "Lead converted",
      description: "A patient record was created and the lead moved to Ongoing.",
      variant: "success",
    });
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveLeadId(null);

    const overId = event.over?.id;

    if (!overId || typeof overId !== "string") {
      return;
    }

    const targetColumn = boardColumns.find((column) => column.key === overId);

    if (!targetColumn) {
      return;
    }

    const leadId = String(event.active.id);
    const lead = leads.find((item) => item.id === leadId);

    if (!lead) {
      return;
    }

    const currentStatus = getBoardStatus(lead.status);

    if (currentStatus === targetColumn.key) {
      return;
    }

    const result = await updateLeadStatus(lead.id, targetColumn.key);

    if (result.error) {
      toast({
        title: "Could not move lead",
        description: result.error,
        variant: "error",
      });
      return;
    }

    toast({
      title: "Lead moved",
      description: `${lead.name} is now in ${targetColumn.label}.`,
      variant: "success",
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveLeadId(String(event.active.id));
  }

  const hasError = Boolean(leadsError || therapistsError);
  const isLoading = leadsLoading || therapistsLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Pipeline"
        description="Track every inquiry from first contact through booking, visit, and conversion into an ongoing patient."
        actions={
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className={actionButtonClassName("primary")}
          >
            <UserPlus className="h-4 w-4" />
            Add Lead
          </button>
        }
      />

      {hasError ? (
        <section className="rounded-lg border border-danger/20 bg-danger/5 p-4 shadow-card">
          <p className="text-sm font-semibold text-foreground">
            Lead data could not load cleanly
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {leadsError ?? therapistsError}
          </p>
        </section>
      ) : null}

      {isLoading ? (
        <LeadsBoardSkeleton />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-2">
            {boardColumns.map((column) => {
              const columnLeads = leads.filter(
                (lead) => getBoardStatus(lead.status) === column.key,
              );

              return (
                <DroppableLeadColumn
                  key={column.key}
                  count={columnLeads.length}
                  label={column.label}
                  status={column.key}
                  tone={column.tone}
                >
                  {columnLeads.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface px-4 py-10 text-center">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <MessageSquareText className="h-4 w-4" />
                      </span>
                      <p className="mt-4 text-sm font-semibold text-foreground">
                        No leads in {column.label}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Add a lead or drag one here from another stage.
                      </p>
                    </div>
                  ) : (
                    columnLeads.map((lead) => (
                      <DraggableLeadCard
                        key={lead.id}
                        lead={lead}
                        onOpen={setSelectedLeadId}
                        therapistName={therapistNameForLead(therapists, lead)}
                      />
                    ))
                  )}
                </DroppableLeadColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeLead ? (
              <div className="w-[280px] rotate-1 opacity-95">
                <LeadCardContent
                  lead={activeLead}
                  therapistName={therapistNameForLead(therapists, activeLead)}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {!isLoading && leads.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border bg-surface p-8 text-center shadow-card">
          <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserPlus className="h-6 w-6" />
          </span>
          <h3 className="mt-5 text-lg font-semibold text-foreground">No leads yet</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Start by capturing your first inquiry. Every new lead appears in the New
            column and can be dragged through the clinic pipeline.
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className={cn(actionButtonClassName("primary"), "mt-5")}
          >
            <UserPlus className="h-4 w-4" />
            Add your first lead
          </button>
        </section>
      ) : null}

      <AddLeadModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddLead}
        therapists={therapists}
        isSaving={isSavingLead}
      />

      <LeadDetailDrawer
        lead={selectedLead}
        onClose={() => setSelectedLeadId(null)}
        onConvert={handleConvertLead}
        onSubmit={handleSaveLead}
        therapists={therapists}
        isSaving={isSavingLead}
        isConverting={isConvertingLead}
      />
    </div>
  );
}
