import { LoginForm } from "@/components/auth/LoginForm";
import { safeRedirectPath } from "@/lib/redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  const target = typeof next === "string" ? safeRedirectPath(next) : undefined;
  return <LoginForm next={target} />;
}
