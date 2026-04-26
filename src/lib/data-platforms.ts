export const dataPlatforms = [
  "redshift",
  "bigquery",
  "databricks",
  "snowflake",
  "postgresql",
] as const;

export type DataPlatform = (typeof dataPlatforms)[number];

export const dataPlatformLabels: Record<DataPlatform, string> = {
  redshift: "Redshift",
  bigquery: "BigQuery",
  databricks: "Databricks",
  snowflake: "Snowflake",
  postgresql: "PostgreSQL",
};

export function isDataPlatform(value: unknown): value is DataPlatform {
  return (
    typeof value === "string" &&
    (dataPlatforms as readonly string[]).includes(value)
  );
}
