import Anthropic from "@anthropic-ai/sdk";

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim() && process.env.LLM_MODEL?.trim());
}
export function modelFor(task: "extraction" | "fast"): string {
  const model =
    task === "fast"
      ? process.env.LLM_MODEL_FAST?.trim() || process.env.LLM_MODEL?.trim()
      : process.env.LLM_MODEL?.trim();
  if (!model) throw new Error("Model is not configured.");
  return model;
}
export function anthropicClient() {
  if (!aiConfigured()) throw new Error("Anthropic is not configured.");
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0, timeout: 30_000 });
}
/** Common tool plumbing. Callers still validate returned shapes and grounded facts. */
export async function callAnthropicTool(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
  name: string,
): Promise<unknown> {
  const response = await client.messages.create(params);
  const tool = response.content.find((block) => block.type === "tool_use" && block.name === name);
  if (!tool || tool.type !== "tool_use")
    throw new Error("Missing requested structured tool output.");
  return tool.input;
}
/** Strict mode is supported by current Claude models; opt out for older unsupported models. */
export function strictTools(): boolean {
  return process.env.LLM_STRICT_TOOLS !== "false";
}
