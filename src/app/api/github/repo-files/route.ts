import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getInstallationOctokit } from "@/lib/github-app";
import { isAllowedDbtPath } from "@/lib/dbt-paths";
import { requireSession } from "@/lib/session";

function parseOwnerAndRepo(fullName: string) {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid repository full name");
  }
  return { owner, repo };
}

export async function GET(request: Request) {
  const session = await requireSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const connectionId = url.searchParams.get("connectionId");
  if (!connectionId) {
    return NextResponse.json({ error: "Missing connectionId" }, { status: 400 });
  }

  const connection = await prisma.repoConnection.findFirst({
    where: {
      id: connectionId,
      userId: session.user.id,
    },
  });

  if (!connection) {
    return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  }

  const { owner, repo } = parseOwnerAndRepo(connection.repositoryFullName);
  const octokit = getInstallationOctokit(Number(connection.installationId));

  const branchRef = await octokit.request("GET /repos/{owner}/{repo}/git/ref/{ref}", {
    owner,
    repo,
    ref: `heads/${connection.defaultBranch}`,
  });

  const tree = await octokit.request("GET /repos/{owner}/{repo}/git/trees/{tree_sha}", {
    owner,
    repo,
    tree_sha: branchRef.data.object.sha,
    recursive: "1",
  });

  const candidateFiles = tree.data.tree
    .filter((item) => item.type === "blob" && item.path && isAllowedDbtPath(item.path))
    .slice(0, 200);

  const files = await Promise.all(
    candidateFiles.map(async (item) => {
      const blob = await octokit.request("GET /repos/{owner}/{repo}/git/blobs/{file_sha}", {
        owner,
        repo,
        file_sha: item.sha ?? "",
      });

      const content =
        blob.data.encoding === "base64"
          ? Buffer.from(blob.data.content, "base64").toString("utf8")
          : blob.data.content;

      return {
        path: item.path,
        size: item.size ?? content.length,
        content,
      };
    }),
  );

  return NextResponse.json({
    repository: {
      fullName: connection.repositoryFullName,
      defaultBranch: connection.defaultBranch,
    },
    files,
  });
}
