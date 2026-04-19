import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listInstallationRepositories } from "@/lib/github-app";
import { requireSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const installations = await prisma.githubInstallation.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const existingConnections = await prisma.repoConnection.findMany({
    where: { userId: session.user.id },
    select: { repositoryId: true },
  });
  const connectedRepoIds = new Set(
    existingConnections.map((repo) => repo.repositoryId.toString()),
  );

  const enriched = await Promise.all(
    installations.map(async (installation) => {
      try {
        const repositories = await listInstallationRepositories(
          Number(installation.installationId),
        );
        return {
          installationId: installation.installationId.toString(),
          accountLogin: installation.accountLogin,
          accountType: installation.accountType,
          repositories: repositories.map((repo) => ({
            id: repo.id.toString(),
            name: repo.name,
            fullName: repo.full_name,
            defaultBranch: repo.default_branch,
            connected: connectedRepoIds.has(repo.id.toString()),
          })),
        };
      } catch {
        return {
          installationId: installation.installationId.toString(),
          accountLogin: installation.accountLogin,
          accountType: installation.accountType,
          repositories: [],
          error: "Unable to list repositories for this installation",
        };
      }
    }),
  );

  return NextResponse.json({ installations: enriched });
}
