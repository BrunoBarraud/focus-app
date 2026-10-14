import "server-only";
import { cache } from "react";
import { unstable_rethrow } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import type { Viewer } from "./types";

/**
 * Sesión del request actual (deduplicada con React.cache: aunque layout, página
 * y componentes la pidan, se valida contra Supabase una sola vez por request).
 */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

/**
 * Única fuente de verdad del rol: app_metadata, que solo se puede escribir con
 * la service role. user_metadata la edita el propio usuario desde el navegador.
 */
export function isAdminUser(user: User | null): boolean {
  return user?.app_metadata?.role === "admin";
}

export function toViewer(user: User): Viewer {
  const meta = user.user_metadata ?? {};
  const email = user.email ?? "";
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) || email.split("@")[0] || "Usuario";
  const firstName =
    (typeof meta.first_name === "string" && meta.first_name.trim()) || fullName.split(" ")[0];
  return {
    id: user.id,
    email,
    fullName,
    firstName,
    role: isAdminUser(user) ? "admin" : "user",
  };
}

export async function getViewer(): Promise<Viewer | null> {
  try {
    const { user } = await getSession();
    return user ? toViewer(user) : null;
  } catch (err) {
    // Los errores internos de Next (render dinámico, redirect) no se tragan.
    unstable_rethrow(err);
    console.error("No se pudo obtener la sesión:", err);
    return null;
  }
}
