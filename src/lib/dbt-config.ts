type DbtConfigInput = {
  materialization: string;
  isEnabled: boolean;
  tags: string[];
};

function quote(value: string): string {
  return `'${value.replace(/'/g, "\\'")}'`;
}

export function buildDbtConfigBlock({
  materialization,
  isEnabled,
  tags,
}: DbtConfigInput): string {
  const tagsLiteral =
    tags.length === 0 ? "[]" : `[${tags.map(quote).join(", ")}]`;

  return [
    "{{ config(",
    `    materialized=${quote(materialization)},`,
    `    enabled=${isEnabled ? "true" : "false"},`,
    `    tags=${tagsLiteral}`,
    ") }}",
  ].join("\n");
}

const LEADING_CONFIG_BLOCK = /^\s*\{\{\s*config\s*\([\s\S]*?\)\s*\}\}\s*\n*/;

export function replaceLeadingDbtConfigBlock(sql: string, block: string): string {
  const body = sql.replace(LEADING_CONFIG_BLOCK, "");
  return `${block}\n\n${body}`;
}
