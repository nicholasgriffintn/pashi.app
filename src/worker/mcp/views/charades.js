(() => {
	const byId = (id) => document.getElementById(id);
	const bridge = window.PashiBridge;
	const config = bridge.data();
	const CLIP_TYPES = ["video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
	const CAMERA = {
		audio: true,
		video: { facingMode: "user", height: { ideal: 360 }, width: { ideal: 640 } },
	};
	const TILTS = ["-3deg", "2deg", "-1deg", "3deg"];
	const SHOWN_GUESSES = 5;
	const BASE64_CHUNK = 0x8000;
	const CONTEXT_ROUNDS = 6;
	const CONTEXT_LABEL_LENGTH = 60;
	const state = {
		cardIndex: 0,
		deck: null,
		judging: false,
		phase: "off",
		rounds: [],
		stream: null,
		timer: 0,
		verdict: null,
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

	function setError(message) {
		byId("error").textContent = message || "";
		byId("error").hidden = !message;
	}

	function contextLabel(text) {
		return bridge.clipText(String(text), CONTEXT_LABEL_LENGTH);
	}

	function describeRound(round, number) {
		const { verdict } = round;
		const outcome = verdict.correct
			? "correct"
			: `wrong, the card ranked ${verdict.secretRank} of ${verdict.guesses.length} at ${percent(verdict.secretProbability)}`;
		const talking = verdict.caughtTalking ? ", words heard so points halved" : "";

		return `${number}. Card “${contextLabel(round.card)}”: audience guessed “${contextLabel(verdict.topGuess)}” (${outcome}), ${verdict.points} points${talking}`;
	}

	function describeState() {
		const lines = ["Pashi Charades state:"];

		if (!state.deck) {
			return [...lines, "No deck chosen. The player is picking a deck."].join("\n");
		}

		const score = state.rounds.reduce((sum, round) => sum + round.verdict.points, 0);
		const skipped = Math.max(0, state.rounds.length - CONTEXT_ROUNDS);
		const card = contextLabel(state.deck.cards[state.cardIndex]);

		lines.push(
			`Deck: ${contextLabel(state.deck.name)}`,
			`Current card: “${card}” (${state.verdict ? "performed and judged" : "not yet performed"})`,
			`Score: ${score} points over ${state.rounds.length} judged rounds`,
		);

		if (state.rounds.length > 0) {
			lines.push(
				skipped > 0 ? `Rounds (latest ${CONTEXT_ROUNDS}, ${skipped} earlier omitted):` : "Rounds:",
				...state.rounds
					.slice(skipped)
					.map((round, index) => describeRound(round, skipped + index + 1)),
			);
		}

		return lines.join("\n");
	}

	function shareState() {
		bridge.updateModelContext(describeState());
	}

	function drawIndex(deck) {
		const played = new Set(state.rounds.map((round) => round.card));
		const fresh = deck.cards.flatMap((card, index) => (played.has(card) ? [] : [index]));
		const pool = fresh.length > 0 ? fresh : deck.cards.map((_, index) => index);

		return pool[Math.floor(Math.random() * pool.length)];
	}

	function busy() {
		return state.phase === "countdown" || state.phase === "recording" || state.judging;
	}

	function renderControls() {
		const stage = byId("stage");

		stage.dataset.phase = state.phase;
		byId("stage-dark").hidden = Boolean(state.stream);
		byId("stage-video").hidden = !state.stream;
		byId("open-camera").disabled = state.phase === "starting";
		byId("open-camera").textContent = state.phase === "starting" ? "Opening…" : "Raise the curtain";
		byId("stage-judging").hidden = !state.judging;
		byId("action").disabled = !state.stream || busy() || Boolean(state.verdict);
		byId("next-card").disabled = busy();
		byId("next-card").textContent = state.verdict ? "Next card" : "Deal another";
		byId("change-deck").disabled = busy();
	}

	function renderCard() {
		const card = byId("card");
		const text = state.deck.cards[state.cardIndex];

		byId("card-text").textContent = text;
		byId("card-corner").textContent = state.deck.name;
		byId("card-corner-end").textContent = state.deck.name;
		card.style.animation = "none";
		void card.offsetWidth;
		card.style.animation = "";
	}

	function renderRounds() {
		const list = byId("rounds");

		list.replaceChildren();

		for (const round of state.rounds) {
			const item = node("li", `${round.card} +${round.verdict.points}`);

			item.dataset.correct = String(round.verdict.correct);
			list.append(item);
		}

		byId("score").textContent = String(
			state.rounds.reduce((sum, round) => sum + round.verdict.points, 0),
		);
		byId("round").textContent = String(state.rounds.length);
	}

	function renderVerdict() {
		const verdict = state.verdict;

		byId("verdict").hidden = !verdict;
		byId("instructions").hidden = Boolean(verdict);

		if (!verdict) {
			return;
		}

		byId("verdict-guess").textContent = verdict.topGuess;
		byId("verdict-summary").textContent = verdict.correct
			? "Spot on. Take a bow."
			: `You were doing “${verdict.card}”. It ranked ${verdict.secretRank} of ${verdict.guesses.length} at ${percent(verdict.secretProbability)}.`;

		const guesses = byId("verdict-guesses");

		guesses.replaceChildren();
		verdict.guesses.slice(0, SHOWN_GUESSES).forEach((guess, index) => {
			const secret = guess.card === verdict.card;
			const item = node("li", undefined, "guess");
			const head = node("span", undefined, "guess-head");
			const bar = node("span", undefined, "guess-bar");
			const fill = node("span", undefined, "guess-fill");

			item.dataset.secret = String(secret);
			head.append(
				node("span", secret ? `${guess.card} ★` : guess.card),
				node("span", percent(guess.probability)),
			);
			fill.style.transform = `scaleX(${guess.probability})`;
			fill.style.setProperty("--delay", `${index * 120}ms`);
			bar.append(fill);
			item.append(head, bar);
			guesses.append(item);
		});

		const stamp = byId("verdict-stamp");

		stamp.dataset.caught = String(verdict.caughtTalking);
		stamp.textContent = verdict.caughtTalking ? "Words heard · ½ points" : "Clean performance";
		byId("verdict-talking").textContent = `talking ${percent(verdict.talking)}`;

		const drama = byId("verdict-drama");

		drama.replaceChildren();
		config.dramaLevels.forEach((label, index) => {
			const step = node("li", label);

			step.dataset.reached = String(index <= verdict.drama.level);
			step.dataset.active = String(index === verdict.drama.level);
			drama.append(step);
		});
	}

	function render() {
		renderControls();
		renderVerdict();
	}

	function renderPicker() {
		const grid = byId("deck-grid");

		byId("rules").textContent = config.rules;
		grid.replaceChildren();

		config.decks.forEach((deck, index) => {
			const button = node("button", undefined, "deck");
			const back = node("span", undefined, "deck-back");
			const face = node("span", undefined, "deck-face");

			button.type = "button";
			button.style.setProperty("--tilt", TILTS[index % TILTS.length]);
			back.style.setProperty("--back-tilt", TILTS[(index + 1) % TILTS.length]);
			face.append(
				node("span", `${deck.cards.length} cards`, "card-corner"),
				node("span", deck.name, "deck-name"),
				node("span", `${deck.cards.slice(0, 3).join(" · ")}…`, "deck-sample"),
			);
			button.append(back, face);
			button.addEventListener("click", () => chooseDeck(deck.id));
			grid.append(button);
		});

		byId("screen-picker").hidden = false;
		byId("screen-game").hidden = true;
	}

	function chooseDeck(id) {
		const deck = config.decks.find((entry) => entry.id === id);

		if (!deck) {
			return;
		}

		state.deck = deck;
		state.rounds = [];
		state.verdict = null;
		state.cardIndex = drawIndex(deck);
		setError("");
		byId("screen-picker").hidden = true;
		byId("screen-game").hidden = false;
		renderCard();
		renderRounds();
		render();
		shareState();
	}

	function stopStream() {
		for (const track of state.stream?.getTracks() ?? []) {
			track.stop();
		}

		state.stream = null;
		byId("stage-video").srcObject = null;
	}

	async function openCamera() {
		setError("");
		state.phase = "starting";
		render();

		try {
			state.stream = await navigator.mediaDevices.getUserMedia(CAMERA);
			byId("stage-video").srcObject = state.stream;
			state.phase = "ready";
		} catch (error) {
			state.phase = "off";
			setError(
				error instanceof Error && error.name === "NotAllowedError"
					? "Camera access was refused. Allow it in your browser, or ask your host to let this app use the camera."
					: `The camera would not start (${error instanceof Error ? error.name : "unknown error"}).`,
			);
		}

		render();
	}

	function countdown(seconds, onTick) {
		return new Promise((resolve) => {
			let remaining = seconds;

			onTick(remaining);
			state.timer = setInterval(() => {
				remaining -= 1;
				onTick(remaining);

				if (remaining <= 0) {
					clearInterval(state.timer);
					resolve();
				}
			}, 1000);
		});
	}

	function supportedClipType() {
		return CLIP_TYPES.find((type) => window.MediaRecorder?.isTypeSupported(type));
	}

	async function recordClip() {
		const mimeType = supportedClipType();

		if (!state.stream || !mimeType) {
			throw new Error("This browser cannot record video clips.");
		}

		const countdownLabel = byId("stage-countdown");

		state.phase = "countdown";
		render();
		countdownLabel.hidden = false;
		await countdown(config.countdownSeconds, (remaining) => {
			countdownLabel.textContent = String(remaining);
			countdownLabel.style.animation = "none";
			void countdownLabel.offsetWidth;
			countdownLabel.style.animation = "";
		});
		countdownLabel.hidden = true;

		const recorder = new MediaRecorder(state.stream, { mimeType, videoBitsPerSecond: 900_000 });
		const chunks = [];
		const finished = new Promise((resolve) => {
			recorder.addEventListener("dataavailable", (event) => chunks.push(event.data));
			recorder.addEventListener("stop", () => resolve(new Blob(chunks, { type: mimeType })));
		});
		const fill = byId("stage-progress-fill");

		state.phase = "recording";
		render();
		byId("stage-rolling").hidden = false;
		byId("stage-progress").hidden = false;
		recorder.start();
		await countdown(config.clipSeconds, (remaining) => {
			byId("stage-rolling-text").textContent = `Rolling · ${remaining}s`;
			fill.style.transform = `scaleX(${(config.clipSeconds - remaining) / config.clipSeconds})`;
		});
		recorder.stop();

		const clip = await finished;

		byId("stage-rolling").hidden = true;
		byId("stage-progress").hidden = true;
		fill.style.transform = "scaleX(0)";
		state.phase = "ready";

		return clip;
	}

	async function toDataUrl(blob) {
		const bytes = new Uint8Array(await blob.arrayBuffer());
		let binary = "";

		for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK) {
			binary += String.fromCharCode(...bytes.subarray(offset, offset + BASE64_CHUNK));
		}

		return `data:${blob.type.split(";")[0]};base64,${btoa(binary)}`;
	}

	async function act() {
		setError("");

		try {
			const clip = await recordClip();

			if (clip.size > config.clipMaxBytes) {
				throw new Error(
					"That take was too large to send. Try again in better light or a smaller window.",
				);
			}

			if (!bridge.embedded) {
				throw new Error(
					"Open Charades inside an MCP host such as Polychat for the audience to judge it.",
				);
			}

			state.judging = true;
			render();

			const verdict = await bridge.callTool("pashi_judge_charades", {
				card: state.cardIndex,
				deck: state.deck.id,
				video: await toDataUrl(clip),
			});

			state.verdict = verdict;
			state.rounds.push({ card: verdict.card, verdict });
			renderRounds();
			shareState();
		} catch (error) {
			setError(error instanceof Error ? error.message : "The judges have wandered off.");
		} finally {
			state.judging = false;
			state.phase = state.stream ? "ready" : "off";
			render();
		}
	}

	function nextCard() {
		state.verdict = null;
		state.cardIndex = drawIndex(state.deck);
		renderCard();
		render();
		shareState();
	}

	function leaveDeck() {
		stopStream();
		state.phase = "off";
		state.deck = null;
		state.verdict = null;
		setError("");
		renderPicker();
		shareState();
	}

	byId("open-camera").addEventListener("click", () => {
		void openCamera();
	});
	byId("action").addEventListener("click", () => {
		void act();
	});
	byId("next-card").addEventListener("click", nextCard);
	byId("change-deck").addEventListener("click", leaveDeck);

	bridge.on("ui/notifications/tool-result", (params) => {
		const value = bridge.readToolValue(params);

		if (value?.game === "charades" && typeof value.selectedDeck === "string" && !state.deck) {
			chooseDeck(value.selectedDeck);
		}
	});

	bridge.on("ui/resource-teardown", () => {
		clearInterval(state.timer);
		stopStream();
	});

	window.addEventListener("pagehide", stopStream);

	renderPicker();
	void bridge.connect({ name: "pashi-charades", version: "1.0.0" });
})();
