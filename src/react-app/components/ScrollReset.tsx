import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

import { keepsScroll } from "../lib/scroll-reset";

export function ScrollReset() {
	const { pathname, state } = useLocation();
	const navigationType = useNavigationType();
	const shouldReset = navigationType !== "POP" && !keepsScroll(state);

	useEffect(() => {
		if (shouldReset) {
			window.scrollTo(0, 0);
		}
	}, [pathname, shouldReset]);

	return null;
}
