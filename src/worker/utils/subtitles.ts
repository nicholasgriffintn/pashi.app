export interface SubtitleSegment {
	end: number;
	start: number;
	text: string;
}

function pad(value: number, width: number) {
	return String(value).padStart(width, "0");
}

export function formatSubtitleTimestamp(seconds: number, separator: "," | ".") {
	const totalMs = Math.round(Math.max(0, seconds) * 1000);
	const hours = Math.floor(totalMs / 3_600_000);
	const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
	const secs = Math.floor((totalMs % 60_000) / 1000);

	return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(secs, 2)}${separator}${pad(totalMs % 1000, 3)}`;
}

export function segmentsToSrt(segments: readonly SubtitleSegment[]) {
	return segments
		.map(
			(segment, index) =>
				`${index + 1}\n${formatSubtitleTimestamp(segment.start, ",")} --> ${formatSubtitleTimestamp(segment.end, ",")}\n${segment.text.trim()}\n`,
		)
		.join("\n");
}

export function segmentsToVtt(segments: readonly SubtitleSegment[]) {
	const cues = segments.map(
		(segment) =>
			`${formatSubtitleTimestamp(segment.start, ".")} --> ${formatSubtitleTimestamp(segment.end, ".")}\n${segment.text.trim()}\n`,
	);

	return ["WEBVTT\n", ...cues].join("\n");
}
