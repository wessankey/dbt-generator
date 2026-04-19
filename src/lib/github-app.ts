import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

export type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  default_branch: string;
};

function getPrivateKey() {
  const key = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!key) {
    throw new Error("Missing GITHUB_APP_PRIVATE_KEY");
  }

  return key.replaceAll("\\n", "\n");
}

function getAppId() {
  const appId = process.env.GITHUB_APP_ID;
  if (!appId) {
    throw new Error("Missing GITHUB_APP_ID");
  }
  return appId;
}

export function getGitHubInstallUrl() {
  const slug = process.env.GITHUB_APP_SLUG;
  if (!slug) {
    throw new Error("Missing GITHUB_APP_SLUG");
  }

  return `https://github.com/apps/${slug}/installations/new`;
}

export function getAppOctokit() {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: getAppId(),
      privateKey: getPrivateKey(),
    },
  });
}

export function getInstallationOctokit(installationId: number) {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: getAppId(),
      privateKey: getPrivateKey(),
      installationId,
    },
  });
}

export async function listInstallationRepositories(installationId: number) {
  const octokit = getInstallationOctokit(installationId);
  const { data } = await octokit.request("GET /installation/repositories", {
    per_page: 100,
  });
  return data.repositories as GitHubRepository[];
}

export async function getInstallationMetadata(installationId: number) {
  const octokit = getAppOctokit();
  const { data } = await octokit.request("GET /app/installations/{installation_id}", {
    installation_id: installationId,
  });

  const accountLogin =
    data.account && "login" in data.account
      ? data.account.login
      : data.account && "slug" in data.account
        ? data.account.slug
        : null;
  const accountType = data.account && "type" in data.account ? data.account.type : "Organization";

  return {
    accountLogin,
    accountType,
  };
}
