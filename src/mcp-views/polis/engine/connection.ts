import type { PolisCommand, PolisEvent } from "./protocol";

const WORKER_ELEMENT = "pashi-worker";
const WORKER_READY_MS = 4000;
const WORKER_BLOCKED =
	"Polis could not start its simulation. This host does not allow Web Workers.";

export interface EngineLink {
	dispose: () => void;
	send: (command: PolisCommand, transfer?: Transferable[]) => void;
}

export function openEngine(onEvent: (event: PolisEvent) => void): Promise<EngineLink> {
	const source = document.getElementById(WORKER_ELEMENT)?.textContent;

	if (!source) {
		return Promise.reject(new Error("Polis was served without its simulation."));
	}

	const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
	let worker: Worker;

	try {
		worker = new Worker(url);
	} catch {
		URL.revokeObjectURL(url);

		return Promise.reject(new Error(WORKER_BLOCKED));
	}

	return new Promise((resolve, reject) => {
		const fail = () => {
			clearTimeout(timer);
			URL.revokeObjectURL(url);
			worker.terminate();
			reject(new Error(WORKER_BLOCKED));
		};

		const timer = setTimeout(fail, WORKER_READY_MS);

		const onReady = (message: MessageEvent<PolisEvent>) => {
			clearTimeout(timer);
			URL.revokeObjectURL(url);
			worker.removeEventListener("error", fail);
			worker.removeEventListener("message", onReady);
			worker.addEventListener("message", (next: MessageEvent<PolisEvent>) => onEvent(next.data));
			onEvent(message.data);
			resolve({
				dispose: () => worker.terminate(),
				send: (command, transfer = []) => worker.postMessage(command, transfer),
			});
		};

		worker.addEventListener("error", fail);
		worker.addEventListener("message", onReady);
	});
}
