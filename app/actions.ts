"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Server Action: Iniciar Sesión con Correo y Contraseña
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
  redirect("/");
}

/**
 * Server Action: Registrarse con Correo, Contraseña, Nombre y Fecha de Nacimiento
 */
export async function signupAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string) || "Usuario";
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
        birth_date: birthDate,
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  // Aseguramos la creación de su perfil en user_settings si no lo hizo el trigger
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

    // Creamos hábitos semilla para su nuevo usuario
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
  redirect("/");
}

/**
 * Server Action: Cerrar Sesión
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Server Action: Marcar o alternar el estado de un hábito para una fecha dada en habit_logs
 */
export async function toggleHabitLog(habitId: string, dateStr?: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Usuario no autenticado");
  }

  const targetDate = dateStr || new Date().toISOString().split("T")[0];

  // 1. Verificar si ya existe un registro para ese hábito y esa fecha
  const { data: existingLog, error: fetchError } = await supabase
    .from("habit_logs")
    .select("id, completed")
    .eq("habit_id", habitId)
    .eq("date", targetDate)
    .maybeSingle();

  if (fetchError) {
    console.error("Error consultando habit_logs:", fetchError.message);
    throw new Error("No se pudo consultar el registro del hábito");
  }

  if (existingLog) {
    // Si ya existe, alternamos el estado
    const nextState = !existingLog.completed;
    const { error: updateError } = await supabase
      .from("habit_logs")
      .update({ completed: nextState })
      .eq("id", existingLog.id);

    if (updateError) {
      console.error("Error actualizando habit_log:", updateError.message);
      throw new Error("Error al actualizar el hábito");
    }
  } else {
    // Si no existe, insertamos como completado
    const { error: insertError } = await supabase.from("habit_logs").insert({
      habit_id: habitId,
      date: targetDate,
      completed: true,
    });

    if (insertError) {
      console.error("Error insertando habit_log:", insertError.message);
      throw new Error("Error al registrar el hábito en Supabase");
    }
  }

  revalidatePath("/");
  revalidatePath("/habitos");

  return { success: true };
}

/**
 * Server Action: Actualizar preferencias o fecha de nacimiento del usuario
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
    throw new Error("Usuario no autenticado");
  }

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    ...data,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Error al actualizar configuración: ${error.message}`);
  }

  revalidatePath("/");
  return { success: true };
}
