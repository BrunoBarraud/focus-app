import { LoginForm } from "@/components/auth/LoginForm";
import { safeRedirectPath } from "@/lib/redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; modo?: string | string[] }>;
}) {
  const { next, modo } = await searchParams;
  const target = typeof next === "string" ? safeRedirectPath(next) : undefined;
  // /login?modo=registro abre directamente la pestaña de crear cuenta.
  return <LoginForm next={target} mode={modo === "registro" ? "signup" : "login"} />;
}
