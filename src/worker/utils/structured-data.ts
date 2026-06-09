import type { StringRecord } from "../../shared/records.ts";
import { uniqueKeys } from "../../shared/records.ts";
import { escapeXml } from "./text.ts";

export function parseKeyValueText(input: string): StringRecord | undefined {
	const lines = input
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line !== "" && !line.startsWith("#") && !line.startsWith(";"));
	if (lines.length === 0) {
		return undefined;
	}

	const entries: Array<[string, string]> = [];
	let section = "";
	for (const line of lines) {
		const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
		if (sectionMatch) {
			section = normaliseKey(sectionMatch[1]);
			continue;
		}

		const match = /^(?:export\s+)?([A-Za-z_][\w.-]*)\s*[=:]\s*(.*)$/.exec(line);
		if (!match) {
			return undefined;
		}

		const key = section ? `${section}.${normaliseKey(match[1])}` : normaliseKey(match[1]);
		entries.push([key, unquoteValue(match[2].trim())]);
	}

	if (entries.length === 0) {
		return undefined;
	}

	return Object.fromEntries(entries);
}

export function parseXmlRecords(input: string): StringRecord[] {
	const withoutDeclaration = input.replace(/<\?xml\b[^>]*\?>/gi, "").trim();
	const itemRecords = [...withoutDeclaration.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)]
		.map((match) => parseXmlRecord(match[1]))
		.filter((record) => Object.keys(record).length > 0);
	if (itemRecords.length > 0) {
		return itemRecords;
	}

	const root = /^<([A-Za-z_][\w.-]*)\b[^>]*>([\s\S]*)<\/\1>$/.exec(withoutDeclaration);
	if (root) {
		const record = parseXmlRecord(root[2]);
		return Object.keys(record).length > 0 ? [record] : [];
	}

	return [];
}

export function recordsToYaml(records: readonly StringRecord[]) {
	if (records.length === 0) {
		return "";
	}

	return records
		.map((record) => {
			const entries = Object.entries(record);
			if (entries.length === 0) {
				return "- {}";
			}

			return entries
				.map(([key, value], index) => `${index === 0 ? "- " : "  "}${key}: ${yamlScalar(value)}`)
				.join("\n");
		})
		.join("\n");
}

export function recordToYaml(record: StringRecord) {
	return Object.entries(record)
		.map(([key, value]) => `${key}: ${yamlScalar(value)}`)
		.join("\n");
}

export function recordsToToml(records: readonly StringRecord[], collectionName = "items") {
	if (records.length === 0) {
		return "";
	}

	return records
		.map((record) => [
			`[[${tomlKey(collectionName)}]]`,
			...Object.entries(record).map(([key, value]) => `${tomlKey(key)} = ${quotedString(value)}`),
		].join("\n"))
		.join("\n\n");
}

export function recordToToml(record: StringRecord) {
	return Object.entries(record)
		.map(([key, value]) => `${tomlKey(key)} = ${quotedString(value)}`)
		.join("\n");
}

export function recordsToXml(records: readonly StringRecord[], rootName = "items", itemName = "item") {
	return [
		"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
		`<${xmlName(rootName)}>`,
		...records.flatMap((record) => [
			`\t<${xmlName(itemName)}>`,
			...Object.entries(record).map(([key, value]) => `\t\t<${xmlName(key)}>${escapeXml(value)}</${xmlName(key)}>`),
			`\t</${xmlName(itemName)}>`,
		]),
		`</${xmlName(rootName)}>`,
	].join("\n");
}

export function recordToXml(record: StringRecord, rootName = "item") {
	return [
		"<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
		`<${xmlName(rootName)}>`,
		...Object.entries(record).map(([key, value]) => `\t<${xmlName(key)}>${escapeXml(value)}</${xmlName(key)}>`),
		`</${xmlName(rootName)}>`,
	].join("\n");
}

export function recordToIni(record: StringRecord) {
	return Object.entries(record)
		.map(([key, value]) => `${normaliseKey(key)}=${value}`)
		.join("\n");
}

export function recordToEnv(record: StringRecord) {
	return Object.entries(record)
		.map(([key, value]) => `${envKey(key)}=${envValue(value)}`)
		.join("\n");
}

export function recordsToSqlInserts(records: readonly StringRecord[], tableName: string) {
	if (records.length === 0) {
		return "";
	}

	const columns = uniqueKeys(records);
	const table = sqlIdentifier(tableName);
	return records
		.map((record) => {
			const values = columns.map((column) => sqlString(record[column] ?? ""));
			return `INSERT INTO ${table} (${columns.map(sqlIdentifier).join(", ")}) VALUES (${values.join(", ")});`;
		})
		.join("\n");
}

export function sourceNameStem(sourceName: string) {
	const basename = sourceName.split(/[\\/]/).pop() || "data";
	return basename.replace(/\.[^.]+$/, "") || "data";
}

function unquoteValue(value: string) {
	if (
		(value.startsWith("\"") && value.endsWith("\"")) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1);
	}

	return value;
}

function parseXmlRecord(input: string): StringRecord {
	const entries: Array<[string, string]> = [];
	for (const match of input.matchAll(/<([A-Za-z_][\w.-]*)\b[^>]*>([^<>]*)<\/\1>/g)) {
		entries.push([normaliseKey(match[1]), decodeXml(match[2].trim())]);
	}

	return Object.fromEntries(entries);
}

function decodeXml(value: string) {
	return value
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, "\"")
		.replace(/&#39;|&apos;/g, "'");
}

function yamlScalar(value: string) {
	if (/^[A-Za-z0-9_./:@ -]+$/.test(value) && value.trim() === value && value !== "") {
		return value;
	}

	return quotedString(value);
}

function quotedString(value: string) {
	return `"${value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\r?\n/g, "\\n")}"`;
}

function normaliseKey(key: string) {
	return key.trim().replace(/\s+/g, "_");
}

function tomlKey(key: string) {
	const normalised = normaliseKey(key);
	return /^[A-Za-z0-9_-]+$/.test(normalised) ? normalised : quotedString(normalised);
}

function xmlName(name: string) {
	const cleaned = normaliseKey(name).replace(/[^A-Za-z0-9_.-]/g, "_");
	const safe = cleaned || "item";
	return /^[A-Za-z_]/.test(safe) ? safe : `_${safe}`;
}

function envKey(key: string) {
	const cleaned = normaliseKey(key).replace(/[^A-Za-z0-9_]/g, "_").toUpperCase();
	const safe = cleaned || "VALUE";
	return /^[A-Z_]/.test(safe) ? safe : `VALUE_${safe}`;
}

function envValue(value: string) {
	return /^[A-Za-z0-9_./:@-]*$/.test(value) ? value : quotedString(value);
}

function sqlIdentifier(value: string) {
	const cleaned = sourceNameStem(value).replace(/[^A-Za-z0-9_]/g, "_");
	const safe = cleaned || "data";
	return /^[A-Za-z_]/.test(safe) ? safe : `data_${safe}`;
}

function sqlString(value: string) {
	return `'${value.replace(/'/g, "''")}'`;
}
