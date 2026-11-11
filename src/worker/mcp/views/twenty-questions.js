(() => {
	const byId = (id) => document.getElementById(id);
	const bridge = window.PashiBridge;
	const config = bridge.data();
	const SVG = "http://www.w3.org/2000/svg";
	const DIAL_RADIUS = 40;
	const TICKS = 11;
	const SUSPICIOUSLY_QUICK = 10;
	const CONTEXT_ANSWERS = 10;
	const CONTEXT_QUESTION_LENGTH = 80;
	const CONTEXT_LABEL_LENGTH = 60;
	const VERBAL_SCALE = [
		[0.95, "Almost certainly"],
		[0.8, "Very likely"],
		[0.62, "Probably"],
		[0.38, "Hard to say"],
		[0.2, "Probably not"],
		[0.05, "Very unlikely"],
		[0, "Almost certainly not"],
	];
	const state = {
		busy: false,
		game: null,
		history: [],
		phase: "choosing",
		secret: null,
	};

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

	function describeProbability(probability) {
		return VERBAL_SCALE.find(([floor]) => probability >= floor)?.[1] ?? "Almost certainly not";
	}

	function tone(probability) {
		if (probability >= 0.75) {
			return "strong";
		}

		return probability >= 0.4 ? "middling" : "weak";
	}

	function counted(history) {
		return history.filter((answer) => answer.kind !== "unanswerable").length;
	}

	function verdictFor(answer) {
		if (answer.solved) {
			return "Got it";
		}

		if (answer.kind === "guess") {
			return "Not it";
		}

		if (answer.kind === "unanswerable") {
			return "Not a yes or no";
		}

		return describeProbability(answer.yes);
	}

	function setError(id, message) {
		byId(id).textContent = message || "";
		byId(id).hidden = !message;
	}

	function categoryLabel(id) {
		return config.categories.find((category) => category.id === id)?.label ?? id;
	}

	function describeAnswer(answer) {
		const question = bridge.clipText(answer.question, CONTEXT_QUESTION_LENGTH);
		const reading =
			answer.kind === "question"
				? `${verdictFor(answer)} (${percent(answer.yes)} yes), ${answer.warmth.label.toLowerCase()}`
				: verdictFor(answer);

		return `- ${answer.kind === "guess" ? "Guess" : "Question"} “${question}”: ${reading}`;
	}

	function describeOutcome() {
		const used = `${counted(state.history)} of ${state.game.maxQuestions} questions used`;

		if (state.phase === "won") {
			return `Outcome: the player solved it, ${used}`;
		}

		return state.phase === "lost"
			? `Outcome: the player did not solve it, ${used}`
			: `Outcome: still playing, ${used}`;
	}

	function describeState() {
		const lines = ["Pashi Twenty Questions state:"];

		if (!state.game || state.phase === "choosing") {
			return [...lines, "No game in progress. The player is picking a category."].join("\n");
		}

		const ended = state.phase === "won" || state.phase === "lost";
		const skipped = Math.max(0, state.history.length - CONTEXT_ANSWERS);

		lines.push(
			`Category: ${bridge.clipText(categoryLabel(state.game.category), CONTEXT_LABEL_LENGTH)}`,
			describeOutcome(),
			ended && state.secret
				? `Secret, revealed now the game has ended: “${bridge.clipText(state.secret, CONTEXT_LABEL_LENGTH)}”`
				: "Secret: sealed on the server and not known to this view",
		);

		if (state.history.length > 0) {
			lines.push(
				skipped > 0
					? `Asked so far (latest ${CONTEXT_ANSWERS}, ${skipped} earlier omitted):`
					: "Asked so far:",
				...state.history.slice(skipped).map(describeAnswer),
			);
		}

		return lines.join("\n");
	}

	function shareState() {
		bridge.updateModelContext(describeState());
	}

	function polar(fraction, radius) {
		const angle = Math.PI * (1 - fraction);

		return {
			x: 50 + radius * Math.cos(angle),
			y: 50 - radius * Math.sin(angle),
		};
	}

	function arc(fraction) {
		const from = polar(0, DIAL_RADIUS);
		const to = polar(fraction, DIAL_RADIUS);

		return `M ${from.x} ${from.y} A ${DIAL_RADIUS} ${DIAL_RADIUS} 0 0 1 ${to.x} ${to.y}`;
	}

	function drawDialFrame() {
		const ticks = byId("dial-ticks");

		byId("dial-track").setAttribute("d", arc(1));

		for (let index = 0; index < TICKS; index += 1) {
			const fraction = index / (TICKS - 1);
			const outer = polar(fraction, 47);
			const inner = polar(fraction, fraction === 0.5 ? 43 : 45);
			const line = document.createElementNS(SVG, "line");

			line.setAttribute("x1", String(inner.x));
			line.setAttribute("y1", String(inner.y));
			line.setAttribute("x2", String(outer.x));
			line.setAttribute("y2", String(outer.y));
			ticks.append(line);
		}
	}

	function renderDial(probability) {
		const value = probability ?? 0.5;
		const fill = byId("dial-fill");
		const label = byId("dial-value");

		fill.toggleAttribute("hidden", probability === null);
		fill.setAttribute("d", arc(Math.max(0.001, value)));
		fill.dataset.tone = probability === null ? "" : tone(value);
		byId("dial-needle").style.transform = `rotate(${value * 180 - 90}deg)`;
		label.textContent = probability === null ? "··" : percent(probability);
		label.dataset.tone = probability === null ? "" : tone(value);
	}

	function renderReading() {
		const last = state.history.at(-1);
		const asked = counted(state.history);
		const max = state.game.maxQuestions;
		const verdict = byId("verdict");

		byId("status").textContent =
			`${categoryLabel(state.game.category)} · question ${Math.min(asked + 1, max)} of ${max}`;
		renderDial(last && last.kind === "question" ? last.yes : null);
		verdict.textContent = last ? verdictFor(last) : "Ask away";
		verdict.style.animation = "none";
		void verdict.offsetWidth;
		verdict.style.animation = "";
		byId("verdict-question").textContent = last
			? `“${last.question}”`
			: "Start broad. “Is it alive?” is a classic for a reason.";
	}

	function renderEnding() {
		const asked = counted(state.history);
		const won = state.phase === "won";

		byId("ending-status").textContent = won ? `Solved in ${asked}` : "Twenty up";
		byId("ending-secret").textContent = state.secret ?? "";
		byId("ending-quip").textContent = won
			? asked <= SUSPICIOUSLY_QUICK
				? "Frankly suspicious. Well played."
				: "Got there in the end."
			: "It happens to the best of us. Mostly to the rest of us.";
	}

	function renderPips() {
		const pips = byId("pips");
		const answers = state.history.filter((answer) => answer.kind !== "unanswerable");
		const max = state.game.maxQuestions;

		pips.replaceChildren(node("span", `${answers.length} of ${max} questions used`, "sr-only"));

		for (let slot = 0; slot < max; slot += 1) {
			const answer = answers[slot];
			const pip = node("span", undefined, "pip");

			if (answer) {
				pip.title = answer.question;
				pip.dataset.state = answer.solved
					? "solved"
					: answer.kind === "guess"
						? "miss"
						: tone(answer.yes);
			}

			pips.append(pip);
		}
	}

	function renderThermometer() {
		const latest = state.history.toReversed().find((answer) => answer.kind !== "unanswerable");
		const marker = byId("thermometer-marker");
		const steps = config.warmthSteps;

		marker.hidden = !latest;
		byId("warmth-now").textContent = latest ? steps[latest.warmth.level] : "—";

		if (latest) {
			marker.style.left = `${(latest.warmth.level / (steps.length - 1)) * 100}%`;
		}
	}

	function renderTranscript() {
		const list = byId("transcript");

		list.replaceChildren();

		if (state.history.length === 0) {
			list.append(
				node("li", "The transcript of your interrogation will appear here.", "transcript-empty"),
			);

			return;
		}

		for (const answer of state.history.toReversed()) {
			const item = node("li", undefined, "line");
			const body = node("div", undefined, "line-body");
			const reading = node("p", verdictFor(answer), "line-verdict");
			const skipped = answer.kind === "unanswerable";

			item.dataset.kind = answer.kind;
			item.dataset.solved = String(answer.solved);

			if (!skipped) {
				reading.append(node("span", ` · ${answer.warmth.label.toLowerCase()}`, "line-warmth"));
			}

			body.append(node("p", answer.question, "line-question"), reading);
			item.append(
				node(
					"span",
					skipped ? "–" : String(counted(state.history.slice(0, answer.id + 1))),
					"line-number",
				),
				body,
			);

			if (!skipped) {
				item.append(node("span", percent(answer.yes), "line-percent"));
			}

			list.append(item);
		}
	}

	function renderForm() {
		const input = byId("question");
		const playing = state.phase === "playing";

		byId("ask").hidden = !playing;
		byId("give-up").hidden = !playing;
		byId("give-up").disabled = state.busy;
		input.disabled = state.busy;
		input.maxLength = config.questionLength.max;
		input.placeholder =
			counted(state.history) === 0 ? "Is it bigger than a breadbox?" : "Ask, or name your guess";
		byId("ask-button").disabled =
			state.busy || input.value.trim().length < config.questionLength.min;
		byId("ask-button").textContent = state.busy ? "Asking…" : "Ask";
	}

	function render() {
		const choosing = state.phase === "choosing";

		byId("screen-picker").hidden = !choosing;
		byId("screen-game").hidden = choosing;

		for (const button of byId("category-grid").querySelectorAll("button")) {
			button.disabled = state.busy;
		}

		if (choosing) {
			return;
		}

		byId("reading").hidden = state.phase !== "playing";
		byId("ending").hidden = state.phase === "playing";
		renderReading();
		renderEnding();
		renderPips();
		renderThermometer();
		renderTranscript();
		renderForm();
	}

	function renderPicker() {
		const grid = byId("category-grid");

		grid.replaceChildren();

		for (const category of config.categories) {
			const button = node("button", undefined, "category");

			button.type = "button";
			button.append(
				node("span", "?", "category-mark"),
				node("span", category.label, "category-name"),
				node("span", category.hint, "category-hint"),
			);
			button.addEventListener("click", () => {
				void start(category.id);
			});
			grid.append(button);
		}

		byId("warmth-low").textContent = config.warmthSteps[0];
		byId("warmth-high").textContent = config.warmthSteps.at(-1);
	}

	async function run(errorId, operation) {
		state.busy = true;
		setError("picker-error", "");
		setError("error", "");
		render();

		try {
			if (!bridge.embedded) {
				throw new Error("Open Twenty Questions inside an MCP host such as Polychat to play.");
			}

			await operation();
		} catch (error) {
			setError(errorId, error instanceof Error ? error.message : "Something went wrong.");
		} finally {
			state.busy = false;
			render();
		}
	}

	function start(category) {
		return run("picker-error", async () => {
			state.game = await bridge.callTool("pashi_start_twenty_questions", { category });
			state.history = [];
			state.secret = null;
			state.phase = "playing";
			shareState();
		});
	}

	function ask(question) {
		return run("error", async () => {
			if (!state.game || state.phase !== "playing") {
				return;
			}

			const answer = await bridge.callTool("pashi_ask_twenty_questions", {
				question,
				token: state.game.token,
			});

			state.history = [...state.history, { ...answer, id: state.history.length }];

			if (answer.solved) {
				state.secret = answer.secret;
				state.phase = "won";
			} else if (answer.over) {
				state.secret = answer.secret;
				state.phase = "lost";
			}

			shareState();
		});
	}

	function giveUp() {
		return run("error", async () => {
			if (!state.game) {
				return;
			}

			const reveal = await bridge.callTool("pashi_reveal_twenty_questions", {
				token: state.game.token,
			});

			state.secret = reveal.secret;
			state.phase = "lost";
			shareState();
		});
	}

	function reset() {
		state.game = null;
		state.history = [];
		state.secret = null;
		state.phase = "choosing";
		setError("error", "");
		render();
		shareState();
	}

	byId("ask").addEventListener("submit", (event) => {
		event.preventDefault();

		const input = byId("question");
		const question = input.value.trim();

		if (question.length < config.questionLength.min || state.busy) {
			return;
		}

		input.value = "";
		void ask(question).then(() => input.focus());
	});
	byId("question").addEventListener("input", renderForm);
	byId("give-up").addEventListener("click", () => {
		void giveUp();
	});
	byId("again").addEventListener("click", reset);

	bridge.on("ui/notifications/tool-result", (params) => {
		const value = bridge.readToolValue(params);

		if (
			value?.game === "twenty-questions" &&
			typeof value.selectedCategory === "string" &&
			state.phase === "choosing" &&
			!state.busy
		) {
			void start(value.selectedCategory);
		}
	});

	drawDialFrame();
	renderPicker();
	render();
	void bridge.connect({ name: "pashi-twenty-questions", version: "1.0.0" });
})();
