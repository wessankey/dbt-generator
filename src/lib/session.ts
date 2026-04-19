import { auth } from "@/lib/auth";

export type AppSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function requireSession(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return null;
  }

  return session;
}
