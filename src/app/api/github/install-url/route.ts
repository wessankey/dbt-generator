import { NextResponse } from "next/server";
import { getGitHubInstallUrl } from "@/lib/github-app";
import { requireSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ url: getGitHubInstallUrl() });
}
