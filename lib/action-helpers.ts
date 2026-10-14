import "server-only";
import type { z } from "zod";
import { getSession } from "./auth";
import type { ActionResult } from "./types";
import { firstIssue } from "./validation";

// Helpers de las server actions. Viven fuera de los archivos "use server"
// porque todo lo que exporta un archivo "use server" se vuelve un endpoint.

export function ok(): ActionResult<null>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | null> {
  return { ok: true, data: data ?? null };
}

export function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

export const SESSION_EXPIRED = fail("Tu sesión expiró. Volvé a iniciar sesión.");

/** Loguea el detalle técnico y devuelve un mensaje apto para el usuario. */
export function dbFail(action: string, error: { message: string; code?: string }) {
  console.error(`[action] Error al ${action}:`, error.code ?? "", error.message);
  return fail(`No se pudo ${action}. Probá de nuevo en unos segundos.`);
}

/** Sesión obligatoria para cualquier mutación. */
export async function requireUser() {
  const { supabase, user } = await getSession();
  return user ? { supabase, user } : null;
}

export function parse<S extends z.ZodType>(
  schema: S,
  input: unknown
): { ok: true; data: z.output<S> } | { ok: false; error: string } {
  const result = schema.safeParse(input);
  return result.success ? { ok: true, data: result.data } : fail(firstIssue(result.error));
}
