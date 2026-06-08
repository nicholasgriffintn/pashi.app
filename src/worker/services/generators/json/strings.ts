import type { GeneratorRequest } from "../request";
import type { GeneratorTool, JsonResult } from "../types";
import { parseInteger, randomChoice } from "../../../utils/generation";
import { textResult } from "./result";

const EMOJIS = [
	"⚡",
	"✨",
	"🌙",
	"🔥",
	"💿",
	"🧪",
	"🎲",
	"🎯",
	"🚀",
	"🛠️",
	"📦",
	"🔐",
	"🧠",
	"💾",
	"🪩",
	"🧩",
	"📡",
	"🎮",
	"🗡️",
	"🌀",
] as const;

export function createStringResult(
	generator: GeneratorTool,
	request: GeneratorRequest,
): JsonResult | undefined {
	switch (generator.id) {
		case "emoji":
			return textResult(generator, request.input, createEmojis(request));
		default:
			return undefined;
	}
}

function createEmojis(request: GeneratorRequest) {
	const count = parseInteger(request.fields.count ?? request.input, 6, 1, 100);
	const separator = request.fields.separator ?? "";
	return Array.from({ length: count }, () => randomChoice(EMOJIS)).join(separator);
}
