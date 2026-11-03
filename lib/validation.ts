import { z } from "zod";
import { isIsoDate, isTime, isValidTimeZone } from "./dates";
import { isInactivityHours } from "./notifications/inactivity";
import { buildSlots, isTimetableColor, toMinutes } from "./timetable";

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
    // undefined = no tocar; null = color automático.
    color: z.string().refine(isTimetableColor, "Color inválido.").nullable().optional(),
  })
  .refine((t) => (t.recurring ? (t.daysOfWeek?.length ?? 0) > 0 : Boolean(t.date)), {
    message: "Una tarea semanal necesita días; una puntual necesita fecha.",
  })
  .refine((t) => !t.startTime || !t.endTime || toMinutes(t.endTime) > toMinutes(t.startTime), {
    message: "La hora de fin tiene que ser después de la de inicio.",
  });
export type TaskInput = z.input<typeof taskInput>;

export const calendarScheduleInput = z
  .object({
    start: time,
    slotMinutes: z.number().int().min(10, "Cada bloque dura al menos 10 minutos.").max(240),
    gapMinutes: z.number().int().min(0).max(60),
    end: time,
  })
  .refine((s) => toMinutes(s.end) > toMinutes(s.start), { message: "El día tiene que terminar después del primer bloque." })
  .refine((s) => buildSlots(s).length > 0, { message: "Con esa configuración no entra ningún bloque." });

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
  timezone: timezone.optional(),
});

/** Cada cuántas horas avisar si no se usa la app; null = no avisar. */
export const inactivityHours = z
  .number()
  .refine(isInactivityHours, "Frecuencia inválida.")
  .nullable();

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
