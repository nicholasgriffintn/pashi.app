import { POLIS_RECORDING_VERSION, type PolisRecording } from "../../../shared/polis";
import { randomId } from "../../shared/ids";
import type { World } from "../library/index";

export function recordingOf(world: World): PolisRecording {
	return {
		version: POLIS_RECORDING_VERSION,
		id: world.config.id ?? randomId(),
		name: world.name,
		population: world.config.population,
		seed: world.config.seed,
		day: world.day,
		savedAt: Date.now(),
		log: world.log,
	};
}
