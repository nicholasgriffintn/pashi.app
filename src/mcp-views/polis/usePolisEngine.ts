import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";

import type { PolisRecording } from "../../shared/polis";
import { errorMessage } from "../shared/errors";
import type { ToastTone } from "../shared/Toast";
import { answerDecisions, pollTown } from "./decision-requests";
import { openEngine, type EngineLink } from "./engine/connection";
import { attachMapCanvas } from "./engine/map-canvas";
import type { PolisCommand, PolisEvent, PolisModelSettings, PolisStatus } from "./engine/protocol";
import type { PollResult } from "./poll";
import { downloadRecording } from "./recording-file";
import { polisService } from "./service";
import { useSavedTowns } from "./useSavedTowns";

const DEFAULT_MODEL_SETTINGS: PolisModelSettings = { callsPerYear: 1000, holdForAnswers: false };
const AUTOSAVE_MIN_MS = 15_000;

export type PolisPoll =
	| { status: "idle" }
	| { status: "asking"; proposal: string }
	| { status: "done"; proposal: string; result: PollResult }
	| { status: "failed"; proposal: string; message: string };

export type PolisShareState =
	| { status: "idle" }
	| { status: "sharing" }
	| { status: "shared"; token: string; url: string; day: number; id: string }
	| { status: "failed"; message: string };

export interface PolisEngineOptions {
	notify: (text: string, tone?: ToastTone) => void;
	recording?: PolisRecording;
	siteUrl: string;
}

export function usePolisEngine({ notify, recording, siteUrl }: PolisEngineOptions) {
	const [link, setLink] = useState<EngineLink | null>(null);
	const autosave = useRef({ blocked: false, last: 0 });
	const [container, setContainer] = useState<HTMLDivElement | null>(null);
	const [ready, setReady] = useState(false);
	const [engineError, setEngineError] = useState<string | null>(null);
	const [restoring, setRestoring] = useState<{ name: string; progress: number } | null>(null);
	const [status, setStatus] = useState<PolisStatus | null>(null);
	const [poll, setPoll] = useState<PolisPoll>({ status: "idle" });
	const pollProposal = useRef("");
	const [modelSettings, setModelSettings] = useState(DEFAULT_MODEL_SETTINGS);
	const [share, setShare] = useState<PolisShareState>({ status: "idle" });
	const viewOnly = Boolean(recording);
	const saved = useSavedTowns(!viewOnly);

	const send = useCallback(
		(command: PolisCommand) => {
			link?.send(command);
		},
		[link],
	);

	const saveExplicitly = useEffectEvent(async (town: PolisRecording) => {
		try {
			await saved.save(town);
			notify("Town saved");
		} catch (caught) {
			notify(errorMessage(caught, "The town could not be saved"), "error");
		}
	});

	const saveQuietly = useEffectEvent(async (town: PolisRecording) => {
		try {
			await saved.save(town);
		} catch (caught) {
			autosave.current.blocked = true;
			notify(`Autosave is off: ${errorMessage(caught, "the town could not be saved")}`, "error");
		}
	});

	const shareRecording = useEffectEvent(async (town: PolisRecording) => {
		try {
			const { token } = await polisService.share(town);

			setShare({
				status: "shared",
				token,
				url: `${siteUrl}/polis/${token}`,
				day: town.day,
				id: town.id,
			});
			void saved.refresh();
		} catch (caught) {
			setShare({ status: "failed", message: errorMessage(caught, "The town could not be shared") });
		}
	});

	const requestAutosave = useEffectEvent(() => {
		const now = Date.now();

		if (!autosave.current.blocked && now - autosave.current.last >= AUTOSAVE_MIN_MS) {
			autosave.current.last = now;
			send({ type: "export", purpose: "autosave" });
		}
	});

	const answerPoll = useEffectEvent(async (event: Extract<PolisEvent, { type: "pollBuckets" }>) => {
		const proposal = pollProposal.current;

		try {
			setPoll({ status: "done", proposal, result: await pollTown(event, proposal) });
		} catch (caught) {
			setPoll({
				status: "failed",
				proposal,
				message: errorMessage(caught, "The decision model did not answer"),
			});
		}
	});

	const handleRecording = useEffectEvent((event: Extract<PolisEvent, { type: "recording" }>) => {
		if (event.purpose === "share") {
			void shareRecording(event.recording);
		} else if (event.purpose === "save") {
			void saveExplicitly(event.recording);
		} else if (event.purpose === "autosave") {
			void saveQuietly(event.recording);
		} else {
			downloadRecording(event.recording);
		}
	});

	const handleEvent = useEffectEvent((event: PolisEvent) => {
		switch (event.type) {
			case "status":
				setRestoring(null);
				setStatus(event.status);
				break;
			case "restoring":
				setRestoring({ name: event.name, progress: event.day / Math.max(event.endDay, 1) });
				break;
			case "recording":
				handleRecording(event);
				break;
			case "autosave":
				requestAutosave();
				break;
			case "decide":
				void answerDecisions(event).then(send);
				break;
			case "pollBuckets":
				void answerPoll(event);
				break;
			case "ready":
				break;
			default:
				break;
		}
	});

	useEffect(() => {
		if (!container) {
			return undefined;
		}

		let cancelled = false;
		let opened: EngineLink | null = null;
		let detach = () => {};

		openEngine((event) => handleEvent(event))
			.then((engine) => {
				if (cancelled) {
					engine.dispose();

					return undefined;
				}

				opened = engine;
				detach = attachMapCanvas(container, engine);
				setLink(engine);
				setReady(true);
				setEngineError(null);

				return undefined;
			})
			.catch((caught: unknown) => {
				if (!cancelled) {
					setEngineError(errorMessage(caught, "Polis could not start its simulation."));
				}
			});

		return () => {
			cancelled = true;
			detach();
			opened?.dispose();
			setLink(null);
			setReady(false);
			setStatus(null);
		};
	}, [container]);

	useEffect(() => {
		if (ready) {
			send({ type: "model", settings: modelSettings });
		}
	}, [modelSettings, ready, send]);

	useEffect(() => {
		if (ready && recording) {
			send({ type: "import", recording, watch: true });
		}
	}, [ready, recording, send]);

	const openTown = async (id: string, watch: boolean) => {
		try {
			send({ type: "import", recording: await saved.open(id), watch });
		} catch (caught) {
			notify(errorMessage(caught, "That town could not be opened"), "error");
		}
	};

	const forgetTown = async (id: string) => {
		try {
			await saved.forget(id);
		} catch (caught) {
			notify(errorMessage(caught, "That town could not be deleted"), "error");
		}
	};

	const shareTown = () => {
		setShare({ status: "sharing" });
		send({ type: "export", purpose: "share" });
	};

	const stopSharing = async () => {
		if (share.status !== "shared") {
			return;
		}

		try {
			await polisService.stopSharing(share.id);
			setShare({ status: "idle" });
			void saved.refresh();
		} catch (caught) {
			setShare({ status: "failed", message: errorMessage(caught, "Sharing could not be stopped") });
		}
	};

	const askTown = (proposal: string) => {
		pollProposal.current = proposal;
		setPoll({ status: "asking", proposal });
		send({ type: "poll", requestId: Date.now() });
	};

	const clearPoll = () => setPoll({ status: "idle" });

	return {
		askTown,
		clearPoll,
		engineError,
		forgetTown,
		modelSettings,
		openTown,
		poll,
		ready,
		restoring,
		send,
		setContainer,
		setModelSettings,
		share,
		shareTown,
		status,
		stopSharing,
		towns: saved.towns,
		townsError: saved.error,
		viewOnly,
	};
}

export type PolisEngine = ReturnType<typeof usePolisEngine>;
