import { isRecord } from "../../../shared/records.ts";
import { mapWithConcurrency } from "../../utils/async.ts";
import { fetchCachedJson, UpstreamError } from "../../utils/cached-fetch.ts";
import { CalendarDateError, parseCalendarDate } from "../../utils/calendar-date.ts";

export const NEWS_BRIEFING_FORMATS = ["hacker-news", "search", "on-this-day"] as const;
export const NEWS_BRIEFING_FEEDS = ["top", "new", "best"] as const;
export const NEWS_BRIEFING_WINDOWS = ["1h", "6h", "24h", "3d", "1w"] as const;

export type NewsBriefingFormat = (typeof NEWS_BRIEFING_FORMATS)[number];

const FEED_MAX_BYTES = 1024 * 1024;
const HN_ITEM_MAX_BYTES = 64 * 1024;

export class NewsBriefingError extends Error {
	readonly status: number;

	constructor(message: string, status = 422) {
		super(message);
		this.status = status;
	}
}

export interface NewsBriefingOptions {
	feed?: string;
	limit?: string;
	window?: string;
}

const HN_API = "https://hacker-news.firebaseio.com/v0";
const HN_MAX = 30;
const HN_DEFAULT = 15;
const HN_CONCURRENCY = 6;
const HN_TTL_SECONDS = 5 * 60;
const GDELT_API = "https://api.gdeltproject.org/api/v2/doc/doc";
const GDELT_MAX = 25;
const GDELT_DEFAULT = 15;
const GDELT_TTL_SECONDS = 5 * 60;
const GDELT_MIN_TERM_LENGTH = 3;
const WIKI_API = "https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected";
const WIKI_MAX = 20;
const WIKI_DEFAULT = 10;
const WIKI_TTL_SECONDS = 24 * 60 * 60;
const WIKI_USER_AGENT = "Pashi (+https://pashi.app)";
const MAX_TOPIC_LENGTH = 120;
const TIMEOUT_MS = 6_000;
const GDELT_TIMEOUT_MS = 20_000;

function isOneOf<T extends string>(values: readonly T[], value: string | undefined): value is T {
	return values.some((item) => item === value);
}

export function isNewsBriefingFormat(value: string | undefined): value is NewsBriefingFormat {
	return isOneOf(NEWS_BRIEFING_FORMATS, value);
}

function readLimit(value: string | undefined, fallback: number, max: number) {
	if (!value?.trim()) {
		return fallback;
	}

	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) {
		throw new NewsBriefingError(`Set limit to a whole number from 1 to ${max}.`);
	}

	return parsed;
}

function text(value: unknown) {
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function loadJson(
	url: string,
	ttlSeconds: number,
	source: string,
	headers?: Record<string, string>,
	timeoutMs = TIMEOUT_MS,
) {
	try {
		const result = await fetchCachedJson(url, {
			headers,
			maxBytes: FEED_MAX_BYTES,
			source,
			timeoutMs,
			ttlSeconds,
		});

		if (result.status !== 200) {
			throw new NewsBriefingError(`${source} did not return a usable response.`, 502);
		}

		return result.body;
	} catch (error) {
		if (error instanceof UpstreamError) {
			throw new NewsBriefingError(error.message, error.status);
		}

		throw error;
	}
}

function ageLabel(seconds: number) {
	if (seconds < 3600) {
		return `${Math.max(1, Math.round(seconds / 60))}m`;
	}

	if (seconds < 86_400) {
		return `${Math.round(seconds / 3600)}h`;
	}

	return `${Math.round(seconds / 86_400)}d`;
}

function parseHnItem(value: unknown, now: number) {
	if (!isRecord(value) || value.dead === true || value.deleted === true) {
		return undefined;
	}

	const id = typeof value.id === "number" ? value.id : undefined;
	const title = text(value.title);

	if (id === undefined || !title) {
		return undefined;
	}

	const time = typeof value.time === "number" ? value.time : undefined;
	const seconds = time === undefined ? undefined : Math.max(0, now - time);

	return {
		age: seconds === undefined ? undefined : ageLabel(seconds),
		comments: typeof value.descendants === "number" ? value.descendants : 0,
		discussion: `https://news.ycombinator.com/item?id=${id}`,
		points: typeof value.score === "number" ? value.score : 0,
		posted: time === undefined ? undefined : new Date(time * 1000).toISOString(),
		title,
		url: text(value.url) ?? `https://news.ycombinator.com/item?id=${id}`,
	};
}

async function hackerNews(options: NewsBriefingOptions) {
	const feed = options.feed?.trim() || "top";

	if (!isOneOf(NEWS_BRIEFING_FEEDS, feed)) {
		throw new NewsBriefingError(`Choose a feed: ${NEWS_BRIEFING_FEEDS.join(", ")}.`);
	}

	const limit = readLimit(options.limit, HN_DEFAULT, HN_MAX);
	const ids = await loadJson(`${HN_API}/${feed}stories.json`, HN_TTL_SECONDS, "Hacker News");

	if (!Array.isArray(ids)) {
		throw new NewsBriefingError("Hacker News returned an unexpected story list.", 502);
	}

	const wanted = ids.filter((id): id is number => Number.isInteger(id)).slice(0, limit);
	const now = Math.floor(Date.now() / 1000);
	const items = await mapWithConcurrency(wanted, HN_CONCURRENCY, async (id) => {
		try {
			const result = await fetchCachedJson(`${HN_API}/item/${id}.json`, {
				maxBytes: HN_ITEM_MAX_BYTES,
				source: "Hacker News",
				timeoutMs: TIMEOUT_MS,
				ttlSeconds: HN_TTL_SECONDS,
			});

			return result.status === 200 ? parseHnItem(result.body, now) : undefined;
		} catch {
			return undefined;
		}
	});
	const stories = items.flatMap((item) => (item ? [item] : []));

	if (stories.length === 0) {
		throw new NewsBriefingError("Hacker News did not return any stories. Try again shortly.", 502);
	}

	return {
		count: stories.length,
		feed,
		source: {
			cache: "Cached for up to 5 minutes.",
			name: "Hacker News",
			note: "Headlines and links only. Open each link for the article.",
			url: "https://news.ycombinator.com",
		},
		stories,
	};
}

function gdeltDate(value: string | undefined) {
	const match = value ? /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(value) : null;

	return match
		? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}Z`
		: undefined;
}

function parseGdeltArticle(value: unknown) {
	if (!isRecord(value)) {
		return undefined;
	}

	const title = text(value.title);
	const url = text(value.url);

	if (!title || !url || !/^https?:\/\//i.test(url)) {
		return undefined;
	}

	return {
		domain: text(value.domain),
		published: gdeltDate(text(value.seendate)),
		title,
		url,
	};
}

function validateTopic(value: string) {
	const topic = value.trim().replace(/\s+/g, " ");

	if (!topic) {
		throw new NewsBriefingError("Enter a topic to search for, such as climate summit.");
	}

	if (topic.length > MAX_TOPIC_LENGTH) {
		throw new NewsBriefingError(`Keep the topic under ${MAX_TOPIC_LENGTH} characters.`);
	}

	if (topic.split(" ").every((word) => word.length < GDELT_MIN_TERM_LENGTH)) {
		throw new NewsBriefingError(
			`Use at least one word of ${GDELT_MIN_TERM_LENGTH} or more characters.`,
		);
	}

	return topic;
}

async function search(input: string, options: NewsBriefingOptions) {
	const topic = validateTopic(input);
	const window = options.window?.trim() || "24h";

	if (!isOneOf(NEWS_BRIEFING_WINDOWS, window)) {
		throw new NewsBriefingError(`Choose a window: ${NEWS_BRIEFING_WINDOWS.join(", ")}.`);
	}

	const limit = readLimit(options.limit, GDELT_DEFAULT, GDELT_MAX);
	const params = new URLSearchParams({
		format: "json",
		maxrecords: String(limit),
		mode: "artlist",
		query: `${topic} sourcelang:english`,
		sort: "datedesc",
		timespan: window,
	});
	const data = await loadJson(
		`${GDELT_API}?${params.toString()}`,
		GDELT_TTL_SECONDS,
		"GDELT",
		undefined,
		GDELT_TIMEOUT_MS,
	);
	const raw = isRecord(data) && Array.isArray(data.articles) ? data.articles : [];
	const seen = new Set<string>();
	const articles = raw.flatMap((item) => {
		const article = parseGdeltArticle(item);

		if (!article || seen.has(article.url)) {
			return [];
		}

		seen.add(article.url);

		return [article];
	});

	return {
		articles: articles.slice(0, limit),
		count: Math.min(articles.length, limit),
		query: topic,
		source: {
			cache: "Cached for up to 5 minutes.",
			name: "GDELT DOC 2.0",
			note: `English-language coverage from the last ${window}, newest first. Headlines and links only. GDELT asks for at most one request every 5 seconds.`,
			url: "https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/",
		},
		window,
	};
}

function onThisDayDate(input: string) {
	try {
		return parseCalendarDate(input.trim() || "today");
	} catch (error) {
		if (error instanceof CalendarDateError) {
			throw new NewsBriefingError(
				"Enter the date as YYYY-MM-DD, such as 2026-07-20, or leave it empty for today.",
			);
		}

		throw error;
	}
}

function parseWikiPage(value: unknown) {
	if (!isRecord(value)) {
		return undefined;
	}

	const titles = isRecord(value.titles) ? value.titles : undefined;
	const canonical = text(titles?.canonical);
	const title = text(titles?.normalized) ?? canonical;
	const urls = isRecord(value.content_urls) ? value.content_urls : undefined;
	const desktop = isRecord(urls?.desktop) ? urls.desktop : undefined;
	const url = text(desktop?.page);

	return title && url ? { title, url } : undefined;
}

function parseWikiEvent(value: unknown) {
	if (!isRecord(value)) {
		return undefined;
	}

	const summary = text(value.text);

	if (!summary) {
		return undefined;
	}

	const pages = Array.isArray(value.pages) ? value.pages : [];

	return {
		articles: pages.flatMap((page) => {
			const parsed = parseWikiPage(page);

			return parsed ? [parsed] : [];
		}),
		text: summary,
		year: typeof value.year === "number" ? value.year : undefined,
	};
}

async function onThisDay(input: string, options: NewsBriefingOptions) {
	const { day, month } = onThisDayDate(input);
	const limit = readLimit(options.limit, WIKI_DEFAULT, WIKI_MAX);
	const mm = String(month).padStart(2, "0");
	const dd = String(day).padStart(2, "0");
	const data = await loadJson(`${WIKI_API}/${mm}/${dd}`, WIKI_TTL_SECONDS, "Wikimedia", {
		"Api-User-Agent": WIKI_USER_AGENT,
		"User-Agent": WIKI_USER_AGENT,
	});
	const raw = isRecord(data) && Array.isArray(data.selected) ? data.selected : [];
	const events = raw
		.flatMap((item) => {
			const event = parseWikiEvent(item);

			return event ? [event] : [];
		})
		.slice(0, limit);

	if (events.length === 0) {
		throw new NewsBriefingError(`Wikipedia has no selected events for ${mm}-${dd}.`, 404);
	}

	return {
		date: `${mm}-${dd}`,
		events,
		source: {
			cache: "Cached for up to a day.",
			license: "Wikipedia text is available under CC BY-SA 4.0.",
			name: "Wikipedia, On this day",
			note: "Selected events for this date, with links to the articles.",
			url: "https://en.wikipedia.org/wiki/Wikipedia:On_this_day",
		},
	};
}

export async function buildNewsBriefing(
	input: string,
	format: NewsBriefingFormat,
	options: NewsBriefingOptions,
) {
	if (format === "hacker-news") {
		return hackerNews(options);
	}

	if (format === "search") {
		return search(input, options);
	}

	return onThisDay(input, options);
}
