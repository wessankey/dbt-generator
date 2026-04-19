import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInstallationMetadata } from "@/lib/github-app";
import { requireSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const url = new URL(request.url);
  const installationIdParam = url.searchParams.get("installation_id");
  const setupAction = url.searchParams.get("setup_action");

  if (!installationIdParam || setupAction !== "install") {
    return NextResponse.redirect(new URL("/?install=failed", request.url));
  }

  const installationId = Number(installationIdParam);
  if (!Number.isInteger(installationId)) {
    return NextResponse.redirect(new URL("/?install=failed", request.url));
  }

  try {
    const metadata = await getInstallationMetadata(installationId);
    await prisma.githubInstallation.upsert({
      where: {
        userId_installationId: {
          userId: session.user.id,
          installationId: BigInt(installationId),
        },
      },
      create: {
        userId: session.user.id,
        installationId: BigInt(installationId),
        accountLogin: metadata.accountLogin,
        accountType: metadata.accountType,
      },
      update: {
        accountLogin: metadata.accountLogin,
        accountType: metadata.accountType,
      },
    });

    return NextResponse.redirect(new URL("/?install=success", request.url));
  } catch {
    return NextResponse.redirect(new URL("/?install=failed", request.url));
  }
}
