import { produceNodeSubscription } from "./node-normalizer.js";

const ALLOWED_OPTIONS = new Set(["output", "type", "name"]);

function parseArguments(rawArguments) {
  if (!rawArguments || typeof rawArguments !== "object" || Array.isArray(rawArguments)) {
    throw new Error("arguments must be an object");
  }
  for (const key of Object.keys(rawArguments)) {
    if (!key.startsWith("_") && !ALLOWED_OPTIONS.has(key)) {
      throw new Error(`Unknown option: ${key}`);
    }
  }
  const output = rawArguments.output;
  if (output !== "nodes") throw new Error("output must be nodes");
  const type = rawArguments.type ?? "collection";
  if (!["collection", "col"].includes(type)) {
    throw new Error("type must be collection");
  }
  const name = rawArguments.name ?? "anywhere-sources";
  if (typeof name !== "string" || !name.trim() || /[\r\n]/.test(name)) {
    throw new Error("name must be a non-empty collection name");
  }
  return { type: "collection", name: name.trim() };
}

function logDiagnostics(context, diagnostics) {
  const logger = context?.logger ?? globalThis?.console;
  const method = typeof logger === "function"
    ? logger
    : typeof logger?.info === "function"
      ? logger.info.bind(logger)
      : typeof logger?.log === "function"
        ? logger.log.bind(logger)
        : null;
  if (!method) return;
  try {
    method(`[anywhere-profile] ${JSON.stringify(diagnostics)}`);
  } catch {
    // Diagnostics are optional and must never change the generated subscription.
  }
}

export async function operator(input = {}, targetPlatform, context = {}) {
  void targetPlatform;
  const options = parseArguments(context.arguments ?? {});
  if (typeof context.produceArtifact !== "function") {
    throw new Error("produceArtifact is unavailable");
  }
  const nodes = await context.produceArtifact({
    type: options.type,
    name: options.name,
    platform: "JSON",
    produceType: "internal",
  });
  if (!Array.isArray(nodes) || !nodes.length) {
    throw new Error("produceArtifact must return a non-empty node array");
  }
  const result = produceNodeSubscription(nodes);
  logDiagnostics(context, result.diagnostics);
  return { ...input, $content: result.content };
}

