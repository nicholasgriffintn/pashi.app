import { useMutation } from "@tanstack/react-query";
import { useReducer, useState } from "react";

import {
	DECIDE_IMAGE_TYPES,
	DECIDE_LIMITS,
	type DecideRequest,
	type DecideResponse,
} from "../../shared/decide";
import { DECIDE_EXAMPLES, type DecideExample } from "./decide-examples";
import {
	decideFormReducer,
	findFormProblem,
	formFromExample,
	toDecideRequest,
} from "./decide-form";
import { readImageWithinBudget } from "./image-data-url";
import { fetchJson } from "./query-client";

export function useDecide() {
	const [form, dispatchForm] = useReducer(decideFormReducer, DECIDE_EXAMPLES[0], formFromExample);
	const [imageError, setImageError] = useState<string | null>(null);
	const [isReadingImage, setIsReadingImage] = useState(false);
	const mutation = useMutation({
		mutationFn: (request: DecideRequest) =>
			fetchJson<DecideResponse>("/api/labs/decide", {
				body: JSON.stringify(request),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			}),
	});
	const problem = findFormProblem(form);

	function loadExample(example: DecideExample) {
		dispatchForm({ example, type: "load" });
		setImageError(null);
		mutation.reset();
	}

	async function pickImage(file: File) {
		setImageError(null);
		setIsReadingImage(true);

		try {
			const dataUrl = await readImageWithinBudget(
				file,
				DECIDE_IMAGE_TYPES,
				DECIDE_LIMITS.imageBytes,
			);

			dispatchForm({ image: { dataUrl, name: file.name }, type: "image" });
		} catch (error) {
			setImageError(error instanceof Error ? error.message : "That image could not be read.");
		} finally {
			setIsReadingImage(false);
		}
	}

	function submit() {
		if (!problem && !isReadingImage) {
			mutation.mutate(toDecideRequest(form));
		}
	}

	return {
		answers: mutation.data?.answers,
		askedRequest: mutation.data ? mutation.variables : undefined,
		dispatch: dispatchForm,
		error: mutation.error,
		form,
		imageError,
		isPending: mutation.isPending,
		isReadingImage,
		loadExample,
		pickImage,
		problem,
		submit,
	};
}
