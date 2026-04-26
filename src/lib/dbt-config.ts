type DbtConfigInput = {
  materialization: string;
  isEnabled: boolean;
  tags: string[];
  uniqueKey: string;
  database: string;
  schema: string;
  alias: string;
};

function quote(value: string): string {
  return `'${value.replace(/'/g, "\\'")}'`;
}

export function buildDbtConfigBlock({
  materialization,
  isEnabled,
  tags,
  uniqueKey,
  database,
  schema,
  alias,
}: DbtConfigInput): string {
  const tagsLiteral =
    tags.length === 0 ? "[]" : `[${tags.map(quote).join(", ")}]`;

  const entries: string[] = [
    `materialized=${quote(materialization)}`,
    `enabled=${isEnabled ? "true" : "false"}`,
    `tags=${tagsLiteral}`,
  ];

  const trimmedUniqueKey = uniqueKey.trim();
  if (trimmedUniqueKey) {
    entries.push(`unique_key=${quote(trimmedUniqueKey)}`);
  }

  const trimmedDatabase = database.trim();
  if (trimmedDatabase) {
    entries.push(`database=${quote(trimmedDatabase)}`);
  }

  const trimmedSchema = schema.trim();
  if (trimmedSchema) {
    entries.push(`schema=${quote(trimmedSchema)}`);
  }

  const trimmedAlias = alias.trim();
  if (trimmedAlias) {
    entries.push(`alias=${quote(trimmedAlias)}`);
  }

  return [
    "{{ config(",
    ...entries.map(
      (entry, index) => `    ${entry}${index < entries.length - 1 ? "," : ""}`,
    ),
    ") }}",
  ].join("\n");
}

const LEADING_CONFIG_BLOCK = /^\s*\{\{\s*config\s*\([\s\S]*?\)\s*\}\}\s*\n*/;

export function replaceLeadingDbtConfigBlock(sql: string, block: string): string {
  const body = sql.replace(LEADING_CONFIG_BLOCK, "");
  return `${block}\n\n${body}`;
}
