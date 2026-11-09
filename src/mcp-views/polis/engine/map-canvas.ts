import type { EngineLink } from "./connection";

const MAX_PIXEL_RATIO = 2;
const TAP_DISTANCE = 5;
const ZOOM_SPEED = 0.0016;

export function attachMapCanvas(container: HTMLElement, link: EngineLink): () => void {
	const canvas = document.createElement("canvas");
	const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
	const measure = () => ({
		height: container.clientHeight,
		pixelRatio,
		width: container.clientWidth,
	});

	canvas.className = "polis-canvas";
	canvas.setAttribute("aria-label", "Map of the town");
	container.prepend(canvas);

	const offscreen = canvas.transferControlToOffscreen();

	link.send({ type: "canvas", canvas: offscreen, ...measure() }, [offscreen]);

	const observer = new ResizeObserver(() => link.send({ type: "resize", ...measure() }));

	observer.observe(container);

	let dragging = false;
	let moved = 0;
	let lastX = 0;
	let lastY = 0;

	const onDown = (event: PointerEvent) => {
		dragging = true;
		moved = 0;
		lastX = event.clientX;
		lastY = event.clientY;
		canvas.setPointerCapture(event.pointerId);
	};

	const onMove = (event: PointerEvent) => {
		if (!dragging) {
			return;
		}

		const dx = event.clientX - lastX;
		const dy = event.clientY - lastY;

		moved += Math.abs(dx) + Math.abs(dy);
		lastX = event.clientX;
		lastY = event.clientY;
		link.send({ type: "pan", dx, dy });
	};

	const onUp = (event: PointerEvent) => {
		dragging = false;

		if (moved < TAP_DISTANCE) {
			const bounds = canvas.getBoundingClientRect();

			link.send({
				type: "click",
				x: event.clientX - bounds.left,
				y: event.clientY - bounds.top,
			});
		}
	};

	const onWheel = (event: WheelEvent) => {
		event.preventDefault();

		const bounds = canvas.getBoundingClientRect();

		link.send({
			type: "zoom",
			factor: Math.exp(-event.deltaY * ZOOM_SPEED),
			x: event.clientX - bounds.left,
			y: event.clientY - bounds.top,
		});
	};

	canvas.addEventListener("pointerdown", onDown);
	canvas.addEventListener("pointermove", onMove);
	canvas.addEventListener("pointerup", onUp);
	canvas.addEventListener("wheel", onWheel, { passive: false });

	return () => {
		observer.disconnect();
		canvas.remove();
	};
}
