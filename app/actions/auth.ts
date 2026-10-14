"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import { isIsoDate, isValidTimeZone } from "@/lib/dates";
import { safeRedirectPath } from "@/lib/redirect";

export type AuthFormState = { error?: string; notice?: string };

const credentials = z.object({
  email: z.email("Ingresá un email válido.").max(254),
  password: z.string().min(1, "Ingresá tu contraseña.").max(200),
});

function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = credentials.safeParse({
    email: field(formData, "email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      error:
        error.code === "invalid_credentials"
          ? "Email o contraseña incorrectos."
          : error.code === "email_not_confirmed"
            ? "Tenés que confirmar tu email antes de entrar. Revisá tu bandeja."
            : "No se pudo iniciar sesión. Probá de nuevo.",
    };
  }

  revalidatePath("/", "layout");
  redirect(safeRedirectPath(field(formData, "next")));
}

const signupSchema = credentials.extend({
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(200),
  firstName: z.string().trim().max(60),
  lastName: z.string().trim().max(60),
  birthDate: z.string().refine((v) => v === "" || isIsoDate(v), "Fecha de nacimiento inválida."),
  timezone: z.string(),
});

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    email: field(formData, "email"),
    password: formData.get("password"),
    firstName: field(formData, "firstName"),
    lastName: field(formData, "lastName"),
    birthDate: field(formData, "birthDate"),
    timezone: field(formData, "timezone"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const { email, password, firstName, lastName, birthDate, timezone } = parsed.data;
  const fullName = `${firstName} ${lastName}`.trim();

  // Los datos iniciales (settings, hábitos de ejemplo, calendario "General") los
  // crea el trigger handle_new_user con SECURITY DEFINER: así funciona aunque
  // la confirmación por email esté activada y todavía no haya sesión.
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || undefined,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        birth_date: birthDate || undefined,
        timezone: isValidTimeZone(timezone) ? timezone : undefined,
      },
    },
  });

  if (error) {
    return {
      error:
        error.code === "user_already_exists"
          ? "Ya existe una cuenta con ese email."
          : error.code === "weak_password"
            ? "La contraseña es muy débil."
            : "No se pudo crear la cuenta. Probá de nuevo.",
    };
  }

  if (!data.session) {
    return { notice: "Te enviamos un email para confirmar tu cuenta. Después podés iniciar sesión." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
