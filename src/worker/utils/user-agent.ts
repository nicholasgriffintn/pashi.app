export type UserAgentDevice = "bot" | "desktop" | "mobile" | "tablet" | "unknown";

export interface UserAgentComponent {
	name: string | null;
	version: string | null;
}

export interface UserAgentDetails {
	browser: UserAgentComponent;
	device: UserAgentDevice;
	engine: UserAgentComponent;
	isBot: boolean;
	os: UserAgentComponent;
}

interface UserAgentRule {
	device?: UserAgentDevice;
	formatVersion?: (version: string) => string;
	name?: string;
	pattern: RegExp;
}

const WINDOWS_NT_VERSIONS = new Map([
	["10.0", "10 or 11"],
	["6.3", "8.1"],
	["6.2", "8"],
	["6.1", "7"],
	["6.0", "Vista"],
	["5.2", "XP"],
	["5.1", "XP"],
]);

const BOT_RULES: readonly UserAgentRule[] = [
	{ name: "Bingbot", pattern: /\bbingbot(?:\/(\d[\d.]*))?/i },
	{ name: "ChatGPT-User", pattern: /\bChatGPT-User(?:\/(\d[\d.]*))?/i },
	{ name: "Claude-User", pattern: /\bClaude-User(?:\/(\d[\d.]*))?/i },
	{ name: "anthropic-ai", pattern: /\banthropic-ai(?:\/(\d[\d.]*))?/i },
	{ name: "meta-externalagent", pattern: /\bmeta-externalagent(?:\/(\d[\d.]*))?/i },
	{ name: "facebookexternalhit", pattern: /\bfacebookexternalhit(?:\/(\d[\d.]*))?/i },
	{
		pattern: /([a-z0-9_-]*(?:bot|crawler|spider)(?:-[a-z0-9-]+)?)(?![a-z0-9_])(?:\/v?(\d[\d.]*))?/i,
	},
	{ name: "Headless Chrome", pattern: /\bHeadlessChrome\/(\d[\d.]*)/ },
	{ name: "curl", pattern: /\bcurl\/(\d[\d.]*)/i },
	{ name: "Wget", pattern: /\bWget\/(\d[\d.]*)/i },
	{ name: "python-requests", pattern: /\bpython-requests\/(\d[\d.]*)/i },
	{ name: "Python-urllib", pattern: /\bPython-urllib\/(\d[\d.]*)/i },
	{ name: "Go-http-client", pattern: /\bGo-http-client\/(\d[\d.]*)/i },
	{ name: "axios", pattern: /\baxios\/(\d[\d.]*)/i },
	{ name: "node-fetch", pattern: /\bnode-fetch(?:\/(\d[\d.]*))?/i },
	{ name: "okhttp", pattern: /\bokhttp\/(\d[\d.]*)/i },
	{ name: "PostmanRuntime", pattern: /\bPostmanRuntime\/(\d[\d.]*)/i },
];

const BROWSER_RULES: readonly UserAgentRule[] = [
	{ name: "Edge", pattern: /\bEdg(?:e|A|iOS)?\/(\d[\d.]*)/ },
	{ name: "Opera", pattern: /\b(?:OPR|OPT|OPiOS)\/(\d[\d.]*)/ },
	{ name: "Samsung Internet", pattern: /\bSamsungBrowser\/(\d[\d.]*)/ },
	{ name: "Brave", pattern: /\bBrave\/(\d[\d.]*)/ },
	{ name: "Vivaldi", pattern: /\bVivaldi\/(\d[\d.]*)/ },
	{ name: "Yandex Browser", pattern: /\bYaBrowser\/(\d[\d.]*)/ },
	{ name: "DuckDuckGo", pattern: /\b(?:DuckDuckGo|Ddg)\/(\d[\d.]*)/ },
	{ name: "UC Browser", pattern: /\bUCBrowser\/(\d[\d.]*)/ },
	{ name: "Firefox", pattern: /\b(?:Firefox|FxiOS)\/(\d[\d.]*)/ },
	{ name: "Chrome", pattern: /\b(?:Chrome|Chromium|CriOS)\/(\d[\d.]*)/ },
	{ name: "Safari", pattern: /\bVersion\/(\d[\d.]*).*\bSafari\// },
	{ name: "Safari", pattern: /\bSafari\// },
	{ name: "Opera", pattern: /\bOpera[/ ](\d[\d.]*)/ },
	{ name: "Internet Explorer", pattern: /\bMSIE (\d[\d.]*)/ },
	{ name: "Internet Explorer", pattern: /\bTrident\/.*\brv:(\d[\d.]*)/ },
];

const ENGINE_RULES: readonly UserAgentRule[] = [
	{ name: "EdgeHTML", pattern: /\bEdge\/(\d[\d.]*)/ },
	{ name: "Trident", pattern: /\bTrident\/(\d[\d.]*)/ },
	{ name: "Presto", pattern: /\bPresto\/(\d[\d.]*)/ },
	{ name: "Blink", pattern: /\b(?:Chrome|Chromium)\/(\d[\d.]*)/ },
	{ name: "WebKit", pattern: /\bAppleWebKit\/(\d[\d.]*)/ },
	{ name: "Gecko", pattern: /\brv:(\d[\d.]*).*\bGecko\/\d/ },
	{ name: "Gecko", pattern: /\bGecko\/\d/ },
];

const OS_RULES: readonly UserAgentRule[] = [
	{ device: "mobile", name: "iOS", pattern: /\b(?:iPhone|iPod)\b(?:.*?\bOS (\d+(?:_\d+)*))?/ },
	{ device: "tablet", name: "iPadOS", pattern: /\biPad\b(?:.*?\bOS (\d+(?:_\d+)*))?/ },
	{ device: "mobile", name: "Android", pattern: /\bAndroid\b(?: (\d+(?:\.\d+)*))?/ },
	{ device: "desktop", name: "ChromeOS", pattern: /\bCrOS\b(?: \S+ (\d+(?:\.\d+)*))?/ },
	{
		device: "desktop",
		formatVersion: (version) => WINDOWS_NT_VERSIONS.get(version) ?? `NT ${version}`,
		name: "Windows",
		pattern: /\bWindows\b(?: NT (\d+\.\d+))?/,
	},
	{ device: "desktop", name: "macOS", pattern: /\bMac OS X (\d+(?:[._]\d+)*)/ },
	{ device: "desktop", name: "macOS", pattern: /\bMac(?:intosh| OS X)\b/ },
	{ device: "desktop", name: "Linux", pattern: /\bLinux\b/ },
];

const UNKNOWN_COMPONENT: UserAgentComponent = { name: null, version: null };

export function parseUserAgent(input: string): UserAgentDetails {
	const value = input.trim();
	const bot = matchUserAgentRule(value, BOT_RULES);
	const os = matchUserAgentRule(value, OS_RULES);

	return {
		browser:
			bot?.component ?? matchUserAgentRule(value, BROWSER_RULES)?.component ?? UNKNOWN_COMPONENT,
		device: bot ? "bot" : userAgentDevice(value, os?.rule.device),
		engine: matchUserAgentRule(value, ENGINE_RULES)?.component ?? UNKNOWN_COMPONENT,
		isBot: bot !== undefined,
		os: os?.component ?? UNKNOWN_COMPONENT,
	};
}

function matchUserAgentRule(value: string, rules: readonly UserAgentRule[]) {
	for (const rule of rules) {
		const match = rule.pattern.exec(value);

		if (!match) {
			continue;
		}

		const captures = match.slice(1).filter((capture) => capture !== undefined);
		const name = rule.name ?? captures.shift() ?? null;
		const version = captures[0]?.replaceAll("_", ".");

		return {
			component: {
				name,
				version: version === undefined ? null : (rule.formatVersion?.(version) ?? version),
			},
			rule,
		};
	}

	return undefined;
}

function userAgentDevice(value: string, osDevice: UserAgentDevice | undefined): UserAgentDevice {
	const isAndroidTablet = /\bAndroid\b/.test(value) && !/\bMobile\b/.test(value);

	if (isAndroidTablet || /\b(?:iPad|Tablet|PlayBook|Silk)\b/.test(value)) {
		return "tablet";
	}

	if (/\b(?:Mobile|Mobi|iPhone|iPod)\b/.test(value)) {
		return "mobile";
	}

	return osDevice ?? "unknown";
}
