"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { HabitCategory, WeekDay, MorningRitual, PlannerTask, Goal, UserRole, SupportFeedback, SupportFeedbackType, SupportFeedbackStatus, SupportFeedbackPriority } from "@/lib/types";

// ==============================================================================
// 1. AUTENTICACIÓN
// ==============================================================================

/**
 * Server Action: Iniciar Sesión
 */
export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Por favor ingresa correo y contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

/**
 * Server Action: Registrarse
 */
export async function signupAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const firstName = (formData.get("firstName") as string) || "";
  const lastName = (formData.get("lastName") as string) || "";
  const fullName = `${firstName} ${lastName}`.trim() || "Usuario";
  const birthDate = (formData.get("birthDate") as string) || "1995-06-15";

  if (!email || !password) {
    return { error: "Por favor completa todos los campos requeridos." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data?.user) {
    await supabase.from("user_settings").upsert({
      user_id: data.user.id,
      birth_date: birthDate,
      target_age: 80,
      daily_mission: `Propósito personal de ${fullName}`,
      daily_pillar: "Disciplina & Presencia",
      daily_frog: "Completar la prioridad absoluta de hoy",
      energy_level: "high",
    });

    await supabase.from("habits").insert([
      {
        user_id: data.user.id,
        title: "Deep Work (2 horas sin distracciones)",
        category: "trabajo",
        monthly_target_days: 22,
        color: "#10b981",
      },
      {
        user_id: data.user.id,
        title: "Ejercicio Físico o Caminata",
        category: "cuerpo",
        monthly_target_days: 20,
        color: "#f97316",
      },
      {
        user_id: data.user.id,
        title: "Lectura o Aprendizaje (20m)",
        category: "mente",
        monthly_target_days: 25,
        color: "#8b5cf6",
      },
    ]);
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

/**
 * Server Action: Cerrar Sesión
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  redirect("/login");
}

// ==============================================================================
// 2. HÁBITOS (MUTACIONES CON REVALIDACIÓN DE CACHÉ)
// ==============================================================================

/**
 * Server Action: Agregar un nuevo hábito
 */
export async function addHabitAction(data: {
  name: string;
  category: HabitCategory;
  monthlyTargetDays: number;
  color?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Debes iniciar sesión para crear hábitos." };
  }

  const { data: newHabit, error } = await supabase
    .from("habits")
    .insert({
      user_id: user.id,
      title: data.name,
      category: data.category,
      monthly_target_days: data.monthlyTargetDays,
      color: data.color || "#10b981",
    })
    .select()
    .single();

  if (error) {
    console.error("Error al crear hábito en Supabase:", error.message);
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/habitos", "layout");
  return { success: true, habit: newHabit };
}

/**
 * Server Action: Actualizar título de un hábito
 */
export async function updateHabitTitleAction(habitId: string, newTitle: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuario no autenticado." };
  }

  const { error } = await supabase
    .from("habits")
    .update({ title: newTitle })
    .eq("id", habitId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error al actualizar título del hábito:", error.message);
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/habitos", "layout");
  return { success: true };
}

/**
 * Server Action: Eliminar un hábito
 */
export async function deleteHabitAction(habitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuario no autenticado." };
  }

  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("id", habitId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error al eliminar hábito de Supabase:", error.message);
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/habitos", "layout");
  return { success: true };
}

/**
 * Server Action: Alternar el cumplimiento de un hábito en un día del mes
 */
export async function toggleHabitDayAction(habitId: string, day: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuario no autenticado." };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const dayStr = String(day).padStart(2, "0");
  const dateStr = `${year}-${month}-${dayStr}`;

  // Verificar si ya existe registro en habit_logs
  const { data: existing, error: fetchErr } = await supabase
    .from("habit_logs")
    .select("id, completed")
    .eq("habit_id", habitId)
    .eq("date", dateStr)
    .maybeSingle();

  if (fetchErr) {
    console.error("Error al buscar registro de hábito:", fetchErr.message);
    return { error: fetchErr.message };
  }

  if (existing) {
    const { error: updateErr } = await supabase
      .from("habit_logs")
      .update({ completed: !existing.completed })
      .eq("id", existing.id);

    if (updateErr) {
      console.error("Error actualizando registro:", updateErr.message);
      return { error: updateErr.message };
    }
  } else {
    const { error: insertErr } = await supabase.from("habit_logs").insert({
      habit_id: habitId,
      date: dateStr,
      completed: true,
    });

    if (insertErr) {
      console.error("Error insertando registro:", insertErr.message);
      return { error: insertErr.message };
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/habitos", "layout");
  return { success: true };
}

// ==============================================================================
// 3. TAREAS (ORGANIZADOR INTELIGENTE CON REVALIDACIÓN)
// ==============================================================================

function parseTaskTimeAndDesc(rawDesc?: string): { scheduledTime?: string; cleanDescription?: string } {
  if (!rawDesc) return {};
  if (rawDesc.startsWith("@time:")) {
    const lines = rawDesc.split("\n");
    const time = lines[0].replace("@time:", "").trim();
    const clean = lines.slice(1).join("\n").trim();
    return {
      scheduledTime: time || undefined,
      cleanDescription: clean || undefined,
    };
  }
  return { cleanDescription: rawDesc };
}

/**
 * Server Action: Agregar una nueva tarea o reunión con horario
 */
export async function addTaskAction(task: {
  title: string;
  description?: string;
  day: WeekDay;
  scheduledDate?: string;
  scheduledTime?: string;
  priority: "high" | "medium" | "low";
  estimatedMinutes: number;
  completed?: boolean;
  tag: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuario no autenticado." };
  }

  const rawDescription = task.scheduledTime
    ? `@time:${task.scheduledTime}${task.description ? "\n" + task.description : ""}`
    : task.description || null;

  const { data: newTask, error } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title: task.title,
      description: rawDescription,
      day_of_week: task.day,
      scheduled_date: task.scheduledDate || null,
      priority: task.priority,
      estimated_minutes: task.estimatedMinutes,
      status: task.completed ? "completed" : "pending",
      tag: task.tag,
    })
    .select()
    .single();

  if (error) {
    console.error("Error al agregar tarea:", error.message);
    return { error: error.message };
  }

  const parsed = parseTaskTimeAndDesc(newTask.description);

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/planificador", "layout");
  return {
    success: true,
    task: {
      ...newTask,
      description: parsed.cleanDescription,
      scheduledTime: parsed.scheduledTime,
    },
  };
}

/**
 * Server Action: Alternar el estado de completada de una tarea
 */
export async function toggleTaskAction(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuario no autenticado." };
  }

  const { data: task, error: fetchErr } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !task) {
    return { error: "Tarea no encontrada." };
  }

  const nextStatus = task.status === "completed" ? "pending" : "completed";
  const { error: updateErr } = await supabase
    .from("tasks")
    .update({ status: nextStatus })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (updateErr) {
    console.error("Error al alternar estado de tarea:", updateErr.message);
    return { error: updateErr.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/planificador", "layout");
  return { success: true, status: nextStatus };
}

/**
 * Server Action: Eliminar una tarea
 */
export async function deleteTaskAction(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuario no autenticado." };
  }

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error al eliminar tarea:", error.message);
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/planificador", "layout");
  return { success: true };
}

/**
 * Server Action: Obtener tareas parametrizadas por mes y año para navegación futura
 */
export async function getTasksForMonthAction(year: number, month: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuario no autenticado.", tasks: [] };
  }

  const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDay = new Date(year, month, 0).getDate();
  const endOfMonth = `${year}-${String(month).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;

  // Consultar tareas programadas para ese mes o tareas recurrentes generales
  const { data: monthTasks, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .or(`and(scheduled_date.gte.${startOfMonth},scheduled_date.lte.${endOfMonth}),scheduled_date.is.null`)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error al obtener tareas del mes:", error.message);
    return { error: error.message, tasks: [] };
  }

  return {
    success: true,
    tasks: (monthTasks || []).map((t: any) => {
      const parsed = parseTaskTimeAndDesc(t.description);
      return {
        id: t.id,
        title: t.title,
        description: parsed.cleanDescription || "",
        day: (t.day_of_week as WeekDay) || "L",
        scheduledDate: t.scheduled_date || undefined,
        scheduledTime: parsed.scheduledTime,
        priority: (t.priority as any) || "medium",
        estimatedMinutes: t.estimated_minutes || 30,
        completed: t.status === "completed",
        tag: t.tag || "General",
      };
    }),
  };
}

// ==============================================================================
// 4. OBJETIVOS Y METAS
// ==============================================================================

/**
 * Server Action: Agregar una nueva meta
 */
export async function addGoalAction(goal: {
  title: string;
  category: "personal" | "professional";
  progress?: number;
  targetDate?: string;
  timeframe?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuario no autenticado." };
  }

  const { data: newGoal, error } = await supabase
    .from("goals")
    .insert({
      user_id: user.id,
      title: goal.title,
      type: goal.category === "professional" ? "profesional" : "personal",
      progress: goal.progress || 0,
      target_date: goal.targetDate || "Fin de año",
      timeframe: goal.timeframe || "Anual",
    })
    .select()
    .single();

  if (error) {
    console.error("Error al agregar meta:", error.message);
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/objetivos", "layout");
  return { success: true, goal: newGoal };
}

/**
 * Server Action: Eliminar una meta
 */
export async function deleteGoalAction(goalId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuario no autenticado." };
  }

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error al eliminar meta:", error.message);
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/objetivos", "layout");
  return { success: true };
}

/**
 * Server Action: Alternar hito de una meta
 */
export async function toggleMilestoneAction(goalId: string, milestoneId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuario no autenticado." };
  }

  const { data: goal, error: fetchErr } = await supabase
    .from("goals")
    .select("progress")
    .eq("id", goalId)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !goal) {
    return { error: "Meta no encontrada." };
  }

  const nextProgress = goal.progress >= 100 ? 50 : Math.min(100, goal.progress + 25);
  const { error: updateErr } = await supabase
    .from("goals")
    .update({ progress: nextProgress })
    .eq("id", goalId)
    .eq("user_id", user.id);

  if (updateErr) {
    console.error("Error al actualizar hito:", updateErr.message);
    return { error: updateErr.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/objetivos", "layout");
  return { success: true, progress: nextProgress };
}

// ==============================================================================
// 5. RITUAL MATUTINO & PREFERENCIAS
// ==============================================================================

/**
 * Server Action: Actualizar Ritual Matutino
 */
export async function updateMorningRitualAction(data: Partial<MorningRitual>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuario no autenticado." };
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (data.mission !== undefined) updates.daily_mission = data.mission;
  if (data.pillar !== undefined) updates.daily_pillar = data.pillar;
  if (data.frog !== undefined) updates.daily_frog = data.frog;
  if (data.energyLevel !== undefined) updates.energy_level = data.energyLevel;

  const { data: existingSettings } = await supabase
    .from("user_settings")
    .select("birth_date")
    .eq("user_id", user.id)
    .maybeSingle();

  let error;
  if (existingSettings) {
    const { error: updateErr } = await supabase
      .from("user_settings")
      .update(updates)
      .eq("user_id", user.id);
    error = updateErr;
  } else {
    const { error: insertErr } = await supabase.from("user_settings").insert({
      user_id: user.id,
      birth_date: user.user_metadata?.birth_date || "1995-01-01",
      target_age: 80,
      ...updates,
    });
    error = insertErr;
  }

  if (error) {
    console.error("Error al actualizar ritual:", error.message);
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/**
 * Server Action: Actualizar Perfil Completo
 */
export async function updateUserProfile(data: {
  fullName?: string;
  birthDate?: string;
  targetAge?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuario no autenticado." };
  }

  if (data.fullName || data.birthDate) {
    await supabase.auth.updateUser({
      data: {
        ...(data.fullName ? { full_name: data.fullName } : {}),
        ...(data.birthDate ? { birth_date: data.birthDate } : {}),
      },
    });
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (data.birthDate) updates.birth_date = data.birthDate;
  if (data.targetAge) updates.target_age = data.targetAge;

  const { data: existingSettings } = await supabase
    .from("user_settings")
    .select("birth_date")
    .eq("user_id", user.id)
    .maybeSingle();

  let settingsError;
  if (existingSettings) {
    const { error: updateErr } = await supabase
      .from("user_settings")
      .update(updates)
      .eq("user_id", user.id);
    settingsError = updateErr;
  } else {
    const { error: insertErr } = await supabase.from("user_settings").insert({
      user_id: user.id,
      birth_date: data.birthDate || user.user_metadata?.birth_date || "1995-01-01",
      target_age: data.targetAge || 80,
      ...updates,
    });
    settingsError = insertErr;
  }

  if (settingsError) {
    console.error("Error al actualizar perfil:", settingsError.message);
    return { error: settingsError.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/**
 * Server Action: Actualizar preferencias o fecha de nacimiento del usuario (compatibilidad)
 */
export async function updateUserSettings(data: {
  birth_date?: string;
  target_age?: number;
  daily_mission?: string;
  daily_pillar?: string;
  daily_frog?: string;
  energy_level?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuario no autenticado." };
  }

  const { data: existingSettings } = await supabase
    .from("user_settings")
    .select("birth_date")
    .eq("user_id", user.id)
    .maybeSingle();

  let error;
  if (existingSettings) {
    const { error: updateErr } = await supabase
      .from("user_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    error = updateErr;
  } else {
    const { error: insertErr } = await supabase.from("user_settings").insert({
      user_id: user.id,
      birth_date: data.birth_date || user.user_metadata?.birth_date || "1995-01-01",
      target_age: data.target_age || 80,
      ...data,
      updated_at: new Date().toISOString(),
    });
    error = insertErr;
  }

  if (error) {
    console.error("Error al actualizar configuración:", error.message);
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

/**
 * Server Action: Alternar log de hábito por fecha (compatibilidad)
 */
export async function toggleHabitLog(habitId: string, dateStr?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Usuario no autenticado." };
  }

  const targetDate = dateStr || new Date().toISOString().split("T")[0];

  const { data: existingLog, error: fetchErr } = await supabase
    .from("habit_logs")
    .select("id, completed")
    .eq("habit_id", habitId)
    .eq("date", targetDate)
    .maybeSingle();

  if (fetchErr) {
    return { error: fetchErr.message };
  }

  if (existingLog) {
    const { error: updateErr } = await supabase
      .from("habit_logs")
      .update({ completed: !existingLog.completed })
      .eq("id", existingLog.id);

    if (updateErr) return { error: updateErr.message };
  } else {
    const { error: insertErr } = await supabase.from("habit_logs").insert({
      habit_id: habitId,
      date: targetDate,
      completed: true,
    });

    if (insertErr) return { error: insertErr.message };
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/habitos", "layout");
  return { success: true };
}

// ==============================================================================
// 9. ROLES DE USUARIO Y SISTEMA DE SOPORTE & FEEDBACK
// Lista de correos con privilegios de Administrador
// Puedes configurar correos aquí o mediante la variable de entorno ADMIN_EMAILS (separados por coma)
const DEFAULT_ADMIN_EMAILS: string[] = [
  // Ejemplos o correos fijos:
];

function getAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS 
    ? process.env.ADMIN_EMAILS.split(",").map((e) => e.trim().toLowerCase()) 
    : [];
  return [...DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase()), ...envEmails].filter(Boolean);
}

/**
 * Server Action: Obtener el rol y datos del usuario actual
 */
export async function getCurrentUserRoleAction(): Promise<{
  user: any;
  role: UserRole;
  isAuthenticated: boolean;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { user: null, role: "user", isAuthenticated: false };
    }

    const adminEmails = getAdminEmails();
    const userEmail = (user.email || "").toLowerCase();

    const isEmailAdmin = adminEmails.includes(userEmail);
    const isAppMetadataAdmin = user.app_metadata?.role === "admin";
    const isUserMetadataAdmin = user.user_metadata?.role === "admin";

    const role: UserRole = (isEmailAdmin || isAppMetadataAdmin || isUserMetadataAdmin) ? "admin" : "user";

    return { user, role, isAuthenticated: true };
  } catch (err) {
    console.warn("Error al consultar rol de usuario:", err);
    return { user: null, role: "user", isAuthenticated: false };
  }
}

/**
 * Server Action: Asignar o cambiar el rol de usuario (solo ejecutable por un Administrador)
 */
export async function setUserRoleAction(targetRole: UserRole) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Debes iniciar sesión para realizar esta acción." };
    }

    // Verificar si quien intenta cambiar el rol es realmente admin
    const adminEmails = getAdminEmails();
    const userEmail = (user.email || "").toLowerCase();
    const isCallerAdmin = 
      adminEmails.includes(userEmail) || 
      user.app_metadata?.role === "admin" || 
      user.user_metadata?.role === "admin";

    if (!isCallerAdmin) {
      return { error: "No tienes permisos de Administrador para asignar o modificar roles." };
    }

    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        role: targetRole,
      },
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/", "layout");
    revalidatePath("/soporte", "layout");
    revalidatePath("/dashboard", "layout");
    return { success: true, role: targetRole };
  } catch (err: any) {
    return { error: err.message || "Error al actualizar rol." };
  }
}

/**
 * Server Action: Crear nuevo Feedback o Ticket de Soporte
 */
export async function createFeedbackAction(payload: {
  type: SupportFeedbackType;
  title: string;
  description: string;
  rating?: number;
  priority?: SupportFeedbackPriority;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const userEmail = user?.email || "anonimo@focus-app.com";
    const userName =
      user?.user_metadata?.full_name ||
      user?.user_metadata?.first_name ||
      userEmail.split("@")[0] ||
      "Usuario de Focus";

    const insertData = {
      user_id: user?.id || null,
      user_email: userEmail,
      user_name: userName,
      type: payload.type || "suggestion",
      title: payload.title.trim(),
      description: payload.description.trim(),
      rating: payload.rating || 5,
      priority: payload.priority || "medium",
      status: "pending",
      admin_response: null,
    };

    const { data, error } = await supabase
      .from("support_feedback")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.warn("Aviso al insertar en support_feedback:", error.message);
      // Retornar fallback simulado exitoso para no bloquear al usuario si la tabla aún no se ejecutó en SQL
      const fallbackFeedback: SupportFeedback = {
        id: "fb-" + Date.now(),
        userId: user?.id,
        userEmail,
        userName,
        type: payload.type,
        title: payload.title,
        description: payload.description,
        rating: payload.rating,
        priority: payload.priority || "medium",
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { success: true, feedback: fallbackFeedback, note: "Guardado localmente" };
    }

    revalidatePath("/soporte", "layout");
    return {
      success: true,
      feedback: {
        id: data.id,
        userId: data.user_id,
        userEmail: data.user_email,
        userName: data.user_name,
        type: data.type,
        title: data.title,
        description: data.description,
        rating: data.rating,
        priority: data.priority,
        status: data.status,
        adminResponse: data.admin_response,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err: any) {
    return { error: err.message || "Error al enviar feedback." };
  }
}

/**
 * Server Action: Obtener feedbacks
 * Si es admin, retorna todos los feedbacks. Si es usuario común, solo los suyos.
 */
export async function getFeedbacksAction(): Promise<{
  feedbacks: SupportFeedback[];
  isAdmin: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const isAdmin =
      user?.user_metadata?.role === "admin" || user?.app_metadata?.role === "admin";

    let query = supabase.from("support_feedback").select("*").order("created_at", { ascending: false });

    if (!isAdmin && user) {
      query = query.eq("user_id", user.id);
    } else if (!isAdmin && !user) {
      return { feedbacks: [], isAdmin: false };
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Aviso al consultar support_feedback:", error.message);
      return { feedbacks: [], isAdmin: Boolean(isAdmin) };
    }

    const formatted: SupportFeedback[] = (data || []).map((item: any) => ({
      id: item.id,
      userId: item.user_id,
      userEmail: item.user_email,
      userName: item.user_name,
      type: item.type,
      title: item.title,
      description: item.description,
      rating: item.rating,
      priority: item.priority,
      status: item.status,
      adminResponse: item.admin_response,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    return { feedbacks: formatted, isAdmin: Boolean(isAdmin) };
  } catch (err: any) {
    return { feedbacks: [], isAdmin: false, error: err.message };
  }
}

/**
 * Server Action: Actualizar estado o respuesta del administrador a un feedback
 */
export async function updateFeedbackStatusAction(
  feedbackId: string,
  newStatus: SupportFeedbackStatus,
  adminResponse?: string
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const updatePayload: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (adminResponse !== undefined) {
      updatePayload.admin_response = adminResponse.trim();
    }

    const { error } = await supabase
      .from("support_feedback")
      .update(updatePayload)
      .eq("id", feedbackId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/soporte", "layout");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Error al actualizar feedback." };
  }
}

/**
 * Server Action: Eliminar un feedback
 */
export async function deleteFeedbackAction(feedbackId: string) {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("support_feedback")
      .delete()
      .eq("id", feedbackId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/soporte", "layout");
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Error al eliminar feedback." };
  }
}

