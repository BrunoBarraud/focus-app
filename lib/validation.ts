import { z } from "zod";
import { isIsoDate, isTime, isValidTimeZone } from "./dates";

// Las server actions son endpoints POST públicos: los tipos de TypeScript no
// existen en runtime, así que todo input se valida acá.

export const uuid = z.uuid();
export const isoDate = z.string().refine(isIsoDate, "Fecha inválida (YYYY-MM-DD).");
export const time = z.string().refine(isTime, "Hora inválida (HH:MM).");
export const timezone = z.string().refine(isValidTimeZone, "Zona horaria inválida.");
const title = (max = 200) => z.string().trim().min(1, "El título es obligatorio.").max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const weekDay = z.enum(["L", "M", "X", "J", "V", "S", "D"]);
export const priority = z.enum(["high", "medium", "low"]);

export const habitInput = z.object({
  name: title(120),
  category: z.enum(["cuerpo", "mente", "trabajo", "espiritu"]),
  monthlyTargetDays: z.number().int().min(1).max(31),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export const taskInput = z
  .object({
    calendarId: uuid.optional(),
    title: title(200),
    description: optionalText(2000),
    recurring: z.boolean(),
    date: isoDate.optional(),
    daysOfWeek: z.array(weekDay).max(7).optional(),
    startTime: time.optional(),
    endTime: time.optional(),
    priority,
    estimatedMinutes: z.number().int().min(5).max(24 * 60).optional(),
    tag: z.string().trim().max(40).optional(),
  })
  .refine((t) => (t.recurring ? (t.daysOfWeek?.length ?? 0) > 0 : Boolean(t.date)), {
    message: "Una tarea semanal necesita días; una puntual necesita fecha.",
  });
export type TaskInput = z.input<typeof taskInput>;

export const calendarInput = z.object({
  name: title(60),
  color: z.string().max(60),
});

export const goalInput = z.object({
  title: title(200),
  category: z.enum(["personal", "professional"]),
  targetDate: isoDate.nullable().optional(),
  timeframe: z.enum(["Q1", "Q2", "Q3", "Q4", "Anual"]),
  milestones: z.array(title(200)).max(20).optional(),
});

export const dreamInput = z.object({
  title: title(200),
  description: optionalText(2000),
  category: z.enum(["Viajes", "Finanzas", "Experiencias", "Impacto", "Creatividad"]),
  targetYear: z.number().int().min(1900).max(2200).optional(),
});
export const dreamStatus = z.enum(["pending", "in_progress", "completed"]);

export const ritualInput = z
  .object({
    mission: z.string().trim().min(1).max(300),
    pillar: z.string().trim().min(1).max(300),
    frog: z.string().trim().min(1).max(300),
    energyLevel: z.enum(["low", "medium", "high", "peak"]),
  })
  .partial();

export const profileInput = z.object({
  fullName: z.string().trim().min(1).max(120).optional(),
  birthDate: isoDate.optional(),
  targetAge: z.number().int().min(1).max(130).optional(),
  timezone: timezone.optional(),
});

export const feedbackInput = z.object({
  type: z.enum(["suggestion", "improvement", "bug", "question", "other"]),
  title: title(200),
  description: z.string().trim().min(1, "La descripción es obligatoria.").max(5000),
  rating: z.number().int().min(1).max(5).optional(),
  priority: priority.optional(),
});

export const feedbackStatus = z.enum(["pending", "in_review", "resolved", "dismissed"]);

export const pushSubscriptionInput = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({
    auth: z.string().min(1).max(200),
    p256dh: z.string().min(1).max(200),
  }),
});

/** Primer mensaje de error legible de un resultado de zod. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos inválidos.";
}
