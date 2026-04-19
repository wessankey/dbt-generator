import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

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
    })),
  });
}
