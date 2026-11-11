(() => {
	const byId = (id) => document.getElementById(id);
	const bridge = window.PashiBridge;
	const config = bridge.data();
	const limits = config.limits;
	const JPEG_QUALITY = 0.82;
	const CONTEXT_FLAGGED = 12;
	const CONTEXT_NAME_LENGTH = 48;
	const CONTEXT_PILE_LENGTH = 40;
	const state = {
		active: 0,
		generation: 0,
		items: [],
		nextId: 0,
		piles: [],
		queue: [],
	};
	const prints = new Map();

	function node(tag, text, className) {
		const element = document.createElement(tag);

		if (text !== undefined) {
			element.textContent = text;
		}

		if (className) {
			element.className = className;
		}

		return element;
	}

	function percent(value) {
		return `${Math.round(value * 100)}%`;
	}

	function hashSeed(value) {
		let hash = 0;

		for (const character of value) {
			hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
		}

		return hash;
	}

	function setError(message) {
		byId("error").textContent = message || "";
		byId("error").hidden = !message;
	}

	function createPiles(preset) {
		return preset.piles.map((pile, index) => ({ ...pile, id: `p${index}` }));
	}

	function placedPileId(item) {
		return item.state === "sorted" ? (item.manualPileId ?? item.result.pileId) : null;
	}

	function isDeveloping(item) {
		return item.state === "queued" || item.state === "sorting";
	}

	function pileName(pile, index) {
		return bridge.clipText(pile.label.trim() || `Pile ${index + 1}`, CONTEXT_PILE_LENGTH);
	}

	function describeFlagged(item) {
		const flags = item.result.flags.map((flag) => config.flags[flag]?.label ?? flag).join(", ");

		return `- ${bridge.clipText(item.name, CONTEXT_NAME_LENGTH)}: ${flags}`;
	}

	function describeState() {
		const pileIds = new Set(state.piles.map((pile) => pile.id));
		const sorted = state.items.filter((item) => item.state === "sorted");
		const flagged = sorted.filter((item) => item.result.flags.length > 0);
		const piles = state.piles.map((pile, index) => {
			const count = sorted.filter((item) => placedPileId(item) === pile.id).length;

			return `${pileName(pile, index)}: ${count}`;
		});
		const lines = ["Pashi Photo Sorter state:"];

		if (state.items.length === 0) {
			return [...lines, "No photos on the table.", `Pile counts: ${piles.join("; ")}`].join("\n");
		}

		lines.push(
			`Photos: ${state.items.length} on the table, ${sorted.length} sorted, ${state.items.filter(isDeveloping).length} still sorting, ${state.items.filter((item) => item.state === "failed").length} failed`,
			`Awaiting the user's decision (no confident pile): ${sorted.filter((item) => !pileIds.has(placedPileId(item))).length}`,
			`Moved by the user: ${sorted.filter((item) => item.manualPileId).length}`,
			`Pile counts: ${piles.join("; ")}`,
		);

		if (flagged.length > 0) {
			lines.push(
				flagged.length > CONTEXT_FLAGGED
					? `Flagged photos (first ${CONTEXT_FLAGGED} of ${flagged.length}):`
					: "Flagged photos:",
				...flagged.slice(0, CONTEXT_FLAGGED).map(describeFlagged),
			);
		}

		return lines.join("\n");
	}

	function shareState() {
		bridge.updateModelContext(describeState());
	}

	function pump() {
		while (state.active < limits.parallelSorts && state.queue.length > 0) {
			const task = state.queue.shift();

			state.active += 1;
			void task().finally(() => {
				state.active -= 1;
				pump();
			});
		}
	}

	async function encodeJpeg(file) {
		const bitmap = await createImageBitmap(file);
		const scale = Math.min(1, limits.maxDimension / Math.max(bitmap.width, bitmap.height));
		const canvas = document.createElement("canvas");

		canvas.width = Math.max(1, Math.round(bitmap.width * scale));
		canvas.height = Math.max(1, Math.round(bitmap.height * scale));

		const context = canvas.getContext("2d");

		if (!context) {
			bitmap.close();
			throw new Error("Canvas is not supported in this browser.");
		}

		context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
		bitmap.close();

		return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
	}

	function sendablePiles(piles) {
		return piles.map((pile, index) => ({
			description: pile.description,
			id: pile.id,
			label: pile.label.trim() || `Pile ${index + 1}`,
		}));
	}

	function patch(id, next) {
		const item = state.items.find((entry) => entry.id === id);

		if (item) {
			Object.assign(item, next);
			renderTable();
		}
	}

	function sort(item, piles) {
		const generation = state.generation;

		patch(item.id, { error: "", result: null, state: "queued" });
		state.queue.push(async () => {
			if (generation !== state.generation) {
				return;
			}

			patch(item.id, { state: "sorting" });

			try {
				if (!bridge.embedded) {
					throw new Error("Open Photo Sorter inside an MCP host such as Polychat to sort.");
				}

				const result = await bridge.callTool("pashi_sort_photo", {
					image: await encodeJpeg(item.file),
					piles,
				});

				if (generation === state.generation) {
					patch(item.id, { manualPileId: undefined, result, state: "sorted" });
					shareState();
				}
			} catch (error) {
				if (generation === state.generation) {
					const message = error instanceof Error ? error.message : "Could not sort this one.";

					setError(message);
					patch(item.id, { error: message, state: "failed" });
					shareState();
				}
			}
		});
		pump();
	}

	function addFiles(files) {
		const room = limits.maxPhotos - state.items.length;
		const images = files.filter((file) => file.type.startsWith("image/"));
		const accepted = images.slice(0, Math.max(0, room));
		const piles = sendablePiles(state.piles);

		setError(
			images.length > accepted.length
				? `The table holds ${limits.maxPhotos} photos. ${images.length - accepted.length} stayed in the box.`
				: "",
		);

		for (const file of accepted) {
			const item = {
				file,
				id: `photo-${state.nextId}`,
				name: file.name,
				previewUrl: URL.createObjectURL(file),
				state: "queued",
			};

			state.nextId += 1;
			state.items.push(item);
			sort(item, piles);
		}

		renderTable();

		if (accepted.length > 0) {
			shareState();
		}
	}

	function resortAll() {
		const piles = sendablePiles(state.piles);

		state.generation += 1;
		state.queue = [];
		setError("");

		for (const item of state.items) {
			sort(item, piles);
		}
	}

	function clearTable() {
		state.generation += 1;
		state.queue = [];

		for (const item of state.items) {
			URL.revokeObjectURL(item.previewUrl);
		}

		state.items = [];
		prints.clear();
		setError("");
		renderTable();
	}

	function moveTo(id, pileId) {
		patch(id, { manualPileId: pileId });
		shareState();
	}

	function printFor(item) {
		const existing = prints.get(item.id);

		if (existing) {
			return existing;
		}

		const figure = node("figure", undefined, "print");
		const frame = node("div", undefined, "print-frame");
		const image = node("img");
		const flags = node("div", undefined, "print-flags");
		const caption = node("figcaption", undefined, "print-caption");
		const choices = node("div", undefined, "print-choices");

		image.src = item.previewUrl;
		image.alt = item.name;
		figure.style.setProperty("--tilt", `${(hashSeed(item.id) % 7) - 3}deg`);
		frame.append(image, flags);
		figure.append(frame, caption, choices);

		const print = { caption, choices, figure, flags };

		prints.set(item.id, print);

		return print;
	}

	function retryButton(item) {
		const button = node("button", "Try again", "choice");

		button.type = "button";
		button.addEventListener("click", () => {
			setError("");
			sort(item, sendablePiles(state.piles));
		});

		return button;
	}

	function choiceButton(item, pile) {
		const button = node("button", pile.label || "Untitled", "choice");

		button.type = "button";
		button.dataset.best = String(item.result?.bestGuess === pile.id);
		button.addEventListener("click", () => moveTo(item.id, pile.id));

		return button;
	}

	function updatePrint(item, unsure) {
		const print = printFor(item);

		print.figure.dataset.state = item.state;
		print.flags.replaceChildren();
		print.caption.replaceChildren();
		print.choices.replaceChildren();

		if (isDeveloping(item)) {
			print.caption.append(node("span", "developing…", "print-developing"));
		}

		if (item.state === "failed") {
			const spoiled = node("span", "spoiled", "print-spoiled");

			spoiled.title = item.error;
			print.caption.append(spoiled);
			print.choices.append(retryButton(item));
		}

		if (item.state === "sorted") {
			for (const flag of item.result.flags) {
				const badge = node("span", config.flags[flag]?.label ?? flag, "flag");

				badge.title = config.flags[flag]?.question ?? flag;
				print.flags.append(badge);
			}

			print.caption.append(
				node("span", percent(item.result.confidence)),
				node("span", item.manualPileId ? "filed by you" : item.result.keeper, "print-keeper"),
			);

			if (unsure) {
				print.choices.append(...state.piles.map((pile) => choiceButton(item, pile)));
			}
		}

		return print.figure;
	}

	function renderPiles() {
		const grid = byId("pile-grid");

		grid.replaceChildren();

		for (const pile of state.piles) {
			const filed = state.items.filter((item) => placedPileId(item) === pile.id);
			const section = node("section", undefined, "pile");
			const head = node("header", undefined, "pile-head");
			const body = node("div", undefined, "prints");

			head.append(
				node("h2", pile.label || "Untitled", "pile-title"),
				node("span", String(filed.length), "pile-count"),
			);

			if (filed.length === 0) {
				body.append(node("p", "Nothing here yet", "pile-empty"));
			} else {
				body.append(...filed.map((item) => updatePrint(item, false)));
			}

			section.append(head, body);
			grid.append(section);
		}
	}

	function yourCallNote(waiting, unsure) {
		if (unsure.length > 0) {
			return `${unsure.length} it would rather not guess`;
		}

		return waiting.some(isDeveloping)
			? "Developing the rest"
			: `${waiting.length} could not be sorted`;
	}

	function renderTable() {
		const empty = state.items.length === 0;
		const pileIds = new Set(state.piles.map((pile) => pile.id));
		const waiting = state.items.filter((item) => isDeveloping(item) || item.state === "failed");
		const unsure = state.items.filter(
			(item) => item.state === "sorted" && !pileIds.has(placedPileId(item)),
		);
		const sorted = state.items.filter((item) => item.state === "sorted").length;

		byId("drop-empty").hidden = !empty;
		byId("table").hidden = empty;
		byId("resort").disabled = state.items.some(isDeveloping);

		if (empty) {
			return;
		}

		byId("progress-fill").style.transform = `scaleX(${sorted / state.items.length})`;
		byId("progress-count").textContent = `${sorted}/${state.items.length} sorted`;
		byId("your-call").hidden = waiting.length === 0 && unsure.length === 0;
		byId("your-call-note").textContent = yourCallNote(waiting, unsure);
		byId("your-call-prints").replaceChildren(
			...waiting.map((item) => updatePrint(item, false)),
			...unsure.map((item) => updatePrint(item, true)),
		);
		renderPiles();
	}

	function renderChips() {
		const chips = byId("chips");

		chips.replaceChildren();

		for (const pile of state.piles) {
			const chip = node("span", undefined, "chip");
			const input = node("input");
			const remove = node("button", "×", "chip-remove");

			input.value = pile.label;
			input.maxLength = limits.labelLength;
			input.size = Math.max(4, pile.label.length);
			input.setAttribute("aria-label", "Pile name");
			input.addEventListener("input", () => {
				pile.label = input.value;
				input.size = Math.max(4, input.value.length);
				remove.setAttribute("aria-label", `Remove ${input.value}`);
				renderTable();
			});
			input.addEventListener("change", shareState);
			remove.type = "button";
			remove.hidden = state.piles.length <= limits.minPiles;
			remove.setAttribute("aria-label", `Remove ${pile.label}`);
			remove.addEventListener("click", () => {
				state.piles = state.piles.filter((entry) => entry.id !== pile.id);
				renderChips();
				renderTable();
				shareState();
			});
			chip.append(input, remove);
			chips.append(chip);
		}

		const add = node("button", "+ Pile", "chip-add");

		add.type = "button";
		add.disabled = state.piles.length >= limits.maxPiles;
		add.addEventListener("click", () => {
			if (state.piles.length < limits.maxPiles) {
				state.piles = [
					...state.piles,
					{ description: "", id: `p${Date.now()}`, label: "New pile" },
				];
				renderChips();
				renderTable();
				shareState();
				chips.querySelectorAll("input")[state.piles.length - 1]?.select();
			}
		});
		chips.append(add);
	}

	function renderPresets() {
		const list = byId("presets");

		list.replaceChildren(
			...config.presets.map((preset) => {
				const button = node("button", preset.name, "preset");

				button.type = "button";
				button.addEventListener("click", () => {
					state.piles = createPiles(preset);
					renderChips();
					renderTable();
					shareState();
				});

				return button;
			}),
		);
	}

	function wireDrop(target) {
		target.tabIndex = 0;
		target.setAttribute("role", "button");
		target.addEventListener("keydown", (event) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				byId("file-input").click();
			}
		});
		target.addEventListener("dragover", (event) => {
			event.preventDefault();
			target.dataset.over = "true";
		});
		target.addEventListener("dragleave", () => {
			delete target.dataset.over;
		});
		target.addEventListener("drop", (event) => {
			event.preventDefault();
			delete target.dataset.over;
			addFiles([...(event.dataTransfer?.files ?? [])]);
		});
	}

	byId("file-input").addEventListener("change", (event) => {
		addFiles([...(event.target.files ?? [])]);
		event.target.value = "";
	});
	byId("resort").addEventListener("click", resortAll);
	byId("clear").addEventListener("click", () => {
		clearTable();
		shareState();
	});
	document.addEventListener("dragover", (event) => event.preventDefault());
	document.addEventListener("drop", (event) => event.preventDefault());
	bridge.on("ui/resource-teardown", clearTable);
	window.addEventListener("pagehide", clearTable);

	byId("drop-copy").textContent =
		`Drop up to ${limits.maxPhotos} images or click to choose. Each one develops as Polychat decides where it goes, and anything it is unsure of waits for you.`;
	wireDrop(byId("drop-empty"));
	wireDrop(byId("drop-more"));
	state.piles = createPiles(config.presets[0]);
	renderPresets();
	renderChips();
	renderTable();
	void bridge.connect({ name: "pashi-photo-sorter", version: "1.0.0" });
})();
