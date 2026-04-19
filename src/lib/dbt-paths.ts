const DBT_PREFIX_ALLOWLIST = [
  "models/",
  "macros/",
  "seeds/",
  "snapshots/",
  "analyses/",
  "tests/",
];

const DBT_FILE_ALLOWLIST = new Set([
  "dbt_project.yml",
  "packages.yml",
  "dependencies.yml",
]);

export function normalizeRepoPath(path: string) {
  return path.replace(/^\/+/, "").trim();
}

export function isAllowedDbtPath(path: string) {
  const normalized = normalizeRepoPath(path);
  if (!normalized) {
    return false;
  }

  if (DBT_FILE_ALLOWLIST.has(normalized)) {
    return true;
  }

  return DBT_PREFIX_ALLOWLIST.some((prefix) => normalized.startsWith(prefix));
}
