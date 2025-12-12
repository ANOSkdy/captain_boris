import "server-only";

export function isAirtableConfigured(): boolean {
  return Boolean(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID);
}

export function airtableConfigHint(): string {
  const missing: string[] = [];
  if (!process.env.AIRTABLE_API_KEY) missing.push("AIRTABLE_API_KEY");
  if (!process.env.AIRTABLE_BASE_ID) missing.push("AIRTABLE_BASE_ID");
  return missing.length ? `Missing env: ${missing.join(", ")}` : "Airtable env OK";
}