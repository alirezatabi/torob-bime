/** Only fixed, non-sensitive messages and allowlisted error metadata reach logs.
 * Never forward provider/DB messages: they may contain URLs, keys, source text or user input. */
export function logFailure(
  area: "catalogue" | "intent" | "explanation" | "extraction" | "route",
  error: unknown,
): void {
  const item =
    error && typeof error === "object" ? (error as { name?: unknown; code?: unknown }) : {};
  const rawName = typeof item.name === "string" ? item.name : "Error";
  const name = /^[A-Za-z][A-Za-z0-9]{0,80}$/.test(rawName) ? rawName : "Error";
  const rawCode = typeof item.code === "string" ? item.code : "";
  const code = /^(P\d{4}|E[A-Z_]{2,30})$/.test(rawCode) ? rawCode : undefined;
  const message: Record<typeof area, string> = {
    catalogue: "Catalogue database lookup failed.",
    intent: "Intent model request failed; using rules.",
    explanation: "Explanation model request failed; using rules.",
    extraction: "Extraction provider request failed.",
    route: "Request processing failed.",
  };
  console.error(JSON.stringify({ area, name, ...(code ? { code } : {}), message: message[area] }));
}
