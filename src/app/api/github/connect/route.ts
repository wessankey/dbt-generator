import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listInstallationRepositories } from "@/lib/github-app";
import { requireSession } from "@/lib/session";

type ConnectPayload = {
  installationId: string;
  repositoryId: string;
};

export async function POST(request: Request) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: ConnectPayload;
  try {
    payload = (await request.json()) as ConnectPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const installationIdNumber = Number(payload.installationId);
  const repositoryIdNumber = Number(payload.repositoryId);

  if (!Number.isInteger(installationIdNumber) || !Number.isInteger(repositoryIdNumber)) {
    return NextResponse.json({ error: "Invalid installation or repository id" }, { status: 400 });
  }

  const installation = await prisma.githubInstallation.findUnique({
    where: {
      userId_installationId: {
        userId: session.user.id,
        installationId: BigInt(installationIdNumber),
      },
    },
  });

  if (!installation) {
    return NextResponse.json({ error: "Installation not found" }, { status: 404 });
  }

  const repositories = await listInstallationRepositories(installationIdNumber);
  const repository = repositories.find((repo) => repo.id === repositoryIdNumber);
  if (!repository) {
    return NextResponse.json({ error: "Repository not granted to this installation" }, { status: 403 });
  }

  const connection = await prisma.repoConnection.upsert({
    where: {
      userId_repositoryId: {
        userId: session.user.id,
        repositoryId: BigInt(repository.id),
      },
    },
    create: {
      userId: session.user.id,
      installationId: BigInt(installationIdNumber),
      repositoryId: BigInt(repository.id),
      repositoryName: repository.name,
      repositoryFullName: repository.full_name,
      defaultBranch: repository.default_branch,
    },
    update: {
      installationId: BigInt(installationIdNumber),
      repositoryName: repository.name,
      repositoryFullName: repository.full_name,
      defaultBranch: repository.default_branch,
    },
  });

  return NextResponse.json({
    connection: {
      id: connection.id,
      repositoryId: connection.repositoryId.toString(),
      repositoryName: connection.repositoryName,
      repositoryFullName: connection.repositoryFullName,
      defaultBranch: connection.defaultBranch,
      installationId: connection.installationId.toString(),
    },
  });
}
