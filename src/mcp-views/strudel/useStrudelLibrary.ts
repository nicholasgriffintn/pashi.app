import { useCallback, useEffect, useState } from "react";

import { isRecord } from "../../shared/records";
import { errorMessage } from "../shared/errors";
import { host } from "../shared/host";
import { isGeneratedPattern, isPatternList, isSavedPattern, type StrudelPattern } from "./config";

export interface PatternDraft {
	code: string;
	description?: string;
	id?: string;
	name: string;
	tags: string[];
}

export interface GenerateRequest {
	complexity: string;
	prompt: string;
	style?: string;
	tempo?: number;
}

function isDeleted(value: unknown): value is { deleted: string } {
	return isRecord(value) && typeof value.deleted === "string";
}

function draftForChat(draft: PatternDraft) {
	return [
		`Save this Strudel pattern to my Pashi library as “${draft.name}”${draft.id ? ` (update pattern ${draft.id})` : ""}.`,
		draft.description ? `Description: ${draft.description}` : "",
		draft.tags.length ? `Tags: ${draft.tags.join(", ")}` : "",
		"",
		"```",
		draft.code,
		"```",
	]
		.filter((line, index) => line || index > 2)
		.join("\n");
}

export function useStrudelLibrary() {
	const [patterns, setPatterns] = useState<StrudelPattern[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;

		host
			.callTool("pashi_list_strudel_patterns", {}, isPatternList)
			.then((result) => {
				if (active) {
					setPatterns(result.patterns);
					setLoadError(null);
				}
			})
			.catch((error: unknown) => {
				if (active) {
					setLoadError(errorMessage(error, "Patterns unavailable."));
				}
			})
			.finally(() => {
				if (active) {
					setIsLoading(false);
				}
			});

		return () => {
			active = false;
		};
	}, []);

	const save = useCallback(async (draft: PatternDraft) => {
		const result = await host.callTool("pashi_save_strudel_pattern", { ...draft }, isSavedPattern);

		setPatterns((current) => [
			result.pattern,
			...current.filter((pattern) => pattern.id !== result.pattern.id),
		]);

		return result.pattern;
	}, []);

	const remove = useCallback(async (id: string) => {
		await host.callTool("pashi_delete_strudel_pattern", { id }, isDeleted);
		setPatterns((current) => current.filter((pattern) => pattern.id !== id));
	}, []);

	const saveFromChat = useCallback(
		(draft: PatternDraft) => host.sendMessage(draftForChat(draft)),
		[],
	);

	const generate = useCallback(async (request: GenerateRequest) => {
		return host.callTool("pashi_generate_strudel", { ...request }, isGeneratedPattern);
	}, []);

	return { generate, isLoading, loadError, patterns, remove, save, saveFromChat };
}

export type StrudelLibrary = ReturnType<typeof useStrudelLibrary>;
