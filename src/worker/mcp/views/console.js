(() => {
	const byId = (id) => document.getElementById(id);
	const bridge = window.PashiBridge;
	const { kind, toolUrl } = bridge.data();
	const toolName = kind === "converter" ? "pashi_convert" : "pashi_generate";
	const elements = {
		copy: byId("console-copy"),
		empty: byId("console-empty"),
		error: byId("console-error"),
		fields: byId("console-fields"),
		form: byId("console-form"),
		input: byId("console-input"),
		inputField: byId("console-input-field"),
		inputLabel: byId("console-input-label"),
		meta: byId("console-meta"),
		open: byId("console-open"),
		output: byId("console-output"),
		result: byId("console-result"),
		root: byId("console"),
		run: byId("console-run"),
		status: byId("console-status"),
		title: byId("console-title"),
	};
	const state = { copyText: "", type: "" };
	const SHORT_HINT_LENGTH = 24;

	elements.root.dataset.kind = kind;
	byId("console-kind").textContent = kind === "converter" ? "Pashi converter" : "Pashi generator";

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

	function isRecord(value) {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}

	function setError(message) {
		elements.error.textContent = message || "";
		elements.error.hidden = !message;
	}

	function renderSwatches(colours) {
		const list = node("ul", undefined, "console-swatches");

		for (const colour of colours) {
			const item = node("li");
			const swatch = node("span", undefined, "console-swatch");

			if (CSS.supports("color", colour)) {
				swatch.style.background = colour;
			}

			item.append(swatch, node("code", colour));
			list.append(item);
		}

		return list;
	}

	function renderRecord(record) {
		const list = node("dl", undefined, "console-record");

		for (const [key, value] of Object.entries(record)) {
			list.append(node("dt", key), node("dd", String(value)));
		}

		return list;
	}

	function renderTable(records) {
		const table = node("table", undefined, "console-table");
		const keys = [...new Set(records.flatMap((record) => Object.keys(record)))];
		const headRow = node("tr");

		for (const key of keys) {
			headRow.append(node("th", key));
		}

		const head = node("thead");
		const body = node("tbody");

		head.append(headRow);

		for (const record of records) {
			const row = node("tr");

			for (const key of keys) {
				row.append(node("td", record[key] === undefined ? "" : String(record[key])));
			}

			body.append(row);
		}

		table.append(head, body);

		return table;
	}

	function renderLines(lines) {
		const list = node("ol", undefined, "console-lines");

		for (const line of lines) {
			list.append(node("li", String(line)));
		}

		return list;
	}

	function renderResult(value) {
		const result = value.result;

		if (value.kind === "palette" && Array.isArray(result)) {
			return renderSwatches(result.map(String));
		}

		if (typeof result === "string") {
			return node("pre", result);
		}

		if (Array.isArray(result) && result.every(isRecord)) {
			return renderTable(result);
		}

		if (Array.isArray(result)) {
			return renderLines(result);
		}

		if (isRecord(result)) {
			return renderRecord(result);
		}

		return node("pre", JSON.stringify(value, null, 2));
	}

	function copyTextFor(result) {
		if (typeof result === "string") {
			return result;
		}

		if (Array.isArray(result) && result.every((item) => typeof item === "string")) {
			return result.join("\n");
		}

		return JSON.stringify(result, null, 2);
	}

	function showResult(value) {
		if (!value) {
			return;
		}

		if (value.error) {
			setError(value.error);

			return;
		}

		setError("");
		state.type = value.type || state.type;
		state.copyText = copyTextFor(value.result);
		elements.title.textContent = value.label || value.type || "Result";
		elements.meta.textContent = value.meta || "";
		elements.output.replaceChildren(renderResult(value));
		elements.result.hidden = false;
		elements.empty.hidden = true;
	}

	function shortHint(field) {
		return field.hint && field.hint.length <= SHORT_HINT_LENGTH ? field.hint : "";
	}

	function control(field, value) {
		if (field.control === "select" && field.options?.length) {
			const select = node("select");
			const values = field.required ? field.options : ["", ...field.options];
			const defaultLabel = shortHint(field) ? `Default (${shortHint(field)})` : "Default";

			for (const option of values) {
				const entry = node("option", option || defaultLabel);

				entry.value = option;
				select.append(entry);
			}

			select.value = values.includes(value) ? value : values[0];

			return select;
		}

		const input = node(field.control === "textarea" ? "textarea" : "input");

		input.value = value;
		input.placeholder = field.hint || "";

		return input;
	}

	function buildForm(description, args) {
		const fields = args.fields && isRecord(args.fields) ? args.fields : {};
		const known = new Set(description.fields.map((field) => field.id));
		const extras = Object.keys(fields)
			.filter((id) => !known.has(id))
			.map((id) => ({ control: "text", id, label: id, required: false }));

		elements.inputField.hidden = !description.input.used;
		elements.inputLabel.textContent = description.input.label || "Input";
		elements.input.placeholder = description.input.placeholder || "";
		elements.input.value = typeof args.input === "string" ? args.input : "";
		elements.run.textContent = description.actionLabel || "Run again";
		elements.fields.replaceChildren();

		for (const field of [...description.fields, ...extras]) {
			const wrapper = node(
				"label",
				undefined,
				field.control === "textarea" ? "field field-wide" : "field",
			);
			const value =
				typeof fields[field.id] === "string" ? fields[field.id] : field.defaultValue || "";
			const input = control(field, value);

			input.name = field.id;
			wrapper.append(node("span", field.label, "field-label"), input);

			if (field.control === "select" && field.hint && !shortHint(field)) {
				wrapper.append(node("span", field.hint, "field-hint"));
			}

			elements.fields.append(wrapper);
		}

		elements.form.hidden = false;
	}

	function fallbackDescription() {
		return {
			actionLabel: "Run again",
			fields: [],
			input: { label: "Input", placeholder: "", used: true },
		};
	}

	async function loadForm(args) {
		if (typeof args.type !== "string" || !args.type) {
			return;
		}

		state.type = args.type;

		try {
			buildForm(await bridge.callTool("pashi_describe_tool", { type: args.type }), args);
		} catch {
			buildForm(fallbackDescription(), args);
		}
	}

	function readForm() {
		const fields = {};

		for (const element of elements.fields.querySelectorAll("[name]")) {
			if (element.value.trim()) {
				fields[element.name] = element.value;
			}
		}

		return { fields, input: elements.input.value, type: state.type };
	}

	async function runAgain() {
		elements.run.disabled = true;
		elements.status.textContent = "Running…";

		try {
			showResult(await bridge.callTool(toolName, readForm()));
			elements.status.textContent = "";
		} catch (error) {
			setError(error instanceof Error ? error.message : "The tool call failed.");
			elements.status.textContent = "";
		} finally {
			elements.run.disabled = false;
		}
	}

	elements.form.addEventListener("submit", (event) => {
		event.preventDefault();
		void runAgain();
	});

	async function copyResult() {
		try {
			await navigator.clipboard.writeText(state.copyText);
			elements.copy.textContent = "Copied";
		} catch {
			elements.copy.textContent = "Copy blocked";
		}

		setTimeout(() => {
			elements.copy.textContent = "Copy";
		}, 1600);
	}

	elements.copy.addEventListener("click", () => {
		void copyResult();
	});

	elements.open.addEventListener("click", () => {
		if (state.type) {
			bridge.openLink(`${toolUrl}${encodeURIComponent(state.type)}`).catch(() => {
				setError("The host would not open the link.");
			});
		}
	});

	bridge.on("ui/notifications/tool-input", (params) => {
		void loadForm(isRecord(params.arguments) ? params.arguments : {});
	});

	bridge.on("ui/notifications/tool-result", (params) => {
		const value = bridge.readToolValue(params);

		if (params.isError) {
			setError(value?.error || "The tool call failed.");
		} else {
			showResult(value);
		}
	});

	async function start() {
		const context = await bridge.connect({ name: `pashi-${kind}`, version: "1.0.0" });

		if (!context) {
			elements.empty.textContent = `Open this view from an MCP host by calling ${toolName}.`;
		}
	}

	void start();
})();
