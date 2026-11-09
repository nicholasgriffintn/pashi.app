import {
	isPolisDecisionResponse,
	isPolisLawDraft,
	isPolisRecording,
	isPolisScenarioDraft,
	type PolisBucket,
	type PolisParameters,
	type PolisRecording,
} from "../../shared/polis";
import { isRecord } from "../../shared/records";
import { host } from "../shared/host";

export interface PolisTownSummary {
	day: number;
	id: string;
	name: string;
	population: number;
	savedAt: number;
	shareToken?: string;
}

function isTownSummary(value: unknown): value is PolisTownSummary {
	return (
		isRecord(value) &&
		typeof value.id === "string" &&
		typeof value.name === "string" &&
		typeof value.population === "number" &&
		typeof value.day === "number" &&
		typeof value.savedAt === "number" &&
		(value.shareToken === undefined || typeof value.shareToken === "string")
	);
}

function isTownList(value: unknown): value is { towns: PolisTownSummary[] } {
	return isRecord(value) && Array.isArray(value.towns) && value.towns.every(isTownSummary);
}

function isTownRecording(value: unknown): value is { recording: PolisRecording } {
	return isRecord(value) && isPolisRecording(value.recording);
}

function isSavedTown(value: unknown): value is { town: PolisTownSummary } {
	return isRecord(value) && isTownSummary(value.town);
}

function isDeletedTown(value: unknown): value is { deleted: string } {
	return isRecord(value) && typeof value.deleted === "string";
}

function isShareResult(value: unknown): value is { token: string } {
	return isRecord(value) && typeof value.token === "string";
}

function isStopSharingResult(value: unknown): value is { token: string | null } {
	return isRecord(value) && (value.token === null || typeof value.token === "string");
}

export const polisService = {
	decide: (request: { buckets: PolisBucket[]; laws: string[]; proposal?: string }) =>
		host.callTool("pashi_polis_decide", { ...request }, isPolisDecisionResponse),
	deleteTown: (id: string) => host.callTool("pashi_delete_polis_town", { id }, isDeletedTown),
	draftLaw: (request: { parameters: PolisParameters; text: string }) =>
		host.callTool("pashi_polis_draft_law", { ...request }, isPolisLawDraft),
	draftScenario: (request: { text: string }) =>
		host.callTool("pashi_polis_draft_scenario", { ...request }, isPolisScenarioDraft),
	getTown: async (id: string) =>
		(await host.callTool("pashi_get_polis_town", { id }, isTownRecording)).recording,
	listTowns: async () => (await host.callTool("pashi_list_polis_towns", {}, isTownList)).towns,
	saveTown: async (recording: PolisRecording) =>
		(await host.callTool("pashi_save_polis_town", { recording }, isSavedTown)).town,
	share: (recording: PolisRecording) =>
		host.callTool("pashi_share_polis_town", { recording }, isShareResult),
	stopSharing: (id: string) =>
		host.callTool("pashi_stop_sharing_polis_town", { id }, isStopSharingResult),
};
