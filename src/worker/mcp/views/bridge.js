(() => {
	const PROTOCOL_VERSION = "2025-06-18";
	const HANDSHAKE_TIMEOUT_MS = 1500;
	const REQUEST_TIMEOUT_MS = 90000;
	const SIZE_DEBOUNCE_MS = 60;
	const embedded = window.parent !== window;
	const pending = new Map();
	const listeners = new Map();
	const latest = new Map();
	let nextId = 1;

	function post(message) {
		window.parent.postMessage({ jsonrpc: "2.0", ...message }, "*");
	}

	function request(method, params, timeout = REQUEST_TIMEOUT_MS) {
		if (!embedded) {
			return Promise.reject(new Error("This view is not inside an MCP host."));
		}

		const id = nextId;

		nextId += 1;

		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				pending.delete(id);
				reject(new Error(`The host did not answer ${method}.`));
			}, timeout);

			pending.set(id, { reject, resolve, timer });
			post({ id, method, params });
		});
	}

	function emit(method, params) {
		latest.set(method, params);

		for (const listener of listeners.get(method) ?? []) {
			listener(params);
		}
	}

	function applyTheme(theme) {
		if (theme === "light" || theme === "dark") {
			document.documentElement.dataset.theme = theme;
		}
	}

	function handleHostRequest(message) {
		if (message.method === "ui/resource-teardown" || message.method === "ping") {
			post({ id: message.id, result: {} });

			return;
		}

		post({ error: { code: -32601, message: `Unknown method: ${message.method}` }, id: message.id });
	}

	window.addEventListener("message", (event) => {
		const message = event.data;

		if (event.source !== window.parent || !message || message.jsonrpc !== "2.0") {
			return;
		}

		if (typeof message.method === "string") {
			if (message.id !== undefined && message.id !== null) {
				handleHostRequest(message);
			}

			if (message.method === "ui/notifications/host-context-changed") {
				applyTheme(message.params?.theme);
			}

			emit(message.method, message.params ?? {});

			return;
		}

		const entry = pending.get(message.id);

		if (!entry) {
			return;
		}

		pending.delete(message.id);
		clearTimeout(entry.timer);

		if (message.error) {
			entry.reject(new Error(message.error.message || "The host refused the request."));
		} else {
			entry.resolve(message.result);
		}
	});

	function reportSize() {
		let timer = 0;
		let last = "";
		const send = () => {
			const box = document.documentElement.getBoundingClientRect();
			const size = { height: Math.ceil(box.height), width: Math.ceil(box.width) };
			const key = `${size.width}x${size.height}`;

			timer = 0;

			if (key !== last) {
				last = key;
				post({ method: "ui/notifications/size-changed", params: size });
			}
		};

		new ResizeObserver(() => {
			clearTimeout(timer);
			timer = setTimeout(send, SIZE_DEBOUNCE_MS);
		}).observe(document.documentElement);
		send();
	}

	function preferredTheme() {
		return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
	}

	async function connect(appInfo) {
		if (!embedded) {
			applyTheme(preferredTheme());

			return null;
		}

		try {
			const result = await request(
				"ui/initialize",
				{ appCapabilities: {}, appInfo, protocolVersion: PROTOCOL_VERSION },
				HANDSHAKE_TIMEOUT_MS,
			);

			applyTheme(result?.hostContext?.theme);
			post({ method: "ui/notifications/initialized", params: {} });
			reportSize();

			return result?.hostContext ?? {};
		} catch {
			applyTheme(preferredTheme());

			return null;
		}
	}

	function on(method, listener) {
		const current = listeners.get(method) ?? [];

		listeners.set(method, [...current, listener]);

		if (latest.has(method)) {
			listener(latest.get(method));
		}
	}

	function readToolValue(result) {
		if (result?.structuredContent && typeof result.structuredContent === "object") {
			return result.structuredContent;
		}

		const text = result?.content?.find((item) => item?.type === "text")?.text;

		if (typeof text !== "string") {
			return null;
		}

		try {
			return JSON.parse(text);
		} catch {
			return { error: text };
		}
	}

	async function callTool(name, args) {
		const result = await request("tools/call", { arguments: args, name });
		const value = readToolValue(result);

		if (result?.isError) {
			throw new Error(value?.error || "The tool call failed.");
		}

		return value;
	}

	function data() {
		const element = document.getElementById("pashi-data");

		return element ? JSON.parse(element.textContent || "null") : null;
	}

	window.PashiBridge = {
		callTool,
		connect,
		data,
		embedded,
		on,
		openLink: (url) => request("ui/open-link", { url }),
		readToolValue,
	};
})();
