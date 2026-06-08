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

export async function readGeneratorBody(c: Context) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return { fields: {}, input: "" };
  }

  const input = isInputBody(body) ? body.input : "";
  const fields =
    typeof body === "object" && body !== null && !Array.isArray(body) && "fields" in body
      ? normaliseFields(body.fields)
      : {};

  return { fields, input };
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

function normaliseFields(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, fieldValue]) =>
      typeof fieldValue === "string" ? [[key, fieldValue]] : [],
    ),
  );
}
