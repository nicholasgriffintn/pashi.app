import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
	"a[href]",
	"button:not([disabled])",
	"input:not([disabled])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	'[tabindex]:not([tabindex="-1"])',
].join(", ");

function focusableWithin(container: HTMLElement) {
	return [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
		(element) => element.offsetParent !== null || element === document.activeElement,
	);
}

export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, isActive: boolean) {
	useEffect(() => {
		const container = containerRef.current;

		if (!isActive || !container) {
			return;
		}

		const previouslyFocused = document.activeElement;
		const [first] = focusableWithin(container);

		(first ?? container).focus();

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== "Tab" || !container) {
				return;
			}

			const focusable = focusableWithin(container);

			if (focusable.length === 0) {
				event.preventDefault();

				return;
			}

			const firstElement = focusable[0];
			const lastElement = focusable[focusable.length - 1];

			if (event.shiftKey && document.activeElement === firstElement) {
				event.preventDefault();
				lastElement.focus();

				return;
			}

			if (!event.shiftKey && document.activeElement === lastElement) {
				event.preventDefault();
				firstElement.focus();
			}
		}

		document.addEventListener("keydown", handleKeyDown, true);

		return () => {
			document.removeEventListener("keydown", handleKeyDown, true);

			if (previouslyFocused instanceof HTMLElement) {
				previouslyFocused.focus();
			}
		};
	}, [containerRef, isActive]);
}
