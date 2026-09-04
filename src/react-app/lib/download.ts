import { apiFetch } from "./api-request.ts";

export async function downloadApiResource(url: string, filename: string, apiKey: string) {
	const response = await apiFetch(url, apiKey);

	if (!response.ok) {
		const body = (await response.json().catch(() => ({}))) as { error?: string };

		throw new Error(body.error || "Download failed.");
	}

	const objectUrl = URL.createObjectURL(await response.blob());
	const link = document.createElement("a");

	link.download = filename;
	link.href = objectUrl;
	document.body.append(link);
	link.click();
	link.remove();
	window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}
