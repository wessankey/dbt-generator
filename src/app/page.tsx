"use client";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { KeyboardEvent, useEffect, useMemo, useState } from "react";

const materializationOptions = [
  "ephemeral",
  "table",
  "view",
  "materialized view",
  "incremental",
] as const;

export default function Home() {
  const { data: session, isPending: isSessionPending } = authClient.useSession();
  const [isEnabled, setIsEnabled] = useState(true);
  const [sql, setSql] = useState("select *\nfrom {{ ref('source_model') }}");
  const [generatedPath, setGeneratedPath] = useState("models/generated/new_model.sql");
  const [prTitle, setPrTitle] = useState("Generate dbt model updates");
  const [prBody, setPrBody] = useState("Automated changes created by dbt-generator.");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(["core", "finance"]);
  const [materialization, setMaterialization] =
    useState<(typeof materializationOptions)[number]>("view");
  const [installations, setInstallations] = useState<
    Array<{
      installationId: string;
      accountLogin: string | null;
      accountType: string | null;
      repositories: Array<{
        id: string;
        fullName: string;
        defaultBranch: string;
        connected: boolean;
      }>;
      error?: string;
    }>
  >([]);
  const [connections, setConnections] = useState<
    Array<{
      id: string;
      repositoryFullName: string;
      defaultBranch: string;
    }>
  >([]);
  const [activeConnectionId, setActiveConnectionId] = useState("");
  const [repoFiles, setRepoFiles] = useState<Array<{ path: string; size: number }>>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const isAuthed = Boolean(session?.user);
  const activeConnection = useMemo(
    () => connections.find((connection) => connection.id === activeConnectionId),
    [activeConnectionId, connections],
  );

  useEffect(() => {
    if (!isAuthed) return;

    void refreshGitHubState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  function addTag() {
    const nextTag = tagInput.trim();
    if (!nextTag) {
      return;
    }

    const alreadyAdded = tags.some(
      (existingTag) => existingTag.toLowerCase() === nextTag.toLowerCase(),
    );
    if (!alreadyAdded) {
      setTags((currentTags) => [...currentTags, nextTag]);
    }
    setTagInput("");
  }

  function handleTagInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag();
    }
  }

  function removeTag(tagToRemove: string) {
    setTags((currentTags) => currentTags.filter((tag) => tag !== tagToRemove));
  }

  async function refreshGitHubState() {
    if (!isAuthed) {
      return;
    }

    setErrorMessage("");
    try {
      const [installationsResponse, connectionsResponse] = await Promise.all([
        fetch("/api/github/installations"),
        fetch("/api/github/connections"),
      ]);

      if (!installationsResponse.ok || !connectionsResponse.ok) {
        throw new Error("Failed to refresh GitHub state");
      }

      const installationBody = (await installationsResponse.json()) as {
        installations: Array<{
          installationId: string;
          accountLogin: string | null;
          accountType: string | null;
          repositories: Array<{
            id: string;
            fullName: string;
            defaultBranch: string;
            connected: boolean;
          }>;
          error?: string;
        }>;
      };
      const connectionBody = (await connectionsResponse.json()) as {
        connections: Array<{
          id: string;
          repositoryFullName: string;
          defaultBranch: string;
        }>;
      };

      setInstallations(installationBody.installations);
      setConnections(connectionBody.connections);
      if (connectionBody.connections.length > 0 && !activeConnectionId) {
        setActiveConnectionId(connectionBody.connections[0]?.id ?? "");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    }
  }

  async function signInWithGitHub() {
    setErrorMessage("");
    await authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    });
  }

  async function signOut() {
    setErrorMessage("");
    setStatusMessage("");
    await authClient.signOut();
    setInstallations([]);
    setConnections([]);
    setActiveConnectionId("");
    setRepoFiles([]);
  }

  async function installGitHubApp() {
    setIsBusy(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/github/install-url");
      if (!response.ok) {
        throw new Error("Could not generate installation URL");
      }
      const body = (await response.json()) as { url: string };
      window.location.href = body.url;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
      setIsBusy(false);
    }
  }

  async function connectRepository(installationId: string, repositoryId: string) {
    setIsBusy(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const response = await fetch("/api/github/connect", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          installationId,
          repositoryId,
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as { error?: string };
        throw new Error(errorBody.error ?? "Could not connect repository");
      }

      setStatusMessage("Repository connected.");
      await refreshGitHubState();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsBusy(false);
    }
  }

  async function readDbtFiles() {
    if (!activeConnectionId) {
      return;
    }
    setIsBusy(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const response = await fetch(`/api/github/repo-files?connectionId=${activeConnectionId}`);
      const body = (await response.json()) as {
        files?: Array<{ path: string; size: number }>;
        error?: string;
      };

      if (!response.ok || !body.files) {
        throw new Error(body.error ?? "Could not read repository files");
      }

      setRepoFiles(body.files);
      setStatusMessage(`Loaded ${body.files.length} dbt files from default branch.`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsBusy(false);
    }
  }

  async function createDraftPr() {
    if (!activeConnectionId) {
      return;
    }
    setIsBusy(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      const response = await fetch("/api/github/create-pr", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          connectionId: activeConnectionId,
          title: prTitle,
          body: prBody,
          changes: [
            {
              path: generatedPath,
              content: sql,
            },
          ],
        }),
      });

      const body = (await response.json()) as {
        pullRequest?: { url: string };
        error?: string;
      };

      if (!response.ok || !body.pullRequest) {
        throw new Error(body.error ?? "Could not create draft PR");
      }

      setStatusMessage(`Draft PR created: ${body.pullRequest.url}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_top,_rgba(15,23,42,0.12),_transparent_60%)] dark:bg-[radial-gradient(1200px_circle_at_top,_rgba(148,163,184,0.18),_transparent_60%)]" />
      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:px-10">
        <div className="space-y-3">
          <span className="inline-flex w-fit items-center rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
            New dbt model
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Create model configuration
          </h1>
          <p className="max-w-3xl text-muted-foreground">
            Draft your model SQL and configure key model properties before generating
            scaffold files.
          </p>
        </div>

        <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm backdrop-blur sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-medium">GitHub integration</h2>
            {isSessionPending ? (
              <span className="text-sm text-muted-foreground">Checking session...</span>
            ) : isAuthed ? (
              <span className="text-sm text-muted-foreground">
                Signed in as {session?.user.email ?? "GitHub user"}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Sign in required</span>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {isAuthed ? (
              <>
                <Button type="button" onClick={signOut}>
                  Sign out
                </Button>
                <Button type="button" variant="outline" onClick={installGitHubApp} disabled={isBusy}>
                  Install GitHub App
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void refreshGitHubState()}
                  disabled={isBusy}
                >
                  Refresh installations
                </Button>
              </>
            ) : (
              <Button type="button" onClick={signInWithGitHub}>
                Login with GitHub
              </Button>
            )}
          </div>

          {isAuthed ? (
            <div className="mt-4 space-y-3">
              {installations.map((installation) => (
                <div key={installation.installationId} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-medium">
                    Installation {installation.installationId}
                    {installation.accountLogin ? ` - ${installation.accountLogin}` : ""}
                  </p>
                  {installation.error ? (
                    <p className="mt-2 text-sm text-destructive">{installation.error}</p>
                  ) : installation.repositories.length > 0 ? (
                    <div className="mt-2 space-y-2">
                      {installation.repositories.map((repo) => (
                        <div
                          key={repo.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2"
                        >
                          <span className="text-sm">{repo.fullName}</span>
                          {repo.connected ? (
                            <span className="text-xs font-medium text-muted-foreground">Connected</span>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() =>
                                void connectRepository(installation.installationId, repo.id)
                              }
                            >
                              Connect
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No repositories granted.</p>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {statusMessage ? <p className="mt-4 text-sm text-emerald-600">{statusMessage}</p> : null}
          {errorMessage ? <p className="mt-2 text-sm text-destructive">{errorMessage}</p> : null}
        </section>

        <form className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <section className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm backdrop-blur sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-medium text-foreground">Model SQL</h2>
                <p className="text-sm text-muted-foreground">
                  Basic editor placeholder for now.
                </p>
              </div>
              <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                SQL
              </span>
            </div>
            <textarea
              value={sql}
              onChange={(event) => setSql(event.target.value)}
              spellCheck={false}
              className="min-h-[360px] w-full resize-y rounded-xl border border-input bg-background/90 px-4 py-3 font-mono text-sm leading-relaxed shadow-sm outline-none ring-0 transition-colors placeholder:text-muted-foreground/70 focus:border-ring"
              placeholder="select * from {{ ref('my_source_model') }}"
            />
          </section>

          <section className="flex flex-col gap-5">
            <div className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm backdrop-blur sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-foreground">Connected repository</h2>
                <p className="text-sm text-muted-foreground">
                  Select a connected repo to read dbt files and create a draft PR.
                </p>
              </div>
              {connections.length > 0 ? (
                <>
                  <select
                    value={activeConnectionId}
                    onChange={(event) => setActiveConnectionId(event.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring"
                  >
                    {connections.map((connection) => (
                      <option key={connection.id} value={connection.id}>
                        {connection.repositoryFullName} ({connection.defaultBranch})
                      </option>
                    ))}
                  </select>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" disabled={isBusy} onClick={readDbtFiles}>
                      Read dbt files
                    </Button>
                  </div>
                  <div className="mt-3 max-h-40 overflow-auto rounded-lg border border-border/60 p-2">
                    {repoFiles.length > 0 ? (
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {repoFiles.map((file) => (
                          <li key={file.path}>
                            {file.path} ({file.size} bytes)
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">No files loaded yet.</p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No connected repositories yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm backdrop-blur sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-foreground">Draft PR</h2>
                <p className="text-sm text-muted-foreground">
                  Creates a fresh branch from the default branch and opens a draft PR.
                </p>
              </div>
              <div className="space-y-2">
                <input
                  value={generatedPath}
                  onChange={(event) => setGeneratedPath(event.target.value)}
                  placeholder="models/generated/new_model.sql"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring"
                />
                <input
                  value={prTitle}
                  onChange={(event) => setPrTitle(event.target.value)}
                  placeholder="PR title"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-ring"
                />
                <textarea
                  value={prBody}
                  onChange={(event) => setPrBody(event.target.value)}
                  placeholder="PR body"
                  className="min-h-20 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring"
                />
                <Button
                  type="button"
                  disabled={!activeConnection || isBusy}
                  onClick={createDraftPr}
                >
                  Create draft PR
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm backdrop-blur sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-foreground">Enabled</h2>
                <p className="text-sm text-muted-foreground">
                  Control whether this model should run.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isEnabled}
                onClick={() => setIsEnabled((currentState) => !currentState)}
                className="inline-flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium transition hover:bg-accent/40"
              >
                <span>{isEnabled ? "Enabled" : "Disabled"}</span>
                <span
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isEnabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`h-5 w-5 rounded-full bg-background shadow transition-transform ${
                      isEnabled ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </span>
              </button>
            </div>

            <div className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm backdrop-blur sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg font-medium text-foreground">Tags</h2>
                <p className="text-sm text-muted-foreground">
                  Add one or more tags to categorize this model.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={handleTagInputKeyDown}
                  placeholder="e.g. marketing"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-ring"
                />
                <Button type="button" onClick={addTag} className="h-10 shrink-0 px-4">
                  Add
                </Button>
              </div>
              <div className="mt-3 flex min-h-10 flex-wrap gap-2">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => removeTag(tag)}
                      className="inline-flex items-center rounded-full border border-border/70 bg-background px-3 py-1 text-sm text-foreground transition hover:bg-accent/50"
                    >
                      {tag}
                      <span className="ml-2 text-muted-foreground">&times;</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No tags yet.</p>
                )}
              </div>
            </div>

            <fieldset className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm backdrop-blur sm:p-6">
              <legend className="text-lg font-medium text-foreground">Materialization</legend>
              <p className="mb-4 text-sm text-muted-foreground">
                Choose how this model should be materialized in dbt.
              </p>
              <div className="space-y-2">
                {materializationOptions.map((option) => (
                  <label
                    key={option}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-sm transition hover:bg-accent/40"
                  >
                    <input
                      type="radio"
                      name="materialization"
                      value={option}
                      checked={materialization === option}
                      onChange={() => setMaterialization(option)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="capitalize">{option}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>
        </form>
      </main>
    </div>
  );
}
