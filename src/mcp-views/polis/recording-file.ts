import { isPolisRecording, type PolisRecording } from "../../shared/polis";

export const NOT_A_RECORDING = "That file is not a Polis recording";

function fileName(recording: PolisRecording) {
	const slug = recording.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

	return `${slug}-day-${recording.day}.polis.json`;
}

export function downloadRecording(recording: PolisRecording) {
	const url = URL.createObjectURL(
		new Blob([JSON.stringify(recording)], { type: "application/json" }),
	);
	const link = document.createElement("a");

	link.href = url;
	link.download = fileName(recording);
	link.click();
	URL.revokeObjectURL(url);
}

export async function readRecording(file: File): Promise<PolisRecording> {
	let parsed: unknown;

	try {
		parsed = JSON.parse(await file.text());
	} catch {
		throw new Error(NOT_A_RECORDING);
	}

	if (!isPolisRecording(parsed)) {
		throw new Error(NOT_A_RECORDING);
	}

	return parsed;
}
