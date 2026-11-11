import { useEffect, useRef } from "react";

import { host } from "../shared/host";
import type { PolisStatus } from "./engine/protocol";
import { describeNoTown, describeTown, townTurnKey } from "./town-context";

export function useTownContext(status: PolisStatus | null) {
	const turn = status ? townTurnKey(status) : null;
	const lastTurn = useRef<string | null>(null);

	useEffect(() => {
		if (turn === lastTurn.current) {
			return;
		}

		lastTurn.current = turn;
		host.updateModelContext(status ? describeTown(status) : describeNoTown());
	}, [status, turn]);
}
