import { type Context } from "hono";

export async function readInputBody(c: Context) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return "";
  }

  return isInputBody(body) ? body.input : "";
}

export function isInputBody(value: unknown): value is { input: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "input" in value &&
    typeof value.input === "string"
  );
}