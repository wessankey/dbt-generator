import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { isDataPlatform } from "@/lib/data-platforms";

export async function GET(request: Request) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await prisma.repoConnection.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    connections: connections.map((connection) => ({
      id: connection.id,
      installationId: connection.installationId.toString(),
      repositoryId: connection.repositoryId.toString(),
      repositoryName: connection.repositoryName,
      repositoryFullName: connection.repositoryFullName,
      defaultBranch: connection.defaultBranch,
      dataPlatform: connection.dataPlatform,
    })),
  });
}

type PatchPayload = {
  connectionId?: string;
  dataPlatform?: string | null;
};

export async function PATCH(request: Request) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PatchPayload;
  try {
    payload = (await request.json()) as PatchPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { connectionId, dataPlatform } = payload;
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  if (dataPlatform !== null && !isDataPlatform(dataPlatform)) {
    return NextResponse.json({ error: "Invalid data platform" }, { status: 400 });
  }

  const existing = await prisma.repoConnection.findUnique({
    where: { id: connectionId },
  });
  if (!existing || existing.userId !== session.user.id) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const updated = await prisma.repoConnection.update({
    where: { id: connectionId },
    data: { dataPlatform: dataPlatform ?? null },
  });

  return NextResponse.json({
    connection: {
      id: updated.id,
      repositoryFullName: updated.repositoryFullName,
      defaultBranch: updated.defaultBranch,
      dataPlatform: updated.dataPlatform,
    },
  });
}
