import { isRecord } from "../../shared/records";

export const KEEP_SCROLL_STATE = { keepScroll: true };

export function keepsScroll(state: unknown) {
	return isRecord(state) && state.keepScroll === true;
}
