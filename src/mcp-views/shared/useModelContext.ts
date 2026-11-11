import { useEffect, useRef } from "react";

import { host } from "./host";

export function useModelContext(summary: string) {
	const lastRef = useRef(summary);

	useEffect(() => {
		if (summary !== lastRef.current) {
			lastRef.current = summary;
			host.updateModelContext(summary);
		}
	}, [summary]);
}
