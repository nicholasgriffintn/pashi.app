import { Hono } from "hono";
import { isbot } from "isbot";
function requireInput(input) {
  if (!input) {
    throw new Error("Enter input first.");
  }
  return input;
}
function parseLength(input, fallback, min, max) {
  return parseInteger(input, fallback, min, max);
}
function parseCount(input, fallback = 1, max = 1e3) {
  return parseInteger(input, fallback, 1, max);
}
function parseInteger(input, fallback, min, max) {
  const parsed = parseStrictInteger(input, fallback);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}
function parseNumber(input, fallback, min, max) {
  const parsed = parseStrictNumber(input, fallback);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}
function parseStrictInteger(input, fallback) {
  const trimmed = input.trim();
  if (!trimmed) {
    return fallback;
  }
  return /^[+-]?\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}
function parseStrictNumber(input, fallback) {
  const trimmed = input.trim();
  if (!trimmed) {
    return fallback;
  }
  return /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed) ? Number(trimmed) : Number.NaN;
}
function parseBoolean(input, fallback) {
  if (!input) {
    return fallback;
  }
  const normalised = input.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalised)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalised)) {
    return false;
  }
  return fallback;
}
function parseChoice(input, options, fallback) {
  const normalised = input?.trim().toLowerCase();
  return options.find((option) => option === normalised) ?? fallback;
}
function parseDelimitedList(input) {
  return input.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
}
function parseDate(input) {
  if (!input) {
    return /* @__PURE__ */ new Date();
  }
  const numeric = Number(input);
  if (Number.isFinite(numeric)) {
    return new Date(input.length <= 10 ? numeric * 1e3 : numeric);
  }
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? /* @__PURE__ */ new Date() : parsed;
}
function randomDateInRange(startInput, endInput) {
  const start = parseDate(startInput);
  const end = parseDate(endInput);
  const lower = Math.min(start.getTime(), end.getTime());
  const upper = Math.max(start.getTime(), end.getTime());
  return new Date(Math.floor(lower + randomUnitInterval() * (upper - lower + 1)));
}
function randomBytes(length) {
  const bytes2 = new Uint8Array(length);
  crypto.getRandomValues(bytes2);
  return bytes2;
}
function randomCharacters(alphabet, length) {
  return Array.from(randomBytes(length), (byte) => alphabet[byte % alphabet.length]).join("");
}
function randomHex(length) {
  return randomCharacters("0123456789abcdef", length);
}
function randomChoice(items) {
  const item = items[randomIntegerInRange(items.length)];
  if (item === void 0) {
    throw new Error("No items available.");
  }
  return item;
}
function singleOrList(values) {
  const first = values[0];
  return values.length === 1 && first !== void 0 ? first : [...values];
}
function shuffle(items) {
  const shuffled = [...items];
  for (let index2 = shuffled.length - 1; index2 > 0; index2 -= 1) {
    const swapIndex = randomIntegerInRange(index2 + 1);
    [shuffled[index2], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index2]];
  }
  return shuffled;
}
function randomIntegerInRange(maxExclusive) {
  const range = Math.max(1, maxExclusive);
  const maxUint32 = 4294967296;
  const limit = Math.floor(maxUint32 / range) * range;
  let value = randomUint32();
  while (value >= limit) {
    value = randomUint32();
  }
  return value % range;
}
function randomIntegerBetween(min, max) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return lower + randomIntegerInRange(upper - lower + 1);
}
function randomUnitInterval() {
  return randomIntegerInRange(1e9) / 1e9;
}
function slugify(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/-{2,}/g, "-");
}
async function sha256(value) {
  return createDigest(value, "SHA-256");
}
async function createDigest(value, algorithm) {
  if (algorithm === "MD5") {
    return createMd5Digest(new TextEncoder().encode(value));
  }
  const digest = await crypto.subtle.digest(algorithm, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function base64Encode(value) {
  return bytesToBase64$1(new TextEncoder().encode(value));
}
function bytesToBase64$1(bytes2) {
  let binary = "";
  for (const byte of bytes2) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary);
}
function bytesToBase64Url(bytes2) {
  return bytesToBase64$1(bytes2).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
function base64UrlToBytes(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}
function concatBytes$1(chunks) {
  const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0);
  const bytes2 = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes2.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes2;
}
function hashSeed(value) {
  let hash = 2166136261;
  for (let index2 = 0; index2 < value.length; index2 += 1) {
    hash ^= value.charCodeAt(index2);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}
function randomUint32() {
  const bytes2 = randomBytes(4);
  return bytes2[0] * 16777216 + (bytes2[1] << 16) + (bytes2[2] << 8) + bytes2[3];
}
function createMd5Digest(value) {
  const padded = createMd5PaddedBytes(value);
  let a = 1732584193;
  let b = 4023233417;
  let c = 2562383102;
  let d = 271733878;
  for (let offset = 0; offset < padded.length; offset += 64) {
    const words2 = Array.from(
      { length: 16 },
      (_, index2) => readLittleEndianUint32(padded, offset + index2 * 4)
    );
    const initialA = a;
    const initialB = b;
    const initialC = c;
    const initialD = d;
    for (let index2 = 0; index2 < 64; index2 += 1) {
      const { mix, wordIndex } = md5RoundValues(index2, b, c, d);
      const next = d;
      d = c;
      c = b;
      b = addUint32(
        b,
        rotateLeft(
          addUint32(a, mix, MD5_CONSTANTS[index2], words2[wordIndex]),
          MD5_SHIFTS[index2]
        )
      );
      a = next;
    }
    a = addUint32(a, initialA);
    b = addUint32(b, initialB);
    c = addUint32(c, initialC);
    d = addUint32(d, initialD);
  }
  return [a, b, c, d].map(littleEndianHex).join("");
}
function createMd5PaddedBytes(bytes2) {
  const bitLength = bytes2.length * 8;
  const paddedLength = ((bytes2.length + 8 >> 6) + 1) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes2);
  padded[bytes2.length] = 128;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, bitLength >>> 0, true);
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 4294967296), true);
  return padded;
}
function md5RoundValues(index2, b, c, d) {
  if (index2 < 16) {
    return { mix: b & c | ~b & d, wordIndex: index2 };
  }
  if (index2 < 32) {
    return { mix: d & b | ~d & c, wordIndex: (5 * index2 + 1) % 16 };
  }
  if (index2 < 48) {
    return { mix: b ^ c ^ d, wordIndex: (3 * index2 + 5) % 16 };
  }
  return { mix: c ^ (b | ~d), wordIndex: 7 * index2 % 16 };
}
function addUint32(...values) {
  return values.reduce((total, value) => total + value >>> 0, 0);
}
function rotateLeft(value, shift) {
  return (value << shift | value >>> 32 - shift) >>> 0;
}
function readLittleEndianUint32(bytes2, offset) {
  return (bytes2[offset] | bytes2[offset + 1] << 8 | bytes2[offset + 2] << 16 | bytes2[offset + 3] << 24) >>> 0;
}
function littleEndianHex(value) {
  return Array.from(
    { length: 4 },
    (_, index2) => (value >>> index2 * 8 & 255).toString(16).padStart(2, "0")
  ).join("");
}
const MD5_SHIFTS = [
  7,
  12,
  17,
  22,
  7,
  12,
  17,
  22,
  7,
  12,
  17,
  22,
  7,
  12,
  17,
  22,
  5,
  9,
  14,
  20,
  5,
  9,
  14,
  20,
  5,
  9,
  14,
  20,
  5,
  9,
  14,
  20,
  4,
  11,
  16,
  23,
  4,
  11,
  16,
  23,
  4,
  11,
  16,
  23,
  4,
  11,
  16,
  23,
  6,
  10,
  15,
  21,
  6,
  10,
  15,
  21,
  6,
  10,
  15,
  21,
  6,
  10,
  15,
  21
];
const MD5_CONSTANTS = [
  3614090360,
  3905402710,
  606105819,
  3250441966,
  4118548399,
  1200080426,
  2821735955,
  4249261313,
  1770035416,
  2336552879,
  4294925233,
  2304563134,
  1804603682,
  4254626195,
  2792965006,
  1236535329,
  4129170786,
  3225465664,
  643717713,
  3921069994,
  3593408605,
  38016083,
  3634488961,
  3889429448,
  568446438,
  3275163606,
  4107603335,
  1163531501,
  2850285829,
  4243563512,
  1735328473,
  2368359562,
  4294588738,
  2272392833,
  1839030562,
  4259657740,
  2763975236,
  1272893353,
  4139469664,
  3200236656,
  681279174,
  3936430074,
  3572445317,
  76029189,
  3654602809,
  3873151461,
  530742520,
  3299628645,
  4096336452,
  1126891415,
  2878612391,
  4237533241,
  1700485571,
  2399980690,
  4293915773,
  2240044497,
  1873313359,
  4264355552,
  2734768916,
  1309151649,
  4149444226,
  3174756917,
  718787259,
  3951481745
];
const APPLICATION_KEY_PREFIX = "applications:v1:";
const API_KEY_PREFIX = "api-keys:v1:";
const API_KEY_PATTERN = /^[A-Za-z0-9._~-]{32,256}$/;
const APPLICATION_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
async function authenticateApplication(request, env) {
  const credential = readApiKey(request.headers);
  if (credential.status !== "present") {
    return { status: credential.status };
  }
  if (!env.APPLICATIONS) {
    return { status: "unavailable" };
  }
  const digest = await sha256(credential.value);
  const apiKeyValue = await readKvValue(env.APPLICATIONS, `${API_KEY_PREFIX}${digest}`);
  if (apiKeyValue.status !== "found") {
    return apiKeyValue.status === "unavailable" ? { status: "unavailable" } : { status: "invalid" };
  }
  const apiKey = parseApiKeyRecord(apiKeyValue.value);
  if (!apiKey?.enabled) {
    return { status: "invalid" };
  }
  const applicationValue = await readKvValue(
    env.APPLICATIONS,
    `${APPLICATION_KEY_PREFIX}${apiKey.applicationId}`
  );
  if (applicationValue.status !== "found") {
    return applicationValue.status === "unavailable" ? { status: "unavailable" } : { status: "invalid" };
  }
  const application = parseApplication(applicationValue.value);
  if (!application?.enabled || application.id !== apiKey.applicationId) {
    return { status: "invalid" };
  }
  return { application, status: "authenticated" };
}
function readApiKey(headers) {
  const authorization = headers.get("authorization");
  const headerKey = headers.get("x-api-key")?.trim();
  let bearerKey;
  if (authorization) {
    const match = authorization.match(/^\s*Bearer\s+(\S+)\s*$/i);
    if (match) {
      bearerKey = match[1];
    } else if (/^\s*Bearer\b/i.test(authorization)) {
      return { status: "invalid" };
    }
  }
  if (bearerKey && headerKey && bearerKey !== headerKey) {
    return { status: "invalid" };
  }
  const value = bearerKey ?? headerKey;
  if (!value) {
    return { status: "absent" };
  }
  return API_KEY_PATTERN.test(value) ? { status: "present", value } : { status: "invalid" };
}
async function readKvValue(namespace, key) {
  try {
    const value = await namespace.get(key);
    return value === null ? { status: "missing" } : { status: "found", value };
  } catch {
    return { status: "unavailable" };
  }
}
function parseApiKeyRecord(value) {
  const record = parseJsonRecord(value);
  if (!record || typeof record.applicationId !== "string" || !APPLICATION_ID_PATTERN.test(record.applicationId) || typeof record.enabled !== "boolean") {
    return void 0;
  }
  return {
    applicationId: record.applicationId,
    enabled: record.enabled
  };
}
function parseApplication(value) {
  const record = parseJsonRecord(value);
  if (!record || typeof record.id !== "string" || !APPLICATION_ID_PATTERN.test(record.id) || typeof record.name !== "string" || record.name.trim().length === 0 || record.name.length > 100 || typeof record.enabled !== "boolean") {
    return void 0;
  }
  return {
    enabled: record.enabled,
    id: record.id,
    name: record.name
  };
}
function parseJsonRecord(value) {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : void 0;
  } catch {
    return void 0;
  }
}
async function requireApiKey(c) {
  if (c.get("application")) {
    return void 0;
  }
  const authentication = await authenticateApplication(c.req.raw, c.env);
  if (authentication.status === "authenticated") {
    c.set("application", authentication.application);
    return void 0;
  }
  if (authentication.status === "unavailable") {
    return c.json(
      { error: "API key authentication is unavailable." },
      503,
      { "Cache-Control": "no-store" }
    );
  }
  return c.json(
    { error: "A valid API key is required for this operation." },
    401,
    {
      "Cache-Control": "no-store",
      "WWW-Authenticate": 'Bearer realm="Pashi API"'
    }
  );
}
const blockBots = async (c, next) => {
  const userAgent = c.req.header("user-agent") ?? "";
  if (userAgent && isbot(userAgent)) {
    const authentication = await authenticateApplication(c.req.raw, c.env);
    if (authentication.status !== "authenticated") {
      return c.text("Forbidden", 403, {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow"
      });
    }
    c.set("application", authentication.application);
  }
  await next();
  if (c.get("application")) {
    c.res.headers.set("Cache-Control", "private, no-store");
  }
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isStringRecord(value) {
  return isRecord(value) && Object.values(value).every((item) => typeof item === "string");
}
function isStringRecordArray(value) {
  return Array.isArray(value) && value.every(isStringRecord);
}
function isRecordArray(value) {
  return value.every(isStringRecord);
}
function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
function recordToText(record) {
  return Object.entries(record).map(([key, value]) => `${key}: ${value}`).join("\n");
}
function uniqueKeys(records) {
  return [...new Set(records.flatMap((record) => Object.keys(record)))];
}
function csvRow(values) {
  return values.map(csvValue).join(",");
}
function csvValue(value) {
  return `"${value.replace(/"/g, '""')}"`;
}
function recordsToCsv(records) {
  if (records.length === 0) {
    return "";
  }
  const columns = [...new Set(records.flatMap((record) => Object.keys(record)))];
  return [
    csvRow(columns),
    ...records.map((record) => csvRow(columns.map((column) => record[column] ?? "")))
  ].join("\n");
}
function parseCsv(value) {
  const rows = parseCsvRows(value);
  return recordsFromRows(rows);
}
function parseTsv(value) {
  const rows = value.split(/\r?\n/).map((row) => row.split("	"));
  return recordsFromRows(rows);
}
function recordsFromRows(rows) {
  const [headers, ...body] = rows;
  if (!headers?.length) {
    return [];
  }
  return body.filter((row) => row.some((cell) => cell.trim())).map(
    (row) => Object.fromEntries(headers.map((header, index2) => [header || `column_${index2 + 1}`, row[index2] ?? ""]))
  );
}
function parseCsvRows(value) {
  const rows = [];
  let cell = "";
  let row = [];
  let inQuotes = false;
  for (let index2 = 0; index2 < value.length; index2 += 1) {
    const char = value[index2];
    const nextChar = value[index2 + 1];
    if (char === '"' && inQuotes && nextChar === '"') {
      cell += '"';
      index2 += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index2 += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function safeFilename(value) {
  return value.replace(/[^a-z0-9_-]/gi, "-").toLowerCase() || "pashi";
}
function safeHttpUrl(value) {
  if (!value?.trim()) {
    return void 0;
  }
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? value.trim() : void 0;
  } catch {
    return void 0;
  }
}
function todayIsoDate() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function parseKeyValueText(input) {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter((line) => line !== "" && !line.startsWith("#") && !line.startsWith(";"));
  if (lines.length === 0) {
    return void 0;
  }
  const entries = [];
  let section = "";
  for (const line of lines) {
    const sectionMatch = /^\[([^\]]+)\]$/.exec(line);
    if (sectionMatch) {
      section = normaliseKey(sectionMatch[1]);
      continue;
    }
    const match = /^(?:export\s+)?([A-Za-z_][\w.-]*)\s*[=:]\s*(.*)$/.exec(line);
    if (!match) {
      return void 0;
    }
    const key = section ? `${section}.${normaliseKey(match[1])}` : normaliseKey(match[1]);
    entries.push([key, unquoteValue(match[2].trim())]);
  }
  if (entries.length === 0) {
    return void 0;
  }
  return Object.fromEntries(entries);
}
function parseXmlRecords(input) {
  const withoutDeclaration = input.replace(/<\?xml\b[^>]*\?>/gi, "").trim();
  const itemRecords = [...withoutDeclaration.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map((match) => parseXmlRecord(match[1])).filter((record) => Object.keys(record).length > 0);
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
function recordsToYaml(records) {
  if (records.length === 0) {
    return "";
  }
  return records.map((record) => {
    const entries = Object.entries(record);
    if (entries.length === 0) {
      return "- {}";
    }
    return entries.map(([key, value], index2) => `${index2 === 0 ? "- " : "  "}${key}: ${yamlScalar(value)}`).join("\n");
  }).join("\n");
}
function recordToYaml(record) {
  return Object.entries(record).map(([key, value]) => `${key}: ${yamlScalar(value)}`).join("\n");
}
function recordsToToml(records, collectionName = "items") {
  if (records.length === 0) {
    return "";
  }
  return records.map((record) => [
    `[[${tomlKey(collectionName)}]]`,
    ...Object.entries(record).map(([key, value]) => `${tomlKey(key)} = ${quotedString(value)}`)
  ].join("\n")).join("\n\n");
}
function recordToToml(record) {
  return Object.entries(record).map(([key, value]) => `${tomlKey(key)} = ${quotedString(value)}`).join("\n");
}
function recordsToXml(records, rootName = "items", itemName = "item") {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<${xmlName(rootName)}>`,
    ...records.flatMap((record) => [
      `	<${xmlName(itemName)}>`,
      ...Object.entries(record).map(([key, value]) => `		<${xmlName(key)}>${escapeXml(value)}</${xmlName(key)}>`),
      `	</${xmlName(itemName)}>`
    ]),
    `</${xmlName(rootName)}>`
  ].join("\n");
}
function recordToXml(record, rootName = "item") {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<${xmlName(rootName)}>`,
    ...Object.entries(record).map(([key, value]) => `	<${xmlName(key)}>${escapeXml(value)}</${xmlName(key)}>`),
    `</${xmlName(rootName)}>`
  ].join("\n");
}
function recordToIni(record) {
  return Object.entries(record).map(([key, value]) => `${normaliseKey(key)}=${value}`).join("\n");
}
function recordToEnv(record) {
  return Object.entries(record).map(([key, value]) => `${envKey(key)}=${envValue(value)}`).join("\n");
}
function recordsToSqlInserts(records, tableName) {
  if (records.length === 0) {
    return "";
  }
  const columns = uniqueKeys(records);
  const table = sqlIdentifier(tableName);
  return records.map((record) => {
    const values = columns.map((column) => sqlString(record[column] ?? ""));
    return `INSERT INTO ${table} (${columns.map(sqlIdentifier).join(", ")}) VALUES (${values.join(", ")});`;
  }).join("\n");
}
function sourceNameStem(sourceName2) {
  const basename = sourceName2.split(/[\\/]/).pop() || "data";
  return basename.replace(/\.[^.]+$/, "") || "data";
}
function unquoteValue(value) {
  if (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1);
  }
  return value;
}
function parseXmlRecord(input) {
  const entries = [];
  for (const match of input.matchAll(/<([A-Za-z_][\w.-]*)\b[^>]*>([^<>]*)<\/\1>/g)) {
    entries.push([normaliseKey(match[1]), decodeXml(match[2].trim())]);
  }
  return Object.fromEntries(entries);
}
function decodeXml(value) {
  return value.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
}
function yamlScalar(value) {
  if (/^[A-Za-z0-9_./:@ -]+$/.test(value) && value.trim() === value && value !== "") {
    return value;
  }
  return quotedString(value);
}
function quotedString(value) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n")}"`;
}
function normaliseKey(key) {
  return key.trim().replace(/\s+/g, "_");
}
function tomlKey(key) {
  const normalised = normaliseKey(key);
  return /^[A-Za-z0-9_-]+$/.test(normalised) ? normalised : quotedString(normalised);
}
function xmlName(name) {
  const cleaned = normaliseKey(name).replace(/[^A-Za-z0-9_.-]/g, "_");
  const safe = cleaned || "item";
  return /^[A-Za-z_]/.test(safe) ? safe : `_${safe}`;
}
function envKey(key) {
  const cleaned = normaliseKey(key).replace(/[^A-Za-z0-9_]/g, "_").toUpperCase();
  const safe = cleaned || "VALUE";
  return /^[A-Z_]/.test(safe) ? safe : `VALUE_${safe}`;
}
function envValue(value) {
  return /^[A-Za-z0-9_./:@-]*$/.test(value) ? value : quotedString(value);
}
function sqlIdentifier(value) {
  const cleaned = sourceNameStem(value).replace(/[^A-Za-z0-9_]/g, "_");
  const safe = cleaned || "data";
  return /^[A-Za-z_]/.test(safe) ? safe : `data_${safe}`;
}
function sqlString(value) {
  return `'${value.replace(/'/g, "''")}'`;
}
const TEXT_FILE_FORMATS = ["txt", "md", "json", "csv", "tsv", "html", "xls", "yaml", "toml", "xml", "ini", "properties", "env", "sql"];
function isTextFileFormat(value) {
  return TEXT_FILE_FORMATS.some((format) => format === value);
}
const MIME_TYPES = {
  csv: "text/csv;charset=utf-8",
  env: "text/plain;charset=utf-8",
  html: "text/html;charset=utf-8",
  ini: "text/plain;charset=utf-8",
  json: "application/json;charset=utf-8",
  md: "text/markdown;charset=utf-8",
  properties: "text/plain;charset=utf-8",
  sql: "application/sql;charset=utf-8",
  toml: "application/toml;charset=utf-8",
  tsv: "text/tab-separated-values;charset=utf-8",
  txt: "text/plain;charset=utf-8",
  xls: "application/vnd.ms-excel;charset=utf-8",
  xml: "application/xml;charset=utf-8",
  yaml: "application/yaml;charset=utf-8"
};
function convertTextFileContent(input, outputFormat, sourceName2 = "file") {
  const content = createConvertedContent(input, outputFormat, sourceName2);
  return {
    content,
    extension: outputFormat,
    mimeType: MIME_TYPES[outputFormat],
    preview: content.slice(0, 4e3)
  };
}
function createConvertedContent(input, outputFormat, sourceName2) {
  const source = readSourceContent(input, sourceName2);
  switch (outputFormat) {
    case "csv":
      return convertToCsv(source);
    case "env":
      return convertToKeyValue(source, "env");
    case "html":
      return createHtmlDocument(source, sourceName2);
    case "ini":
      return convertToKeyValue(source, "ini");
    case "json":
      return convertToJson(source, sourceName2);
    case "md":
      return convertToMarkdown(source, sourceName2);
    case "properties":
      return convertToKeyValue(source, "properties");
    case "sql":
      return convertToSql(source, sourceName2);
    case "toml":
      return convertToToml(source);
    case "tsv":
      return convertToTsv(source);
    case "txt":
      return source.text;
    case "xls":
      return createExcelHtmlDocument(source, sourceName2);
    case "xml":
      return convertToXml(source);
    case "yaml":
      return convertToYaml(source);
  }
}
function readSourceContent(input, sourceName2 = "file") {
  const parsedJson = parseJson$5(input);
  if (isStringRecordArray(parsedJson)) {
    return {
      records: parsedJson,
      text: JSON.stringify(parsedJson, null, 2),
      values: []
    };
  }
  if (isStringRecord(parsedJson)) {
    return {
      keyValues: parsedJson,
      records: [],
      text: JSON.stringify(parsedJson, null, 2),
      values: []
    };
  }
  if (isStringArray(parsedJson)) {
    return {
      records: [],
      text: parsedJson.join("\n"),
      values: parsedJson
    };
  }
  const xmlRecords = shouldPreferXmlSource(sourceName2, input) ? parseXmlRecords(input) : [];
  if (xmlRecords.length > 0) {
    return {
      records: xmlRecords,
      text: input,
      values: []
    };
  }
  const keyValues = parseKeyValueText(input);
  if (keyValues && shouldPreferKeyValueSource(sourceName2, input)) {
    return {
      keyValues,
      records: [],
      text: input,
      values: []
    };
  }
  const tsvRecords = shouldPreferTsvSource(sourceName2, input) ? parseTsv(input) : [];
  if (tsvRecords.length > 0) {
    return {
      records: tsvRecords,
      text: input,
      values: []
    };
  }
  const csvRecords = parseCsv(input);
  if (csvRecords.length > 0) {
    return {
      records: csvRecords,
      text: input,
      values: []
    };
  }
  return {
    records: [],
    text: stripHtml(input),
    values: []
  };
}
function convertToTsv(source) {
  if (source.keyValues) {
    return recordsToTsv([source.keyValues]);
  }
  if (source.records.length > 0) {
    return recordsToTsv(source.records);
  }
  if (source.values.length > 0) {
    return ["value", ...source.values].join("\n");
  }
  return ["line", ...source.text.split(/\r?\n/)].join("\n");
}
function convertToCsv(source) {
  if (source.keyValues) {
    return recordsToCsv([source.keyValues]);
  }
  if (source.records.length > 0) {
    return recordsToCsv(source.records);
  }
  if (source.values.length > 0) {
    return [csvRow(["value"]), ...source.values.map((item) => csvRow([item]))].join("\n");
  }
  return [csvRow(["line"]), ...source.text.split(/\r?\n/).map((line) => csvRow([line]))].join("\n");
}
function convertToJson(source, sourceName2) {
  if (source.keyValues) {
    return JSON.stringify(source.keyValues, null, 2);
  }
  if (source.records.length > 0) {
    return JSON.stringify(source.records, null, 2);
  }
  if (source.values.length > 0) {
    return JSON.stringify(source.values, null, 2);
  }
  return JSON.stringify({
    content: source.text,
    name: sourceName2
  }, null, 2);
}
function convertToMarkdown(source, sourceName2) {
  if (source.keyValues) {
    return recordsToMarkdownTable([source.keyValues]);
  }
  if (source.records.length > 0) {
    return recordsToMarkdownTable(source.records);
  }
  if (source.values.length > 0) {
    return source.values.map((value) => `- ${value}`).join("\n");
  }
  return `# ${sourceName2}

${source.text}`;
}
function createHtmlDocument(source, sourceName2) {
  const body = source.keyValues ? recordsToHtmlTable([source.keyValues]) : source.records.length > 0 ? recordsToHtmlTable(source.records) : `<pre>${escapeXml(source.text)}</pre>`;
  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    `	<title>${escapeXml(sourceName2)}</title>`,
    '	<meta charset="utf-8">',
    "</head>",
    "<body>",
    `	${body}`,
    "</body>",
    "</html>"
  ].join("\n");
}
function createExcelHtmlDocument(source, sourceName2) {
  const body = source.keyValues ? recordsToHtmlTable([source.keyValues]) : source.records.length > 0 ? recordsToHtmlTable(source.records) : recordsToHtmlTable([{ content: source.text }]);
  return [
    "<html>",
    "<head>",
    `	<meta charset="utf-8">`,
    `	<title>${escapeXml(sourceName2)}</title>`,
    "</head>",
    "<body>",
    `	${body}`,
    "</body>",
    "</html>"
  ].join("\n");
}
function convertToYaml(source) {
  if (source.keyValues) {
    return recordToYaml(source.keyValues);
  }
  if (source.records.length > 0) {
    return recordsToYaml(source.records);
  }
  return recordToYaml({ content: source.text });
}
function convertToToml(source) {
  if (source.keyValues) {
    return recordToToml(source.keyValues);
  }
  if (source.records.length > 0) {
    return recordsToToml(source.records);
  }
  return recordToToml({ content: source.text });
}
function convertToXml(source) {
  if (source.keyValues) {
    return recordToXml(source.keyValues);
  }
  if (source.records.length > 0) {
    return recordsToXml(source.records);
  }
  return recordToXml({ content: source.text });
}
function convertToKeyValue(source, outputFormat) {
  const record = source.keyValues ?? source.records[0] ?? { content: source.text };
  if (outputFormat === "env") {
    return recordToEnv(record);
  }
  return recordToIni(record);
}
function convertToSql(source, sourceName2) {
  if (source.records.length > 0) {
    return recordsToSqlInserts(source.records, sourceNameStem(sourceName2));
  }
  return recordsToSqlInserts([source.keyValues ?? { content: source.text }], sourceNameStem(sourceName2));
}
function recordsToMarkdownTable(records) {
  const columns = uniqueKeys(records);
  if (columns.length === 0) {
    return "";
  }
  return [
    `| ${columns.map(markdownTableCell).join(" | ")} |`,
    `| ${columns.map(() => "---").join(" | ")} |`,
    ...records.map((record) => `| ${columns.map((column) => markdownTableCell(record[column] ?? "")).join(" | ")} |`)
  ].join("\n");
}
function recordsToTsv(records) {
  const columns = uniqueKeys(records);
  if (columns.length === 0) {
    return "";
  }
  return [
    columns.map(tsvCell).join("	"),
    ...records.map((record) => columns.map((column) => tsvCell(record[column] ?? "")).join("	"))
  ].join("\n");
}
function tsvCell(value) {
  return value.replace(/\t/g, " ").replace(/\r?\n/g, " ");
}
function markdownTableCell(value) {
  return value.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}
function recordsToHtmlTable(records) {
  const columns = uniqueKeys(records);
  if (columns.length === 0) {
    return "";
  }
  return [
    "<table>",
    "	<thead>",
    `		<tr>${columns.map((column) => `<th>${escapeXml(column)}</th>`).join("")}</tr>`,
    "	</thead>",
    "	<tbody>",
    ...records.map((record) => `		<tr>${columns.map((column) => `<td>${escapeXml(record[column] ?? "")}</td>`).join("")}</tr>`),
    "	</tbody>",
    "</table>"
  ].join("\n");
}
function stripHtml(input) {
  return input.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").trim();
}
function parseJson$5(input) {
  try {
    return JSON.parse(input);
  } catch {
    return void 0;
  }
}
function shouldPreferKeyValueSource(sourceName2, input) {
  const extension2 = sourceName2.toLowerCase().split(".").pop();
  if (extension2 === "env" || extension2 === "ini" || extension2 === "properties" || extension2 === "toml") {
    return true;
  }
  const nonEmptyLines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return nonEmptyLines.length > 0 && nonEmptyLines.every((line) => /^(?:export\s+)?[A-Za-z_][\w.-]*\s*[=:]/.test(line));
}
function shouldPreferXmlSource(sourceName2, input) {
  const extension2 = sourceName2.toLowerCase().split(".").pop();
  return extension2 === "xml" || /^\s*<\?xml\b/i.test(input);
}
function shouldPreferTsvSource(sourceName2, input) {
  const extension2 = sourceName2.toLowerCase().split(".").pop();
  const firstLine = input.split(/\r?\n/, 1)[0] ?? "";
  return extension2 === "tsv" || extension2 === "tab" || firstLine.includes("	") && !firstLine.includes(",");
}
const TEXT_TRANSFORM_FORMATS = [
  "lowercase",
  "uppercase",
  "title",
  "kebab",
  "snake",
  "camel",
  "reverse",
  "sort-lines",
  "unique-lines",
  "dedupe-words",
  "word-count",
  "character-count",
  "sentence-count",
  "text-size",
  "word-frequency",
  "hashtags",
  "list",
  "repeat",
  "replace",
  "leet",
  "upside-down",
  "binary",
  "from-binary",
  "hex",
  "from-hex",
  "ascii-decimal",
  "ascii-hex",
  "ascii-octal",
  "url-encode",
  "url-decode",
  "unicode-escape",
  "unicode-unescape",
  "normalize-nfc",
  "normalize-nfd",
  "remove-whitespace",
  "remove-zero-width",
  "vertical"
];
class TextTransformError extends Error {
}
const LEET_REPLACEMENTS = {
  a: "4",
  e: "3",
  i: "1",
  l: "1",
  o: "0",
  s: "5",
  t: "7"
};
const UPSIDE_DOWN_REPLACEMENTS = {
  "!": "¡",
  ".": "˙",
  "?": "¿",
  a: "ɐ",
  b: "q",
  c: "ɔ",
  d: "p",
  e: "ǝ",
  f: "ɟ",
  g: "ƃ",
  h: "ɥ",
  i: "ᴉ",
  j: "ɾ",
  k: "ʞ",
  l: "l",
  m: "ɯ",
  n: "u",
  o: "o",
  p: "d",
  q: "b",
  r: "ɹ",
  s: "s",
  t: "ʇ",
  u: "n",
  v: "ʌ",
  w: "ʍ",
  x: "x",
  y: "ʎ",
  z: "z"
};
function isTextTransformFormat(value) {
  return TEXT_TRANSFORM_FORMATS.some((format) => format === value);
}
function transformText(input, format, fields = {}) {
  switch (format) {
    case "ascii-decimal":
      return codePoints(input, 10);
    case "ascii-hex":
      return codePoints(input, 16);
    case "ascii-octal":
      return codePoints(input, 8);
    case "binary":
      return bytes(input).map((byte) => byte.toString(2).padStart(8, "0")).join(" ");
    case "camel":
      return words(input).map((word, index2) => index2 === 0 ? word.toLowerCase() : capitalise(word.toLowerCase())).join("");
    case "character-count":
      return String([...input].length);
    case "dedupe-words":
      return uniqueBy(words(input), (word) => word.toLowerCase()).join(" ");
    case "from-binary":
      return decodeBytes(input, 2);
    case "from-hex":
      return decodeBytes(input, 16);
    case "hashtags":
      return words(input).map((word) => `#${word}`).join(" ");
    case "hex":
      return bytes(input).map((byte) => byte.toString(16).padStart(2, "0")).join(" ");
    case "kebab":
      return words(input).map((word) => word.toLowerCase()).join("-");
    case "leet":
      return input.replace(/[aeilost]/gi, (char) => LEET_REPLACEMENTS[char.toLowerCase()] ?? char);
    case "list":
      return input.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean).join("\n");
    case "lowercase":
      return input.toLowerCase();
    case "normalize-nfc":
      return input.normalize("NFC");
    case "normalize-nfd":
      return input.normalize("NFD");
    case "repeat":
      return repeatInput(input, fields.count);
    case "replace":
      return replaceText(input, fields.search, fields.replace);
    case "remove-whitespace":
      return input.replace(/\s+/g, "");
    case "remove-zero-width":
      return input.replace(/[\u200B-\u200D\uFEFF]/g, "");
    case "reverse":
      return [...input].reverse().join("");
    case "sentence-count":
      return String(sentences(input).length);
    case "snake":
      return words(input).map((word) => word.toLowerCase()).join("_");
    case "sort-lines":
      return input.split(/\r?\n/).sort((left, right) => left.localeCompare(right, void 0, { sensitivity: "base" })).join("\n");
    case "title":
      return words(input).map((word) => capitalise(word.toLowerCase())).join(" ");
    case "text-size": {
      const byteCount = bytes(input).length;
      return `${byteCount} ${byteCount === 1 ? "byte" : "bytes"}`;
    }
    case "unicode-escape":
      return unicodeEscape(input);
    case "unicode-unescape":
      return unicodeUnescape(input);
    case "unique-lines":
      return uniqueBy(input.split(/\r?\n/), (line) => line).join("\n");
    case "uppercase":
      return input.toUpperCase();
    case "upside-down":
      return [...input.toLowerCase()].reverse().map((char) => UPSIDE_DOWN_REPLACEMENTS[char] ?? char).join("");
    case "url-decode":
      return decodeUrlComponent(input);
    case "url-encode":
      return encodeURIComponent(input);
    case "vertical":
      return [...input].join("\n");
    case "word-count":
      return String(words(input).length);
    case "word-frequency":
      return wordFrequency(input);
  }
}
function words(input) {
  return input.match(/[A-Za-z0-9]+/g) ?? [];
}
function sentences(input) {
  return input.match(/[^.!?]+[.!?]+/g) ?? [];
}
function uniqueBy(values, keyFor) {
  const seen = /* @__PURE__ */ new Set();
  const output = [];
  for (const value of values) {
    const key = keyFor(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(value);
  }
  return output;
}
function repeatInput(input, countValue) {
  const count = parseInteger(countValue ?? "", 2, 1, 100);
  return Array.from({ length: count }, () => input).join("\n");
}
function replaceText(input, search, replacement) {
  return search ? input.replaceAll(search, replacement ?? "") : input;
}
function wordFrequency(input) {
  const counts = /* @__PURE__ */ new Map();
  for (const word of words(input).map((value) => value.toLowerCase())) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([leftWord, leftCount], [rightWord, rightCount]) => rightCount - leftCount || leftWord.localeCompare(rightWord)).map(([word, count]) => `${word}: ${count}`).join("\n");
}
function capitalise(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function bytes(input) {
  return [...new TextEncoder().encode(input)];
}
function decodeBytes(input, radix) {
  const values = input.trim().split(/[\s,]+/).filter(Boolean).map((value) => parseByteToken(value, radix));
  if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    throw new TextTransformError("Encoded text contains an invalid byte.");
  }
  return new TextDecoder().decode(new Uint8Array(values));
}
function parseByteToken(value, radix) {
  if (!isByteToken(value, radix)) {
    return Number.NaN;
  }
  return Number.parseInt(value, radix);
}
function isByteToken(value, radix) {
  switch (radix) {
    case 2:
      return /^[01]{1,8}$/.test(value);
    case 16:
      return /^[0-9a-fA-F]{1,2}$/.test(value);
    default:
      return false;
  }
}
function decodeUrlComponent(input) {
  try {
    return decodeURIComponent(input.replace(/\+/g, " "));
  } catch {
    throw new TextTransformError("Enter valid URL-encoded text.");
  }
}
function codePoints(input, radix) {
  return [...input].map((char) => char.codePointAt(0)?.toString(radix) ?? "").join(" ");
}
function unicodeEscape(input) {
  return [...input].map((char) => {
    const codePoint = char.codePointAt(0) ?? 0;
    if (codePoint <= 65535) {
      return escapeCodeUnit(codePoint);
    }
    const value = codePoint - 65536;
    return `${escapeCodeUnit((value >> 10) + 55296)}${escapeCodeUnit((value & 1023) + 56320)}`;
  }).join("");
}
function unicodeUnescape(input) {
  return input.replace(
    /\\u([0-9a-fA-F]{4})/g,
    (_, codeUnit) => String.fromCharCode(Number.parseInt(codeUnit, 16))
  );
}
function escapeCodeUnit(value) {
  return `\\u${value.toString(16).padStart(4, "0")}`;
}
const UNIT_OUTPUTS = [
  "m",
  "km",
  "cm",
  "mm",
  "in",
  "ft",
  "yd",
  "mi",
  "kg",
  "g",
  "lb",
  "oz",
  "c",
  "f",
  "k",
  "b",
  "kb",
  "mb",
  "gb",
  "tb",
  "mps",
  "kph",
  "mph",
  "kn",
  "sqm",
  "sqft",
  "acre",
  "l",
  "ml",
  "gal",
  "deg",
  "rad",
  "s",
  "min",
  "h",
  "pa",
  "kpa",
  "bar",
  "psi",
  "j",
  "kj",
  "kwh",
  "cal",
  "w",
  "kw",
  "hp",
  "n",
  "lbf",
  "hz",
  "khz",
  "mhz",
  "nm",
  "lbft"
];
class UnitConversionError extends Error {
}
const UNITS = {
  acre: linearUnit("area", "acre", 4046.8564224, ["acres"]),
  b: linearUnit("data", "B", 1, ["byte", "bytes"]),
  bar: linearUnit("pressure", "bar", 1e5, ["bars"]),
  c: temperatureUnit("temperature", "°C", (value) => value + 273.15, (value) => value - 273.15, ["celsius", "°c"]),
  cal: linearUnit("energy", "cal", 4.184, ["calorie", "calories"]),
  cm: linearUnit("length", "cm", 0.01, ["centimeter", "centimeters", "centimetre", "centimetres"]),
  deg: linearUnit("angle", "deg", Math.PI / 180, ["degree", "degrees"]),
  f: temperatureUnit("temperature", "°F", (value) => (value - 32) * 5 / 9 + 273.15, (value) => (value - 273.15) * 9 / 5 + 32, ["fahrenheit", "°f"]),
  ft: linearUnit("length", "ft", 0.3048, ["foot", "feet"]),
  g: linearUnit("mass", "g", 1e-3, ["gram", "grams"]),
  gal: linearUnit("volume", "gal", 3.785411784, ["gallon", "gallons"]),
  gb: linearUnit("data", "GB", 1024 ** 3, ["gigabyte", "gigabytes"]),
  h: linearUnit("time", "h", 3600, ["hr", "hour", "hours"]),
  hp: linearUnit("power", "hp", 745.6998715822702, ["horsepower"]),
  hz: linearUnit("frequency", "Hz", 1, ["hertz"]),
  in: linearUnit("length", "in", 0.0254, ["inch", "inches"]),
  j: linearUnit("energy", "J", 1, ["joule", "joules"]),
  k: temperatureUnit("temperature", "K", (value) => value, (value) => value, ["kelvin"]),
  kb: linearUnit("data", "KB", 1024, ["kilobyte", "kilobytes"]),
  kg: linearUnit("mass", "kg", 1, ["kilogram", "kilograms"]),
  khz: linearUnit("frequency", "kHz", 1e3, ["kilohertz"]),
  kj: linearUnit("energy", "kJ", 1e3, ["kilojoule", "kilojoules"]),
  km: linearUnit("length", "km", 1e3, ["kilometer", "kilometers", "kilometre", "kilometres"]),
  kn: linearUnit("speed", "kn", 0.5144444444, ["knot", "knots"]),
  kw: linearUnit("power", "kW", 1e3, ["kilowatt", "kilowatts"]),
  kpa: linearUnit("pressure", "kPa", 1e3, ["kilopascal", "kilopascals"]),
  kph: linearUnit("speed", "km/h", 1e3 / 3600, ["kmh", "kilometer-per-hour", "kilometre-per-hour"]),
  kwh: linearUnit("energy", "kWh", 36e5, ["kilowatt-hour", "kilowatt-hours"]),
  l: linearUnit("volume", "L", 1, ["liter", "liters", "litre", "litres"]),
  lb: linearUnit("mass", "lb", 0.45359237, ["pound", "pounds"]),
  lbf: linearUnit("force", "lbf", 4.4482216152605, ["pound-force", "pounds-force"]),
  lbft: linearUnit("torque", "lb-ft", 1.3558179483314, ["lb-ft", "pound-foot", "pound-feet"]),
  m: linearUnit("length", "m", 1, ["meter", "meters", "metre", "metres"]),
  mb: linearUnit("data", "MB", 1024 ** 2, ["megabyte", "megabytes"]),
  mhz: linearUnit("frequency", "MHz", 1e3 ** 2, ["megahertz"]),
  mi: linearUnit("length", "mi", 1609.344, ["mile", "miles"]),
  min: linearUnit("time", "min", 60, ["minute", "minutes"]),
  ml: linearUnit("volume", "ml", 1e-3, ["milliliter", "milliliters", "millilitre", "millilitres"]),
  mm: linearUnit("length", "mm", 1e-3, ["millimeter", "millimeters", "millimetre", "millimetres"]),
  mph: linearUnit("speed", "mph", 0.44704, ["mile-per-hour", "miles-per-hour"]),
  mps: linearUnit("speed", "m/s", 1, ["meter-per-second", "metre-per-second"]),
  n: linearUnit("force", "N", 1, ["newton", "newtons"]),
  nm: linearUnit("torque", "N m", 1, ["n-m", "newton-meter", "newton-meters", "newton-metre", "newton-metres"]),
  oz: linearUnit("mass", "oz", 0.028349523125, ["ounce", "ounces"]),
  pa: linearUnit("pressure", "Pa", 1, ["pascal", "pascals"]),
  psi: linearUnit("pressure", "psi", 6894.757293168, ["pound-per-square-inch"]),
  rad: linearUnit("angle", "rad", 1, ["radian", "radians"]),
  s: linearUnit("time", "s", 1, ["sec", "second", "seconds"]),
  sqft: linearUnit("area", "sq ft", 0.09290304, ["square-foot", "square-feet"]),
  sqm: linearUnit("area", "m²", 1, ["square-meter", "square-meters", "square-metre", "square-metres"]),
  tb: linearUnit("data", "TB", 1024 ** 4, ["terabyte", "terabytes"]),
  w: linearUnit("power", "W", 1, ["watt", "watts"]),
  yd: linearUnit("length", "yd", 0.9144, ["yard", "yards"])
};
const UNIT_ALIASES = createUnitAliases();
function convertUnitText(input, toUnitValue, fromUnitValue) {
  const parsed = parseUnitInput(input);
  const fromUnit = findUnit(fromUnitValue || parsed.unit);
  const toUnit = findUnit(toUnitValue);
  if (!fromUnit || !toUnit) {
    throw new UnitConversionError("Use a supported source and output unit.");
  }
  if (fromUnit.definition.dimension !== toUnit.definition.dimension) {
    throw new UnitConversionError("Source and output units must measure the same dimension.");
  }
  const baseValue = fromUnit.definition.toBase(parsed.value);
  const converted = toUnit.definition.fromBase(baseValue);
  return `${formatNumber(converted)} ${toUnit.definition.label}`;
}
function linearUnit(dimension, label, factor, aliases) {
  return {
    aliases,
    dimension,
    fromBase: (value) => value / factor,
    label,
    toBase: (value) => value * factor
  };
}
function temperatureUnit(dimension, label, toBase, fromBase, aliases) {
  return { aliases, dimension, fromBase, label, toBase };
}
function createUnitAliases() {
  const aliases = /* @__PURE__ */ new Map();
  for (const [unit, definition] of Object.entries(UNITS)) {
    aliases.set(unit, unit);
    for (const alias of definition.aliases) {
      aliases.set(alias, unit);
    }
  }
  return aliases;
}
function findUnit(value) {
  if (!value) {
    return void 0;
  }
  const unit = UNIT_ALIASES.get(value.trim().toLowerCase());
  return unit ? { definition: UNITS[unit], unit } : void 0;
}
function parseUnitInput(input) {
  const match = /^\s*(-?\d+(?:\.\d+)?)\s*([A-Za-z°²/^_-]+)?\s*$/.exec(input);
  if (!match) {
    throw new UnitConversionError("Enter a value with a source unit, for example 10 m.");
  }
  return {
    unit: match[2],
    value: Number(match[1])
  };
}
function formatNumber(value) {
  return Number(value.toFixed(4)).toString();
}
const HTML_TRANSFORM_FORMATS = [
  "escape",
  "unescape",
  "strip-tags",
  "extract-links",
  "extract-comments",
  "remove-comments",
  "to-markdown"
];
function isHtmlTransformFormat(value) {
  return HTML_TRANSFORM_FORMATS.some((format) => format === value);
}
function transformHtml(input, format) {
  switch (format) {
    case "escape":
      return escapeXml(input);
    case "extract-comments":
      return extractComments(input).join("\n");
    case "extract-links":
      return extractLinks$1(input).join("\n");
    case "remove-comments":
      return input.replace(/<!--[\s\S]*?-->/g, "");
    case "strip-tags":
      return stripTags(input);
    case "to-markdown":
      return htmlToMarkdown(input);
    case "unescape":
      return unescapeHtml(input);
  }
}
function extractComments(input) {
  return [...input.matchAll(/<!--([\s\S]*?)-->/g)].map((match) => (match[1] ?? "").trim());
}
function extractLinks$1(input) {
  return [...input.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>/gi)].map((match) => unescapeHtml(match[2] ?? "").trim()).filter(Boolean);
}
function stripTags(input) {
  return unescapeHtml(input).replace(/<\/(?:h[1-6]|p|div|section|article|li|ul|ol|br)>/gi, "\n").replace(/<[^>]+>/g, "").split(/\n+/).map((line) => line.trim().replace(/\s+/g, " ")).filter(Boolean).join("\n");
}
function htmlToMarkdown(input) {
  let markdown = unescapeHtml(input).replace(/<!--[\s\S]*?-->/g, "").replace(
    /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_match, level, text) => `${"#".repeat(Number(level))} ${inlineMarkdown(text)}

`
  ).replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_match, text) => `- ${inlineMarkdown(text)}
`).replace(/<\/?(?:ul|ol)\b[^>]*>/gi, "").replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, (_match, text) => `${inlineMarkdown(text)}

`).replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "");
  markdown = markdown.split(/\n{3,}/).map((block) => block.trim()).filter(Boolean).join("\n\n");
  return markdown;
}
function inlineMarkdown(input) {
  return input.replace(
    /<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi,
    (_match, _quote, href, text) => `[${stripInlineTags(text)}](${unescapeHtml(href)})`
  ).replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, (_match, text) => `**${stripInlineTags(text)}**`).replace(/<(?:em|i)\b[^>]*>([\s\S]*?)<\/(?:em|i)>/gi, (_match, text) => `*${stripInlineTags(text)}*`).replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_match, text) => `\`${stripInlineTags(text)}\``).replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
}
function stripInlineTags(input) {
  return input.replace(/<[^>]+>/g, "").trim().replace(/\s+/g, " ");
}
function unescapeHtml(input) {
  return input.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}
const JSON_TRANSFORM_FORMATS = [
  "format",
  "minify",
  "sort",
  "flatten",
  "keys",
  "base64",
  "from-base64",
  "escape",
  "unescape"
];
class JsonTransformError extends Error {
}
function isJsonTransformFormat(value) {
  return JSON_TRANSFORM_FORMATS.some((format) => format === value);
}
function transformJson(input, format) {
  switch (format) {
    case "base64":
      return bytesToBase64(new TextEncoder().encode(input));
    case "escape":
      return input.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    case "flatten":
      return JSON.stringify(flattenJson(parseJson$4(input)), null, 2);
    case "format":
      return JSON.stringify(parseJson$4(input), null, 2);
    case "from-base64":
      return base64ToText(input);
    case "keys":
      return jsonKeys(parseJson$4(input)).sort().join("\n");
    case "minify":
      return JSON.stringify(parseJson$4(input));
    case "sort":
      return JSON.stringify(sortJson(parseJson$4(input)), null, 2);
    case "unescape":
      return input.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
}
function parseJson$4(input) {
  try {
    return JSON.parse(input);
  } catch {
    throw new JsonTransformError("Enter valid JSON.");
  }
}
function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, sortJson(item)])
    );
  }
  return value;
}
function flattenJson(value) {
  const flattened = {};
  visitJson(value, "", (path, item) => {
    if (path && !isContainer(item)) {
      flattened[path] = item;
    }
  });
  return sortJson(flattened);
}
function jsonKeys(value) {
  const keys = [];
  visitJson(value, "", (path) => {
    if (path) {
      keys.push(path);
    }
  });
  return keys;
}
function visitJson(value, path, visit) {
  visit(path, value);
  if (Array.isArray(value)) {
    value.forEach((item, index2) => {
      visitJson(item, childPath(path, String(index2)), visit);
    });
    return;
  }
  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      visitJson(item, childPath(path, key), visit);
    }
  }
}
function childPath(parent, key) {
  return parent ? `${parent}.${key}` : key;
}
function isContainer(value) {
  return Array.isArray(value) || isRecord(value);
}
function bytesToBase64(bytes2) {
  let binary = "";
  for (const byte of bytes2) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary);
}
function base64ToText(value) {
  try {
    const binary = atob(value.trim());
    return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0));
  } catch {
    throw new JsonTransformError("Enter valid base64 text.");
  }
}
const MARKDOWN_TARGET_FORMATS = ["slack", "wordpress-html"];
function isMarkdownTargetFormat(value) {
  return MARKDOWN_TARGET_FORMATS.some((format) => format === value);
}
function convertMarkdownTarget(input, format) {
  switch (format) {
    case "slack":
      return markdownToSlack(input);
    case "wordpress-html":
      return markdownToWordPressHtml(input);
  }
}
function markdownToSlack(input) {
  return input.split(/\r?\n/).map((line) => {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      return `*${slackInline(heading[2])}*`;
    }
    const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
    if (bullet) {
      return `• ${slackInline(bullet[1])}`;
    }
    return slackInline(line);
  }).join("\n").trim();
}
function markdownToWordPressHtml(input) {
  const lines = input.split(/\r?\n/);
  const html = [];
  let inList = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(trimmed);
    if (heading) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      const level = heading[1].length;
      html.push(`<h${level}>${htmlInline(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(trimmed);
    if (bullet) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${htmlInline(bullet[1])}</li>`);
      continue;
    }
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
    html.push(`<p>${htmlInline(trimmed)}</p>`);
  }
  if (inList) {
    html.push("</ul>");
  }
  return html.join("\n");
}
function slackInline(input) {
  return input.replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, label, url) => {
    const safeUrl = safeLinkUrl(url);
    return safeUrl ? `<${safeUrl}|${label}>` : label;
  }).replace(/\*\*([^*]+)\*\*/g, "*$1*").replace(/__([^_]+)__/g, "*$1*");
}
function htmlInline(input) {
  const escaped = escapeXml(input);
  return escaped.replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, label, url) => {
    const safeUrl = safeLinkUrl(url);
    return safeUrl ? `<a href="${escapeXml(safeUrl)}">${label}</a>` : label;
  }).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/__([^_]+)__/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>");
}
function safeLinkUrl(value) {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:" ? trimmed : void 0;
  } catch {
    return void 0;
  }
}
const DATA_SHAPE_FORMATS = [
  "json-shape",
  "csv-shape"
];
class DataShapeError extends Error {
}
function isDataShapeFormat(value) {
  return DATA_SHAPE_FORMATS.some((format) => format === value);
}
function inspectDataShape(input, format) {
  switch (format) {
    case "csv-shape":
      return inspectCsvShape(input);
    case "json-shape":
      return inspectJsonShape(input);
  }
}
function inspectJsonShape(input) {
  const value = parseJson$3(input);
  return JSON.stringify(describeJsonValue(value), null, 2);
}
function inspectCsvShape(input) {
  const records = parseCsv(input);
  if (records.length === 0) {
    throw new DataShapeError("Enter CSV with a header row and at least one data row.");
  }
  return JSON.stringify({
    columns: columnStats(records),
    columnCount: Object.keys(records[0] ?? {}).length,
    rowCount: records.length
  }, null, 2);
}
function parseJson$3(input) {
  try {
    return JSON.parse(input);
  } catch {
    throw new DataShapeError("Enter valid JSON.");
  }
}
function describeJsonValue(value) {
  if (Array.isArray(value)) {
    const samples = value.slice(0, 25);
    return {
      kind: "array",
      length: value.length,
      items: mergeJsonShapes(samples.map(describeJsonValue))
    };
  }
  if (isRecord(value)) {
    return {
      kind: "object",
      properties: Object.fromEntries(
        Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, describeJsonValue(item)])
      )
    };
  }
  return {
    kind: primitiveKind(value),
    example: value
  };
}
function mergeJsonShapes(shapes) {
  if (shapes.length === 0) {
    return { kind: "unknown" };
  }
  const kinds = new Set(shapes.map((shape2) => isRecord(shape2) ? String(shape2.kind ?? "unknown") : "unknown"));
  if (kinds.size > 1) {
    return {
      kind: "union",
      options: [...kinds].sort()
    };
  }
  const [shape] = shapes;
  if (!isRecord(shape) || shape.kind !== "object") {
    return shape;
  }
  const propertyNames = /* @__PURE__ */ new Set();
  for (const item of shapes) {
    if (!isRecord(item) || !isRecord(item.properties)) {
      continue;
    }
    for (const property of Object.keys(item.properties)) {
      propertyNames.add(property);
    }
  }
  return {
    kind: "object",
    properties: Object.fromEntries(
      [...propertyNames].sort().map((property) => {
        const propertyShapes = shapes.map((item) => isRecord(item) && isRecord(item.properties) ? item.properties[property] : void 0).filter((item) => item !== void 0);
        return [property, mergeJsonShapes(propertyShapes)];
      })
    )
  };
}
function primitiveKind(value) {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (isRecord(value)) {
    return "object";
  }
  return typeof value;
}
function columnStats(records) {
  const stats = /* @__PURE__ */ new Map();
  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!stats.has(key)) {
        stats.set(key, { empty: 0, examples: [], name: key, types: {} });
      }
      const column = stats.get(key);
      if (!column) {
        continue;
      }
      const value = record[key] ?? "";
      const trimmed = value.trim();
      if (!trimmed) {
        column.empty += 1;
      }
      const type = inferScalarType(trimmed);
      column.types[type] = (column.types[type] ?? 0) + 1;
      if (trimmed && !column.examples.includes(trimmed) && column.examples.length < 3) {
        column.examples.push(trimmed);
      }
    }
  }
  return [...stats.values()].sort((left, right) => left.name.localeCompare(right.name));
}
function inferScalarType(value) {
  if (!value) {
    return "empty";
  }
  if (/^(?:true|false)$/i.test(value)) {
    return "boolean";
  }
  if (/^[+-]?\d+(?:\.\d+)?$/.test(value)) {
    return "number";
  }
  if (!Number.isNaN(Date.parse(value)) && /\d{4}-\d{2}-\d{2}/.test(value)) {
    return "date";
  }
  return "string";
}
const DEVELOPER_INSPECT_FORMATS = [
  "jwt",
  "uuid",
  "cron",
  "colour-contrast",
  "mime-signature"
];
class DeveloperInspectError extends Error {
}
function isDeveloperInspectFormat(value) {
  return DEVELOPER_INSPECT_FORMATS.some((format) => format === value);
}
function inspectDeveloperText(input, format, options = {}) {
  switch (format) {
    case "colour-contrast":
      return JSON.stringify(inspectColourContrast(input, options), null, 2);
    case "cron":
      return JSON.stringify(inspectCron(input), null, 2);
    case "jwt":
      return JSON.stringify(inspectJwt(input), null, 2);
    case "mime-signature":
      return JSON.stringify(inspectMimeSignature(input), null, 2);
    case "uuid":
      return JSON.stringify(inspectUuid(input), null, 2);
  }
}
function inspectJwt(input) {
  const token = input.trim().replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new DeveloperInspectError("Enter a JWT with header, payload, and signature segments.");
  }
  const header = parseJwtSegment(parts[0], "header");
  const payload = parseJwtSegment(parts[1], "payload");
  return {
    header,
    payload,
    signatureBytes: base64UrlByteLength(parts[2]),
    timing: isRecord(payload) ? jwtTiming(payload) : {},
    warning: "Decoded only; signature is not verified."
  };
}
function inspectUuid(input) {
  const value = input.trim().toLowerCase().replace(/^urn:uuid:/, "").replace(/[{}]/g, "");
  const match = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f])([0-9a-f]{3})-([0-9a-f])([0-9a-f]{3})-([0-9a-f]{12})$/.exec(value);
  if (!match) {
    throw new DeveloperInspectError("Enter a valid hyphenated UUID.");
  }
  const version = Number.parseInt(match[3], 16);
  const variantNibble = Number.parseInt(match[5], 16);
  const inspected = {
    canonical: value,
    isNil: value === "00000000-0000-0000-0000-000000000000",
    variant: uuidVariant(variantNibble),
    version
  };
  if (version === 7) {
    const timestamp = Number.parseInt(`${match[1]}${match[2]}`, 16);
    inspected.timestamp = new Date(timestamp).toISOString();
  }
  return inspected;
}
function inspectCron(input) {
  const fields = input.trim().split(/\s+/);
  if (fields.length !== 5) {
    throw new DeveloperInspectError("Enter a standard five-field cron expression.");
  }
  const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;
  return {
    dayOfMonth: explainCronField(dayOfMonth, "day of month", 1, 31),
    dayOfWeek: explainCronField(dayOfWeek, "day of week", 0, 7),
    expression: fields.join(" "),
    hour: explainCronField(hour, "hour", 0, 23),
    minute: explainCronField(minute, "minute", 0, 59),
    month: explainCronField(month, "month", 1, 12),
    summary: cronSummary(minute, hour, dayOfMonth, month, dayOfWeek)
  };
}
function inspectColourContrast(input, options) {
  const inputColours = input.match(/#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g) ?? [];
  const foreground = parseHexColour(options.foreground || inputColours[0]);
  const background = parseHexColour(options.background || inputColours[foreground ? 1 : 0]);
  if (!foreground || !background) {
    throw new DeveloperInspectError("Enter foreground and background hex colours.");
  }
  const ratio = contrastRatio$1(relativeLuminance$1(foreground), relativeLuminance$1(background));
  return {
    AA: {
      largeText: ratio >= 3,
      normalText: ratio >= 4.5
    },
    AAA: {
      largeText: ratio >= 4.5,
      normalText: ratio >= 7
    },
    background: rgbToHex$1(background),
    foreground: rgbToHex$1(foreground),
    ratio: Number(ratio.toFixed(2))
  };
}
function inspectMimeSignature(input) {
  const bytes2 = inputBytes(input);
  if (bytes2.length === 0) {
    throw new DeveloperInspectError("Enter hex bytes, base64 text, or a data URL.");
  }
  const signature = detectSignature(bytes2);
  return {
    bytes: bytes2.slice(0, 16).map((byte) => byte.toString(16).padStart(2, "0")).join(" "),
    extension: signature.extension,
    mimeType: signature.mimeType,
    name: signature.name
  };
}
function parseJwtSegment(segment, name) {
  try {
    return JSON.parse(base64UrlToText(segment));
  } catch {
    throw new DeveloperInspectError(`Enter a JWT with a valid ${name} segment.`);
  }
}
function jwtTiming(payload) {
  const now = Math.floor(Date.now() / 1e3);
  return Object.fromEntries(
    ["iat", "nbf", "exp"].filter((claim) => typeof payload[claim] === "number").map((claim) => {
      const seconds = payload[claim];
      return [claim, {
        iso: new Date(seconds * 1e3).toISOString(),
        relativeSeconds: seconds - now
      }];
    })
  );
}
function uuidVariant(nibble) {
  if ((nibble & 8) === 0) {
    return "NCS";
  }
  if ((nibble & 12) === 8) {
    return "RFC 4122";
  }
  if ((nibble & 14) === 12) {
    return "Microsoft";
  }
  return "future";
}
function explainCronField(value, label, min, max) {
  if (value === "*") {
    return `every ${label}`;
  }
  const step = /^\*\/(\d+)$/.exec(value);
  if (step) {
    return `every ${step[1]} ${label}s`;
  }
  if (value.includes(",")) {
    return `${label}s ${value}`;
  }
  if (value.includes("-")) {
    return `${label}s ${value}`;
  }
  const numeric = Number.parseInt(value, 10);
  if (Number.isInteger(numeric) && numeric >= min && numeric <= max) {
    return `${label} ${numeric}`;
  }
  return `custom ${label} field: ${value}`;
}
function cronSummary(minute, hour, dayOfMonth, month, dayOfWeek) {
  if (minute.startsWith("*/") && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Every ${minute.slice(2)} minutes`;
  }
  if (minute !== "*" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Every hour at minute ${minute}`;
  }
  if (minute !== "*" && hour !== "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return `Every day at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }
  if (minute !== "*" && hour !== "*" && dayOfMonth === "*" && month === "*" && dayOfWeek !== "*") {
    return `Every week on day ${dayOfWeek} at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }
  if (minute !== "*" && hour !== "*" && dayOfMonth !== "*" && month === "*" && dayOfWeek === "*") {
    return `Every month on day ${dayOfMonth} at ${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
  }
  return "Custom cron schedule";
}
function parseHexColour(value) {
  if (!value) {
    return void 0;
  }
  const hex = value.trim().replace(/^#/, "");
  if (![3, 4, 6, 8].includes(hex.length) || !/^[0-9a-fA-F]+$/.test(hex)) {
    return void 0;
  }
  const expanded = hex.length <= 4 ? [...hex].map((char) => `${char}${char}`).join("") : hex;
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16)
  ];
}
function relativeLuminance$1([red, green, blue]) {
  const [r, g, b] = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio$1(left, right) {
  const light = Math.max(left, right);
  const dark = Math.min(left, right);
  return (light + 0.05) / (dark + 0.05);
}
function rgbToHex$1([red, green, blue]) {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}
function inputBytes(input) {
  const value = input.trim();
  const dataUrl = /^data:[^,]*;base64,(.+)$/i.exec(value);
  if (dataUrl) {
    return base64Bytes(dataUrl[1]);
  }
  const hex = value.replace(/^0x/i, "").replace(/[^0-9a-fA-F]/g, "");
  if (hex.length >= 2 && hex.length % 2 === 0) {
    return Array.from(
      { length: hex.length / 2 },
      (_item, index2) => Number.parseInt(hex.slice(index2 * 2, index2 * 2 + 2), 16)
    );
  }
  return base64Bytes(value);
}
function base64Bytes(value) {
  try {
    const binary = atob(value);
    return [...binary].map((char) => char.codePointAt(0) ?? 0);
  } catch {
    return [];
  }
}
function detectSignature(bytes2) {
  const starts = (signature) => signature.every((byte, index2) => bytes2[index2] === byte);
  const ascii = String.fromCharCode(...bytes2.slice(0, 16));
  if (starts([137, 80, 78, 71])) {
    return { extension: "png", mimeType: "image/png", name: "PNG image" };
  }
  if (starts([255, 216, 255])) {
    return { extension: "jpg", mimeType: "image/jpeg", name: "JPEG image" };
  }
  if (ascii.startsWith("GIF87a") || ascii.startsWith("GIF89a")) {
    return { extension: "gif", mimeType: "image/gif", name: "GIF image" };
  }
  if (ascii.startsWith("%PDF-")) {
    return { extension: "pdf", mimeType: "application/pdf", name: "PDF document" };
  }
  if (starts([80, 75, 3, 4])) {
    return { extension: "zip", mimeType: "application/zip", name: "ZIP archive" };
  }
  if (ascii.slice(0, 4) === "RIFF" && ascii.slice(8, 12) === "WEBP") {
    return { extension: "webp", mimeType: "image/webp", name: "WebP image" };
  }
  if (ascii.startsWith("OggS")) {
    return { extension: "ogg", mimeType: "application/ogg", name: "Ogg container" };
  }
  if (ascii.startsWith("ID3")) {
    return { extension: "mp3", mimeType: "audio/mpeg", name: "MP3 audio" };
  }
  if (ascii.startsWith("\0asm")) {
    return { extension: "wasm", mimeType: "application/wasm", name: "WebAssembly binary" };
  }
  return { extension: "unknown", mimeType: "application/octet-stream", name: "Unknown binary data" };
}
function base64UrlToText(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0));
}
function base64UrlByteLength(value) {
  const padded = value.padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Math.floor(padded.length * 3 / 4) - (padded.endsWith("==") ? 2 : padded.endsWith("=") ? 1 : 0);
}
const DEVELOPER_TEXT_FORMATS = [
  "diff-lines",
  "pretty-json",
  "minify-json",
  "pretty-css",
  "minify-css",
  "pretty-html",
  "minify-html",
  "pretty-xml",
  "minify-xml"
];
class DeveloperTextError extends Error {
}
const HTML_VOID_TAGS = /* @__PURE__ */ new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
function isDeveloperTextFormat(value) {
  return DEVELOPER_TEXT_FORMATS.some((format) => format === value);
}
function transformDeveloperText(input, format, options = {}) {
  switch (format) {
    case "diff-lines":
      return diffLines(input, options);
    case "minify-css":
      return minifyCss(input);
    case "minify-html":
      return minifyMarkup(input, "html");
    case "minify-json":
      return JSON.stringify(parseJson$2(input));
    case "minify-xml":
      return minifyMarkup(input, "xml");
    case "pretty-css":
      return prettyCss(input);
    case "pretty-html":
      return prettyMarkup(input, "html");
    case "pretty-json":
      return JSON.stringify(parseJson$2(input), null, 2);
    case "pretty-xml":
      return prettyMarkup(input, "xml");
  }
}
function parseJson$2(input) {
  try {
    return JSON.parse(input);
  } catch {
    throw new DeveloperTextError("Enter valid JSON.");
  }
}
function diffLines(input, options) {
  const [left, right] = diffInputs(input, options);
  const leftLines = left.split(/\r?\n/);
  const rightLines = right.split(/\r?\n/);
  const table = lcsTable(leftLines, rightLines);
  const output = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < leftLines.length || rightIndex < rightLines.length) {
    if (leftLines[leftIndex] === rightLines[rightIndex]) {
      output.push(`  ${leftLines[leftIndex] ?? ""}`);
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    if (leftIndex < leftLines.length && (rightIndex === rightLines.length || table[leftIndex + 1][rightIndex] >= table[leftIndex][rightIndex + 1])) {
      output.push(`- ${leftLines[leftIndex]}`);
      leftIndex += 1;
      continue;
    }
    if (rightIndex < rightLines.length) {
      output.push(`+ ${rightLines[rightIndex]}`);
      rightIndex += 1;
    }
  }
  return output.join("\n");
}
function diffInputs(input, options) {
  if (options.left !== void 0 || options.right !== void 0) {
    return [options.left ?? "", options.right ?? ""];
  }
  const separator = options.separator || "\n---\n";
  const index2 = input.indexOf(separator);
  if (index2 === -1) {
    throw new DeveloperTextError("Provide left and right fields, or separate two text blocks with a line containing ---.");
  }
  return [
    input.slice(0, index2),
    input.slice(index2 + separator.length)
  ];
}
function lcsTable(left, right) {
  const table = Array.from({ length: left.length + 1 }, () => Array.from({ length: right.length + 1 }, () => 0));
  for (let leftIndex = left.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (let rightIndex = right.length - 1; rightIndex >= 0; rightIndex -= 1) {
      table[leftIndex][rightIndex] = left[leftIndex] === right[rightIndex] ? table[leftIndex + 1][rightIndex + 1] + 1 : Math.max(table[leftIndex + 1][rightIndex], table[leftIndex][rightIndex + 1]);
    }
  }
  return table;
}
function minifyCss(input) {
  return input.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{}:;,>+~])\s*/g, "$1").replace(/;}/g, "}").trim();
}
function prettyCss(input) {
  const minified = minifyCss(input);
  const lines = [];
  let indent = 0;
  let current = "";
  for (const char of minified) {
    if (char === "{") {
      lines.push(`${tabs(indent)}${current.trim()} {`);
      current = "";
      indent += 1;
      continue;
    }
    if (char === "}") {
      if (current.trim()) {
        lines.push(`${tabs(indent)}${cssDeclaration(current.trim())}`);
      }
      indent = Math.max(0, indent - 1);
      lines.push(`${tabs(indent)}}`);
      current = "";
      continue;
    }
    if (char === ";") {
      if (current.trim()) {
        lines.push(`${tabs(indent)}${current.trim()};`);
      }
      current = "";
      continue;
    }
    if (char === ":") {
      current += ": ";
      continue;
    }
    current += char;
  }
  if (current.trim()) {
    lines.push(`${tabs(indent)}${current.trim()}`);
  }
  return lines.join("\n");
}
function cssDeclaration(value) {
  return value.includes(":") && !value.endsWith(";") ? `${value};` : value;
}
function minifyMarkup(input, kind) {
  const withoutComments = kind === "html" ? input.replace(/<!--[\s\S]*?-->/g, "") : input.replace(/<!--[\s\S]*?-->/g, "").replace(/<\?xml\b[^>]*\?>/i, (match) => match.trim());
  return withoutComments.replace(/>\s+</g, "><").replace(/\s{2,}/g, " ").trim();
}
function prettyMarkup(input, kind) {
  const tokens = minifyMarkup(input, kind).match(/<[^>]+>|[^<]+/g) ?? [];
  const lines = [];
  let indent = 0;
  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) {
      continue;
    }
    if (isClosingTag(trimmed)) {
      indent = Math.max(0, indent - 1);
      lines.push(`${tabs(indent)}${trimmed}`);
      continue;
    }
    if (isOpeningTag(trimmed, kind)) {
      lines.push(`${tabs(indent)}${trimmed}`);
      indent += 1;
      continue;
    }
    lines.push(`${tabs(indent)}${trimmed}`);
  }
  return lines.join("\n");
}
function isClosingTag(token) {
  return /^<\//.test(token);
}
function isOpeningTag(token, kind) {
  if (!/^<[A-Za-z]/.test(token) || /\/>$/.test(token)) {
    return false;
  }
  if (kind === "html") {
    const name = /^<([A-Za-z0-9-]+)/.exec(token)?.[1]?.toLowerCase();
    return !name || !HTML_VOID_TAGS.has(name);
  }
  return true;
}
function tabs(count) {
  return "	".repeat(count);
}
const REQUEST_TRANSFORM_FORMATS = [
  "curl-to-fetch",
  "curl-to-json",
  "har-to-curl",
  "request-to-curl"
];
class RequestTransformError extends Error {
}
function isRequestTransformFormat(value) {
  return REQUEST_TRANSFORM_FORMATS.some((format) => format === value);
}
function transformRequestText(input, format) {
  switch (format) {
    case "curl-to-fetch":
      return requestToFetch(parseCurl(input));
    case "curl-to-json":
      return JSON.stringify(parseCurl(input), null, 2);
    case "har-to-curl":
      return requestToCurl(parseHar(input));
    case "request-to-curl":
      return requestToCurl(parseRequestText(input));
  }
}
function parseCurl(input) {
  const tokens = shellTokens(input);
  if (tokens[0] !== "curl") {
    throw new RequestTransformError("Enter a curl command that starts with curl.");
  }
  const request = {
    headers: {},
    method: "GET",
    url: ""
  };
  for (let index2 = 1; index2 < tokens.length; index2 += 1) {
    const token = tokens[index2];
    const next = tokens[index2 + 1];
    if (!token) {
      continue;
    }
    if ((token === "-X" || token === "--request") && next) {
      request.method = next.toUpperCase();
      index2 += 1;
      continue;
    }
    if ((token === "-H" || token === "--header") && next) {
      const header = parseHeader(next);
      if (header) {
        request.headers[header.name] = header.value;
      }
      index2 += 1;
      continue;
    }
    if ((token === "-d" || token === "--data" || token === "--data-raw" || token === "--data-binary") && next) {
      request.body = next;
      if (request.method === "GET") {
        request.method = "POST";
      }
      index2 += 1;
      continue;
    }
    if ((token === "-u" || token === "--user") && next) {
      request.headers.Authorization = `Basic ${btoa(next)}`;
      index2 += 1;
      continue;
    }
    if (!token.startsWith("-")) {
      request.url = token;
    }
  }
  if (!request.url) {
    throw new RequestTransformError("Enter a curl command with a URL.");
  }
  return request;
}
function parseHar(input) {
  const value = parseJson$1(input);
  const entry = isRecord(value) && isRecord(value.log) && Array.isArray(value.log.entries) ? value.log.entries[0] : value;
  const request = isRecord(entry) && isRecord(entry.request) ? entry.request : entry;
  if (!isRecord(request)) {
    throw new RequestTransformError("Enter a HAR request object or HAR log with at least one entry.");
  }
  const headers = Array.isArray(request.headers) ? Object.fromEntries(
    request.headers.filter((header) => isRecord(header)).map((header) => [String(header.name ?? ""), String(header.value ?? "")]).filter(([name]) => name)
  ) : {};
  const postData = isRecord(request.postData) && typeof request.postData.text === "string" ? request.postData.text : void 0;
  const url = typeof request.url === "string" ? request.url : "";
  if (!url) {
    throw new RequestTransformError("Enter a HAR request with a URL.");
  }
  return {
    body: postData,
    headers,
    method: String(request.method ?? (postData ? "POST" : "GET")).toUpperCase(),
    url
  };
}
function parseRequestText(input) {
  const asJson = maybeParseRequestJson(input);
  if (asJson) {
    return asJson;
  }
  const [head, ...bodyParts] = input.split(/\r?\n\r?\n/);
  const lines = head.split(/\r?\n/).filter(Boolean);
  const [requestLine, ...headerLines] = lines;
  const requestMatch = /^([A-Z]+)\s+(\S+)(?:\s+HTTP\/\d(?:\.\d)?)?$/i.exec(requestLine ?? "");
  if (!requestMatch) {
    throw new RequestTransformError("Enter raw HTTP request text or a JSON request object.");
  }
  const headers = Object.fromEntries(
    headerLines.map(parseHeader).filter((header) => Boolean(header)).map((header) => [header.name, header.value])
  );
  const host = headers.Host ?? headers.host;
  const target = requestMatch[2];
  const url = /^https?:\/\//i.test(target) ? target : `https://${host || "example.com"}${target.startsWith("/") ? target : `/${target}`}`;
  const body = bodyParts.join("\n\n");
  return {
    body: body || void 0,
    headers,
    method: requestMatch[1].toUpperCase(),
    url
  };
}
function maybeParseRequestJson(input) {
  let value;
  try {
    value = JSON.parse(input);
  } catch {
    return void 0;
  }
  if (!isRecord(value) || typeof value.url !== "string") {
    return void 0;
  }
  const headers = isRecord(value.headers) ? Object.fromEntries(Object.entries(value.headers).map(([key, item]) => [key, String(item)])) : {};
  return {
    body: typeof value.body === "string" ? value.body : void 0,
    headers,
    method: typeof value.method === "string" ? value.method.toUpperCase() : "GET",
    url: value.url
  };
}
function requestToCurl(request) {
  const lines = [
    "curl",
    `  -X ${shellQuote$1(request.method)}`,
    ...Object.entries(request.headers).map(([name, value]) => `  -H ${shellQuote$1(`${name}: ${value}`)}`),
    request.body ? `  --data-raw ${shellQuote$1(request.body)}` : "",
    `  ${shellQuote$1(request.url)}`
  ].filter(Boolean);
  return lines.join(" \\\n");
}
function requestToFetch(request) {
  const init = {
    method: request.method
  };
  if (Object.keys(request.headers).length > 0) {
    init.headers = request.headers;
  }
  if (request.body) {
    init.body = request.body;
  }
  return `const response = await fetch(${JSON.stringify(request.url)}, ${JSON.stringify(init, null, 2)});
const data = await response.text();`;
}
function parseHeader(value) {
  const match = /^([^:]+):\s*([\s\S]*)$/.exec(value ?? "");
  if (!match) {
    return void 0;
  }
  return {
    name: match[1].trim(),
    value: match[2].trim()
  };
}
function parseJson$1(input) {
  try {
    return JSON.parse(input);
  } catch {
    throw new RequestTransformError("Enter valid HAR JSON.");
  }
}
function shellTokens(input) {
  const tokens = [];
  let current = "";
  let quote;
  let escaping = false;
  for (const char of input) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === "\\") {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) {
        quote = void 0;
      } else {
        current += char;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }
  if (current) {
    tokens.push(current);
  }
  return tokens;
}
function shellQuote$1(value) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
const IMAGE_FORMAT_OUTPUTS = ["webp", "jpeg", "png", "avif", "gif", "bmp", "tiff", "ico", "mjpeg"];
const SLACKMOJI_OUTPUTS = ["gif"];
const SLACK_HDR_EMOJI_OUTPUTS = ["png"];
const DOCUMENT_FORMAT_OUTPUTS = ["docx", "odt", "rtf", "epub", "html", "md", "txt"];
const VIDEO_FORMAT_OUTPUTS = ["mp4", "webm", "mov", "mkv", "avi", "m4v", "mpeg", "mpg", "ogv", "gif", "png", "webp", "jpeg", "mp3", "wav", "flac", "m4a", "ogg", "opus"];
const AUDIO_FORMAT_OUTPUTS = ["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus", "aiff", "mka", "wma", "png"];
const QUEUED_CONVERTER_OUTPUTS = {
  "audio-format": AUDIO_FORMAT_OUTPUTS,
  "document-format": DOCUMENT_FORMAT_OUTPUTS,
  "image-format": IMAGE_FORMAT_OUTPUTS,
  "slack-hdr-emoji": SLACK_HDR_EMOJI_OUTPUTS,
  "slackmoji": SLACKMOJI_OUTPUTS,
  "video-format": VIDEO_FORMAT_OUTPUTS
};
const TIMESTAMP_TRANSFORM_FORMATS = [
  "unix",
  "milliseconds",
  "iso",
  "readable",
  "rfc2822",
  "discord",
  "add",
  "subtract",
  "difference"
];
class TimestampTransformError extends Error {
}
const UNIT_MILLISECONDS = {
  day: 864e5,
  days: 864e5,
  hour: 36e5,
  hours: 36e5,
  millisecond: 1,
  milliseconds: 1,
  minute: 6e4,
  minutes: 6e4,
  second: 1e3,
  seconds: 1e3,
  week: 6048e5,
  weeks: 6048e5
};
const DISCORD_STYLES = {
  date: "D",
  full: "F",
  longdate: "D",
  longtime: "T",
  relative: "R",
  shortdate: "d",
  shorttime: "t"
};
function isTimestampTransformFormat(value) {
  return TIMESTAMP_TRANSFORM_FORMATS.some((format) => format === value);
}
function transformTimestamp(input, format, fields) {
  const date = parseTimestamp(input);
  switch (format) {
    case "add":
      return addTime(date, fields, 1).toISOString();
    case "difference":
      return timestampDifference(date, parseTimestamp(fields.until ?? fields.end ?? ""));
    case "discord":
      return discordTimestamp(date, fields.style);
    case "iso":
      return date.toISOString();
    case "milliseconds":
      return `${date.getTime()}`;
    case "readable":
      return date.toUTCString();
    case "rfc2822":
      return formatRfc2822(date);
    case "subtract":
      return addTime(date, fields, -1).toISOString();
    case "unix":
      return `${Math.floor(date.getTime() / 1e3)}`;
  }
}
function parseTimestamp(input) {
  const value = input.trim();
  if (!value) {
    throw new TimestampTransformError("Enter a timestamp or date.");
  }
  if (/^-?\d+$/.test(value)) {
    const numeric = Number(value);
    const milliseconds = Math.abs(numeric) < 1e10 ? numeric * 1e3 : numeric;
    return validDate(new Date(milliseconds));
  }
  return validDate(new Date(value));
}
function validDate(date) {
  if (Number.isNaN(date.getTime())) {
    throw new TimestampTransformError("Enter a valid timestamp or date.");
  }
  return date;
}
function addTime(date, fields, direction) {
  const amount = Number.parseFloat(fields.amount ?? "1");
  const unit = UNIT_MILLISECONDS[(fields.unit ?? "days").trim().toLowerCase()];
  if (!Number.isFinite(amount) || !unit) {
    throw new TimestampTransformError("Enter a numeric amount and supported unit.");
  }
  return new Date(date.getTime() + direction * amount * unit);
}
function timestampDifference(start, end) {
  const milliseconds = Math.abs(end.getTime() - start.getTime());
  const seconds = Math.floor(milliseconds / 1e3);
  return JSON.stringify({
    days: Math.floor(seconds / 86400),
    hours: Math.floor(seconds / 3600),
    milliseconds,
    minutes: Math.floor(seconds / 60),
    seconds
  }, null, 2);
}
function discordTimestamp(date, styleInput) {
  const style = DISCORD_STYLES[(styleInput ?? "full").trim().toLowerCase()] ?? "F";
  return `<t:${Math.floor(date.getTime() / 1e3)}:${style}>`;
}
function formatRfc2822(date) {
  return date.toUTCString().replace("GMT", "+0000");
}
const URL_TRANSFORM_FORMATS = [
  "parse",
  "query",
  "extract-links",
  "extract-emails",
  "dedupe-links"
];
class UrlTransformError extends Error {
}
function isUrlTransformFormat(value) {
  return URL_TRANSFORM_FORMATS.some((format) => format === value);
}
function transformUrl(input, format) {
  switch (format) {
    case "dedupe-links":
      return uniqueValues(extractLinks(input)).join("\n");
    case "extract-emails":
      return uniqueValues(extractEmails(input)).join("\n");
    case "extract-links":
      return extractLinks(input).join("\n");
    case "parse":
      return JSON.stringify(parseUrl(input), null, 2);
    case "query":
      return JSON.stringify(queryParams(parseHttpUrl(input).searchParams), null, 2);
  }
}
function parseUrl(input) {
  const url = parseHttpUrl(input);
  return {
    hash: url.hash,
    host: url.host,
    hostname: url.hostname,
    href: url.href,
    origin: url.origin,
    pathname: url.pathname,
    port: url.port,
    protocol: url.protocol,
    search: url.search
  };
}
function queryParams(params) {
  const values = {};
  for (const [key, value] of params.entries()) {
    const existing = values[key];
    if (existing === void 0) {
      values[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      values[key] = [existing, value];
    }
  }
  return values;
}
function parseHttpUrl(input) {
  try {
    const url = new URL(input.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new UrlTransformError("Enter an HTTP or HTTPS URL.");
    }
    return url;
  } catch (error) {
    if (error instanceof UrlTransformError) {
      throw error;
    }
    throw new UrlTransformError("Enter a valid URL.");
  }
}
function extractLinks(input) {
  return (input.match(/https?:\/\/[^\s<>"']+/gi) ?? []).map(cleanUrlMatch);
}
function extractEmails(input) {
  return input.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
}
function cleanUrlMatch(value) {
  return value.replace(/[),.;!?]+$/g, "");
}
function uniqueValues(values) {
  return [...new Set(values)];
}
const TEXT_REQUEST_FORMATS = [
  "application/json",
  "application/x-www-form-urlencoded",
  "text/plain"
];
const IMAGE_REQUEST_FORMATS = [
  "application/json",
  "application/x-www-form-urlencoded",
  "application/octet-stream",
  "image/*",
  "image/avif",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
  "multipart/form-data",
  "text/plain"
];
const AUDIO_REQUEST_FORMATS = [
  "application/octet-stream",
  "audio/*",
  "audio/aac",
  "audio/flac",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "multipart/form-data"
];
const VIDEO_REQUEST_FORMATS = [
  "audio/*",
  "application/octet-stream",
  "multipart/form-data",
  "video/*",
  "video/avi",
  "video/mpeg",
  "video/mp4",
  "video/quicktime",
  "video/webm"
];
const FILE_REQUEST_FORMATS = [
  "application/json",
  "application/sql",
  "application/x-www-form-urlencoded",
  "application/xml",
  "application/yaml",
  "multipart/form-data",
  "text/csv",
  "text/html",
  "text/markdown",
  "text/plain"
];
const DOCUMENT_REQUEST_FORMATS = [
  "application/epub+zip",
  "application/msword",
  "application/octet-stream",
  "application/rtf",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "multipart/form-data",
  "text/html",
  "text/markdown",
  "text/plain"
];
const CONVERTER_TOOLS = [
  {
    aliases: ["md-to-jira", "markdown-to-confluence", "md-to-confluence"],
    api: {
      accepts: TEXT_REQUEST_FORMATS,
      examples: [
        {
          body: "## Heading\n\n- **Bold** item",
          contentType: "text/markdown",
          description: "Post Markdown as the raw request body.",
          method: "POST",
          url: "/api/markdown-to-jira"
        },
        {
          description: "Convert Markdown supplied in the query string.",
          method: "GET",
          url: "/api/markdown-to-jira?input=%23%23%20Heading"
        }
      ],
      fields: [],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Documents",
    description: "Convert Markdown into Jira and Confluence wiki markup.",
    display: {
      actionLabel: "Convert to Jira",
      category: "Jira and Confluence",
      examples: [
        "## Release notes\n\n- **Fixed** auth\n- Added `copy` action",
        "[Pashi](https://pashi.app) is **fast**"
      ]
    },
    endpoint: "/api/markdown-to-jira",
    id: "markdown-to-jira",
    input: {
      label: "Markdown",
      kind: "text",
      required: true
    },
    label: "Markdown to Jira",
    outputs: ["jira", "confluence"],
    placeholder: "## Heading\n\n- **Bold** item\n- [Link](https://pashi.app)",
    runtime: "worker",
    status: "available"
  },
  {
    aliases: ["jira-to-md", "confluence-to-markdown", "confluence-to-md"],
    api: {
      accepts: TEXT_REQUEST_FORMATS,
      examples: [
        {
          body: "h2. Heading\n\n* *Bold* item",
          contentType: "text/plain",
          description: "Post Jira markup as the raw request body.",
          method: "POST",
          url: "/api/jira-to-markdown"
        }
      ],
      fields: [],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Documents",
    description: "Convert Jira and Confluence wiki markup back into Markdown.",
    display: {
      actionLabel: "Convert to Markdown",
      category: "Jira and Confluence",
      examples: [
        "h2. Release notes\n\n* *Fixed* auth\n* Added {{copy}} action",
        "[Pashi|https://pashi.app] is *fast*"
      ]
    },
    endpoint: "/api/jira-to-markdown",
    id: "jira-to-markdown",
    input: {
      label: "Jira markup",
      kind: "text",
      required: true
    },
    label: "Jira to Markdown",
    outputs: ["markdown"],
    placeholder: "h2. Heading\n\n* *Bold* item\n* [Link|https://pashi.app]",
    runtime: "worker",
    status: "available"
  },
  {
    aliases: [
      "markdown-format",
      "markdown-to-slack-converter",
      "markdown-to-html-converter",
      "markdown-to-wordpress-html-converter",
      "markdown-link-generator",
      "markdown-image-syntax-generator",
      "markdown-task-list-generator"
    ],
    api: {
      accepts: TEXT_REQUEST_FORMATS,
      examples: [
        {
          body: "## Release notes\n\n- **Fixed** auth",
          contentType: "text/markdown",
          description: "Post Markdown and select a target output format.",
          method: "POST",
          url: "/api/markdown-format?outputFormat=slack"
        }
      ],
      fields: [
        {
          description: "Target Markdown publishing format.",
          id: "outputFormat",
          required: true,
          values: MARKDOWN_TARGET_FORMATS
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Documents",
    description: "Convert Markdown into Slack-friendly text or WordPress HTML.",
    display: {
      actionLabel: "Convert Markdown",
      category: "Markdown",
      examples: [
        "## Release notes\n\n- **Fixed** auth\n- [Pashi](https://pashi.app)"
      ]
    },
    endpoint: "/api/markdown-format",
    id: "markdown-format",
    input: {
      label: "Markdown",
      kind: "text",
      required: true
    },
    label: "Markdown targets",
    outputs: MARKDOWN_TARGET_FORMATS,
    placeholder: "## Heading\n\n- **Bold** item",
    runtime: "worker",
    status: "available"
  },
  {
    aliases: [
      "html-entity-encoder-decoder",
      "html-escape-unescape",
      "html-tag-remover-stripper",
      "html-link-extractor-checker",
      "html-comment-remover-extractor",
      "html-to-markdown-converter"
    ],
    api: {
      accepts: TEXT_REQUEST_FORMATS,
      examples: [
        {
          body: "<h1>Title</h1><p>Hello <strong>world</strong>.</p>",
          contentType: "text/html",
          description: "Post HTML and select a transform with outputFormat.",
          method: "POST",
          url: "/api/html-transform?outputFormat=to-markdown"
        }
      ],
      fields: [
        {
          description: "HTML transform mode.",
          id: "outputFormat",
          required: true,
          values: HTML_TRANSFORM_FORMATS
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Documents",
    description: "Escape, unescape, strip, inspect, and convert simple HTML snippets to Markdown.",
    display: {
      actionLabel: "Transform HTML",
      category: "HTML",
      examples: [
        "<h1>Title</h1><p>Hello <strong>world</strong>.</p>"
      ]
    },
    endpoint: "/api/html-transform",
    id: "html-transform",
    input: {
      label: "HTML",
      kind: "text",
      required: true
    },
    label: "HTML transform",
    outputs: HTML_TRANSFORM_FORMATS,
    placeholder: "<p>Hello <strong>world</strong>.</p>",
    runtime: "worker",
    status: "available"
  },
  {
    aliases: [
      "unix-timestamp-converter",
      "milliseconds-timestamp-converter",
      "human-date-to-timestamp",
      "timestamp-to-readable-date",
      "iso-8601-timestamp-converter",
      "rfc-timestamp-converter",
      "discord-timestamp-generator",
      "add-subtract-time-timestamp",
      "timestamp-difference-calculator",
      "timestamp-validator-formatter",
      "epoch-timestamp-generator"
    ],
    api: {
      accepts: TEXT_REQUEST_FORMATS,
      examples: [
        {
          body: "2024-01-02T03:04:05Z",
          contentType: "text/plain",
          description: "Post a timestamp or date and select an output format.",
          method: "POST",
          url: "/api/timestamp-transform?outputFormat=unix"
        }
      ],
      fields: [
        {
          description: "Timestamp output or calculation mode.",
          id: "outputFormat",
          required: true,
          values: TIMESTAMP_TRANSFORM_FORMATS
        },
        {
          description: "Amount for add or subtract modes.",
          id: "amount"
        },
        {
          description: "Unit for add or subtract modes.",
          id: "unit",
          values: ["milliseconds", "seconds", "minutes", "hours", "days", "weeks"]
        },
        {
          description: "End timestamp for difference mode.",
          id: "until"
        },
        {
          description: "Discord timestamp style.",
          id: "style",
          values: ["shortTime", "longTime", "shortDate", "longDate", "full", "relative"]
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Documents",
    description: "Convert timestamps and dates between Unix, milliseconds, ISO, readable UTC, RFC, Discord, and simple date math outputs.",
    display: {
      actionLabel: "Convert timestamp",
      category: "Dates",
      examples: [
        "2024-01-02T03:04:05Z",
        "1704164645"
      ]
    },
    endpoint: "/api/timestamp-transform",
    id: "timestamp-transform",
    input: {
      label: "Timestamp or date",
      kind: "text",
      required: true
    },
    label: "Timestamp transform",
    outputs: TIMESTAMP_TRANSFORM_FORMATS,
    placeholder: "2024-01-02T03:04:05Z",
    runtime: "worker",
    status: "available"
  },
  {
    aliases: [
      "text-transform",
      "character-counter",
      "case-converter",
      "duplicate-word-remover",
      "find-and-replace-text",
      "remove-duplicate-lines",
      "sentence-counter",
      "string-length-calculator",
      "string-reverse",
      "text-case-converter",
      "leet-speak-converter",
      "text-line-sorter",
      "text-repeater",
      "text-reverser",
      "text-size-calculator",
      "text-to-hashtags-generator",
      "text-to-list-converter",
      "upside-down-text-generator",
      "text-to-binary-converter",
      "binary-to-text-converter",
      "text-to-hex-converter",
      "hex-to-text-converter",
      "ascii-to-decimal-converter",
      "ascii-to-hex-converter",
      "ascii-to-octal-converter",
      "binary-decimal-hex-converter",
      "url-decoder",
      "url-encoder",
      "url-case-converter",
      "unicode-escape-encoder",
      "unicode-normalizer",
      "unicode-text-converter",
      "unicode-url-encoder",
      "unicode-whitespace-remover",
      "unicode-zero-width-tool",
      "vertical-text-generator",
      "whitespace-remover",
      "word-counter",
      "word-counter-character-counter",
      "word-frequency-counter"
    ],
    api: {
      accepts: TEXT_REQUEST_FORMATS,
      examples: [
        {
          body: "Hello, Pashi App!",
          contentType: "text/plain",
          description: "Post text and select a transform with outputFormat.",
          method: "POST",
          url: "/api/text-transform?outputFormat=kebab"
        },
        {
          description: "Decode a binary byte sequence.",
          method: "GET",
          url: "/api/text-transform?input=01001000%2001101001&outputFormat=from-binary"
        }
      ],
      fields: [
        {
          description: "Text transform or encoding mode.",
          id: "outputFormat",
          required: true,
          values: TEXT_TRANSFORM_FORMATS
        },
        {
          description: "Repeat count for repeat mode.",
          id: "count"
        },
        {
          description: "Search text for replace mode.",
          id: "search"
        },
        {
          description: "Replacement text for replace mode.",
          id: "replace"
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Documents",
    description: "Convert case, encode, decode, count, sort, dedupe, and reshape text.",
    display: {
      actionLabel: "Transform text",
      category: "Text",
      examples: [
        "Hello, Pashi App!",
        "01001000 01101001"
      ]
    },
    endpoint: "/api/text-transform",
    id: "text-transform",
    input: {
      label: "Text",
      kind: "text",
      required: true
    },
    label: "Text and encoding",
    outputs: TEXT_TRANSFORM_FORMATS,
    placeholder: "Hello, Pashi App!",
    runtime: "worker",
    status: "available"
  },
  {
    aliases: [
      "json-formatter-beautifier",
      "json-pretty-print",
      "json-minifier",
      "json-sorter",
      "json-flatten",
      "json-key-extractor",
      "json-key-value-extractor",
      "json-base64",
      "json-encode-decode",
      "json-escape-unescape",
      "json-stringify-parse"
    ],
    api: {
      accepts: TEXT_REQUEST_FORMATS,
      examples: [
        {
          body: '{"b":2,"a":1}',
          contentType: "application/json",
          description: "Post JSON and select a transform with outputFormat.",
          method: "POST",
          url: "/api/json-transform?outputFormat=format"
        }
      ],
      fields: [
        {
          description: "JSON transform mode.",
          id: "outputFormat",
          required: true,
          values: JSON_TRANSFORM_FORMATS
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Documents",
    description: "Format, minify, sort, flatten, inspect, encode, and escape JSON text.",
    display: {
      actionLabel: "Transform JSON",
      category: "JSON",
      examples: [
        '{"b":2,"a":{"c":3}}'
      ]
    },
    endpoint: "/api/json-transform",
    id: "json-transform",
    input: {
      label: "JSON",
      kind: "text",
      required: true
    },
    label: "JSON transform",
    outputs: JSON_TRANSFORM_FORMATS,
    placeholder: '{"b":2,"a":{"c":3}}',
    runtime: "worker",
    status: "available"
  },
  {
    aliases: [
      "csv-json-shape-tools",
      "csv-schema-inspector",
      "csv-shape",
      "csv-summary",
      "json-schema-inspector",
      "json-shape",
      "json-structure-inspector"
    ],
    api: {
      accepts: TEXT_REQUEST_FORMATS,
      examples: [
        {
          body: '{"users":[{"id":1,"name":"Ada"}]}',
          contentType: "application/json",
          description: "Inspect JSON structure and inferred value kinds.",
          method: "POST",
          url: "/api/data-shape?outputFormat=json-shape"
        },
        {
          body: "id,name\n1,Ada\n2,Grace",
          contentType: "text/csv",
          description: "Inspect CSV columns, row counts, examples, and inferred scalar types.",
          method: "POST",
          url: "/api/data-shape?outputFormat=csv-shape"
        }
      ],
      fields: [
        {
          description: "Data shape inspection mode.",
          id: "outputFormat",
          required: true,
          values: DATA_SHAPE_FORMATS
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Documents",
    description: "Inspect JSON and CSV structure, including fields, row counts, examples, and inferred scalar types.",
    display: {
      actionLabel: "Inspect data",
      category: "Data",
      examples: [
        '{"users":[{"id":1,"name":"Ada"}]}',
        "id,name\n1,Ada\n2,Grace"
      ]
    },
    endpoint: "/api/data-shape",
    id: "data-shape",
    input: {
      label: "JSON or CSV",
      kind: "text",
      required: true
    },
    label: "Data shape",
    outputs: DATA_SHAPE_FORMATS,
    placeholder: '{"users":[{"id":1,"name":"Ada"}]}',
    runtime: "worker",
    status: "available"
  },
  {
    aliases: [
      "colour-contrast-checker",
      "color-contrast-checker",
      "cron-explainer",
      "file-signature-inspector",
      "jwt-decoder",
      "jwt-inspector",
      "mime-inspector",
      "uuid-decoder",
      "uuid-inspector"
    ],
    api: {
      accepts: TEXT_REQUEST_FORMATS,
      examples: [
        {
          body: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature",
          contentType: "text/plain",
          description: "Decode a JWT header and payload without verifying the signature.",
          method: "POST",
          url: "/api/developer-inspect?outputFormat=jwt"
        },
        {
          body: "#111827 #ffffff",
          contentType: "text/plain",
          description: "Check WCAG contrast for foreground and background colours.",
          method: "POST",
          url: "/api/developer-inspect?outputFormat=colour-contrast"
        }
      ],
      fields: [
        {
          description: "Developer inspection mode.",
          id: "outputFormat",
          required: true,
          values: DEVELOPER_INSPECT_FORMATS
        },
        {
          description: "Foreground colour for contrast checks.",
          id: "foreground"
        },
        {
          description: "Background colour for contrast checks.",
          id: "background"
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Documents",
    description: "Decode JWTs, inspect UUIDs, explain cron expressions, check colour contrast, and identify common file signatures.",
    display: {
      actionLabel: "Inspect value",
      category: "Developer",
      examples: [
        "0 9 * * 1",
        "018f9b7c-2f2d-7b68-8f4f-1f3f6c0b2f00"
      ]
    },
    endpoint: "/api/developer-inspect",
    id: "developer-inspect",
    input: {
      label: "Value",
      kind: "text",
      required: true
    },
    label: "Developer inspector",
    outputs: DEVELOPER_INSPECT_FORMATS,
    placeholder: "0 9 * * 1",
    runtime: "worker",
    status: "available"
  },
  {
    aliases: [
      "css-beautifier",
      "css-formatter",
      "css-minifier",
      "diff-checker",
      "diff-tool",
      "html-beautifier",
      "html-formatter",
      "html-minifier",
      "json-beautifier",
      "json-diff-tool",
      "json-minifier-tool",
      "pretty-print",
      "text-diff",
      "xml-beautifier",
      "xml-formatter",
      "xml-minifier"
    ],
    api: {
      accepts: TEXT_REQUEST_FORMATS,
      examples: [
        {
          body: "one\ntwo\n---\none\nthree",
          contentType: "text/plain",
          description: "Compare two text blocks separated by a line containing three hyphens.",
          method: "POST",
          url: "/api/developer-text?outputFormat=diff-lines"
        },
        {
          body: "body{color:#111;background:#fff}",
          contentType: "text/css",
          description: "Pretty-print CSS without adding dependencies.",
          method: "POST",
          url: "/api/developer-text?outputFormat=pretty-css"
        }
      ],
      fields: [
        {
          description: "Developer text transform mode.",
          id: "outputFormat",
          required: true,
          values: DEVELOPER_TEXT_FORMATS
        },
        {
          description: "Left-hand text for diff mode.",
          display: { width: "full" },
          id: "left"
        },
        {
          description: "Right-hand text for diff mode.",
          display: { width: "full" },
          id: "right"
        },
        {
          description: "Separator used when diffing from a single input field.",
          id: "separator"
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Documents",
    description: "Diff text blocks and pretty-print or minify JSON, CSS, HTML, and XML snippets.",
    display: {
      actionLabel: "Transform text",
      category: "Developer",
      examples: [
        "one\ntwo\n---\none\nthree",
        "body{color:#111;background:#fff}"
      ]
    },
    endpoint: "/api/developer-text",
    id: "developer-text",
    input: {
      label: "Text or code",
      kind: "text",
      required: false
    },
    label: "Developer text tools",
    outputs: DEVELOPER_TEXT_FORMATS,
    placeholder: "one\ntwo\n---\none\nthree",
    runtime: "worker",
    status: "available"
  },
  {
    aliases: [
      "curl-converter",
      "curl-to-fetch",
      "curl-to-json",
      "har-converter",
      "har-to-curl",
      "http-request-converter",
      "request-to-curl"
    ],
    api: {
      accepts: TEXT_REQUEST_FORMATS,
      examples: [
        {
          body: `curl -X POST -H 'Content-Type: application/json' --data-raw '{"ok":true}' https://api.example.com/items`,
          contentType: "text/plain",
          description: "Convert a curl command into a Fetch API snippet.",
          method: "POST",
          url: "/api/request-transform?outputFormat=curl-to-fetch"
        },
        {
          body: "GET /items HTTP/1.1\nHost: api.example.com\nAccept: application/json",
          contentType: "text/plain",
          description: "Convert raw HTTP request text into curl.",
          method: "POST",
          url: "/api/request-transform?outputFormat=request-to-curl"
        }
      ],
      fields: [
        {
          description: "Request conversion mode.",
          id: "outputFormat",
          required: true,
          values: REQUEST_TRANSFORM_FORMATS
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Documents",
    description: "Convert common request formats between curl, Fetch API snippets, HAR requests, and raw HTTP request text.",
    display: {
      actionLabel: "Convert request",
      category: "Requests",
      examples: [
        "curl -H 'Accept: application/json' https://api.example.com/items",
        "GET /items HTTP/1.1\nHost: api.example.com"
      ]
    },
    endpoint: "/api/request-transform",
    id: "request-transform",
    input: {
      label: "Request",
      kind: "text",
      required: true
    },
    label: "Request transform",
    outputs: REQUEST_TRANSFORM_FORMATS,
    placeholder: "curl -H 'Accept: application/json' https://api.example.com/items",
    runtime: "worker",
    status: "available"
  },
  {
    aliases: [
      "url-parser",
      "url-query-string-extractor",
      "url-email-link-extractor",
      "url-duplicate-finder"
    ],
    api: {
      accepts: TEXT_REQUEST_FORMATS,
      examples: [
        {
          body: "https://example.com/search?q=pashi&tag=tools",
          contentType: "text/plain",
          description: "Post a URL or text containing URLs and choose a transform with outputFormat.",
          method: "POST",
          url: "/api/url-transform?outputFormat=parse"
        }
      ],
      fields: [
        {
          description: "URL inspection or extraction mode.",
          id: "outputFormat",
          required: true,
          values: URL_TRANSFORM_FORMATS
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Documents",
    description: "Parse URLs, extract query parameters, pull links and email addresses from text, and deduplicate links.",
    display: {
      actionLabel: "Inspect URL",
      category: "URLs",
      examples: [
        "https://example.com/search?q=pashi&tag=tools",
        "Email hello@example.com or read https://pashi.app"
      ]
    },
    endpoint: "/api/url-transform",
    id: "url-transform",
    input: {
      label: "URL or text",
      kind: "text",
      required: true
    },
    label: "URL transform",
    outputs: URL_TRANSFORM_FORMATS,
    placeholder: "https://example.com/search?q=pashi&tag=tools",
    runtime: "worker",
    status: "available"
  },
  {
    aliases: [
      "unit-converter",
      "unit-converter-tool",
      "length-converter",
      "area-converter",
      "volume-converter",
      "weight-converter",
      "weight-and-mass",
      "temperature-converter",
      "speed-converter",
      "data-storage-converter",
      "degrees-radians-converter",
      "time-converter",
      "pressure-converter",
      "energy-converter",
      "power",
      "power-converter",
      "force",
      "force-converter",
      "frequency",
      "frequency-converter",
      "torque",
      "torque-converter",
      "moment-of-force"
    ],
    api: {
      accepts: TEXT_REQUEST_FORMATS,
      examples: [
        {
          body: "10 m",
          contentType: "text/plain",
          description: "Convert a value with a source unit into the selected output unit.",
          method: "POST",
          url: "/api/unit-converter?outputFormat=ft"
        },
        {
          description: "Convert Celsius to Fahrenheit.",
          method: "GET",
          url: "/api/unit-converter?input=100%20c&outputFormat=f"
        }
      ],
      fields: [
        {
          description: "Target unit.",
          id: "outputFormat",
          required: true,
          values: UNIT_OUTPUTS
        },
        {
          description: "Optional source unit when the input contains only a number.",
          id: "fromUnit"
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Documents",
    description: "Convert common length, mass, temperature, data, speed, area, volume, angle, time, pressure, energy, power, force, frequency, and torque units.",
    display: {
      actionLabel: "Convert unit",
      category: "Units",
      examples: [
        "10 m",
        "100 c",
        "1048576 b"
      ]
    },
    endpoint: "/api/unit-converter",
    id: "unit-converter",
    input: {
      label: "Value with unit",
      kind: "text",
      required: true
    },
    label: "Unit converter",
    outputs: UNIT_OUTPUTS,
    placeholder: "10 m",
    runtime: "worker",
    status: "available"
  },
  {
    aliases: [
      "image-format",
      "image-transcode",
      "image-url",
      "remote-image",
      "png-to-webp",
      "jpg-to-webp",
      "svg-to-png-converter",
      "svg-to-jpg-converter",
      "svg-to-webp-converter",
      "svg-to-ico-converter",
      "favicon-generator-from-image",
      "icon-file-format-converter-all-types",
      "animated-gif-to-icon-converter"
    ],
    api: {
      accepts: IMAGE_REQUEST_FORMATS,
      examples: [
        {
          description: "Fetch and convert a public image URL to WebP.",
          method: "GET",
          url: "/api/image-format?input=https%3A%2F%2Fnicholasgriffin.dev%2Favatar.png&outputFormat=webp"
        },
        {
          body: "file=@image.png; outputFormat=avif",
          contentType: "multipart/form-data",
          description: "Upload an image file and create a conversion job.",
          method: "POST",
          url: "/api/image-format"
        },
        {
          description: "Check a queued image conversion job.",
          method: "GET",
          url: "/api/image-format?job=<job-id>"
        }
      ],
      fields: [
        {
          description: "Target image format.",
          id: "outputFormat",
          values: IMAGE_FORMAT_OUTPUTS
        },
        {
          description: "Optional image quality from 1 to 100.",
          id: "quality"
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Media",
    description: "Convert image URLs immediately, or upload image files into the async ffmpeg pipeline.",
    display: {
      actionLabel: "Convert image",
      category: "Media",
      examples: []
    },
    endpoint: "/api/image-format",
    id: "image-format",
    input: {
      accept: ["image/*", ".avif", ".bmp", ".gif", ".ico", ".jpg", ".jpeg", ".mjpeg", ".png", ".tif", ".tiff", ".webp"],
      label: "Image file",
      kind: "file",
      required: true
    },
    label: "Image formats",
    outputs: IMAGE_FORMAT_OUTPUTS,
    placeholder: "Any ffmpeg-readable image",
    runtime: "container",
    status: "available"
  },
  {
    aliases: [
      "slackmoji",
      "slack-emoji",
      "slack-emoji-converter",
      "emoji-to-gif",
      "animated-emoji-converter"
    ],
    api: {
      accepts: IMAGE_REQUEST_FORMATS,
      examples: [
        {
          body: "file=@emoji.png; effect=none",
          contentType: "multipart/form-data",
          description: "Upload an image and generate an animated GIF.",
          method: "POST",
          url: "/api/slackmoji"
        },
        {
          description: "Check a queued slackmoji conversion job.",
          method: "GET",
          url: "/api/slackmoji?job=<job-id>"
        }
      ],
      fields: [
        {
          description: "Target output format.",
          id: "outputFormat",
          required: true,
          values: SLACKMOJI_OUTPUTS
        },
        {
          description: "Preset image.",
          display: {
            control: "source-presets",
            width: "full"
          },
          id: "sourceKey"
        },
        {
          defaultValue: "spinning",
          description: "Optional animation preset.",
          display: {
            control: "effect-presets",
            width: "full"
          },
          id: "effect",
          values: [
            "none",
            "spinning",
            "flipping",
            "zoom",
            "slide_in",
            "slide_out",
            "scroll",
            "spin_left",
            "spin_right",
            "jitter",
            "rock",
            "pulse",
            "dance",
            "intensifies",
            "blink",
            "party",
            "loop",
            "zigzag",
            "yup",
            "excited",
            "nope",
            "dizzy",
            "spiral",
            "shrinking",
            "peeking",
            "hologram",
            "frazzled",
            "melting",
            "rave",
            "matrix",
            "bees",
            "deal_with_it",
            "glitch",
            "ripple",
            "pixelate",
            "glitch_out",
            "shattered",
            "portal",
            "origami",
            "paint_drip",
            "neon_pulse",
            "pixel_sort",
            "kaleidoscope",
            "bubble_pop",
            "typewriter",
            "black_hole",
            "mosaic_spin",
            "liquid_metal",
            "time_warp",
            "dna_spiral",
            "paint_splash",
            "rubiks",
            "vinyl_record",
            "blueprint"
          ]
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Media",
    description: "Create animated Slack-style GIFs from images in the ffmpeg container.",
    display: {
      actionLabel: "Generate Slack-style GIF",
      category: "Media",
      examples: []
    },
    endpoint: "/api/slackmoji",
    id: "slackmoji",
    input: {
      accept: ["image/*", ".avif", ".bmp", ".gif", ".ico", ".jpg", ".jpeg", ".mjpeg", ".png", ".tif", ".tiff", ".webp"],
      label: "Image file",
      kind: "file",
      required: true
    },
    label: "Slack-style GIF generator",
    outputs: SLACKMOJI_OUTPUTS,
    placeholder: "Upload an image to animate as GIF",
    runtime: "container",
    status: "available"
  },
  {
    aliases: [
      "slack-hdr-emoji",
      "hdr-emoji",
      "hdr-slack-emoji",
      "bright-slack-emoji",
      "glowing-slack-emoji",
      "slack-emoji-hdr"
    ],
    api: {
      accepts: IMAGE_REQUEST_FORMATS,
      examples: [
        {
          body: "file=@emoji.png; intensity=2.1; gamma=1.1",
          contentType: "multipart/form-data",
          description: "Upload an image and generate an HDR-style Slack emoji PNG.",
          method: "POST",
          url: "/api/slack-hdr-emoji"
        },
        {
          description: "Check a queued HDR emoji conversion job.",
          method: "GET",
          url: "/api/slack-hdr-emoji?job=<job-id>"
        }
      ],
      fields: [
        {
          description: "Target output format.",
          id: "outputFormat",
          required: true,
          values: SLACK_HDR_EMOJI_OUTPUTS
        },
        {
          description: "Preset image.",
          display: {
            control: "source-presets",
            width: "full"
          },
          id: "sourceKey"
        },
        {
          defaultValue: "2.1",
          description: "Brightness intensity.",
          id: "intensity",
          values: ["1.2", "1.5", "1.8", "2.1"]
        },
        {
          defaultValue: "1.1",
          description: "Gamma shaping.",
          id: "gamma",
          values: ["0.8", "0.9", "1.0", "1.1"]
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Media",
    description: "Create bright HDR-style Slack emoji PNGs from uploaded images or presets.",
    display: {
      actionLabel: "Generate HDR emoji",
      category: "Media",
      examples: []
    },
    endpoint: "/api/slack-hdr-emoji",
    id: "slack-hdr-emoji",
    input: {
      accept: ["image/*", ".avif", ".bmp", ".gif", ".ico", ".jpg", ".jpeg", ".mjpeg", ".png", ".tif", ".tiff", ".webp"],
      label: "Image file",
      kind: "file",
      required: true
    },
    label: "HDR Slack emoji generator",
    outputs: SLACK_HDR_EMOJI_OUTPUTS,
    placeholder: "Upload an image or choose a preset for an HDR-style Slack emoji",
    runtime: "container",
    status: "available"
  },
  {
    aliases: [
      "file-format",
      "text-file",
      "data-file",
      "json-to-csv",
      "csv-to-json",
      "json-to-yaml-converter",
      "yaml-to-json-converter",
      "json-to-toml-converter",
      "toml-to-json-converter",
      "xml-to-json-converter",
      "csv-to-sql-converter-inserts",
      "csv-to-excel-converter",
      "excel-json-to-csv-converter",
      "excel-xml-to-csv-converter",
      "json-to-sql-converter",
      "csv-to-yaml-converter",
      "yaml-to-csv-converter",
      "csv-to-toml-converter",
      "toml-to-csv-converter",
      "json-to-xml-converter",
      "xml-to-csv-converter",
      "yaml-to-toml-converter",
      "toml-to-yaml-converter",
      "yaml-to-xml-converter",
      "xml-to-yaml-converter",
      "env-to-toml-converter",
      "toml-to-env-converter",
      "ini-to-yaml-converter",
      "yaml-to-ini-converter",
      "properties-to-yaml-converter",
      "yaml-to-properties-converter",
      "tsv-to-csv-converter",
      "csv-to-tsv-converter"
    ],
    api: {
      accepts: FILE_REQUEST_FORMATS,
      examples: [
        {
          body: "name,role\nAda,admin",
          contentType: "text/csv",
          description: "Post raw CSV and choose JSON output with query fields.",
          method: "POST",
          url: "/api/file-format?outputFormat=json&sourceName=people.csv"
        },
        {
          body: "file=@people.csv; outputFormat=json",
          contentType: "multipart/form-data",
          description: "Upload a file with a file field and outputFormat field.",
          method: "POST",
          url: "/api/file-format"
        }
      ],
      fields: [
        {
          description: "Target text-file format.",
          id: "outputFormat",
          required: true,
          values: TEXT_FILE_FORMATS
        },
        {
          description: "Optional source filename used for conversion context and download names.",
          id: "sourceName"
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Media",
    description: "Convert text, Markdown, JSON, CSV, HTML, YAML, TOML, XML, INI, env, properties, and SQL files.",
    display: {
      actionLabel: "Convert file",
      category: "Files",
      examples: []
    },
    id: "file-format",
    endpoint: "/api/file-format",
    input: {
      accept: ["text/plain", "text/markdown", "text/csv", "text/tab-separated-values", "text/html", "application/json", "application/xml", "application/yaml", "application/sql", ".txt", ".md", ".markdown", ".csv", ".tsv", ".tab", ".xls", ".html", ".json", ".yaml", ".yml", ".toml", ".xml", ".ini", ".properties", ".env", ".sql"],
      label: "Text file",
      kind: "file",
      required: true
    },
    label: "Text file formats",
    outputs: TEXT_FILE_FORMATS,
    placeholder: "TXT, Markdown, JSON, CSV, HTML, YAML, TOML, XML, INI, env, properties, or SQL",
    runtime: "worker",
    status: "available"
  },
  {
    aliases: [
      "document-format",
      "document-convert",
      "docx-to-markdown",
      "markdown-to-docx",
      "md-to-docx",
      "html-to-docx",
      "docx-to-html",
      "markdown-to-wordpress-html-converter"
    ],
    api: {
      accepts: DOCUMENT_REQUEST_FORMATS,
      examples: [
        {
          body: "file=@notes.md; outputFormat=docx",
          contentType: "multipart/form-data",
          description: "Upload a document and create a Pandoc conversion job.",
          method: "POST",
          url: "/api/document-format"
        },
        {
          description: "Check a queued document conversion job.",
          method: "GET",
          url: "/api/document-format?job=<job-id>"
        }
      ],
      fields: [
        {
          description: "Target document format. The API accepts safe Pandoc output extensions.",
          id: "outputFormat",
          required: true,
          values: DOCUMENT_FORMAT_OUTPUTS
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Documents",
    description: "Convert uploaded documents through the async Cloudflare Container running Pandoc.",
    display: {
      actionLabel: "Convert document",
      category: "Documents",
      examples: []
    },
    endpoint: "/api/document-format",
    id: "document-format",
    input: {
      accept: [
        "application/epub+zip",
        "application/rtf",
        "application/vnd.oasis.opendocument.text",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/html",
        "text/markdown",
        "text/plain",
        ".docx",
        ".epub",
        ".html",
        ".md",
        ".odt",
        ".rtf",
        ".txt"
      ],
      label: "Document file",
      kind: "file",
      required: true
    },
    label: "Document formats",
    outputs: DOCUMENT_FORMAT_OUTPUTS,
    placeholder: "DOCX, ODT, RTF, EPUB, HTML, Markdown, or TXT",
    runtime: "container",
    status: "available"
  },
  {
    aliases: [
      "video-format",
      "video-transcode",
      "video-format-converter",
      "mp4-to-webm",
      "webm-to-mp4",
      "mov-to-mp4",
      "extract-audio-from-video",
      "video-audio-remover",
      "video-bitrate-changer",
      "video-compressor",
      "video-compressor-simple",
      "video-duration-cutter",
      "video-frame-extractor",
      "video-frame-sequence-exporter",
      "video-grayscale",
      "video-keyframe-extractor",
      "video-speed-changer",
      "video-thumbnail-generator",
      "change-video-fps",
      "resize-video-dimensions"
    ],
    api: {
      accepts: VIDEO_REQUEST_FORMATS,
      examples: [
        {
          body: "file=@clip.mp4; outputFormat=webm",
          contentType: "multipart/form-data",
          description: "Upload a video file and create a conversion job.",
          method: "POST",
          url: "/api/video-format"
        },
        {
          description: "Check a queued video conversion job.",
          method: "GET",
          url: "/api/video-format?job=<job-id>"
        }
      ],
      fields: [
        {
          description: "Target video, audio, or animated image format.",
          id: "outputFormat",
          required: true,
          values: VIDEO_FORMAT_OUTPUTS
        },
        {
          description: "Optional ffmpeg operation preset.",
          id: "operation",
          values: ["thumbnail", "extract-audio", "remove-audio", "resize", "trim", "grayscale"]
        },
        {
          description: "Optional timestamp, duration, fps, bitrate, width, height, speed, or volume fields.",
          id: "time"
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Media",
    description: "Convert uploaded video through an async Cloudflare Container running ffmpeg.",
    display: {
      actionLabel: "Convert video",
      category: "Media",
      examples: []
    },
    endpoint: "/api/video-format",
    id: "video-format",
    input: {
      accept: ["video/*", "audio/*", ".3gp", ".avi", ".flv", ".m4v", ".mkv", ".mov", ".mp4", ".mpeg", ".mpg", ".ogv", ".ts", ".webm", ".wmv"],
      label: "Video or audio file",
      kind: "file",
      required: true
    },
    label: "Video and audio formats",
    outputs: VIDEO_FORMAT_OUTPUTS,
    placeholder: "Any ffmpeg-readable video or audio",
    runtime: "container",
    status: "available"
  },
  {
    aliases: [
      "audio-format",
      "audio-transcode",
      "audio-format-converter",
      "mp3-to-wav",
      "wav-to-mp3",
      "mp3-to-flac",
      "flac-to-mp3",
      "wav-to-flac",
      "audio-bitrate-changer",
      "audio-channel-remover",
      "audio-mono-stereo-converter",
      "audio-sample-rate-converter",
      "audio-thumbnail-generator",
      "audio-trimmer",
      "audio-waveform-generator"
    ],
    api: {
      accepts: AUDIO_REQUEST_FORMATS,
      examples: [
        {
          body: "file=@clip.mp3; outputFormat=wav",
          contentType: "multipart/form-data",
          description: "Upload an audio file and create a conversion job.",
          method: "POST",
          url: "/api/audio-format"
        },
        {
          description: "Check a queued audio conversion job.",
          method: "GET",
          url: "/api/audio-format?job=<job-id>"
        }
      ],
      fields: [
        {
          description: "Target audio format.",
          id: "outputFormat",
          required: true,
          values: AUDIO_FORMAT_OUTPUTS
        },
        {
          description: "Optional ffmpeg operation preset.",
          id: "operation",
          values: ["trim", "waveform"]
        },
        {
          description: "Optional duration, bitrate, channels, sampleRate, speed, or volume fields.",
          id: "duration"
        }
      ],
      methods: ["GET", "POST"],
      response: "json"
    },
    audience: "Media",
    description: "Convert uploaded audio through the async Cloudflare Container running ffmpeg.",
    display: {
      actionLabel: "Convert audio",
      category: "Media",
      examples: []
    },
    endpoint: "/api/audio-format",
    id: "audio-format",
    input: {
      accept: ["audio/*", ".aac", ".aiff", ".flac", ".m4a", ".mka", ".mp3", ".oga", ".ogg", ".opus", ".wav", ".wma"],
      label: "Audio file",
      kind: "file",
      required: true
    },
    label: "Audio formats",
    outputs: AUDIO_FORMAT_OUTPUTS,
    placeholder: "Any ffmpeg-readable audio",
    runtime: "container",
    status: "available"
  }
];
function listConverterTools() {
  return CONVERTER_TOOLS;
}
function findConverterTool(type) {
  const normalisedType = type.trim().toLowerCase();
  return CONVERTER_TOOLS.find(
    (tool2) => tool2.id === normalisedType || tool2.aliases.includes(normalisedType)
  );
}
const FEATURE_REQUIRED_SERVICES = {
  ai: ["ai"],
  conversions: ["conversionBucket", "conversionContainer", "conversionQueue"]
};
const SERVICE_LABELS = {
  ai: "Cloudflare Workers AI",
  conversionBucket: "Conversion R2 bucket",
  conversionContainer: "Conversion container",
  conversionQueue: "Conversion queue"
};
const SERVICE_REQUIRED_FEATURES = {
  ai: ["ai"],
  conversionBucket: ["conversions"],
  conversionContainer: ["conversions"],
  conversionQueue: ["conversions"]
};
function isEnabledFlag(value) {
  return value?.trim().toLowerCase() === "true";
}
function serviceStatus(label, requiredFor, available) {
  return {
    available,
    label,
    requiredFor,
    status: available ? "available" : "missing"
  };
}
function unavailableServices(services, requiredServices) {
  return requiredServices.filter((service) => !services[service].available);
}
function createServiceStatus(env) {
  return {
    ai: serviceStatus(SERVICE_LABELS.ai, SERVICE_REQUIRED_FEATURES.ai, Boolean(env.AI)),
    conversionBucket: serviceStatus(
      SERVICE_LABELS.conversionBucket,
      SERVICE_REQUIRED_FEATURES.conversionBucket,
      Boolean(env.CONVERSION_BUCKET)
    ),
    conversionContainer: serviceStatus(
      SERVICE_LABELS.conversionContainer,
      SERVICE_REQUIRED_FEATURES.conversionContainer,
      Boolean(env.CONVERSION_CONTAINER)
    ),
    conversionQueue: serviceStatus(
      SERVICE_LABELS.conversionQueue,
      SERVICE_REQUIRED_FEATURES.conversionQueue,
      Boolean(env.CONVERSION_QUEUE)
    )
  };
}
function createFeatureStatus(env) {
  const services = createServiceStatus(env);
  const aiRequiredServices = FEATURE_REQUIRED_SERVICES.ai;
  const conversionRequiredServices = FEATURE_REQUIRED_SERVICES.conversions;
  const aiUnavailableServices = unavailableServices(services, aiRequiredServices);
  const conversionUnavailableServices = unavailableServices(services, conversionRequiredServices);
  const aiEnabled = isEnabledFlag(env.ENABLE_AI);
  const conversionsEnabled = isEnabledFlag(env.ENABLE_CONVERSIONS);
  return {
    ai: {
      available: aiEnabled && aiUnavailableServices.length === 0,
      enabled: aiEnabled,
      requiredServices: aiRequiredServices,
      unavailableServices: aiUnavailableServices
    },
    conversions: {
      available: conversionsEnabled,
      enabled: conversionsEnabled,
      requiredServices: conversionRequiredServices,
      unavailableServices: conversionUnavailableServices
    }
  };
}
function isConverterFeatureEnabled(env) {
  return Boolean(env && createFeatureStatus(env).conversions.enabled);
}
function hasQueuedConversionServices(env) {
  if (!env) {
    return false;
  }
  const services = createServiceStatus(env);
  return services.conversionBucket.available && services.conversionContainer.available && services.conversionQueue.available;
}
function isConverterAvailable(tool2, env) {
  if (!isConverterFeatureEnabled(env)) {
    return false;
  }
  return tool2.runtime === "worker" || hasQueuedConversionServices(env);
}
const EXPORT_FORMATS = ["csv", "json", "txt"];
function listExportFormats() {
  return EXPORT_FORMATS;
}
function isExportFormat(format) {
  return EXPORT_FORMATS.includes(format);
}
const POKEMON_TYPES = [
  "any",
  "bug",
  "dragon",
  "electric",
  "fairy",
  "fighting",
  "fire",
  "flying",
  "ghost",
  "grass",
  "ground",
  "ice",
  "normal",
  "poison",
  "psychic",
  "rock",
  "water"
];
const KANTO_POKEMON = [
  { id: 1, name: "Bulbasaur", types: ["grass", "poison"] },
  { id: 2, name: "Ivysaur", types: ["grass", "poison"] },
  { id: 3, name: "Venusaur", types: ["grass", "poison"] },
  { id: 4, name: "Charmander", types: ["fire"] },
  { id: 5, name: "Charmeleon", types: ["fire"] },
  { id: 6, name: "Charizard", types: ["fire", "flying"] },
  { id: 7, name: "Squirtle", types: ["water"] },
  { id: 8, name: "Wartortle", types: ["water"] },
  { id: 9, name: "Blastoise", types: ["water"] },
  { id: 10, name: "Caterpie", types: ["bug"] },
  { id: 11, name: "Metapod", types: ["bug"] },
  { id: 12, name: "Butterfree", types: ["bug", "flying"] },
  { id: 13, name: "Weedle", types: ["bug", "poison"] },
  { id: 14, name: "Kakuna", types: ["bug", "poison"] },
  { id: 15, name: "Beedrill", types: ["bug", "poison"] },
  { id: 16, name: "Pidgey", types: ["normal", "flying"] },
  { id: 17, name: "Pidgeotto", types: ["normal", "flying"] },
  { id: 18, name: "Pidgeot", types: ["normal", "flying"] },
  { id: 19, name: "Rattata", types: ["normal"] },
  { id: 20, name: "Raticate", types: ["normal"] },
  { id: 21, name: "Spearow", types: ["normal", "flying"] },
  { id: 22, name: "Fearow", types: ["normal", "flying"] },
  { id: 23, name: "Ekans", types: ["poison"] },
  { id: 24, name: "Arbok", types: ["poison"] },
  { id: 25, name: "Pikachu", types: ["electric"] },
  { id: 26, name: "Raichu", types: ["electric"] },
  { id: 27, name: "Sandshrew", types: ["ground"] },
  { id: 28, name: "Sandslash", types: ["ground"] },
  { id: 29, name: "Nidoran F", types: ["poison"] },
  { id: 30, name: "Nidorina", types: ["poison"] },
  { id: 31, name: "Nidoqueen", types: ["poison", "ground"] },
  { id: 32, name: "Nidoran M", types: ["poison"] },
  { id: 33, name: "Nidorino", types: ["poison"] },
  { id: 34, name: "Nidoking", types: ["poison", "ground"] },
  { id: 35, name: "Clefairy", types: ["fairy"] },
  { id: 36, name: "Clefable", types: ["fairy"] },
  { id: 37, name: "Vulpix", types: ["fire"] },
  { id: 38, name: "Ninetales", types: ["fire"] },
  { id: 39, name: "Jigglypuff", types: ["normal", "fairy"] },
  { id: 40, name: "Wigglytuff", types: ["normal", "fairy"] },
  { id: 41, name: "Zubat", types: ["poison", "flying"] },
  { id: 42, name: "Golbat", types: ["poison", "flying"] },
  { id: 43, name: "Oddish", types: ["grass", "poison"] },
  { id: 44, name: "Gloom", types: ["grass", "poison"] },
  { id: 45, name: "Vileplume", types: ["grass", "poison"] },
  { id: 46, name: "Paras", types: ["bug", "grass"] },
  { id: 47, name: "Parasect", types: ["bug", "grass"] },
  { id: 48, name: "Venonat", types: ["bug", "poison"] },
  { id: 49, name: "Venomoth", types: ["bug", "poison"] },
  { id: 50, name: "Diglett", types: ["ground"] },
  { id: 51, name: "Dugtrio", types: ["ground"] },
  { id: 52, name: "Meowth", types: ["normal"] },
  { id: 53, name: "Persian", types: ["normal"] },
  { id: 54, name: "Psyduck", types: ["water"] },
  { id: 55, name: "Golduck", types: ["water"] },
  { id: 56, name: "Mankey", types: ["fighting"] },
  { id: 57, name: "Primeape", types: ["fighting"] },
  { id: 58, name: "Growlithe", types: ["fire"] },
  { id: 59, name: "Arcanine", types: ["fire"] },
  { id: 60, name: "Poliwag", types: ["water"] },
  { id: 61, name: "Poliwhirl", types: ["water"] },
  { id: 62, name: "Poliwrath", types: ["water", "fighting"] },
  { id: 63, name: "Abra", types: ["psychic"] },
  { id: 64, name: "Kadabra", types: ["psychic"] },
  { id: 65, name: "Alakazam", types: ["psychic"] },
  { id: 66, name: "Machop", types: ["fighting"] },
  { id: 67, name: "Machoke", types: ["fighting"] },
  { id: 68, name: "Machamp", types: ["fighting"] },
  { id: 69, name: "Bellsprout", types: ["grass", "poison"] },
  { id: 70, name: "Weepinbell", types: ["grass", "poison"] },
  { id: 71, name: "Victreebel", types: ["grass", "poison"] },
  { id: 72, name: "Tentacool", types: ["water", "poison"] },
  { id: 73, name: "Tentacruel", types: ["water", "poison"] },
  { id: 74, name: "Geodude", types: ["rock", "ground"] },
  { id: 75, name: "Graveler", types: ["rock", "ground"] },
  { id: 76, name: "Golem", types: ["rock", "ground"] },
  { id: 77, name: "Ponyta", types: ["fire"] },
  { id: 78, name: "Rapidash", types: ["fire"] },
  { id: 79, name: "Slowpoke", types: ["water", "psychic"] },
  { id: 80, name: "Slowbro", types: ["water", "psychic"] },
  { id: 81, name: "Magnemite", types: ["electric"] },
  { id: 82, name: "Magneton", types: ["electric"] },
  { id: 83, name: "Farfetchd", types: ["normal", "flying"] },
  { id: 84, name: "Doduo", types: ["normal", "flying"] },
  { id: 85, name: "Dodrio", types: ["normal", "flying"] },
  { id: 86, name: "Seel", types: ["water"] },
  { id: 87, name: "Dewgong", types: ["water", "ice"] },
  { id: 88, name: "Grimer", types: ["poison"] },
  { id: 89, name: "Muk", types: ["poison"] },
  { id: 90, name: "Shellder", types: ["water"] },
  { id: 91, name: "Cloyster", types: ["water", "ice"] },
  { id: 92, name: "Gastly", types: ["ghost", "poison"] },
  { id: 93, name: "Haunter", types: ["ghost", "poison"] },
  { id: 94, name: "Gengar", types: ["ghost", "poison"] },
  { id: 95, name: "Onix", types: ["rock", "ground"] },
  { id: 96, name: "Drowzee", types: ["psychic"] },
  { id: 97, name: "Hypno", types: ["psychic"] },
  { id: 98, name: "Krabby", types: ["water"] },
  { id: 99, name: "Kingler", types: ["water"] },
  { id: 100, name: "Voltorb", types: ["electric"] },
  { id: 101, name: "Electrode", types: ["electric"] },
  { id: 102, name: "Exeggcute", types: ["grass", "psychic"] },
  { id: 103, name: "Exeggutor", types: ["grass", "psychic"] },
  { id: 104, name: "Cubone", types: ["ground"] },
  { id: 105, name: "Marowak", types: ["ground"] },
  { id: 106, name: "Hitmonlee", types: ["fighting"] },
  { id: 107, name: "Hitmonchan", types: ["fighting"] },
  { id: 108, name: "Lickitung", types: ["normal"] },
  { id: 109, name: "Koffing", types: ["poison"] },
  { id: 110, name: "Weezing", types: ["poison"] },
  { id: 111, name: "Rhyhorn", types: ["ground", "rock"] },
  { id: 112, name: "Rhydon", types: ["ground", "rock"] },
  { id: 113, name: "Chansey", types: ["normal"] },
  { id: 114, name: "Tangela", types: ["grass"] },
  { id: 115, name: "Kangaskhan", types: ["normal"] },
  { id: 116, name: "Horsea", types: ["water"] },
  { id: 117, name: "Seadra", types: ["water"] },
  { id: 118, name: "Goldeen", types: ["water"] },
  { id: 119, name: "Seaking", types: ["water"] },
  { id: 120, name: "Staryu", types: ["water"] },
  { id: 121, name: "Starmie", types: ["water", "psychic"] },
  { id: 122, name: "Mr. Mime", types: ["psychic", "fairy"] },
  { id: 123, name: "Scyther", types: ["bug", "flying"] },
  { id: 124, name: "Jynx", types: ["ice", "psychic"] },
  { id: 125, name: "Electabuzz", types: ["electric"] },
  { id: 126, name: "Magmar", types: ["fire"] },
  { id: 127, name: "Pinsir", types: ["bug"] },
  { id: 128, name: "Tauros", types: ["normal"] },
  { id: 129, name: "Magikarp", types: ["water"] },
  { id: 130, name: "Gyarados", types: ["water", "flying"] },
  { id: 131, name: "Lapras", types: ["water", "ice"] },
  { id: 132, name: "Ditto", types: ["normal"] },
  { id: 133, name: "Eevee", types: ["normal"] },
  { id: 134, name: "Vaporeon", types: ["water"] },
  { id: 135, name: "Jolteon", types: ["electric"] },
  { id: 136, name: "Flareon", types: ["fire"] },
  { id: 137, name: "Porygon", types: ["normal"] },
  { id: 138, name: "Omanyte", types: ["rock", "water"] },
  { id: 139, name: "Omastar", types: ["rock", "water"] },
  { id: 140, name: "Kabuto", types: ["rock", "water"] },
  { id: 141, name: "Kabutops", types: ["rock", "water"] },
  { id: 142, name: "Aerodactyl", types: ["rock", "flying"] },
  { id: 143, name: "Snorlax", types: ["normal"] },
  { id: 144, name: "Articuno", types: ["ice", "flying"] },
  { id: 145, name: "Zapdos", types: ["electric", "flying"] },
  { id: 146, name: "Moltres", types: ["fire", "flying"] },
  { id: 147, name: "Dratini", types: ["dragon"] },
  { id: 148, name: "Dragonair", types: ["dragon"] },
  { id: 149, name: "Dragonite", types: ["dragon", "flying"] },
  { id: 150, name: "Mewtwo", types: ["psychic"] },
  { id: 151, name: "Mew", types: ["psychic"] }
];
const CATEGORY_LABELS = {
  Design: "Design",
  Engineering: "Code",
  Gaming: "Gaming",
  Geographic: "Geographic",
  Identifiers: "Identifiers",
  People: "People",
  Product: "Product",
  Random: "Random",
  Security: "Security",
  Strings: "Text",
  TestData: "Test data",
  Tools: "Tools"
};
const NO_INPUT_TOOL_IDS = /* @__PURE__ */ new Set([
  "coinflip",
  "company",
  "coordinates",
  "iban",
  "ip-address",
  "ipv4",
  "ipv6",
  "mac",
  "minecraft-seed",
  "minecraft-uuid",
  "ssh-key",
  "us-state",
  "uuid",
  "zodiac",
  "zip"
]);
const GENERATOR_ALIASES = {
  "api-key": ["api-keys"],
  "api-token": ["api-tokens"],
  "barcode": ["barcodes", "barcode-generator", "barcode-data-encoder"],
  "bearer-token": ["bearer-tokens"],
  "card": ["credit-cards"],
  "chart-svg": ["bar-graph-generator", "gauge-chart-generator", "heat-map-generator", "radar-chart-generator", "word-cloud-generator", "pie-bar-chart-generator"],
  "coinflip": ["coin-flip"],
  "colour": ["color", "colors", "colours", "random-color-generator", "html-color-picker-generator"],
  "border-radius": ["border-radius-generator"],
  "box-shadow": ["box-shadow-generator"],
  "company": ["company-names"],
  "css-gradient": ["css-gradient-generator", "gradient-generator", "gradient-palette-generator", "gradient-step-generator"],
  "cron-expression": ["cron-expression-generator"],
  "date": ["dates", "random-date-generator"],
  "datetime": ["date-time", "datetimes", "random-timestamp-generator", "epoch-timestamp-generator"],
  "emoji": ["emojis", "random-emoji-generator"],
  "emoji-image": ["emoji-images"],
  "encryption-key": ["encryption-keys"],
  "fraction": ["fractions"],
  "hash": ["hashes", "hash-generator", "md5-hash-generator-checker", "sha1-hash-generator-decrypter", "binary-checksum-hash-generator"],
  "hex-number": ["hexadecimal-number", "hexadecimal-numbers"],
  "iban": ["ibans"],
  "ip-address": ["ip", "ip-addresses"],
  "ipv4": ["ipv4-address", "ipv4-addresses"],
  "ipv6": ["ipv6-address", "ipv6-addresses"],
  "jwt-token": ["jwt-tokens", "jwt-generator-signer"],
  "html-meta-tags": ["html-meta-tag-generator"],
  "http-curl-command": ["curl-command-generator", "curl-generator", "request-curl-generator"],
  "http-har-request": ["har-request-generator", "har-example-generator"],
  "http-request-example": ["http-request-generator", "raw-http-request-generator"],
  "json-api-response": ["json-api-response-generator"],
  "json-axios-code": ["json-axios-code-generator"],
  "json-fetch-code": ["json-fetch-code-generator"],
  "json-schema-example": ["json-schema-example-generator"],
  "json-to-typescript": ["json-to-typescript-interface-generator", "json-to-typescript", "json-to-ts"],
  "lorem": ["lorem-ipsum-generator", "placeholder-text-generator"],
  "mac": ["mac-address", "mac-addresses"],
  "minecraft-seed": ["minecraft-seeds"],
  "number": ["numbers"],
  "octal-number": ["octal-numbers"],
  "binary": ["binary-number", "binary-numbers"],
  "oauth-token": ["oauth-tokens"],
  "passphrase": ["passphrases"],
  "password": ["passwords"],
  "person": ["persons"],
  "phone": ["phone-number", "phone-numbers"],
  "pin": ["pin-code", "pin-codes"],
  "port-number": ["port-numbers"],
  "palette": ["palettes", "color-palette-generator", "random-color-palette-generator", "custom-color-palette-generator", "color-harmony-generator", "monochrome-palette-generator", "pastel-palette-generator"],
  "qr": ["qr-code", "qr-codes", "qr-code-generator", "url-qr-code-generator"],
  "regex-pattern": ["regex", "regexp", "regular-expression", "regular-expression-generator", "regex-generator"],
  "salt": ["salts"],
  "ssh-key": ["ssh-keys"],
  "slug": ["slugs", "url-slug-generator", "text-to-slug-converter"],
  "string": ["strings", "random-string-generator", "text-generator"],
  "text-shadow": ["text-shadow-generator"],
  "time": ["times", "random-time-generator"],
  "timestamp": ["timestamps", "unix-timestamp-converter", "batch-timestamp-converter", "iso-8601-timestamp-converter"],
  "utm": ["utm-builder", "utm-generator", "url-utm-builder"],
  "us-state": ["us-states"],
  "username": ["usernames"],
  "uuid": ["uuids", "uuid-generator", "bulk-uuid-generator", "offline-uuid-generator", "uuid-v1-generator"],
  "webhook-secret": ["webhook-secrets"],
  "zodiac": ["zodiac-sign", "zodiac-signs"],
  "zip": ["zip-code", "zip-codes", "post-code", "postcodes", "postcode", "postal-code", "postal-codes"]
};
function createGeneratorTools() {
  return [
    tool("qr", "QR image", "Engineering", "QR image for links and notes.", "Input", true, "https://pashi.app", "image", "generate QR", ["https://pashi.app", "https://nicholasgriffin.dev/docs"]),
    tool("barcode", "Barcode", "Engineering", "Code 128 barcode SVG.", "Value", true, "PASHI-12345", "image", "Generate barcode", ["PASHI-12345", "ORDER-2048"], [
      field("value", "Value", "PASHI-12345", true),
      field("height", "Height", "160", true),
      field("scale", "Scale", "2", true),
      field("text", "Text", "show", false, "select", ["show", "hide"])
    ]),
    tool("emoji-image", "Emoji image", "Design", "Square SVG emoji image.", "Emoji", false, "⚡", "image", "Generate image", ["⚡", "✨"], [
      field("emoji", "Emoji", "⚡", true),
      field("size", "Size", "512", true),
      field("background", "Background", "0d1024", true)
    ]),
    tool("uuid", "UUID", "Engineering", "UUIDs across versions v1, v3, v4, v5 and v7.", "Count", false, "1", "text", "Generate UUID", ["1", "10"], [
      field("count", "Count", "1", true),
      field("format", "Format", "v4", false, "select", ["v1", "v3", "v4", "v5", "v7"]),
      field("outputFormat", "Output format", "standard", false, "select", ["standard", "uppercase", "no-hyphens", "braced", "urn"]),
      field("name", "Name", "name", false),
      field("namespace", "Namespace", "url", false)
    ]),
    tool("token", "Token", "Engineering", "URL-safe random tokens.", "Length", false, "32", "text", "Generate token", ["32", "48"], [
      field("length", "Length", "32", true),
      field("count", "Count", "1", true)
    ]),
    tool("api-token", "API token", "Security", "API tokens with selectable encoding.", "Length", false, "32", "text", "Generate API token", ["32", "64"], [
      field("count", "Count", "10", true),
      field("length", "Length", "32", true),
      field("format", "Format", "alphanumeric", false, "select", ["alphanumeric", "hex", "base64", "base64url"]),
      field("prefix", "Prefix", "token_", false)
    ]),
    tool("password", "Password", "Security", "Strong passwords with configurable character sets.", "Length", false, "16", "text", "Generate password", ["16", "32"], [
      field("length", "Length", "16", true),
      field("count", "Count", "5", true),
      field("uppercase", "Uppercase", "true", false, "select", ["true", "false"]),
      field("lowercase", "Lowercase", "true", false, "select", ["true", "false"]),
      field("numbers", "Numbers", "true", false, "select", ["true", "false"]),
      field("symbols", "Symbols", "true", false, "select", ["true", "false"]),
      field("excludeSimilar", "Exclude similar", "false", false, "select", ["false", "true"]),
      field("customSymbols", "Custom symbols", "!@#$%^&*()_+-=[]{}|;:,.<>?", false)
    ]),
    tool("hash", "Hash", "Security", "MD5 and SHA hashes for text or random data.", "Input", false, "Text to hash", "fields", "Generate hash", ["hello world", "sha256"], [
      field("value", "Text", "hello world", false, "textarea"),
      field("algorithm", "Algorithm", "sha256", true, "select", ["md5", "sha1", "sha256", "sha512"]),
      field("count", "Count", "1", true),
      field("uppercase", "Uppercase", "false", false, "select", ["false", "true"]),
      field("includeInput", "Include input", "false", false, "select", ["false", "true"])
    ]),
    tool("api-key", "API key", "Security", "API keys with selectable formats and optional secrets.", "Length", false, "32", "fields", "Generate key", ["32", "64"], [
      field("count", "Count", "1", true),
      field("length", "Length", "32", true),
      field("format", "Format", "alphanumeric", false, "select", ["alphanumeric", "hex", "base64", "base64url", "uuid", "numeric"]),
      field("prefix", "Prefix", "sk_", false),
      field("includeSecret", "Include secret", "false", false, "select", ["false", "true"]),
      field("keyLength", "Key length", "32", true),
      field("secretLength", "Secret length", "64", true),
      field("keyPrefix", "Key prefix", "key_", false),
      field("secretPrefix", "Secret prefix", "secret_", false)
    ]),
    tool("jwt-token", "JWT token", "Security", "Signed JWTs with HMAC or RSA algorithms and configurable claims.", "Subject", false, "user_123", "fields", "Sign JWT", ["user_123", "RS256"], [
      field("count", "Count", "1", true),
      field("algorithm", "Algorithm", "HS256", false, "select", ["HS256", "HS384", "HS512", "RS256", "RS384", "RS512"]),
      field("subject", "Subject", "user_123", true),
      field("issuer", "Issuer", "pashi", true),
      field("audience", "Audience", "https://api.example.com", false),
      field("expiresIn", "Expires in seconds", "3600", true),
      field("includeNbf", "Include nbf", "false", false, "select", ["false", "true"]),
      field("includeJti", "Include jti", "true", false, "select", ["true", "false"]),
      field("customClaims", "Custom claims JSON", '{"role":"admin"}', false, "textarea")
    ]),
    tool("oauth-token", "OAuth token", "Security", "OAuth 2.0 token response with optional refresh token.", "Length", false, "64", "fields", "Generate OAuth", ["64"], [
      field("count", "Count", "1", true),
      field("tokenType", "Token type", "bearer", false, "select", ["bearer", "mac", "basic"]),
      field("format", "Format", "base64url", false, "select", ["base64", "base64url", "hex", "alphanumeric"]),
      field("accessTokenLength", "Access length", "64", true),
      field("refreshTokenLength", "Refresh length", "128", true),
      field("expiresIn", "Expires in seconds", "3600", true),
      field("scope", "Scope", "read write", false),
      field("includeRefresh", "Include refresh", "true", false, "select", ["true", "false"])
    ]),
    tool("webhook-secret", "Webhook secret", "Security", "Webhook HMAC secret with optional signature example.", "Length", false, "32", "fields", "Generate secret", ["32"], [
      field("count", "Count", "1", true),
      field("length", "Length", "32", true),
      field("algorithm", "Algorithm", "sha256", false, "select", ["sha256", "sha384", "sha512"]),
      field("format", "Format", "hex", false, "select", ["hex", "base64", "alphanumeric"]),
      field("includeExample", "Include example", "true", false, "select", ["true", "false"]),
      field("includeTimestamp", "Include timestamp", "false", false, "select", ["false", "true"])
    ]),
    tool("encryption-key", "Encryption key", "Security", "AES, HMAC, and RSA key material with selectable output formats.", "Algorithm", false, "aes", "fields", "Generate key", ["aes", "rsa"], [
      field("count", "Count", "1", true),
      field("algorithm", "Algorithm", "aes", false, "select", ["aes", "hmac", "rsa"]),
      field("keySize", "Key size", "256", true, "select", ["128", "192", "256", "384", "512", "2048", "4096"]),
      field("format", "Format", "hex", false, "select", ["hex", "base64", "base64url", "pem"]),
      field("includeIv", "Include IV", "true", false, "select", ["true", "false"])
    ]),
    tool("salt", "Salt", "Security", "Cryptographic salt with selectable encoding.", "Length", false, "32", "fields", "Generate salt", ["16", "32"], [
      field("length", "Length", "32", true),
      field("encoding", "Encoding", "base64", false, "select", ["base64", "base64url", "hex", "alphanumeric"]),
      field("count", "Count", "1", true),
      field("includeLength", "Include length", "false", false, "select", ["false", "true"])
    ]),
    tool("ssh-key", "SSH key", "Security", "RSA SSH key pair with authorized_keys public output.", "Options", false, "", "fields", "Generate SSH", ["rsa", "deploy@ci-server"], [
      field("count", "Count", "1", true),
      field("type", "Type", "rsa", false, "select", ["rsa"]),
      field("bits", "Bits", "2048", false, "select", ["2048", "4096"]),
      field("format", "Format", "both", false, "select", ["both", "pem"]),
      field("comment", "Comment", "pashi@localhost", false)
    ]),
    tool("bearer-token", "Bearer token", "Security", "Ready-to-paste bearer token header value.", "Bytes", false, "48", "text", "Generate bearer", ["48"], [
      field("bytes", "Bytes", "48", true),
      field("count", "Count", "1", true)
    ]),
    tool("port-number", "Port number", "Security", "Random TCP/UDP port in a range.", "Range", false, "1024-65535", "text", "Generate port", ["1024-65535"], [
      field("min", "Min", "1024", true),
      field("max", "Max", "65535", true),
      field("count", "Count", "1", true)
    ]),
    tool("base64", "Base64", "Engineering", "Base64 encode text.", "Input", true, "Text to encode", "text", "Encode", ["hello world", '{"ok":true}']),
    tool("url", "URL encode", "Engineering", "URL encode text.", "Input", true, "Text or URL", "text", "Encode URL", ["hello world", "https://nicholasgriffin.dev/?q=hello world"]),
    tool("slug", "Slug", "Engineering", "Safe URL slug.", "Input", true, "Launch notes v2", "text", "Make slug", ["My Great Blog Post", "Launch notes v2"]),
    tool("cron-expression", "Cron expression", "Engineering", "Cron expressions for common schedules.", "Preset", false, "daily", "fields", "Generate cron", ["daily", "weekly"], [
      field("preset", "Preset", "daily", false, "select", ["hourly", "daily", "weekly", "monthly"]),
      field("minute", "Minute", "0", true),
      field("hour", "Hour", "9", true),
      field("weekday", "Weekday", "1", true),
      field("day", "Day", "1", true)
    ]),
    tool("regex-pattern", "Regex pattern", "Engineering", "Curated regular expressions for common matching tasks.", "Preset", false, "email", "fields", "Generate regex", ["email", "uuid", "hex colour"], [
      field("preset", "Preset", "email", false, "select", ["email", "url", "uuid", "hex-colour", "ipv4", "slug", "iso-date", "time", "integer", "decimal", "whitespace", "html-tag"]),
      field("anchors", "Anchors", "true", false, "select", ["true", "false"]),
      field("flags", "Flags", "none", false, "select", ["none", "i", "g", "gi", "m", "im"])
    ]),
    tool("json-schema-example", "JSON schema example", "Engineering", "Generate a JSON schema from field:type lines.", "Fields", true, "name:string\nage:number", "text", "Generate schema", ["name:string\nage:number"], [
      field("title", "Title", "Example", false),
      field("fields", "Fields", "name:string\nage:number", true, "textarea")
    ]),
    tool("json-to-typescript", "JSON to TypeScript", "Engineering", "Generate a TypeScript interface from sample JSON.", "JSON", true, '{\n  "id": 123,\n  "name": "Ada"\n}', "text", "Generate interface", ['{"id":123,"name":"Ada"}'], [
      field("json", "JSON", '{\n  "id": 123,\n  "name": "Ada"\n}', true, "textarea"),
      field("name", "Interface name", "Root", true)
    ]),
    tool("json-fetch-code", "JSON Fetch code", "Engineering", "Generate a Fetch API JSON request snippet.", "JSON", true, '{"ok":true}', "text", "Generate Fetch", ['{"ok":true}'], [
      field("url", "URL", "https://api.example.com/items", true),
      field("method", "Method", "POST", false, "select", ["GET", "POST", "PUT", "PATCH", "DELETE"]),
      field("headers", "Headers", "Accept: application/json", false, "textarea")
    ]),
    tool("json-axios-code", "JSON Axios code", "Engineering", "Generate an Axios JSON request snippet.", "JSON", true, '{"ok":true}', "text", "Generate Axios", ['{"ok":true}'], [
      field("url", "URL", "https://api.example.com/items", true),
      field("method", "Method", "POST", false, "select", ["GET", "POST", "PUT", "PATCH", "DELETE"]),
      field("headers", "Headers", "Accept: application/json", false, "textarea")
    ]),
    tool("http-curl-command", "HTTP cURL command", "Engineering", "Generate a cURL command for a JSON API request.", "JSON", false, '{"ok":true}', "text", "Generate cURL", ['{"ok":true}', "GET https://api.example.com/items"], [
      field("url", "URL", "https://api.example.com/items", true),
      field("method", "Method", "POST", false, "select", ["GET", "POST", "PUT", "PATCH", "DELETE"]),
      field("headers", "Headers", "Accept: application/json", false, "textarea")
    ]),
    tool("http-request-example", "Raw HTTP request", "Engineering", "Generate raw HTTP request text for API testing and documentation.", "JSON", false, '{"ok":true}', "text", "Generate request", ['{"ok":true}', "GET /items"], [
      field("url", "URL", "https://api.example.com/items", true),
      field("method", "Method", "POST", false, "select", ["GET", "POST", "PUT", "PATCH", "DELETE"]),
      field("headers", "Headers", "Accept: application/json", false, "textarea")
    ]),
    tool("http-har-request", "HAR request", "Engineering", "Generate a minimal HAR request entry for browser tooling and converter tests.", "JSON", false, '{"ok":true}', "text", "Generate HAR", ['{"ok":true}', "POST request"], [
      field("url", "URL", "https://api.example.com/items", true),
      field("method", "Method", "POST", false, "select", ["GET", "POST", "PUT", "PATCH", "DELETE"]),
      field("headers", "Headers", "Accept: application/json", false, "textarea")
    ]),
    tool("json-api-response", "JSON API response", "Engineering", "Generate a standard JSON API response wrapper.", "JSON", false, '{"id":123}', "text", "Generate response", ['{"id":123}'], [
      field("status", "Status", "200", true),
      field("success", "Success", "true", false, "select", ["true", "false"])
    ]),
    tool("html-meta-tags", "HTML meta tags", "Engineering", "SEO and Open Graph meta tag snippet.", "Title", false, "Pashi", "text", "Generate tags", ["Pashi"], [
      field("title", "Title", "Pashi", true),
      field("description", "Description", "Fast tools and converters", true),
      field("url", "URL", "https://pashi.app", false),
      field("image", "Image URL", "", false)
    ]),
    tool("timestamp", "Timestamp", "Engineering", "Random timestamp records.", "Range", false, "2020-2030", "fields", "Generate timestamp", ["2020-2030", "unix seconds"], [
      field("start", "Start", "2020-01-01T00:00:00Z", true),
      field("end", "End", "2030-12-31T23:59:59Z", true),
      field("unit", "Unit", "seconds", false, "select", ["seconds", "milliseconds"]),
      field("count", "Count", "1", true)
    ]),
    tool("date", "Date", "Engineering", "Random dates in multiple formats.", "Range", false, "1970-01-01", "text", "Generate date", ["2020-01-01", "unix"], [
      field("startDate", "Start date", "1970-01-01", true),
      field("endDate", "End date", todayIsoDate(), true),
      field("format", "Format", "iso8601", false, "select", ["iso8601", "us", "eu", "long", "short", "unix"]),
      field("count", "Count", "10", true)
    ]),
    tool("time", "Time", "Engineering", "Random times with hour range and second controls.", "Format", false, "24-hour", "fields", "Generate time", ["24-hour", "12-hour"], [
      field("format", "Format", "24-hour", false, "select", ["24-hour", "12-hour"]),
      field("startHour", "Start hour", "0", true),
      field("endHour", "End hour", "23", true),
      field("includeSeconds", "Include seconds", "true", false, "select", ["true", "false"]),
      field("count", "Count", "1", true)
    ]),
    tool("datetime", "Timestamp", "Engineering", "Random Unix or ISO 8601 timestamps.", "Format", false, "unix", "fields", "Generate timestamp", ["unix", "iso8601"], [
      field("format", "Format", "unix", false, "select", ["unix", "iso8601"]),
      field("startDate", "Start date", "1970-01-01", true),
      field("endDate", "End date", todayIsoDate(), true),
      field("count", "Count", "1", true)
    ]),
    tool("ip-address", "IP address", "Identifiers", "Random IPv4 and IPv6 addresses with uniqueness and range controls.", "Version", false, "ipv4", "text", "Generate IP", ["ipv4", "ipv6"], [
      field("version", "Version", "ipv4", false, "select", ["ipv4", "ipv6", "both"]),
      field("count", "Count", "10", true),
      field("unique", "Unique", "false", false, "select", ["false", "true"]),
      field("includePrivate", "Private ranges", "true", false, "select", ["true", "false"]),
      field("includeLocalhost", "Localhost", "false", false, "select", ["false", "true"])
    ]),
    tool("ipv4", "IPv4 address", "Identifiers", "Random IPv4 addresses.", "Count", false, "10", "text", "Generate IPv4", ["10", "25"], [
      field("count", "Count", "10", true),
      field("unique", "Unique", "false", false, "select", ["false", "true"]),
      field("includePrivate", "Private ranges", "true", false, "select", ["true", "false"]),
      field("includeLocalhost", "Localhost", "false", false, "select", ["false", "true"])
    ]),
    tool("ipv6", "IPv6 address", "Identifiers", "Random IPv6 addresses.", "Count", false, "10", "text", "Generate IPv6", ["10", "25"], [
      field("count", "Count", "10", true),
      field("unique", "Unique", "false", false, "select", ["false", "true"]),
      field("includePrivate", "Private ranges", "true", false, "select", ["true", "false"]),
      field("includeLocalhost", "Localhost", "false", false, "select", ["false", "true"])
    ]),
    tool("mac", "MAC address", "Identifiers", "IEEE 802 MAC addresses with format and address-bit controls.", "Format", false, "colon", "text", "Generate MAC", ["colon", "cisco"], [
      field("format", "Format", "colon", false, "select", ["colon", "hyphen", "dot", "cisco", "plain"]),
      field("count", "Count", "10", true),
      field("uppercase", "Uppercase", "false", false, "select", ["false", "true"]),
      field("local", "Locally administered", "true", false, "select", ["true", "false"]),
      field("unicast", "Unicast", "true", false, "select", ["true", "false"]),
      field("unique", "Unique", "false", false, "select", ["false", "true"])
    ]),
    tool("phone", "Phone number", "Identifiers", "Random country-specific test phone numbers.", "Country", false, "US", "text", "Generate phone", ["US", "GB"], [
      field("country", "Country", "US", false, "select", ["US", "CA", "GB", "DE", "FR", "ES", "IT", "NL", "AU", "JP", "CN", "IN", "BR", "MX"]),
      field("format", "Format", "national", false, "select", ["national", "international", "e164"]),
      field("count", "Count", "10", true),
      field("unique", "Unique", "false", false, "select", ["false", "true"])
    ]),
    tool("username", "Username", "Identifiers", "Random usernames with style, length, and uniqueness controls.", "Style", false, "mixed", "text", "Generate username", ["mixed", "gamer"], [
      field("style", "Style", "mixed", false, "select", ["professional", "gamer", "quirky", "simple", "cool", "mixed"]),
      field("count", "Count", "10", true),
      field("minLength", "Min length", "6", true),
      field("maxLength", "Max length", "15", true),
      field("includeNumbers", "Include numbers", "true", false, "select", ["true", "false"]),
      field("unique", "Unique", "true", false, "select", ["true", "false"])
    ]),
    tool("company", "Company name", "Identifiers", "Random company names by style and industry.", "Style", false, "mixed", "text", "Generate company", ["mixed", "tech"], [
      field("style", "Style", "mixed", false, "select", ["professional", "creative", "modern", "traditional", "tech", "mixed"]),
      field("industry", "Industry", "general", false, "select", ["general", "tech", "finance", "retail", "healthcare", "consulting", "food", "fashion", "construction", "education"]),
      field("count", "Count", "10", true)
    ]),
    tool("minecraft-uuid", "Minecraft UUID", "Identifiers", "Random Minecraft UUID formats.", "Count", false, "1", "fields", "Generate UUID", ["1", "10"], [
      field("count", "Count", "1", true)
    ]),
    tool("us-state", "US state", "Geographic", "Random US states.", "Count", false, "1", "text", "Generate state", ["1", "5"], [
      field("count", "Count", "1", true)
    ]),
    tool("zodiac", "Zodiac sign", "Identifiers", "Random zodiac signs.", "Count", false, "1", "text", "Generate sign", ["1", "5"], [
      field("count", "Count", "1", true)
    ]),
    tool("person", "Person", "People", "Generated fictional identities with optional financial and professional data.", "Locale", false, "en_GB", "fields", "Generate person", ["en_GB", "en_US", "de_DE"], [
      field("locale", "Locale", "en_GB", false, "select", ["en_GB", "en_US", "fr_FR", "es_ES", "it_IT", "de_DE", "pt_PT", "nl_NL", "pl_PL"]),
      field("count", "Count", "1", true),
      field("gender", "Gender", "mixed", false, "select", ["mixed", "male", "female"]),
      field("ageMin", "Min age", "18", true),
      field("ageMax", "Max age", "80", true),
      field("includeFinancial", "Financial data", "true", false, "select", ["true", "false"]),
      field("includeProfessional", "Professional data", "true", false, "select", ["true", "false"])
    ]),
    tool("number", "Number", "Random", "Random numbers by type, range, and precision.", "Type", false, "integer", "text", "Generate number", ["integer", "negative", "even", "odd", "prime", "percentage"], [
      field("min", "Min", "1", true),
      field("max", "Max", "100", true),
      field("type", "Type", "integer", true, "select", ["integer", "decimal", "prime", "percentage", "even", "odd", "negative"]),
      field("decimals", "Decimals", "2", true),
      field("count", "Count", "10", true)
    ]),
    tool("binary", "Binary number", "Random", "Random binary values with configurable bit width and count.", "Bits", false, "8", "text", "Generate binary", ["8", "16"], [
      field("bits", "Bits", "8", true),
      field("count", "Count", "10", true)
    ]),
    tool("hex-number", "Hex number", "Random", "Random hexadecimal numbers with length and format controls.", "Length", false, "8", "text", "Generate hex", ["8", "16"], [
      field("count", "Count", "10", true),
      field("length", "Length", "8", true),
      field("prefix", "0x prefix", "true", false, "select", ["true", "false"]),
      field("uppercase", "Uppercase", "true", false, "select", ["true", "false"]),
      field("unique", "Unique", "false", false, "select", ["false", "true"])
    ]),
    tool("octal-number", "Octal number", "Random", "Random octal numbers with length and prefix controls.", "Length", false, "8", "text", "Generate octal", ["8", "16"], [
      field("count", "Count", "10", true),
      field("length", "Length", "8", true),
      field("prefix", "0o prefix", "true", false, "select", ["true", "false"]),
      field("unique", "Unique", "false", false, "select", ["false", "true"])
    ]),
    tool("fraction", "Fraction", "Random", "Random fraction records.", "Type", false, "proper", "fields", "Generate fraction", ["proper", "mixed"], [
      field("type", "Type", "proper", true, "select", ["proper", "improper", "mixed"]),
      field("maxNumerator", "Max numerator", "12", true),
      field("maxDenominator", "Max denominator", "12", true),
      field("simplify", "Simplify", "yes", false, "select", ["yes", "no"]),
      field("count", "Count", "1", true)
    ]),
    tool("string", "String", "Strings", "Random strings, words, sentences, binary, hex, and base64.", "Length", false, "32", "text", "Generate string", ["alphanumeric", "lorem"], [
      field("type", "Type", "alphanumeric", false, "select", ["alphanumeric", "letters", "words", "sentences", "paragraphs", "binary", "hex", "base64", "lorem"]),
      field("count", "Count", "1", true),
      field("length", "Length", "32", true),
      field("wordCount", "Words", "5", true),
      field("sentenceCount", "Sentences", "3", true),
      field("paragraphCount", "Paragraphs", "2", true),
      field("byteCount", "Bytes", "32", true),
      field("case", "Case", "mixed", false, "select", ["mixed", "lower", "upper"]),
      field("uppercase", "Uppercase", "true", false, "select", ["true", "false"]),
      field("lowercase", "Lowercase", "true", false, "select", ["true", "false"]),
      field("numbers", "Numbers", "true", false, "select", ["true", "false"])
    ]),
    tool("emoji", "Emoji", "Strings", "Random emoji string.", "Count", false, "6", "text", "Generate emoji", ["6", "12"], [
      field("count", "Count", "6", true),
      field("separator", "Separator", "", false)
    ]),
    tool("pin", "PIN code", "Security", "Numeric PINs with pattern filters.", "Length", false, "4", "text", "Generate PIN", ["4", "6"], [
      field("length", "Length", "4", true),
      field("count", "Count", "10", true),
      field("uniqueDigits", "Unique digits", "false", false, "select", ["false", "true"]),
      field("excludeSequential", "Exclude sequential", "false", false, "select", ["false", "true"]),
      field("excludeRepeating", "Exclude repeating", "false", false, "select", ["false", "true"])
    ]),
    tool("passphrase", "Passphrase", "Security", "Memorable passphrases with word and suffix controls.", "Words", false, "5", "text", "Generate phrase", ["5", "6"], [
      field("wordCount", "Words", "5", true),
      field("separator", "Separator", "-", false),
      field("count", "Count", "5", true),
      field("capitalize", "Capitalize", "false", false, "select", ["false", "true"]),
      field("includeNumbers", "Include number", "false", false, "select", ["false", "true"])
    ]),
    tool("colour", "Colour", "Design", "Random colours with formats and contrast checks.", "Count", false, "10", "fields", "Generate colours", ["5", "10"], [
      field("count", "Count", "10", true),
      field("format", "Format", "hex", false, "select", ["hex", "rgb", "hsl", "rgba", "hsla", "all"]),
      field("palette", "Palette", "random", false, "select", ["random", "pastel", "vibrant", "dark", "light", "grayscale"]),
      field("alpha", "Alpha", "1", true)
    ]),
    tool("palette", "Palette", "Design", "Configurable colour palette with harmony controls.", "Seed", false, "Cyber citrus checkout", "palette", "Make palette", ["Cyber citrus checkout", "Neon ink docs"], [
      field("seed", "Seed", "Cyber citrus checkout", false),
      field("count", "Count", "5", true),
      field("harmony", "Harmony", "analogous", false, "select", ["analogous", "complementary", "triadic", "split", "monochrome", "random"]),
      field("saturation", "Saturation", "72", true),
      field("lightness", "Lightness", "52", true)
    ]),
    tool("css-gradient", "CSS gradient", "Design", "CSS linear gradient snippet.", "Seed", false, "Pashi gradient", "text", "Generate CSS", ["Pashi gradient"], [
      field("angle", "Angle", "135", true),
      field("from", "From", "#17c964", true),
      field("to", "To", "#0ea5e9", true)
    ]),
    tool("box-shadow", "Box shadow", "Design", "CSS box-shadow snippet with offset, blur, spread, and colour controls.", "Options", false, "", "text", "Generate shadow", ["soft card shadow"], [
      field("x", "X offset", "0", true),
      field("y", "Y offset", "8", true),
      field("blur", "Blur", "24", true),
      field("spread", "Spread", "0", true),
      field("color", "Colour", "rgba(15, 23, 42, 0.18)", true)
    ]),
    tool("text-shadow", "Text shadow", "Design", "CSS text-shadow snippet.", "Options", false, "", "text", "Generate shadow", ["soft heading shadow"], [
      field("x", "X offset", "0", true),
      field("y", "Y offset", "2", true),
      field("blur", "Blur", "10", true),
      field("color", "Colour", "rgba(15, 23, 42, 0.28)", true)
    ]),
    tool("border-radius", "Border radius", "Design", "CSS border-radius snippet.", "Radius", false, "8", "text", "Generate radius", ["8", "12"], [
      field("radius", "Radius", "8", true)
    ]),
    tool("chart-svg", "SVG chart", "Design", "Simple SVG charts from label-value lines.", "Data", true, "Apples: 10\nPears: 5", "text", "Generate chart", ["Apples: 10\nPears: 5"], [
      field("type", "Type", "bar", false, "select", ["bar", "word-cloud"]),
      field("data", "Data", "Apples: 10\nPears: 5", true, "textarea")
    ]),
    tool("lorem", "Lorem ipsum", "Design", "Placeholder copy with configurable length.", "Topic", false, "Pashi interface", "text", "Generate lorem", ["Pashi interface", "Checkout flow"], [
      field("topic", "Topic", "Pashi interface", false),
      field("paragraphs", "Paragraphs", "2", true),
      field("sentences", "Sentences each", "3", true)
    ]),
    tool("utm", "UTM link", "Product", "Campaign URL with UTM tags.", "URL", false, "https://nicholasgriffin.dev/pricing", "text", "Build UTM", ["https://nicholasgriffin.dev/pricing", "https://pashi.app"], [
      field("url", "URL", "https://example.com/pricing", true),
      field("source", "Source", "newsletter", true),
      field("medium", "Medium", "email", true),
      field("campaign", "Campaign", "launch", true)
    ]),
    tool("coordinates", "Coordinates", "Geographic", "Random coordinates with region, format, and custom bounds.", "Region", false, "global", "fields", "Generate coords", ["global", "uk"], [
      field("region", "Region", "global", false, "select", ["global", "north-america", "south-america", "europe", "africa", "asia", "oceania", "usa", "canada", "uk", "australia"]),
      field("count", "Count", "1", true),
      field("format", "Format", "decimal", false, "select", ["decimal", "dms", "dm"]),
      field("precision", "Precision", "6", true),
      field("minLat", "Min latitude", "", false),
      field("maxLat", "Max latitude", "", false),
      field("minLon", "Min longitude", "", false),
      field("maxLon", "Max longitude", "", false)
    ]),
    tool("zip", "Post code", "Geographic", "Random post codes for multiple locales.", "Locale", false, "en_GB", "text", "Generate post code", ["en_GB", "en_US"], [
      field("locale", "Locale", "en_GB", false, "select", [
        "en_GB",
        "en_US",
        "en_CA",
        "pt_BR",
        "es_AR",
        "fr_FR",
        "de_DE",
        "es_ES",
        "it_IT",
        "pt_PT",
        "nl_NL",
        "pl_PL",
        "ru_RU",
        "tr_TR",
        "uk_UA",
        "en_IN",
        "bn_BD",
        "ja_JP",
        "zh_CN",
        "zh_TW",
        "ko_KR",
        "id_ID",
        "th_TH",
        "vi_VN",
        "fa_IR",
        "ar_SA",
        "ar_EG",
        "en_AU"
      ]),
      field("count", "Count", "10", true)
    ]),
    tool("card", "Card number", "TestData", "Brand-valid, Luhn-valid test card details.", "Type", false, "visa", "fields", "Generate card", ["visa", "mastercard"], [
      field("type", "Type", "visa", false, "select", ["visa", "mastercard", "amex", "discover"]),
      field("count", "Count", "1", true),
      field("includeDetails", "Include details", "true", false, "select", ["true", "false"]),
      field("includeName", "Include name", "true", false, "select", ["true", "false"])
    ]),
    tool("iban", "IBAN", "TestData", "Valid-checksum IBANs for selected countries.", "Country", false, "GB", "text", "Generate IBAN", ["GB", "DE"], [
      field("country", "Country", "GB", false, "select", ["GB", "DE", "FR", "IT", "ES", "NL"]),
      field("count", "Count", "10", true)
    ]),
    tool("dice", "Dice", "Gaming", "Roll RPG dice with drop, keep, modifier, and bulk controls.", "Dice type", false, "d6", "fields", "Roll dice", ["d20", "4d6", "2d20"], [
      field("count", "Rolls", "1", true),
      field("dice_type", "Dice type", "d6", false, "select", ["d4", "d6", "d8", "d10", "d12", "d20", "d100", "custom"]),
      field("dice_sides", "Custom sides", "6", true),
      field("num_dice", "Dice count", "1", true),
      field("modifier", "Modifier", "0", true),
      field("drop_lowest", "Drop lowest", "0", true),
      field("drop_highest", "Drop highest", "0", true),
      field("keep_highest", "Keep highest", "0", true),
      field("show_individual", "Show rolls", "true", false, "select", ["true", "false"])
    ]),
    tool("dice-probability", "Dice probability", "Gaming", "Exact probability for dice notation and target.", "Notation", false, "2d6", "fields", "Calculate odds", ["2d6 >= 7", "4d6 drop lowest >= 12"], [
      field("notation", "Notation", "2d6", true),
      field("comparison", "Comparison", ">=", true, "select", [">=", ">", "=", "<=", "<"]),
      field("target", "Target", "7", true)
    ]),
    tool("lottery", "Lottery", "Gaming", "Lottery numbers from a configurable range.", "Count", false, "6", "fields", "Generate lottery", ["6 from 1-59"], [
      field("count", "Count", "6", true),
      field("min", "Min", "1", true),
      field("max", "Max", "59", true)
    ]),
    tool("minecraft-seed", "Minecraft seed", "Gaming", "Random signed 64-bit Minecraft seed.", "Input", false, "", "text", "Generate seed", ["world seed"]),
    tool("pokemon", "Pokemon", "Gaming", "Random Kanto Pokedex entries with type filtering.", "Type", false, "any", "text", "Generate Pokemon", ["any", "electric"], [
      field("type", "Type", "any", false, "select", POKEMON_TYPES),
      field("count", "Count", "1", true)
    ]),
    tool("coinflip", "Coin flip", "Gaming", "Independent CSPRNG HEADS or TAILS flips.", "Count", false, "1", "text", "Flip coin", ["1", "10"], [
      field("count", "Count", "1", true)
    ]),
    tool("list-randomizer", "List randomizer", "Tools", "Shuffle a comma or newline list.", "Items", true, "Ada\nGrace\nMargaret", "text", "Shuffle list", ["Ada, Grace, Margaret"], [
      field("items", "Items", "Ada\nGrace\nMargaret", true, "textarea")
    ]),
    tool("yes-no", "Yes or no", "Tools", "Weighted yes/no decision.", "Chance", false, "50", "text", "Decide", ["50"], [
      field("yesWeight", "Yes chance", "50", true)
    ]),
    tool("teams", "Teams", "Tools", "Split a list into balanced random teams.", "Items", true, "Ada\nGrace\nMargaret\nKatherine", "fields", "Make teams", ["Ada, Grace, Margaret, Katherine"], [
      field("items", "Items", "Ada\nGrace\nMargaret\nKatherine", true, "textarea"),
      field("teams", "Teams", "2", true)
    ]),
    tool("secret-santa", "Secret Santa", "Tools", "Assign each person a different recipient.", "People", true, "Ada\nGrace\nMargaret", "fields", "Assign pairs", ["Ada, Grace, Margaret"], [
      field("items", "People", "Ada\nGrace\nMargaret", true, "textarea")
    ]),
    tool("name-picker", "Name picker", "Tools", "Pick one item from a comma or newline list.", "Items", true, "Ada\nGrace\nMargaret", "text", "Pick one", ["Ada, Grace, Margaret"], [
      field("items", "Items", "Ada\nGrace\nMargaret", true, "textarea")
    ])
  ];
}
function findGenerator(type) {
  const normalisedType = type.trim().toLowerCase();
  return createGeneratorTools().find(
    (generator) => generator.id === normalisedType || generator.aliases.includes(normalisedType)
  );
}
function listGeneratorTools() {
  return createGeneratorTools();
}
function tool(id, label, audience, description, inputLabel, required, placeholder, resultKind, actionLabel, examples, fields) {
  return {
    aliases: GENERATOR_ALIASES[id] ?? [],
    audience,
    description,
    display: {
      actionLabel,
      category: CATEGORY_LABELS[audience],
      examples
    },
    endpoint: `/api/${id}`,
    id,
    input: {
      fields,
      label: inputLabel,
      mode: NO_INPUT_TOOL_IDS.has(id) ? "none" : "text",
      required
    },
    label,
    modes: resultKind === "image" ? [] : ["ai"],
    placeholder,
    result: { kind: resultKind }
  };
}
function field(id, label, placeholder, required, type = "text", options) {
  return { id, label, options, placeholder, required, type };
}
function createApiIndexResponse(env) {
  const features = createFeatureStatus(env);
  const services = createServiceStatus(env);
  const generators = listGeneratorTools().map((tool2) => ({
    ...tool2,
    apiKeyRequiredModes: features.ai.available && tool2.modes?.includes("ai") ? ["ai"] : [],
    modes: features.ai.available ? tool2.modes : tool2.modes?.filter((mode) => mode !== "ai"),
    toolType: "generator"
  }));
  const converters = listConverterTools().filter((tool2) => isConverterAvailable(tool2, env)).map((tool2) => ({
    ...tool2,
    apiKeyRequired: tool2.runtime === "container",
    toolType: "converter"
  }));
  const tools = [...generators, ...converters];
  return {
    authentication: {
      headers: ["Authorization: Bearer <api-key>", "X-API-Key: <api-key>"],
      requiredFor: ["Workers AI mode", "container converters"]
    },
    endpoints: tools.flatMap((tool2) => tool2.endpoint ? [tool2.endpoint] : []),
    exportFormats: listExportFormats(),
    features,
    name: "Pashi",
    services,
    tools
  };
}
function json(data, status = 200) {
  return Response.json(data, { status });
}
const MARKDOWN_HEADING_PATTERN = /^(#{1,6})\s+(.+)$/;
const JIRA_HEADING_PATTERN = /^h([1-6])\.\s+(.+)$/;
const MARKDOWN_ORDERED_PATTERN = /^(\s*)\d+\.\s+(.+)$/;
const MARKDOWN_UNORDERED_PATTERN = /^(\s*)[-*+]\s+(.+)$/;
const JIRA_ORDERED_PATTERN = /^(#+)\s+(.+)$/;
const JIRA_UNORDERED_PATTERN = /^(\*+)\s+(.+)$/;
const JIRA_QUOTE_PATTERN = /^bq\.\s?(.*)$/;
const JIRA_CODE_BLOCK_PATTERN = /^\{code(?::language=([^}]+))?\}$/;
function nestingPrefix(indent, marker) {
  return marker.repeat(Math.max(1, Math.floor(indent.length / 2) + 1));
}
function createPlaceholderStore() {
  const values = [];
  return {
    restore(value) {
      return values.reduce(
        (current, item, index2) => current.replaceAll(`@@PASHIINLINE${index2}@@`, item),
        value
      );
    },
    stash(value) {
      const index2 = values.push(value) - 1;
      return `@@PASHIINLINE${index2}@@`;
    }
  };
}
function replaceInlineMarkdown(value) {
  const placeholders = createPlaceholderStore();
  const replaced = value.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_match, alt, url) => placeholders.stash(`!${url}|alt=${alt}!`)).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, text, url) => placeholders.stash(`[${text}|${url}]`)).replace(/`([^`]+)`/g, (_match, text) => placeholders.stash(`{{${text}}}`)).replace(/\*\*([^*\n]+)\*\*/g, (_match, text) => placeholders.stash(`*${text}*`)).replace(/__([^_\n]+)__/g, (_match, text) => placeholders.stash(`*${text}*`)).replace(/~~([^~\n]+)~~/g, (_match, text) => placeholders.stash(`-${text}-`)).replace(new RegExp("(?<!\\*)\\*([^*\\n]+)\\*(?!\\*)", "g"), "_$1_").replace(new RegExp("(?<!_)_([^_\\n]+)_(?!_)", "g"), "_$1_");
  return placeholders.restore(replaced);
}
function replaceInlineJira(value) {
  const placeholders = createPlaceholderStore();
  const replaced = value.replace(/!([^!\n|]+)(?:\|alt=([^!\n]+))?!/g, (_match, url, alt) => placeholders.stash(`![${alt ?? ""}](${url})`)).replace(/\[([^\]\n|]+)\|([^\]\n]+)\]/g, (_match, text, url) => placeholders.stash(`[${text}](${url})`)).replace(/\{\{([^{}\n]+)\}\}/g, (_match, text) => placeholders.stash(`\`${text}\``)).replace(/\*([^*\n]+)\*/g, (_match, text) => placeholders.stash(`**${text}**`)).replace(/-([^-]+)-/g, (_match, text) => placeholders.stash(`~~${text}~~`)).replace(/_([^_\n]+)_/g, "*$1*");
  return placeholders.restore(replaced);
}
function markdownTableCells(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) {
    return void 0;
  }
  return trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
}
function isMarkdownTableDivider(line) {
  const cells = markdownTableCells(line);
  return Boolean(cells?.length && cells.every((cell) => /^:?-{3,}:?$/.test(cell)));
}
function jiraTableCells(line) {
  const trimmed = line.trim();
  if (trimmed.startsWith("||") && trimmed.endsWith("||")) {
    return {
      cells: trimmed.slice(2, -2).split("||").map((cell) => cell.trim()),
      header: true
    };
  }
  if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
    return {
      cells: trimmed.slice(1, -1).split("|").map((cell) => cell.trim()),
      header: false
    };
  }
  return void 0;
}
function markdownTableToJira(headerLine, rowLines) {
  const header = markdownTableCells(headerLine) ?? [];
  return [
    `|| ${header.map(replaceInlineMarkdown).join(" || ")} ||`,
    ...rowLines.map((line) => {
      const cells = markdownTableCells(line) ?? [];
      return `| ${cells.map(replaceInlineMarkdown).join(" | ")} |`;
    })
  ];
}
function jiraTableToMarkdown(tableLines) {
  const rows = tableLines.flatMap((line) => {
    const table = jiraTableCells(line);
    return table ? [{ ...table, cells: table.cells.map(replaceInlineJira) }] : [];
  });
  const firstRow = rows[0];
  if (!firstRow) {
    return [];
  }
  return [
    `| ${firstRow.cells.join(" | ")} |`,
    `| ${firstRow.cells.map(() => "---").join(" | ")} |`,
    ...rows.slice(1).map((row) => `| ${row.cells.join(" | ")} |`)
  ];
}
function markdownToJira(input) {
  const lines = input.replaceAll("\r\n", "\n").split("\n");
  const output = [];
  let inCodeBlock = false;
  for (let index2 = 0; index2 < lines.length; index2 += 1) {
    const line = lines[index2];
    const codeFence = line.trim().match(/^```([A-Za-z0-9_-]+)?/);
    if (codeFence) {
      output.push(inCodeBlock ? "{code}" : codeFence[1] ? `{code:language=${codeFence[1]}}` : "{code}");
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      output.push(line);
      continue;
    }
    if (markdownTableCells(line) && isMarkdownTableDivider(lines[index2 + 1] ?? "")) {
      const rowLines = [];
      index2 += 2;
      while (index2 < lines.length && markdownTableCells(lines[index2])) {
        rowLines.push(lines[index2]);
        index2 += 1;
      }
      index2 -= 1;
      output.push(...markdownTableToJira(line, rowLines));
      continue;
    }
    const heading = line.match(MARKDOWN_HEADING_PATTERN);
    if (heading) {
      output.push(`h${heading[1].length}. ${replaceInlineMarkdown(heading[2])}`);
      continue;
    }
    const unordered = line.match(MARKDOWN_UNORDERED_PATTERN);
    if (unordered) {
      output.push(`${nestingPrefix(unordered[1], "*")} ${replaceInlineMarkdown(unordered[2])}`);
      continue;
    }
    const ordered = line.match(MARKDOWN_ORDERED_PATTERN);
    if (ordered) {
      output.push(`${nestingPrefix(ordered[1], "#")} ${replaceInlineMarkdown(ordered[2])}`);
      continue;
    }
    if (line.startsWith("> ")) {
      output.push(`bq. ${replaceInlineMarkdown(line.slice(2))}`);
      continue;
    }
    output.push(replaceInlineMarkdown(line));
  }
  return output.join("\n");
}
function jiraToMarkdown(input) {
  const lines = input.replaceAll("\r\n", "\n").split("\n");
  const output = [];
  let inCodeBlock = false;
  for (let index2 = 0; index2 < lines.length; index2 += 1) {
    const line = lines[index2];
    const codeBlock = line.trim().match(JIRA_CODE_BLOCK_PATTERN);
    if (codeBlock) {
      output.push(inCodeBlock ? "```" : `\`\`\`${codeBlock[1] ?? ""}`);
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) {
      output.push(line);
      continue;
    }
    if (jiraTableCells(line)) {
      const tableLines = [];
      while (index2 < lines.length && jiraTableCells(lines[index2])) {
        tableLines.push(lines[index2]);
        index2 += 1;
      }
      index2 -= 1;
      output.push(...jiraTableToMarkdown(tableLines));
      continue;
    }
    const heading = line.match(JIRA_HEADING_PATTERN);
    if (heading) {
      output.push(`${"#".repeat(Number(heading[1]))} ${replaceInlineJira(heading[2])}`);
      continue;
    }
    const ordered = line.match(JIRA_ORDERED_PATTERN);
    if (ordered) {
      output.push(`${"  ".repeat(ordered[1].length - 1)}1. ${replaceInlineJira(ordered[2])}`);
      continue;
    }
    const unordered = line.match(JIRA_UNORDERED_PATTERN);
    if (unordered) {
      output.push(`${"  ".repeat(unordered[1].length - 1)}- ${replaceInlineJira(unordered[2])}`);
      continue;
    }
    const quote = line.match(JIRA_QUOTE_PATTERN);
    if (quote) {
      output.push(`> ${replaceInlineJira(quote[1])}`);
      continue;
    }
    output.push(replaceInlineJira(line));
  }
  return output.join("\n");
}
class ConverterRequestError extends Error {
  status = 400;
}
function textResult$1(type, label, input, result, meta, options = {}) {
  return {
    ...options,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    input,
    kind: "text",
    label,
    meta,
    result,
    type
  };
}
function textFileFormat(value) {
  if (!value) {
    return "txt";
  }
  if (isTextFileFormat(value)) {
    return value;
  }
  return void 0;
}
function textTransformFormat(value) {
  const format = value || "lowercase";
  return isTextTransformFormat(format) ? format : void 0;
}
function markdownTargetFormat(value) {
  const format = value || "slack";
  return isMarkdownTargetFormat(format) ? format : void 0;
}
function jsonTransformFormat(value) {
  const format = value || "format";
  return isJsonTransformFormat(format) ? format : void 0;
}
function jsonTransformMimeType(format) {
  return format === "flatten" || format === "format" || format === "minify" || format === "sort" ? "application/json;charset=utf-8" : "text/plain;charset=utf-8";
}
function dataShapeFormat(value) {
  const format = value || "json-shape";
  return isDataShapeFormat(format) ? format : void 0;
}
function developerInspectFormat(value) {
  const format = value || "jwt";
  return isDeveloperInspectFormat(format) ? format : void 0;
}
function developerTextFormat(value) {
  const format = value || "diff-lines";
  return isDeveloperTextFormat(format) ? format : void 0;
}
function requestTransformFormat(value) {
  const format = value || "curl-to-fetch";
  return isRequestTransformFormat(format) ? format : void 0;
}
function htmlTransformFormat(value) {
  const format = value || "strip-tags";
  return isHtmlTransformFormat(format) ? format : void 0;
}
function timestampTransformFormat(value) {
  const format = value || "readable";
  return isTimestampTransformFormat(format) ? format : void 0;
}
function urlTransformFormat(value) {
  const format = value || "parse";
  return isUrlTransformFormat(format) ? format : void 0;
}
const converterHandlers = {
  "data-shape": ({ fields, input }) => {
    const outputFormat = dataShapeFormat(fields.outputFormat || fields.format);
    if (!outputFormat) {
      throw new ConverterRequestError(`Choose a supported data shape inspection: ${DATA_SHAPE_FORMATS.join(", ")}.`);
    }
    try {
      return textResult$1(
        "data-shape",
        "Data shape",
        input,
        inspectDataShape(input, outputFormat),
        `Data shape inspected with ${outputFormat}.`,
        { mimeType: "application/json;charset=utf-8" }
      );
    } catch (error) {
      if (error instanceof DataShapeError) {
        throw new ConverterRequestError(error.message);
      }
      throw error;
    }
  },
  "developer-inspect": ({ fields, input }) => {
    const outputFormat = developerInspectFormat(fields.outputFormat || fields.format);
    if (!outputFormat) {
      throw new ConverterRequestError(`Choose a supported developer inspection: ${DEVELOPER_INSPECT_FORMATS.join(", ")}.`);
    }
    try {
      return textResult$1(
        "developer-inspect",
        "Developer inspection",
        input,
        inspectDeveloperText(input, outputFormat, fields),
        `Developer text inspected with ${outputFormat}.`,
        { mimeType: "application/json;charset=utf-8" }
      );
    } catch (error) {
      if (error instanceof DeveloperInspectError) {
        throw new ConverterRequestError(error.message);
      }
      throw error;
    }
  },
  "developer-text": ({ fields, input }) => {
    const outputFormat = developerTextFormat(fields.outputFormat || fields.format);
    if (!outputFormat) {
      throw new ConverterRequestError(`Choose a supported developer text transform: ${DEVELOPER_TEXT_FORMATS.join(", ")}.`);
    }
    try {
      return textResult$1(
        "developer-text",
        "Developer text",
        input,
        transformDeveloperText(input, outputFormat, fields),
        `Developer text transformed with ${outputFormat}.`,
        { mimeType: outputFormat.includes("json") ? "application/json;charset=utf-8" : "text/plain;charset=utf-8" }
      );
    } catch (error) {
      if (error instanceof DeveloperTextError) {
        throw new ConverterRequestError(error.message);
      }
      throw error;
    }
  },
  "file-format": ({ fields, input }) => {
    const outputFormat = textFileFormat(fields.outputFormat || fields.format);
    if (!outputFormat) {
      throw new ConverterRequestError(`Choose a supported text-file output format: ${TEXT_FILE_FORMATS.join(", ")}.`);
    }
    const sourceName2 = fields.sourceName || fields.name || "file";
    const converted = convertTextFileContent(input, outputFormat, sourceName2);
    return textResult$1(
      "file-format",
      `${converted.extension.toUpperCase()} file`,
      input,
      converted.content,
      `Text file converted to ${converted.extension.toUpperCase()}`,
      {
        downloadName: `pashi-${safeFilename(sourceName2.replace(/\.[^.]+$/, ""))}.${converted.extension}`,
        mimeType: converted.mimeType
      }
    );
  },
  "jira-to-markdown": ({ input }) => textResult$1("jira-to-markdown", "Markdown", input, jiraToMarkdown(input), "Jira wiki markup converted to Markdown"),
  "html-transform": ({ fields, input }) => {
    const outputFormat = htmlTransformFormat(fields.outputFormat || fields.format);
    if (!outputFormat) {
      throw new ConverterRequestError(`Choose a supported HTML transform: ${HTML_TRANSFORM_FORMATS.join(", ")}.`);
    }
    return textResult$1(
      "html-transform",
      "HTML transform",
      input,
      transformHtml(input, outputFormat),
      `HTML transformed with ${outputFormat}.`,
      { mimeType: outputFormat === "to-markdown" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8" }
    );
  },
  "json-transform": ({ fields, input }) => {
    const outputFormat = jsonTransformFormat(fields.outputFormat || fields.format);
    if (!outputFormat) {
      throw new ConverterRequestError(`Choose a supported JSON transform: ${JSON_TRANSFORM_FORMATS.join(", ")}.`);
    }
    try {
      return textResult$1(
        "json-transform",
        "JSON transform",
        input,
        transformJson(input, outputFormat),
        `JSON transformed with ${outputFormat}.`,
        { mimeType: jsonTransformMimeType(outputFormat) }
      );
    } catch (error) {
      if (error instanceof JsonTransformError) {
        throw new ConverterRequestError(error.message);
      }
      throw error;
    }
  },
  "markdown-to-jira": ({ input }) => textResult$1("markdown-to-jira", "Jira markup", input, markdownToJira(input), "Markdown converted to Jira and Confluence wiki markup"),
  "markdown-format": ({ fields, input }) => {
    const outputFormat = markdownTargetFormat(fields.outputFormat || fields.format);
    if (!outputFormat) {
      throw new ConverterRequestError(`Choose a supported Markdown output target: ${MARKDOWN_TARGET_FORMATS.join(", ")}.`);
    }
    return textResult$1(
      "markdown-format",
      outputFormat === "slack" ? "Slack markdown" : "WordPress HTML",
      input,
      convertMarkdownTarget(input, outputFormat),
      `Markdown converted to ${outputFormat}.`,
      { mimeType: outputFormat === "wordpress-html" ? "text/html;charset=utf-8" : "text/plain;charset=utf-8" }
    );
  },
  "request-transform": ({ fields, input }) => {
    const outputFormat = requestTransformFormat(fields.outputFormat || fields.format);
    if (!outputFormat) {
      throw new ConverterRequestError(`Choose a supported request transform: ${REQUEST_TRANSFORM_FORMATS.join(", ")}.`);
    }
    try {
      return textResult$1(
        "request-transform",
        "Request transform",
        input,
        transformRequestText(input, outputFormat),
        `Request transformed with ${outputFormat}.`,
        { mimeType: outputFormat === "curl-to-json" ? "application/json;charset=utf-8" : "text/plain;charset=utf-8" }
      );
    } catch (error) {
      if (error instanceof RequestTransformError) {
        throw new ConverterRequestError(error.message);
      }
      throw error;
    }
  },
  "text-transform": ({ fields, input }) => {
    const outputFormat = textTransformFormat(fields.outputFormat || fields.format);
    if (!outputFormat) {
      throw new ConverterRequestError(`Choose a supported text transform: ${TEXT_TRANSFORM_FORMATS.join(", ")}.`);
    }
    try {
      return textResult$1(
        "text-transform",
        "Text transform",
        input,
        transformText(input, outputFormat, fields),
        `Text transformed with ${outputFormat}.`,
        { mimeType: "text/plain;charset=utf-8" }
      );
    } catch (error) {
      if (error instanceof TextTransformError) {
        throw new ConverterRequestError(error.message);
      }
      throw error;
    }
  },
  "timestamp-transform": ({ fields, input }) => {
    const outputFormat = timestampTransformFormat(fields.outputFormat || fields.format);
    if (!outputFormat) {
      throw new ConverterRequestError(`Choose a supported timestamp transform: ${TIMESTAMP_TRANSFORM_FORMATS.join(", ")}.`);
    }
    try {
      return textResult$1(
        "timestamp-transform",
        "Timestamp transform",
        input,
        transformTimestamp(input, outputFormat, fields),
        `Timestamp transformed with ${outputFormat}.`,
        { mimeType: outputFormat === "difference" ? "application/json;charset=utf-8" : "text/plain;charset=utf-8" }
      );
    } catch (error) {
      if (error instanceof TimestampTransformError) {
        throw new ConverterRequestError(error.message);
      }
      throw error;
    }
  },
  "url-transform": ({ fields, input }) => {
    const outputFormat = urlTransformFormat(fields.outputFormat || fields.format);
    if (!outputFormat) {
      throw new ConverterRequestError(`Choose a supported URL transform: ${URL_TRANSFORM_FORMATS.join(", ")}.`);
    }
    try {
      return textResult$1(
        "url-transform",
        "URL transform",
        input,
        transformUrl(input, outputFormat),
        `URL text transformed with ${outputFormat}.`,
        { mimeType: outputFormat === "parse" || outputFormat === "query" ? "application/json;charset=utf-8" : "text/plain;charset=utf-8" }
      );
    } catch (error) {
      if (error instanceof UrlTransformError) {
        throw new ConverterRequestError(error.message);
      }
      throw error;
    }
  },
  "unit-converter": ({ fields, input }) => {
    try {
      const outputFormat = fields.outputFormat || fields.toUnit || fields.to;
      return textResult$1(
        "unit-converter",
        "Unit conversion",
        input,
        convertUnitText(input, outputFormat, fields.fromUnit || fields.from),
        "Unit value converted.",
        { mimeType: "text/plain;charset=utf-8" }
      );
    } catch (error) {
      if (error instanceof UnitConversionError) {
        throw new ConverterRequestError(`${error.message} Supported outputs: ${UNIT_OUTPUTS.join(", ")}.`);
      }
      throw error;
    }
  }
};
const BLOCKED_HOSTNAMES = /* @__PURE__ */ new Set([
  "0.0.0.0",
  "127.0.0.1",
  "localhost"
]);
function ipv4Parts(hostname) {
  const parts = hostname.split(".");
  if (parts.length !== 4) {
    return void 0;
  }
  const numbers = parts.map((part) => Number(part));
  return numbers.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) ? numbers : void 0;
}
function isBlockedIpv4(hostname) {
  const parts = ipv4Parts(hostname);
  if (!parts) {
    return false;
  }
  const [first, second] = parts;
  return first === 0 || first === 10 || first === 127 || first === 169 && second === 254 || first === 172 && second >= 16 && second <= 31 || first === 192 && second === 168;
}
function parsePublicHttpUrl(value) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return void 0;
  }
  let url;
  try {
    url = new URL(trimmedValue);
  } catch {
    return void 0;
  }
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "http:" && url.protocol !== "https:" || url.username || url.password || BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".local") || hostname.includes(":") || isBlockedIpv4(hostname)) {
    return void 0;
  }
  return url;
}
const IMAGE_OUTPUT_FORMATS = /* @__PURE__ */ new Set(["avif", "jpeg", "webp"]);
function sourceName(url) {
  const pathname = url.pathname.split("/").filter(Boolean).at(-1) ?? "image";
  return safeFilename(pathname.replace(/\.[^.]+$/, ""));
}
function normaliseImageFormat(value) {
  const format = value?.trim().toLowerCase();
  if (format === "jpg") {
    return "jpeg";
  }
  return IMAGE_OUTPUT_FORMATS.has(format) ? format : void 0;
}
function parseQuality(value) {
  if (!value) {
    return void 0;
  }
  const quality = Number(value);
  return Number.isInteger(quality) && quality >= 1 && quality <= 100 ? quality : void 0;
}
function contentType(format) {
  return format === "jpeg" ? "image/jpeg" : `image/${format}`;
}
function extension(format) {
  return format === "jpeg" ? "jpg" : format;
}
function createImageFormatRequest(request) {
  const sourceUrl = parsePublicHttpUrl(request.input);
  if (!sourceUrl) {
    return { error: "Use a public HTTP or HTTPS image URL.", status: 400 };
  }
  const requestedFormat = request.fields.outputFormat || request.fields.format;
  const format = normaliseImageFormat(requestedFormat) ?? (!requestedFormat ? "webp" : void 0);
  if (!format) {
    return { error: "Image URL conversion supports webp, jpeg, and avif. Upload a file for other image formats.", status: 400 };
  }
  const quality = parseQuality(request.fields.quality);
  const image = { format };
  if (quality) {
    image.quality = quality;
  }
  const init = {
    cf: { image },
    headers: {
      Accept: contentType(format)
    },
    redirect: "manual"
  };
  return { format, init, sourceUrl };
}
async function createImageFormatResponse(request) {
  const imageRequest = createImageFormatRequest(request);
  if ("error" in imageRequest) {
    return json({ error: imageRequest.error }, imageRequest.status);
  }
  const response = await fetch(imageRequest.sourceUrl, imageRequest.init);
  if (!response.ok || response.redirected) {
    return json({ error: "Could not fetch and convert that image URL." }, response.status || 502);
  }
  const headers = new Headers(response.headers);
  const outputExtension = extension(imageRequest.format);
  headers.set("Content-Disposition", `attachment; filename="pashi-${sourceName(imageRequest.sourceUrl)}.${outputExtension}"`);
  headers.set("Content-Type", headers.get("Content-Type") || contentType(imageRequest.format));
  headers.set("Cache-Control", "no-store");
  return new Response(response.body, {
    headers,
    status: response.status
  });
}
class Container {
  constructor(_state, env) {
    this.env = env;
  }
}
function getContainer() {
  throw new Error("Container work must not run in API access integration tests.");
}
const CONVERSION_OPERATION_FIELD_IDS = [
  "bitrate",
  "channels",
  "duration",
  "effect",
  "fps",
  "gamma",
  "height",
  "intensity",
  "operation",
  "sampleRate",
  "speed",
  "time",
  "volume",
  "width"
];
const SAFE_CONVERSION_FIELD_PATTERN = /^[\w:.,%+\- /]+$/;
function normaliseEffectToken(value) {
  return value.trim().toLowerCase().replace(/^:+/, "").replace(/:+$/, "");
}
function createConversionOperationFields(fields) {
  const operationFields = {};
  for (const key of CONVERSION_OPERATION_FIELD_IDS) {
    const value = fields[key]?.trim();
    if (!value) {
      continue;
    }
    if (key === "effect") {
      const effects = value.split(",").map((effect) => normaliseEffectToken(effect)).filter(Boolean);
      const selectedEffect = effects.find((effect) => effect !== "none") ?? effects[0];
      if (selectedEffect && SAFE_CONVERSION_FIELD_PATTERN.test(selectedEffect)) {
        operationFields.effect = selectedEffect;
      }
      continue;
    }
    if (SAFE_CONVERSION_FIELD_PATTERN.test(value)) {
      operationFields[key] = value;
    }
  }
  return operationFields;
}
function appendConversionOperationSearchParams(url, fields) {
  for (const [key, value] of Object.entries(fields)) {
    if (value) {
      url.searchParams.set(key, value);
    }
  }
}
const CONVERTER_FIELD_PRESETS = {
  "audio-bitrate-changer": { bitrate: "192k" },
  "audio-channel-remover": { channels: "1" },
  "audio-format-converter": {},
  "audio-mono-stereo-converter": { channels: "2" },
  "audio-sample-rate-converter": { sampleRate: "44100" },
  "audio-thumbnail-generator": { operation: "waveform", outputFormat: "png" },
  "audio-trimmer": { duration: "10", operation: "trim" },
  "audio-waveform-generator": { operation: "waveform", outputFormat: "png" },
  "slack-hdr-emoji": { gamma: "0.9", intensity: "1.5", operation: "hdr-emoji", outputFormat: "png" },
  "slackmoji": { operation: "slackmoji", outputFormat: "gif" },
  "change-video-fps": { fps: "30" },
  "extract-audio-from-video": { operation: "extract-audio", outputFormat: "mp3" },
  "markdown-to-html-converter": { outputFormat: "wordpress-html" },
  "resize-video-dimensions": { height: "720", operation: "resize", width: "1280" },
  "video-audio-remover": { operation: "remove-audio" },
  "video-bitrate-changer": { bitrate: "2500k" },
  "video-compressor": { bitrate: "2500k" },
  "video-compressor-simple": { bitrate: "2500k" },
  "video-duration-cutter": { duration: "10", operation: "trim" },
  "video-frame-extractor": { operation: "thumbnail", outputFormat: "png" },
  "video-frame-sequence-exporter": { operation: "thumbnail", outputFormat: "png" },
  "video-format-converter": {},
  "video-grayscale": { operation: "grayscale" },
  "video-keyframe-extractor": { operation: "thumbnail", outputFormat: "png" },
  "video-speed-changer": { speed: "1.25" },
  "video-thumbnail-generator": { operation: "thumbnail", outputFormat: "png" }
};
function applyConverterPresetFields(type, fields) {
  const preset = CONVERTER_FIELD_PRESETS[type.trim().toLowerCase()];
  if (!preset) {
    return fields;
  }
  return {
    ...preset,
    ...fields
  };
}
const SLACKMOJI_PRESET_PREFIX = "default_emojis/";
const PRESET_KEY_PATTERN = /^[a-z0-9][a-z0-9._/-]{0,120}$/i;
function isAllowedPresetKey(key) {
  if (!key || key.includes("..") || key.includes("//")) {
    return false;
  }
  if (!PRESET_KEY_PATTERN.test(key) || key.startsWith("/") || !key.startsWith(SLACKMOJI_PRESET_PREFIX)) {
    return false;
  }
  return true;
}
const OUTPUT_FORMAT_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;
const KNOWN_AUDIO_OUTPUT_FORMATS = /* @__PURE__ */ new Set(["aac", "aiff", "alac", "flac", "m4a", "mka", "mp3", "oga", "ogg", "opus", "wav", "wma"]);
const KNOWN_DOCUMENT_OUTPUT_FORMATS = /* @__PURE__ */ new Set(["docx", "epub", "html", "md", "odt", "rtf", "txt"]);
const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;
const CONTAINER_PORT = 8080;
const JOB_PREFIX = "conversions";
const MAX_PRESET_LIST = 150;
const JOB_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
class ConversionContainer extends Container {
  defaultPort = CONTAINER_PORT;
  enableInternet = false;
  envVars = {
    NODE_ENV: "production"
  };
  sleepAfter = "10m";
  async fetch(request) {
    return this.containerFetch(request);
  }
}
async function createQueuedConversionUploadResponse(converterId, request, env, applicationId, presetType = converterId) {
  const kind = queuedConversionKindForConverter(converterId);
  if (!kind) {
    return Response.json({ error: "Queued converter not found." }, { status: 404 });
  }
  const source = await readUploadedConversionSource(request, env);
  if (!source) {
    return Response.json({ error: "Upload a file to convert." }, { status: 400 });
  }
  const converterFields = applyConverterPresetFields(presetType, source.fields);
  const outputFormat = normaliseOutputFormat(converterId, kind, converterFields.outputFormat || converterFields.format);
  if (!outputFormat.format) {
    return Response.json({ error: outputFormat.error }, { status: 400 });
  }
  const finalOutputFormat = outputFormat.format;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const jobId = crypto.randomUUID();
  const sourceName2 = safeFilename(source.name);
  const sourceKey = `${JOB_PREFIX}/${jobId}/source-${sourceName2}`;
  const outputKey = `${JOB_PREFIX}/${jobId}/output.${extensionForFormat(finalOutputFormat)}`;
  const message = {
    applicationId,
    converterId,
    inputContentType: source.contentType,
    jobId,
    kind,
    operationFields: createConversionOperationFields(converterFields),
    outputFormat: finalOutputFormat,
    outputKey,
    sourceKey,
    sourceName: sourceName2
  };
  const record = {
    ...message,
    createdAt: now,
    status: "queued",
    statusUrl: statusUrl(converterId, jobId),
    updatedAt: now
  };
  await env.CONVERSION_BUCKET.put(sourceKey, source.body, {
    httpMetadata: { contentType: source.contentType }
  });
  await writeJobRecord(env, record);
  await env.CONVERSION_QUEUE.send(message, { contentType: "json" });
  return Response.json(createJobResult(record), { status: 202 });
}
async function createQueuedConversionLookupResponse(converterId, fields, env, applicationId) {
  const jobId = fields.job || fields.download;
  if (!jobId) {
    return void 0;
  }
  if (!isJobId(jobId)) {
    return Response.json({ error: "Conversion job not found." }, { status: 404 });
  }
  const record = await readJobRecord(env, jobId);
  if (!record || record.applicationId !== applicationId || record.converterId !== converterId) {
    return Response.json({ error: "Conversion job not found." }, { status: 404 });
  }
  if (fields.download) {
    if (record.status !== "complete") {
      return Response.json({ error: "Conversion job is not complete yet." }, { status: 409 });
    }
    const object = await env.CONVERSION_BUCKET.get(record.outputKey);
    if (!object) {
      return Response.json({ error: "Converted file is missing." }, { status: 404 });
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Content-Disposition", `attachment; filename="pashi-${record.jobId}.${extensionForFormat(record.outputFormat)}"`);
    headers.set("Content-Type", headers.get("Content-Type") || contentTypeForOutput(record.kind, record.outputFormat));
    headers.set("Cache-Control", "no-store");
    return new Response(object.body, { headers });
  }
  return Response.json(createJobResult(record));
}
async function processConversionQueue(batch, env) {
  for (const message of batch.messages) {
    try {
      await processConversionJob(message.body, env);
      message.ack();
    } catch (error) {
      await markJobFailed(message.body, env, error);
      message.retry();
    }
  }
}
async function processConversionJob(message, env) {
  await updateJobStatus(env, message.jobId, "processing");
  const source = await env.CONVERSION_BUCKET.get(message.sourceKey);
  if (!source) {
    throw new Error("Source object is missing.");
  }
  const fixedLengthBody = new FixedLengthStream(source.size);
  const bodyPipe = source.body.pipeTo(fixedLengthBody.writable);
  const container = getContainer(env.CONVERSION_CONTAINER);
  const url = new URL("http://localhost/convert");
  url.searchParams.set("kind", message.kind);
  url.searchParams.set("outputFormat", message.outputFormat);
  url.searchParams.set("sourceName", message.sourceName);
  appendConversionOperationSearchParams(url, message.operationFields ?? {});
  const response = await container.fetch(new Request(url, {
    body: fixedLengthBody.readable,
    headers: {
      "Content-Length": String(source.size),
      "Content-Type": message.inputContentType
    },
    method: "POST"
  }));
  await bodyPipe;
  if (!response.ok || !response.body) {
    throw new Error(await response.text());
  }
  const outputBody = await createKnownLengthBody(response);
  await env.CONVERSION_BUCKET.put(message.outputKey, outputBody.body, {
    httpMetadata: {
      contentType: contentTypeForOutput(message.kind, message.outputFormat)
    }
  });
  await outputBody.done;
  await updateJobStatus(env, message.jobId, "complete", {
    downloadUrl: downloadUrl(message.converterId, message.jobId)
  });
}
async function listSlackmojiPresets(env) {
  const presets = await loadPresetBatch(
    env,
    SLACKMOJI_PRESET_PREFIX
  );
  return presets.sort((a, b) => a.name.localeCompare(b.name));
}
async function loadPresetBatch(env, prefix) {
  const list = await env.CONVERSION_BUCKET.list({ prefix, limit: MAX_PRESET_LIST });
  return list.objects.filter((object) => isImageKey(object.key)).map((object) => ({
    key: object.key,
    name: object.key.replace(/^.*\//, ""),
    contentType: object.httpMetadata?.contentType ?? "image/png",
    size: object.size,
    url: `/api/slackmoji?preset=${encodeURIComponent(object.key)}`
  }));
}
function isImageKey(key) {
  const value = key.toLowerCase();
  return value.endsWith(".png") || value.endsWith(".jpg") || value.endsWith(".jpeg") || value.endsWith(".gif") || value.endsWith(".webp") || value.endsWith(".avif") || value.endsWith(".bmp") || value.endsWith(".tiff") || value.endsWith(".tif") || value.endsWith(".ico");
}
async function readSlackmojiPresetSource(env, key) {
  if (!isAllowedPresetKey(key)) {
    return void 0;
  }
  const preset = await env.CONVERSION_BUCKET.get(key);
  if (!preset || !preset.body) {
    return void 0;
  }
  return {
    body: preset.body,
    contentType: preset.httpMetadata?.contentType ?? "image/png",
    fields: { sourceKey: key },
    name: key.replace(/^.*\//, "") || key
  };
}
async function readUploadedConversionSource(request, env) {
  const contentType2 = request.headers.get("content-type")?.toLowerCase() ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_UPLOAD_BYTES) {
    return void 0;
  }
  const url = new URL(request.url);
  const fields = Object.fromEntries(url.searchParams.entries());
  for (const key of ["data", "file", "input"]) {
    delete fields[key];
  }
  if (contentType2.includes("multipart/form-data")) {
    const formData = await request.formData();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && key !== "input" && key !== "data") {
        fields[key] = value;
      }
    }
    const file = formData.get("file");
    if (!(file instanceof File) || file.size > MAX_UPLOAD_BYTES) {
      const sourceKey = typeof fields.sourceKey === "string" ? fields.sourceKey : "";
      if (sourceKey) {
        const presetSource = await readSlackmojiPresetSource(env, sourceKey);
        return presetSource ? {
          ...presetSource,
          fields
        } : void 0;
      }
      return void 0;
    }
    return {
      body: file,
      contentType: file.type || "application/octet-stream",
      fields,
      name: file.name || "upload"
    };
  }
  if (!request.body) {
    return void 0;
  }
  return {
    body: request.body,
    contentType: contentType2 || "application/octet-stream",
    fields,
    name: fields.sourceName || fields.name || "upload"
  };
}
async function readJobRecord(env, jobId) {
  const object = await env.CONVERSION_BUCKET.get(jobRecordKey(jobId));
  if (!object) {
    return void 0;
  }
  return object.json();
}
async function writeJobRecord(env, record) {
  await env.CONVERSION_BUCKET.put(jobRecordKey(record.jobId), JSON.stringify(record), {
    httpMetadata: { contentType: "application/json;charset=utf-8" }
  });
}
async function updateJobStatus(env, jobId, status, patch = {}) {
  const record = await readJobRecord(env, jobId);
  if (!record) {
    throw new Error("Conversion job not found.");
  }
  await writeJobRecord(env, {
    ...record,
    ...patch,
    status,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
}
async function markJobFailed(message, env, error) {
  try {
    await updateJobStatus(env, message.jobId, "failed", {
      error: error instanceof Error ? error.message : "Conversion failed."
    });
  } catch {
    await writeJobRecord(env, {
      ...message,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      error: error instanceof Error ? error.message : "Conversion failed.",
      status: "failed",
      statusUrl: statusUrl(message.converterId, message.jobId),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
}
function createJobResult(record) {
  return {
    generatedAt: record.updatedAt,
    input: record.sourceName,
    kind: "fields",
    label: `${record.kind} conversion job`,
    meta: record.status,
    result: {
      downloadUrl: record.downloadUrl ?? "",
      error: record.error ?? "",
      jobId: record.jobId,
      outputFormat: record.outputFormat,
      status: record.status,
      statusUrl: record.statusUrl
    },
    type: record.converterId
  };
}
function jobRecordKey(jobId) {
  return `${JOB_PREFIX}/${jobId}/job.json`;
}
function isJobId(value) {
  return JOB_ID_PATTERN.test(value);
}
function queuedConversionKindForConverter(converterId) {
  if (converterId === "image-format") {
    return "image";
  }
  if (converterId === "slackmoji") {
    return "image";
  }
  if (converterId === "slack-hdr-emoji") {
    return "image";
  }
  if (converterId === "audio-format") {
    return "audio";
  }
  if (converterId === "document-format") {
    return "document";
  }
  if (converterId === "video-format") {
    return "video";
  }
  return void 0;
}
function normaliseOutputFormat(converterId, kind, value) {
  const defaultFormat = converterId === "slackmoji" ? "gif" : converterId === "slack-hdr-emoji" ? "png" : kind === "image" ? "webp" : kind === "audio" ? "mp3" : kind === "document" ? "docx" : "mp4";
  const format = value?.trim().toLowerCase() || defaultFormat;
  if (!OUTPUT_FORMAT_PATTERN.test(format)) {
    return { error: "Choose a safe output format such as webp, mp4, or mp3." };
  }
  const normalisedFormat = format === "jpg" ? "jpeg" : format;
  const supportedFormats = QUEUED_CONVERTER_OUTPUTS[converterId] ?? [];
  if (!supportedFormats.includes(normalisedFormat)) {
    return { error: `Choose a supported output format: ${supportedFormats.join(", ")}.` };
  }
  return { format: normalisedFormat };
}
function extensionForFormat(format) {
  return format === "jpeg" ? "jpg" : format;
}
function contentTypeForOutput(kind, outputFormat) {
  switch (outputFormat) {
    case "aac":
      return "audio/aac";
    case "aiff":
      return "audio/aiff";
    case "avif":
      return "image/avif";
    case "bmp":
      return "image/bmp";
    case "flac":
      return "audio/flac";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "epub":
      return "application/epub+zip";
    case "gif":
      return "image/gif";
    case "html":
      return "text/html;charset=utf-8";
    case "ico":
      return "image/vnd.microsoft.icon";
    case "jpeg":
    case "mjpeg":
      return "image/jpeg";
    case "m4a":
      return "audio/mp4";
    case "mkv":
    case "mka":
      return "video/x-matroska";
    case "mov":
      return "video/quicktime";
    case "mp3":
      return "audio/mpeg";
    case "mp4":
    case "m4v":
      return "video/mp4";
    case "oga":
    case "ogg":
    case "opus":
      return "audio/ogg";
    case "odt":
      return "application/vnd.oasis.opendocument.text";
    case "png":
      return "image/png";
    case "rtf":
      return "application/rtf";
    case "tiff":
      return "image/tiff";
    case "txt":
      return "text/plain;charset=utf-8";
    case "wav":
      return "audio/wav";
    case "webm":
      return kind === "audio" ? "audio/webm" : "video/webm";
    case "webp":
      return "image/webp";
    case "wmv":
      return "video/x-ms-wmv";
  }
  if (kind === "image") {
    return "image/" + outputFormat;
  }
  if (kind === "audio" || KNOWN_AUDIO_OUTPUT_FORMATS.has(outputFormat)) {
    return "audio/" + outputFormat;
  }
  if (kind === "document" || KNOWN_DOCUMENT_OUTPUT_FORMATS.has(outputFormat)) {
    return "application/octet-stream";
  }
  return "video/" + outputFormat;
}
async function createKnownLengthBody(response) {
  const contentLength = Number(response.headers.get("Content-Length") ?? 0);
  if (response.body && Number.isSafeInteger(contentLength) && contentLength > 0) {
    const fixedLengthBody = new FixedLengthStream(contentLength);
    return {
      body: fixedLengthBody.readable,
      done: response.body.pipeTo(fixedLengthBody.writable)
    };
  }
  return {
    body: await response.arrayBuffer()
  };
}
function statusUrl(converterId, jobId) {
  return `/api/${converterId}?job=${encodeURIComponent(jobId)}`;
}
function downloadUrl(converterId, jobId) {
  return `/api/${converterId}?download=${encodeURIComponent(jobId)}`;
}
async function createConverterResponse(type, request, env, params, applicationId) {
  const tool2 = findConverterTool(type);
  if (!tool2) {
    return json({ error: "Converter not found." }, 404);
  }
  const requestWithPresets = {
    ...request,
    fields: applyConverterPresetFields(type, request.fields)
  };
  if (!isConverterFeatureEnabled(env)) {
    return json({ error: "Conversions are not available." }, 503);
  }
  if (env && params) {
    const converterPresetResponse = await createConverterPresetResponse(tool2.id, params, env);
    if (converterPresetResponse) {
      return converterPresetResponse;
    }
  }
  if (env && (tool2.id === "audio-format" || tool2.id === "document-format" || tool2.id === "image-format" || tool2.id === "slack-hdr-emoji" || tool2.id === "slackmoji" || tool2.id === "video-format")) {
    const queuedResponse = await createQueuedConversionLookupResponse(
      tool2.id,
      requestWithPresets.fields,
      env,
      applicationId ?? ""
    );
    if (queuedResponse) {
      return queuedResponse;
    }
  }
  if (tool2.id === "image-format" && requestWithPresets.input.trim()) {
    return createImageFormatResponse(requestWithPresets);
  }
  if (tool2.runtime === "container" && !hasQueuedConversionServices(env)) {
    return json({ error: `${tool2.label} conversion needs media conversion services.` }, 503);
  }
  if (tool2.runtime !== "worker" || !tool2.endpoint) {
    return json({ error: `${tool2.label} conversion needs an API-backed implementation.` }, 501);
  }
  if (tool2.input.required && !requestWithPresets.input.trim()) {
    return json({ error: `Paste ${tool2.input.label.toLowerCase()} to convert.` }, 400);
  }
  const handler = converterHandlers[tool2.id];
  if (!handler) {
    return json({ error: "Converter handler is not configured." }, 501);
  }
  try {
    return json(handler(requestWithPresets));
  } catch (error) {
    if (error instanceof ConverterRequestError) {
      return json({ error: error.message }, error.status);
    }
    throw error;
  }
}
async function createConverterPresetResponse(converterId, params, env) {
  if (converterId !== "slackmoji") {
    return void 0;
  }
  if (params.has("presets")) {
    return json(await listSlackmojiPresets(env));
  }
  const preset = params.get("preset");
  if (!preset) {
    return void 0;
  }
  const source = await readSlackmojiPresetSource(env, preset);
  if (!source) {
    return json({ error: "Preset not found." }, 404);
  }
  const headers = new Headers({
    "Cache-Control": "public, max-age=3600",
    "Content-Type": source.contentType
  });
  return new Response(source.body, { headers });
}
function isQueuedConversionUploadRequest(converterId, contentType2 = "") {
  return converterId === "image-format" && (contentType2.includes("image/") || contentType2.includes("multipart/form-data") || contentType2.includes("application/octet-stream")) || converterId === "slackmoji" && (contentType2.includes("image/") || contentType2.includes("multipart/form-data") || contentType2.includes("application/octet-stream")) || converterId === "slack-hdr-emoji" && (contentType2.includes("image/") || contentType2.includes("multipart/form-data") || contentType2.includes("application/octet-stream")) || converterId === "audio-format" && (contentType2.includes("audio/") || contentType2.includes("multipart/form-data") || contentType2.includes("application/octet-stream")) || converterId === "document-format" && (contentType2.includes("application/epub+zip") || contentType2.includes("application/msword") || contentType2.includes("application/rtf") || contentType2.includes("application/vnd.oasis.opendocument.text") || contentType2.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") || contentType2.includes("multipart/form-data") || contentType2.includes("text/") || contentType2.includes("application/octet-stream")) || converterId === "video-format" && (contentType2.includes("audio/") || contentType2.includes("video/") || contentType2.includes("multipart/form-data") || contentType2.includes("application/octet-stream"));
}
function fieldsResult(generator, input, result) {
  return {
    input,
    kind: "fields",
    label: generator.label,
    meta: Array.isArray(result) ? `${result.length} records` : "Structured",
    result,
    type: generator.id
  };
}
function paletteResult(generator, input, result) {
  return {
    input,
    kind: "palette",
    label: generator.label,
    meta: `${result.length} ${result.length === 1 ? "colour" : "colours"}`,
    result,
    type: generator.id
  };
}
function textResult(generator, input, result) {
  return {
    input,
    kind: "text",
    label: generator.label,
    meta: "Ready",
    result,
    type: generator.id
  };
}
const DEFAULT_START_DATE = "1970-01-01";
const DATE_FORMATS = ["iso8601", "us", "eu", "long", "short", "unix"];
const TIME_FORMATS = ["12-hour", "24-hour"];
const TIMESTAMP_FORMATS = ["unix", "iso8601"];
function createDateResult(generator, request) {
  switch (generator.id) {
    case "date":
      return textResult(generator, request.input, createDates(request));
    case "datetime":
      return fieldsResult(generator, request.input, createDateTimes(request));
    case "time":
      return fieldsResult(generator, request.input, createTimes(request));
    default:
      return void 0;
  }
}
function createDates(request) {
  const count = parseCount(request.fields.count ?? "", 10, 100);
  const format = parseChoice(request.fields.format, DATE_FORMATS, "iso8601");
  return singleOrList(Array.from({ length: count }, () => formatDate(randomDate(request), format)));
}
function createTimes(request) {
  const count = parseCount(request.fields.count ?? "", 1, 100);
  return singleOrList(Array.from({ length: count }, () => createTimeRecord(request)));
}
function createDateTimes(request) {
  const count = parseCount(request.fields.count ?? "", 1, 100);
  return singleOrList(Array.from({ length: count }, () => createTimestampRecord(request)));
}
function createTimeRecord(request) {
  const format = parseChoice(request.fields.format, TIME_FORMATS, "24-hour");
  const startHour = parseInteger(request.fields.startHour ?? request.fields.start_hour ?? "", 0, 0, 23);
  const endHour = parseInteger(request.fields.endHour ?? request.fields.end_hour ?? "", 23, 0, 23);
  const includeSeconds = parseBoolean(request.fields.includeSeconds ?? request.fields.include_seconds, true);
  const hour = randomIntegerBetween(startHour, endHour);
  const minute = randomIntegerInRange(60);
  const second = includeSeconds ? randomIntegerInRange(60) : 0;
  const time24h = `${pad$1(hour)}:${pad$1(minute)}${includeSeconds ? `:${pad$1(second)}` : ""}`;
  const time12h = format12Hour(hour, minute, second, includeSeconds);
  return {
    formatted: format === "12-hour" ? time12h : time24h,
    hour: `${hour}`,
    minute: `${minute}`,
    period: hour >= 12 ? "PM" : "AM",
    second: `${second}`,
    time12h,
    time24h,
    totalSeconds: `${hour * 3600 + minute * 60 + second}`
  };
}
function createTimestampRecord(request) {
  const date = randomDate(request);
  const format = parseChoice(request.fields.format, TIMESTAMP_FORMATS, "unix");
  const unix = Math.floor(date.getTime() / 1e3);
  return {
    formatted: format === "iso8601" ? date.toISOString() : `${unix}`,
    human: date.toUTCString(),
    iso8601: date.toISOString(),
    unix: `${unix}`
  };
}
function randomDate(request) {
  return randomDateInRange(
    request.fields.startDate ?? request.fields.start_date ?? request.fields.start ?? DEFAULT_START_DATE,
    request.fields.endDate ?? request.fields.end_date ?? request.fields.end ?? todayIsoDate()
  );
}
function formatDate(date, format) {
  switch (format) {
    case "eu":
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(date);
    case "long":
      return new Intl.DateTimeFormat("en-US", {
        dateStyle: "full",
        timeZone: "UTC"
      }).format(date);
    case "short":
      return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeZone: "UTC"
      }).format(date);
    case "unix":
      return `${Math.floor(date.getTime() / 1e3)}`;
    case "us":
      return new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(date);
    case "iso8601":
      return date.toISOString().slice(0, 10);
  }
}
function format12Hour(hour, minute, second, includeSeconds) {
  const displayHour = hour % 12 || 12;
  return `${pad$1(displayHour)}:${pad$1(minute)}${includeSeconds ? `:${pad$1(second)}` : ""} ${hour >= 12 ? "PM" : "AM"}`;
}
function pad$1(value) {
  return String(value).padStart(2, "0");
}
function hslToRgb({ hue, lightness, saturation }) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs(hue / 60 % 2 - 1));
  const m = l - chroma / 2;
  const [red, green, blue] = hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return {
    blue: Math.round((blue + m) * 255),
    green: Math.round((green + m) * 255),
    red: Math.round((red + m) * 255)
  };
}
function rgbToHex({ blue, green, red }) {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}
function relativeLuminance({ blue, green, red }) {
  const [linearRed, linearGreen, linearBlue] = [red, green, blue].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue;
}
function contrastRatio(firstLuminance, secondLuminance) {
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}
function normaliseHexColour(value) {
  const colour = value?.trim().replace(/^#/, "");
  return colour && /^[0-9a-fA-F]{6}$/.test(colour) ? colour : void 0;
}
const TEXT_WORDS = [
  "amber",
  "arcade",
  "binary",
  "cobalt",
  "drift",
  "ember",
  "flash",
  "glitch",
  "harbour",
  "ion",
  "jolt",
  "kite",
  "lunar",
  "matrix",
  "neon",
  "orbit",
  "pixel",
  "quartz",
  "ripple",
  "signal",
  "tunnel",
  "umbra",
  "vector",
  "wave",
  "xenon",
  "yield",
  "zenith"
];
const PASSPHRASE_WORDS = [
  "anchor",
  "apricot",
  "atlas",
  "autumn",
  "bamboo",
  "beacon",
  "biscuit",
  "border",
  "brass",
  "cabinet",
  "candle",
  "carbon",
  "castle",
  "cedar",
  "cipher",
  "clover",
  "coffee",
  "comet",
  "copper",
  "cotton",
  "crystal",
  "delta",
  "desert",
  "dragon",
  "ember",
  "falcon",
  "ferry",
  "forest",
  "garden",
  "ginger",
  "harbour",
  "hazel",
  "helmet",
  "honest",
  "indigo",
  "island",
  "jacket",
  "juniper",
  "kernel",
  "lantern",
  "lemon",
  "library",
  "magnet",
  "meadow",
  "mirror",
  "moment",
  "nebula",
  "nectar",
  "nickel",
  "oasis",
  "orange",
  "orbit",
  "paper",
  "pepper",
  "phoenix",
  "pillow",
  "planet",
  "plasma",
  "pocket",
  "prairie",
  "quartz",
  "rabbit",
  "radar",
  "river",
  "rocket",
  "saffron",
  "saturn",
  "shadow",
  "silver",
  "signal",
  "solar",
  "spruce",
  "staple",
  "stone",
  "storm",
  "summer",
  "temple",
  "thunder",
  "ticket",
  "timber",
  "tunnel",
  "velvet",
  "violet",
  "voyage",
  "walnut",
  "winter",
  "wisdom",
  "yellow",
  "zephyr"
];
const LOREM_WORDS = [
  "lorem",
  "ipsum",
  "dolor",
  "sit",
  "amet",
  "consectetur",
  "adipiscing",
  "elit",
  "integer",
  "viverra",
  "nunc",
  "porta",
  "mauris",
  "facilisis",
  "pulvinar",
  "praesent",
  "rhoncus",
  "tellus",
  "magna",
  "aliquam"
];
const COLOUR_FORMATS = ["hex", "rgb", "hsl", "rgba", "hsla", "all"];
const COLOUR_PALETTES = ["random", "pastel", "vibrant", "dark", "light", "grayscale"];
const PALETTE_HARMONIES = ["analogous", "complementary", "triadic", "split", "monochrome", "random"];
function createDesignResult(generator, request) {
  const { input } = request;
  switch (generator.id) {
    case "colour":
      return fieldsResult(generator, input, createColours(request));
    case "lorem":
      return textResult(generator, input, createLoremIpsum(request));
    case "palette":
      return paletteResult(generator, input, createPalette(request));
    default:
      return void 0;
  }
}
function createLoremIpsum(request) {
  const topic = request.fields.topic?.trim() || request.input.trim();
  const paragraphs = parseInteger(request.fields.paragraphs ?? "", 2, 1, 8);
  const sentences2 = parseInteger(request.fields.sentences ?? "", 3, 1, 8);
  return Array.from(
    { length: paragraphs },
    () => Array.from({ length: sentences2 }, () => createLoremSentence(topic)).join(" ")
  ).join("\n\n");
}
function createLoremSentence(topic) {
  const wordCount = 8 + Math.floor(hashSeed(`${topic}-${crypto.randomUUID()}`) % 9);
  const words2 = Array.from({ length: wordCount }, () => randomChoice(LOREM_WORDS));
  if (topic) {
    words2.splice(2, 0, ...topic.toLowerCase().split(/\s+/).slice(0, 2));
  }
  const sentence = words2.join(" ");
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}
function createPalette(request) {
  const seed = request.fields.seed?.trim() || request.input.trim() || crypto.randomUUID();
  const base = hashSeed(seed);
  const count = parseCount(request.fields.count ?? "", 5, 12);
  const harmony = parseChoice(request.fields.harmony, PALETTE_HARMONIES, "analogous");
  const saturation = parseInteger(request.fields.saturation ?? "", 72, 0, 100);
  const lightness = parseInteger(request.fields.lightness ?? "", 52, 0, 100);
  const hues = paletteHues(base % 360, count, harmony);
  return hues.map(
    (hue, index2) => rgbToHex(hslToRgb({
      hue,
      lightness: clampLightness(lightness + seededOffset(base, index2, 7)),
      saturation: clampPercentage(saturation + seededOffset(base, index2, 9))
    }))
  );
}
function paletteHues(baseHue, count, harmony) {
  const offsets = paletteOffsets(count, harmony);
  return offsets.map((offset) => wrapHue(baseHue + offset));
}
function paletteOffsets(count, harmony) {
  switch (harmony) {
    case "analogous":
      return centredSteps(count, 18);
    case "complementary":
      return repeatPattern(count, [0, 180, 24, 204, -24, 156]);
    case "monochrome":
      return Array.from({ length: count }, () => 0);
    case "random":
      return Array.from({ length: count }, (_, index2) => index2 * Math.round(360 / count));
    case "split":
      return repeatPattern(count, [0, 150, 210, 24, 174, 234]);
    case "triadic":
      return repeatPattern(count, [0, 120, 240, 24, 144, 264]);
  }
}
function centredSteps(count, step) {
  const midpoint = (count - 1) / 2;
  return Array.from({ length: count }, (_, index2) => Math.round((index2 - midpoint) * step));
}
function repeatPattern(count, pattern) {
  return Array.from({ length: count }, (_, index2) => pattern[index2 % pattern.length] + Math.floor(index2 / pattern.length) * 10);
}
function wrapHue(value) {
  return (value % 360 + 360) % 360;
}
function seededOffset(seed, index2, range) {
  return (seed + index2 * 37) % (range * 2 + 1) - range;
}
function clampPercentage(value) {
  return Math.max(0, Math.min(100, value));
}
function clampLightness(value) {
  return Math.max(8, Math.min(94, value));
}
function createColours(request) {
  const count = parseCount(request.fields.count ?? request.input, 10, 100);
  const format = parseChoice(request.fields.format, COLOUR_FORMATS, "hex");
  const palette = parseChoice(request.fields.palette, COLOUR_PALETTES, "random");
  const alpha = parseNumber(request.fields.alpha ?? "", 1, 0, 1);
  return Array.from({ length: count }, () => createColourRecord(format, palette, alpha));
}
function createColourRecord(format, palette, alpha) {
  const hsl = randomHsl(palette);
  const rgb = hslToRgb(hsl);
  const hex = rgbToHex(rgb);
  const luminance = relativeLuminance(rgb);
  const contrastWhite = contrastRatio(luminance, 1);
  const contrastBlack = contrastRatio(luminance, 0);
  const rgbValue = `rgb(${rgb.red}, ${rgb.green}, ${rgb.blue})`;
  const hslValue = `hsl(${hsl.hue}, ${hsl.saturation}%, ${hsl.lightness}%)`;
  const rgbaValue = `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${formatAlpha(alpha)})`;
  const hslaValue = `hsla(${hsl.hue}, ${hsl.saturation}%, ${hsl.lightness}%, ${formatAlpha(alpha)})`;
  return {
    contrastBlack: contrastBlack.toFixed(2),
    contrastWhite: contrastWhite.toFixed(2),
    format,
    hex,
    hsl: hslValue,
    hsla: hslaValue,
    luminance: luminance.toFixed(3),
    palette,
    primary: primaryColour(format, { hex, hsl: hslValue, hsla: hslaValue, rgb: rgbValue, rgba: rgbaValue }),
    rgb: rgbValue,
    rgba: rgbaValue,
    wcagAaLarge: contrastWhite >= 3 || contrastBlack >= 3 ? "yes" : "no",
    wcagAaNormal: contrastWhite >= 4.5 || contrastBlack >= 4.5 ? "yes" : "no",
    wcagAaaNormal: contrastWhite >= 7 || contrastBlack >= 7 ? "yes" : "no"
  };
}
function randomHsl(palette) {
  if (palette === "grayscale") {
    return {
      hue: 0,
      lightness: randomIntegerBetween(0, 100),
      saturation: 0
    };
  }
  const ranges = {
    dark: { lightness: [8, 30], saturation: [35, 100] },
    light: { lightness: [70, 100], saturation: [20, 90] },
    pastel: { lightness: [70, 90], saturation: [25, 80] },
    random: { lightness: [0, 100], saturation: [0, 100] },
    vibrant: { lightness: [40, 60], saturation: [70, 100] }
  };
  const range = ranges[palette];
  return {
    hue: randomIntegerBetween(0, 359),
    lightness: randomIntegerBetween(range.lightness[0], range.lightness[1]),
    saturation: randomIntegerBetween(range.saturation[0], range.saturation[1])
  };
}
function primaryColour(format, colours) {
  return format === "all" ? colours.hex : colours[format];
}
function formatAlpha(alpha) {
  return Number(alpha.toFixed(2)).toString();
}
function createAxiosSnippet(request) {
  const shape = createRequestShape(request);
  const method = shape.method.toLowerCase();
  if (method === "get" || method === "delete") {
    return `const response = await axios.${method}("${shape.url}", {
  headers: ${jsonBlock(shape.headers, 2)}
});`;
  }
  return `const response = await axios.${method}("${shape.url}", ${shape.body}, {
  headers: ${jsonBlock(shape.headers, 2)}
});`;
}
function createCurlCommand(request) {
  const shape = createRequestShape(request);
  const lines = [
    "curl",
    `  -X ${shellQuote(shape.method)}`,
    ...Object.entries(shape.headers).map(([name, value]) => `  -H ${shellQuote(`${name}: ${value}`)}`),
    requiresRequestBody(shape.method) ? `  --data-raw ${shellQuote(shape.body)}` : "",
    `  ${shellQuote(shape.url)}`
  ].filter(Boolean);
  return lines.join(" \\\n");
}
function createFetchSnippet(request) {
  const shape = createRequestShape(request);
  const options = requiresRequestBody(shape.method) ? `{
  method: "${shape.method}",
  headers: ${jsonBlock(shape.headers, 2)},
  body: JSON.stringify(${expressionBlock(shape.body, 2)})
}` : `{
  method: "${shape.method}",
  headers: ${jsonBlock(shape.headers, 2)}
}`;
  return [
    `const response = await fetch("${shape.url}", ${options});`,
    "const data = await response.json();"
  ].join("\n");
}
function createHarRequest(request) {
  const shape = createRequestShape(request);
  const har = {
    log: {
      entries: [
        {
          request: {
            headers: Object.entries(shape.headers).map(([name, value]) => ({ name, value })),
            method: shape.method,
            postData: requiresRequestBody(shape.method) ? {
              mimeType: shape.headers["Content-Type"] ?? "application/json",
              text: shape.body
            } : void 0,
            url: shape.url
          }
        }
      ],
      version: "1.2"
    }
  };
  return JSON.stringify(har, null, 2);
}
function createHttpRequestExample(request) {
  const shape = createRequestShape(request);
  const url = new URL(shape.url);
  const target = `${url.pathname}${url.search}`;
  const lines = [
    `${shape.method} ${target || "/"} HTTP/1.1`,
    `Host: ${url.host}`,
    ...Object.entries(shape.headers).map(([name, value]) => `${name}: ${value}`),
    requiresRequestBody(shape.method) ? `
${shape.body}` : ""
  ];
  return lines.join("\n");
}
function createJsonApiResponse(request) {
  const success = request.fields.success?.toLowerCase() !== "false";
  const status = parseStatus(request.fields.status, success ? 200 : 400);
  return JSON.stringify({
    data: parseJsonSample$1(request.input || request.fields.json || "{}"),
    error: success ? null : { message: "Request failed" },
    status,
    success
  }, null, 2);
}
function createRequestShape(request) {
  const method = requestMethod(request.fields.method);
  const body = jsonBody(request);
  return {
    body,
    headers: requestHeaders(request, method),
    method,
    url: safeHttpUrl(request.fields.url) || "https://api.example.com/items"
  };
}
function requestHeaders(request, method) {
  const headers = parseHeaders(request.fields.headers);
  if (!headers.Accept) {
    headers.Accept = "application/json";
  }
  if (requiresRequestBody(method) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}
function parseHeaders(input) {
  const headers = {};
  for (const line of (input ?? "").split(/\r?\n/)) {
    const match = /^([^:]+):\s*(.+)$/.exec(line.trim());
    if (!match) {
      continue;
    }
    headers[match[1].trim()] = match[2].trim();
  }
  return headers;
}
function jsonBody(request) {
  return JSON.stringify(parseJsonSample$1(request.input || request.fields.json || "{}"), null, 2);
}
function parseJsonSample$1(input) {
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}
function requestMethod(value) {
  return parseChoice(value ?? "", ["get", "post", "put", "patch", "delete"], "post").toUpperCase();
}
function requiresRequestBody(method) {
  return method !== "GET" && method !== "DELETE";
}
function parseStatus(value, fallback) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed >= 100 && parsed <= 599 ? parsed : fallback;
}
function jsonBlock(value, indent) {
  const padding = " ".repeat(indent);
  return JSON.stringify(value, null, 2).split("\n").map((line, index2) => index2 === 0 ? line : `${padding}${line}`).join("\n");
}
function expressionBlock(value, indent) {
  const padding = " ".repeat(indent);
  return value.split("\n").map((line, index2) => index2 === 0 ? line : `${padding}${line}`).join("\n");
}
function shellQuote(value) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}
const CRON_PRESETS = ["hourly", "daily", "weekly", "monthly"];
const REGEX_PRESETS = [
  "email",
  "url",
  "uuid",
  "hex-colour",
  "ipv4",
  "slug",
  "iso-date",
  "time",
  "integer",
  "decimal",
  "whitespace",
  "html-tag"
];
const REGEX_FLAGS = ["none", "i", "g", "gi", "m", "im"];
function createDeveloperResult(generator, request) {
  switch (generator.id) {
    case "cron-expression":
      return fieldsResult(generator, request.input, createCronExpression(request));
    case "regex-pattern":
      return fieldsResult(generator, request.input, createRegexPattern(request));
    case "html-meta-tags":
      return textResult(generator, request.input, createHtmlMetaTags(request));
    case "http-curl-command":
      return textResult(generator, request.input, createCurlCommand(request));
    case "http-har-request":
      return textResult(generator, request.input, createHarRequest(request));
    case "http-request-example":
      return textResult(generator, request.input, createHttpRequestExample(request));
    case "json-api-response":
      return textResult(generator, request.input, createJsonApiResponse(request));
    case "json-axios-code":
      return textResult(generator, request.input, createAxiosSnippet(request));
    case "json-fetch-code":
      return textResult(generator, request.input, createFetchSnippet(request));
    case "json-schema-example":
      return textResult(generator, request.input, createJsonSchemaExample(request));
    case "json-to-typescript":
      return textResult(generator, request.input, createTypeScriptInterface(request));
    default:
      return void 0;
  }
}
function createRegexPattern(request) {
  const preset = parseChoice(request.fields.preset ?? request.input, REGEX_PRESETS, "email");
  const flags = parseChoice(request.fields.flags ?? "", REGEX_FLAGS, "none");
  const regex = regexPreset(preset);
  const pattern = request.fields.anchors === "false" ? regex.pattern : `^${regex.pattern}$`;
  const normalizedFlags = flags === "none" ? "" : flags;
  return {
    description: regex.description,
    exampleMatch: regex.exampleMatch,
    exampleNonMatch: regex.exampleNonMatch,
    flags: normalizedFlags || "none",
    javascriptLiteral: `/${escapeRegexLiteral(pattern)}/${normalizedFlags}`,
    notes: "Curated linear-time pattern; still validate business rules separately.",
    pattern
  };
}
function createCronExpression(request) {
  const preset = parseChoice(request.fields.preset ?? request.input, CRON_PRESETS, "daily");
  const minute = parseInteger(request.fields.minute ?? "", 0, 0, 59);
  const hour = parseInteger(request.fields.hour ?? "", 9, 0, 23);
  const weekday = parseInteger(request.fields.weekday ?? "", 1, 0, 6);
  const day = parseInteger(request.fields.day ?? "", 1, 1, 31);
  switch (preset) {
    case "hourly":
      return {
        description: `Every hour at minute ${pad(minute)}`,
        expression: `${minute} * * * *`
      };
    case "monthly":
      return {
        description: `Every month on day ${day} at ${pad(hour)}:${pad(minute)}`,
        expression: `${minute} ${hour} ${day} * *`
      };
    case "weekly":
      return {
        description: `Every week on weekday ${weekday} at ${pad(hour)}:${pad(minute)}`,
        expression: `${minute} ${hour} * * ${weekday}`
      };
    case "daily":
      return {
        description: `Every day at ${pad(hour)}:${pad(minute)}`,
        expression: `${minute} ${hour} * * *`
      };
  }
}
function regexPreset(preset) {
  switch (preset) {
    case "decimal":
      return {
        description: "Signed decimal number.",
        exampleMatch: "-12.75",
        exampleNonMatch: "12.",
        pattern: "[+-]?(?:\\d+\\.\\d+|\\d+)"
      };
    case "hex-colour":
      return {
        description: "CSS hex colour in 3, 4, 6, or 8 digit form.",
        exampleMatch: "#ff2f78",
        exampleNonMatch: "ff2f78",
        pattern: "#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})"
      };
    case "html-tag":
      return {
        description: "Simple HTML tag token.",
        exampleMatch: '<meta name="description">',
        exampleNonMatch: 'meta name="description"',
        pattern: "<\\/?[A-Za-z][A-Za-z0-9-]*\\b[^<>]*>"
      };
    case "integer":
      return {
        description: "Signed base-10 integer.",
        exampleMatch: "-42",
        exampleNonMatch: "4.2",
        pattern: "[+-]?\\d+"
      };
    case "ipv4":
      return {
        description: "IPv4 address with octets from 0 to 255.",
        exampleMatch: "192.168.0.1",
        exampleNonMatch: "999.168.0.1",
        pattern: "(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)"
      };
    case "iso-date":
      return {
        description: "ISO-style calendar date.",
        exampleMatch: "2026-06-10",
        exampleNonMatch: "10/06/2026",
        pattern: "\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])"
      };
    case "slug":
      return {
        description: "Lowercase URL slug.",
        exampleMatch: "launch-notes-v2",
        exampleNonMatch: "Launch notes v2",
        pattern: "[a-z0-9]+(?:-[a-z0-9]+)*"
      };
    case "time":
      return {
        description: "24-hour time with minutes.",
        exampleMatch: "23:59",
        exampleNonMatch: "24:00",
        pattern: "(?:[01]\\d|2[0-3]):[0-5]\\d"
      };
    case "url":
      return {
        description: "HTTP or HTTPS URL.",
        exampleMatch: "https://pashi.app/tools",
        exampleNonMatch: "ftp://pashi.app/tools",
        pattern: "https?:\\/\\/[^\\s/$.?#][^\\s]*"
      };
    case "uuid":
      return {
        description: "UUID v4-style identifier.",
        exampleMatch: "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        exampleNonMatch: "f47ac10b58cc4372a5670e02b2c3d479",
        pattern: "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"
      };
    case "whitespace":
      return {
        description: "One or more whitespace characters.",
        exampleMatch: "   ",
        exampleNonMatch: "word",
        pattern: "\\s+"
      };
    case "email":
      return {
        description: "Practical email address shape, not full RFC validation.",
        exampleMatch: "ada@example.com",
        exampleNonMatch: "ada@example",
        pattern: "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}"
      };
  }
}
function createJsonSchemaExample(request) {
  const title = request.fields.title?.trim() || "Example";
  const fields = parseSchemaFields(request.fields.fields || request.input || "name:string");
  const required = fields.map((field2) => field2.name);
  const schema = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    additionalProperties: false,
    properties: Object.fromEntries(fields.map((field2) => [field2.name, { type: field2.type }])),
    required,
    title,
    type: "object"
  };
  return JSON.stringify(schema, null, 2);
}
function createHtmlMetaTags(request) {
  const title = request.fields.title?.trim() || request.input || "Pashi";
  const description = request.fields.description?.trim() || "Fast tools and converters";
  const url = safeHttpUrl(request.fields.url) || "https://pashi.app";
  const image = safeHttpUrl(request.fields.image);
  const tags = [
    `<title>${escapeXml(title)}</title>`,
    `<meta name="description" content="${escapeXml(description)}">`,
    `<meta property="og:title" content="${escapeXml(title)}">`,
    `<meta property="og:description" content="${escapeXml(description)}">`,
    `<meta property="og:url" content="${escapeXml(url)}">`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`
  ];
  if (image) {
    tags.push(`<meta property="og:image" content="${escapeXml(image)}">`);
  }
  return tags.join("\n");
}
function createTypeScriptInterface(request) {
  const sample = parseJsonSample(request.fields.json || request.input || "{}");
  const name = pascalCase(request.fields.name || "Root");
  const shape = isRecord(sample) ? sample : { value: sample };
  const lines = Object.entries(shape).map(
    ([key, value]) => `  ${typescriptPropertyName(key)}: ${typescriptType(value)};`
  );
  return [`interface ${name} {`, ...lines, "}"].join("\n");
}
function parseSchemaFields(input) {
  return input.split(/\r?\n|,/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [rawName = "value", rawType = "string"] = line.split(/\s*:\s*/);
    return {
      name: safePropertyName(rawName),
      type: schemaType(rawType)
    };
  });
}
function schemaType(value) {
  const normalised = value.toLowerCase();
  return normalised === "number" || normalised === "integer" || normalised === "boolean" || normalised === "array" || normalised === "object" || normalised === "null" ? normalised : "string";
}
function safePropertyName(value) {
  const name = value.trim().replace(/[^\w.-]/g, "_");
  return name || "value";
}
function pad(value) {
  return String(value).padStart(2, "0");
}
function escapeRegexLiteral(pattern) {
  return pattern.replace(/\\/g, "\\\\").replace(/\//g, "\\/");
}
function parseJsonSample(input) {
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}
function typescriptType(value) {
  if (Array.isArray(value)) {
    const sample = value.find((item) => item !== null);
    return sample === void 0 ? "unknown[]" : `${typescriptType(sample)}[]`;
  }
  if (isRecord(value)) {
    const fields = Object.entries(value).map(
      ([key, item]) => `${typescriptPropertyName(key)}: ${typescriptType(item)}`
    );
    return `{ ${fields.join("; ")} }`;
  }
  if (value === null) {
    return "null";
  }
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return typeof value;
  }
  return "unknown";
}
function typescriptPropertyName(value) {
  return /^[A-Za-z_$][\w$]*$/.test(value) ? value : JSON.stringify(value);
}
function pascalCase(value) {
  const words2 = value.match(/[A-Za-z0-9]+/g) ?? ["Root"];
  return words2.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join("") || "Root";
}
const UUID_EPOCH_OFFSET = 12219292800000000n;
const UUID_NAMESPACE_ALIASES = {
  dns: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  url: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  oid: "6ba7b812-9dad-11d1-80b4-00c04fd430c8",
  x500: "6ba7b814-9dad-11d1-80b4-00c04fd430c8"
};
let lastV1Timestamp = 0n;
let lastV1ClockSeq = 0;
let lastV1ClockSeqInitialized = false;
async function createUuid(format, name = "name", namespace = "url") {
  switch (format) {
    case "v1":
      return createV1Uuid();
    case "v3":
      return createV3Uuid(name, parseUuidNamespace(namespace));
    case "v5":
      return createV5Uuid(name, parseUuidNamespace(namespace));
    case "v7":
      return createV7Uuid();
    default:
      return crypto.randomUUID();
  }
}
function formatUuidForOutput(value, outputFormat) {
  const standard = value.toLowerCase();
  if (outputFormat === "uppercase") {
    return standard.toUpperCase();
  }
  if (outputFormat === "no-hyphens") {
    return standard.replaceAll("-", "");
  }
  if (outputFormat === "braced") {
    return `{${standard}}`;
  }
  if (outputFormat === "urn") {
    return `urn:uuid:${standard}`;
  }
  return standard;
}
function parseUuidNamespace(value) {
  const normalised = value.trim().toLowerCase();
  const alias = UUID_NAMESPACE_ALIASES[normalised];
  const source = alias ?? normalised;
  if (!isUuid(source)) {
    throw new Error("Namespace must be dns, url, oid, x500, or a UUID.");
  }
  return parseUuid(source);
}
function createV1Uuid() {
  if (!lastV1ClockSeqInitialized) {
    lastV1ClockSeq = randomBytes(2).reduce((value, byte, index2) => value + (byte << index2 * 8), 0) & 16383;
    lastV1ClockSeqInitialized = true;
  }
  const timestamp = BigInt(Date.now()) * 10000n + UUID_EPOCH_OFFSET;
  if (timestamp <= lastV1Timestamp) {
    lastV1ClockSeq = lastV1ClockSeq + 1 & 16383;
  } else {
    lastV1ClockSeq = randomBytes(2).reduce((value, byte, index2) => value + (byte << index2 * 8), 0) & 16383;
  }
  lastV1Timestamp = timestamp;
  const timeLow = timestamp & 0xffffffffn;
  const timeMid = timestamp >> 32n & 0xffffn;
  const timeHi = timestamp >> 48n & 0x0fffn | 0x1000n;
  const clockSeq = lastV1ClockSeq | 32768;
  const clockSeqBytes = numberToBytes(BigInt(clockSeq), 2);
  clockSeqBytes[0] = clockSeqBytes[0] & 63 | 128;
  const node = randomBytes(6);
  node[0] |= 1;
  return formatUuid([
    ...numberToBytes(timeLow, 4),
    ...numberToBytes(timeMid, 2),
    ...numberToBytes(timeHi, 2),
    ...clockSeqBytes,
    ...node
  ]);
}
async function createV3Uuid(name, namespace) {
  const namespaceAndName = concatBytes$1([namespace, new TextEncoder().encode(name)]);
  const digest = createMd5Digest(namespaceAndName);
  const hash = bytesFromHex(digest, 16);
  hash[6] = hash[6] & 15 | 48;
  hash[8] = hash[8] & 63 | 128;
  return formatUuid(Array.from(hash));
}
async function createV5Uuid(name, namespace) {
  const namespaceAndName = concatBytes$1([namespace, new TextEncoder().encode(name)]);
  const digest = await crypto.subtle.digest("SHA-1", namespaceAndName);
  const hash = new Uint8Array(digest).slice(0, 16);
  hash[6] = hash[6] & 15 | 80;
  hash[8] = hash[8] & 63 | 128;
  return formatUuid(Array.from(hash));
}
function createV7Uuid() {
  const timestamp = BigInt(Date.now());
  const random = randomBytes(10);
  const timestampBytes = numberToBytes(timestamp, 6);
  return formatUuid([
    ...timestampBytes,
    random[0] & 15 | 112,
    random[1],
    random[2] & 63 | 128,
    ...random.slice(3)
  ]);
}
function formatUuid(bytes2) {
  const values = Array.from(bytes2);
  const groups = [
    values.slice(0, 4),
    values.slice(4, 6),
    values.slice(6, 8),
    values.slice(8, 10),
    values.slice(10, 16)
  ];
  return groups.map(
    (segment) => segment.map((byte) => byte.toString(16).padStart(2, "0")).join("")
  ).join("-");
}
function numberToBytes(value, length) {
  const bytes2 = new Uint8Array(length);
  for (let index2 = 0; index2 < length; index2 += 1) {
    const offset = (length - 1 - index2) * 8;
    bytes2[index2] = Number(value >> BigInt(offset) & 0xffn);
  }
  return bytes2;
}
function parseUuid(value) {
  const hex = value.replaceAll("-", "").toLowerCase();
  if (!/^[0-9a-f]{32}$/i.test(hex)) {
    throw new Error("Namespace must be a valid UUID.");
  }
  return new Uint8Array(
    Array.from({ length: 16 }, (_, index2) => Number.parseInt(hex.slice(index2 * 2, index2 * 2 + 2), 16))
  );
}
function bytesFromHex(value, length) {
  const bytes2 = new Uint8Array(length);
  for (let index2 = 0; index2 < length; index2 += 1) {
    const byte = Number.parseInt(value.slice(index2 * 2, index2 * 2 + 2), 16);
    if (Number.isNaN(byte)) {
      throw new Error("Invalid UUID digest.");
    }
    bytes2[index2] = byte;
  }
  return bytes2;
}
function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
async function createEngineeringResult(generator, request) {
  const { input } = request;
  switch (generator.id) {
    case "base64":
      return textResult(generator, input, base64Encode(requireInput(input)));
    case "slug":
      return textResult(generator, input, slugify(requireInput(input)));
    case "timestamp":
      return fieldsResult(generator, input, createTimestamps(request));
    case "token":
      return textResult(generator, input, createTokens(request));
    case "url":
      return textResult(generator, input, encodeURIComponent(requireInput(input)));
    case "uuid":
      return textResult(generator, input, await createUuids(request));
    default:
      return void 0;
  }
}
function createTokens(request) {
  const length = parseLength(request.fields.length ?? request.input, 32, 8, 96);
  const count = parseCount(request.fields.count ?? "", 1, 1e3);
  return singleOrList(Array.from({ length: count }, () => createToken$1(length)));
}
async function createUuids(request) {
  const format = parseChoice(request.fields.format, UUID_FORMATS, "v4");
  const count = parseCount(request.fields.count ?? request.input, 1, 1e3);
  const name = request.fields.name || request.input || "name";
  const namespace = request.fields.namespace || "url";
  const outputFormat = parseChoice(request.fields.outputFormat, UUID_OUTPUT_FORMATS, "standard");
  const uuids = Array.from({ length: count }, () => createUuid(format, name, namespace));
  const values = await Promise.all(uuids);
  return singleOrList(values.map((uuid) => formatUuidForOutput(uuid, outputFormat)));
}
const UUID_FORMATS = ["v1", "v3", "v4", "v5", "v7"];
const UUID_OUTPUT_FORMATS = ["standard", "uppercase", "no-hyphens", "braced", "urn"];
function createTimestamps(request) {
  const count = parseCount(request.fields.count ?? "", 1, 1e3);
  return singleOrList(Array.from({ length: count }, () => createTimestamp(request)));
}
function createTimestamp(request) {
  const date = randomDateInRange(
    request.fields.start || "2000-01-01T00:00:00.000Z",
    request.fields.end || "2030-12-31T23:59:59.999Z"
  );
  const unit = request.fields.unit === "milliseconds" ? "milliseconds" : "seconds";
  return {
    epochMilliseconds: `${date.getTime()}`,
    epochSeconds: `${Math.floor(date.getTime() / 1e3)}`,
    iso: date.toISOString(),
    timestamp: unit === "milliseconds" ? `${date.getTime()}` : `${Math.floor(date.getTime() / 1e3)}`,
    unit,
    utc: date.toUTCString()
  };
}
function createToken$1(length) {
  return bytesToBase64$1(randomBytes(length)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
function createCssResult(generator, request) {
  switch (generator.id) {
    case "border-radius":
      return textResult(generator, request.input, createBorderRadius(request));
    case "box-shadow":
      return textResult(generator, request.input, createBoxShadow(request));
    case "css-gradient":
      return textResult(generator, request.input, createCssGradient(request));
    case "text-shadow":
      return textResult(generator, request.input, createTextShadow(request));
    default:
      return void 0;
  }
}
function createCssGradient(request) {
  const angle = parseInteger(request.fields.angle ?? "", 135, 0, 360);
  const from = cssColour(request.fields.from, "#17c964");
  const to = cssColour(request.fields.to, "#0ea5e9");
  return `background: linear-gradient(${angle}deg, ${from} 0%, ${to} 100%);`;
}
function createBoxShadow(request) {
  const x = cssPixel(request.fields.x, 0, -200, 200);
  const y = cssPixel(request.fields.y, 8, -200, 200);
  const blur = cssPixel(request.fields.blur, 24, 0, 300);
  const spread = cssPixel(request.fields.spread, 0, -100, 100);
  const color = cssColour(request.fields.color, "rgba(15, 23, 42, 0.18)");
  return `box-shadow: ${x} ${y} ${blur} ${spread} ${color};`;
}
function createTextShadow(request) {
  const x = cssPixel(request.fields.x, 0, -200, 200);
  const y = cssPixel(request.fields.y, 2, -200, 200);
  const blur = cssPixel(request.fields.blur, 10, 0, 300);
  const color = cssColour(request.fields.color, "rgba(15, 23, 42, 0.28)");
  return `text-shadow: ${x} ${y} ${blur} ${color};`;
}
function createBorderRadius(request) {
  const radius = cssPixel(request.fields.radius ?? request.input, 8, 0, 999);
  return `border-radius: ${radius};`;
}
function cssPixel(value, fallback, min, max) {
  return `${parseInteger(value ?? "", fallback, min, max)}px`;
}
function cssColour(value, fallback) {
  const colour = (value || fallback).trim();
  return /^[#(),.%\w\s-]+$/.test(colour) ? colour : fallback;
}
const CHART_TYPES = ["bar", "word-cloud"];
function createChartResult(generator, request) {
  if (generator.id !== "chart-svg") {
    return void 0;
  }
  const type = parseChoice(request.fields.type, CHART_TYPES, "bar");
  const items = parseChartItems(request.fields.data || request.input);
  const svg = type === "word-cloud" ? createWordCloudSvg(items) : createBarChartSvg(items);
  return textResult(generator, request.input, svg);
}
function parseChartItems(input) {
  const items = input.split(/\r?\n|,/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const [label = "", value = "1"] = line.split(/\s*[:=]\s*/);
    const parsedValue = Number(value);
    return {
      label: label.trim() || "Item",
      value: Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1
    };
  });
  return items.length > 0 ? items.slice(0, 12) : [{ label: "Item", value: 1 }];
}
function createBarChartSvg(items) {
  const width = 640;
  const rowHeight = 44;
  const labelWidth = 120;
  const chartWidth = 460;
  const height = 40 + items.length * rowHeight;
  const max = Math.max(...items.map((item) => item.value), 1);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">`,
    '	<rect width="100%" height="100%" fill="#ffffff"/>',
    ...items.flatMap((item, index2) => {
      const y = 24 + index2 * rowHeight;
      const barWidth = Math.max(4, Math.round(item.value / max * chartWidth));
      return [
        `	<text x="24" y="${y + 22}" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="14">${escapeXml(item.label)}</text>`,
        `	<rect x="${labelWidth}" y="${y}" width="${barWidth}" height="28" rx="4" fill="#17c964"/>`,
        `	<text x="${labelWidth + barWidth + 8}" y="${y + 19}" fill="#334155" font-family="Inter, Arial, sans-serif" font-size="12">${formatValue(item.value)}</text>`
      ];
    }),
    "</svg>"
  ].join("\n");
}
function createWordCloudSvg(items) {
  const width = 640;
  const height = 360;
  const max = Math.max(...items.map((item) => item.value), 1);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">`,
    '	<rect width="100%" height="100%" fill="#ffffff"/>',
    ...items.map((item, index2) => {
      const size = 18 + Math.round(item.value / max * 34);
      const x = 32 + index2 % 4 * 150;
      const y = 64 + Math.floor(index2 / 4) * 88;
      return `	<text x="${x}" y="${y}" fill="#0f172a" font-family="Inter, Arial, sans-serif" font-size="${size}">${escapeXml(item.label)}</text>`;
    }),
    "</svg>"
  ].join("\n");
}
function formatValue(value) {
  return Number(value.toFixed(2)).toString();
}
const DICE_TYPES = ["d4", "d6", "d8", "d10", "d12", "d20", "d100", "custom"];
const DICE_EXPRESSION_PATTERN = /^(.+?)\s*(>=|<=|>|<|=)\s*(-?\d+)\s*$/;
function rollDice(request) {
  const notation = parseDiceRequest(request);
  const rollCount = parseInteger(request.fields.count ?? request.fields.rolls ?? "", 1, 1, 25);
  const showIndividual = parseBoolean(request.fields.showIndividual ?? request.fields.show_individual, true);
  const rollSets = Array.from(
    { length: rollCount },
    (_, index2) => formatRollRecord(rollDiceSet(notation), notation, index2 + 1, showIndividual)
  );
  return singleOrList(rollSets);
}
function calculateDiceProbability(request) {
  const expression = parseDiceExpression(diceNotationInput(request));
  const notation = parseDiceRequest(request);
  const target = expression ? expression.target : parseInteger(request.fields.target ?? "", notation.dice + notation.modifier, -1e5, 1e5);
  const comparison = expression?.comparison ?? normaliseComparison(request.fields.comparison);
  const distribution = createDiceDistribution(notation);
  const totalOutcomes = sumBigInts([...distribution.values()]);
  const matchingOutcomes = sumBigInts(
    [...distribution.entries()].filter(([total]) => matchesComparison(total, target, comparison)).map(([, outcomes]) => outcomes)
  );
  const probability = Number(matchingOutcomes) / Number(totalOutcomes);
  return {
    comparison,
    matchingOutcomes: `${matchingOutcomes}`,
    notation: formatDiceNotation(notation),
    percent: `${(probability * 100).toFixed(4)}%`,
    probability: probability.toFixed(8),
    target: `${target}`,
    totalOutcomes: `${totalOutcomes}`
  };
}
function parseDiceNotation(value) {
  const normalised = value.trim().toLowerCase();
  const match = normalised.match(/^(\d*)d(\d+)([+-]\d+)?(?:\s+(drop|keep)\s+(lowest|highest)(?:\s+(\d+))?)?$/);
  if (!match) {
    return { dice: 1, dropHighest: 0, dropLowest: 0, keepHighest: 0, modifier: 0, sides: 6 };
  }
  const dice = parseInteger(match[1] || "1", 1, 1, 100);
  const mechanicCount = parseInteger(match[6] ?? "", 1, 1, dice);
  const mechanic = normaliseDiceMechanic(match[4], match[5], mechanicCount);
  return {
    dice,
    dropHighest: mechanic.dropHighest,
    dropLowest: mechanic.dropLowest,
    keepHighest: mechanic.keepHighest,
    modifier: parseInteger(match[3] ?? "", 0, -1e4, 1e4),
    sides: parseInteger(match[2], 6, 2, 1e3)
  };
}
function parseDiceRequest(request) {
  if (request.fields.dice_type || request.fields.diceType || request.fields.num_dice || request.fields.numDice) {
    return parseDiceFields(request);
  }
  return parseDiceNotation(parseDiceExpression(diceNotationInput(request))?.notation ?? diceNotationInput(request));
}
function diceNotationInput(request) {
  return request.fields.notation || request.input || "1d6";
}
function parseDiceExpression(value) {
  const match = value.trim().match(DICE_EXPRESSION_PATTERN);
  if (!match) {
    return void 0;
  }
  return {
    comparison: normaliseComparison(match[2]),
    notation: match[1].trim(),
    target: parseInteger(match[3], 0, -1e5, 1e5)
  };
}
function parseDiceFields(request) {
  const diceType = parseChoice(request.fields.dice_type ?? request.fields.diceType, DICE_TYPES, "d6");
  const sides = diceType === "custom" ? parseInteger(request.fields.dice_sides ?? request.fields.diceSides ?? "", 6, 2, 1e3) : Number.parseInt(diceType.slice(1), 10);
  const dice = parseInteger(request.fields.num_dice ?? request.fields.numDice ?? "", 1, 1, 100);
  const mechanic = normaliseFieldMechanics(request, dice);
  return {
    dice,
    dropHighest: mechanic.dropHighest,
    dropLowest: mechanic.dropLowest,
    keepHighest: mechanic.keepHighest,
    modifier: parseInteger(request.fields.modifier ?? "", 0, -100, 100),
    sides
  };
}
function normaliseDiceMechanic(action, direction, count) {
  return {
    dropHighest: action === "drop" && direction === "highest" ? count : 0,
    dropLowest: action === "drop" && direction === "lowest" ? count : 0,
    keepHighest: action === "keep" && direction === "highest" ? count : 0
  };
}
function normaliseFieldMechanics(request, dice) {
  const dropLowest = parseInteger(request.fields.drop_lowest ?? request.fields.dropLowest ?? "", 0, 0, Math.min(10, dice - 1));
  const dropHighest = dropLowest > 0 ? 0 : parseInteger(request.fields.drop_highest ?? request.fields.dropHighest ?? "", 0, 0, Math.min(10, dice - 1));
  const keepHighest = dropLowest > 0 || dropHighest > 0 ? 0 : parseInteger(request.fields.keep_highest ?? request.fields.keepHighest ?? "", 0, 0, dice);
  return { dropHighest, dropLowest, keepHighest };
}
function rollDiceSet(notation) {
  const rolls = Array.from({ length: notation.dice }, () => 1 + randomIntegerInRange(notation.sides));
  const { dropped, kept } = applyDiceMechanic(rolls, notation);
  const subtotal = kept.reduce((sum, roll) => sum + roll, 0);
  return {
    dropped,
    kept,
    rolls,
    subtotal,
    total: subtotal + notation.modifier
  };
}
function formatRollRecord(roll, notation, index2, showIndividual) {
  return {
    ...roll.dropped.length > 0 ? { droppedRolls: roll.dropped.join(", ") } : {},
    ...showIndividual ? { rolls: roll.rolls.join(", ") } : {},
    ...roll.kept.length !== roll.rolls.length ? { keptRolls: roll.kept.join(", ") } : {},
    diceType: `d${notation.sides}`,
    modifier: `${notation.modifier}`,
    notation: formatDiceNotation(notation),
    roll: `#${index2}`,
    subtotal: `${roll.subtotal}`,
    total: `${roll.total}`
  };
}
function applyDiceMechanic(rolls, notation) {
  const sorted = rolls.map((value, index2) => ({ index: index2, value }));
  if (notation.dropLowest > 0) {
    return splitRolls(rolls, sorted.toSorted((left, right) => left.value - right.value).slice(0, notation.dropLowest).map((roll) => roll.index));
  }
  if (notation.dropHighest > 0) {
    return splitRolls(rolls, sorted.toSorted((left, right) => right.value - left.value).slice(0, notation.dropHighest).map((roll) => roll.index));
  }
  if (notation.keepHighest > 0) {
    const keptIndexes = new Set(sorted.toSorted((left, right) => right.value - left.value).slice(0, notation.keepHighest).map((roll) => roll.index));
    return splitRolls(rolls, rolls.map((_, index2) => index2).filter((index2) => !keptIndexes.has(index2)));
  }
  return { dropped: [], kept: rolls };
}
function splitRolls(rolls, droppedIndexes) {
  const droppedSet = new Set(droppedIndexes);
  return {
    dropped: rolls.filter((_, index2) => droppedSet.has(index2)),
    kept: rolls.filter((_, index2) => !droppedSet.has(index2))
  };
}
function formatDiceNotation(notation) {
  const modifier = notation.modifier === 0 ? "" : notation.modifier > 0 ? `+${notation.modifier}` : `${notation.modifier}`;
  const mechanic = notation.dropLowest > 0 ? ` drop ${notation.dropLowest} lowest` : notation.dropHighest > 0 ? ` drop ${notation.dropHighest} highest` : notation.keepHighest > 0 ? ` keep highest ${notation.keepHighest}` : "";
  return `${notation.dice}d${notation.sides}${modifier}${mechanic}`;
}
function createDiceDistribution(notation) {
  if (hasDiceMechanic(notation)) {
    return createMechanicDistribution(notation);
  }
  if (notation.dice > 50 || notation.sides > 200 || notation.dice * notation.sides > 5e3) {
    throw new Error("Exact dice probability supports up to 50 dice, 200 sides, or 5000 dice-side combinations.");
  }
  let distribution = /* @__PURE__ */ new Map([[0, 1n]]);
  for (let die = 0; die < notation.dice; die += 1) {
    const next = /* @__PURE__ */ new Map();
    for (const [sum, count] of distribution) {
      for (let face = 1; face <= notation.sides; face += 1) {
        addOutcome(next, sum + face, count);
      }
    }
    distribution = next;
  }
  return applyModifier(distribution, notation.modifier);
}
function createMechanicDistribution(notation) {
  if (notation.dice > 8 || notation.sides > 30) {
    throw new Error("Advanced dice probability supports up to 8 dice with 30 sides.");
  }
  const distribution = /* @__PURE__ */ new Map();
  const rolls = [];
  function visit() {
    if (rolls.length === notation.dice) {
      const subtotal = applyDiceMechanic(rolls, notation).kept.reduce((sum, roll) => sum + roll, 0);
      addOutcome(distribution, subtotal + notation.modifier, 1n);
      return;
    }
    for (let face = 1; face <= notation.sides; face += 1) {
      rolls.push(face);
      visit();
      rolls.pop();
    }
  }
  visit();
  return distribution;
}
function hasDiceMechanic(notation) {
  return notation.dropLowest > 0 || notation.dropHighest > 0 || notation.keepHighest > 0;
}
function applyModifier(distribution, modifier) {
  if (modifier === 0) {
    return distribution;
  }
  return new Map([...distribution.entries()].map(([sum, count]) => [sum + modifier, count]));
}
function addOutcome(distribution, total, count) {
  distribution.set(total, (distribution.get(total) ?? 0n) + count);
}
function normaliseComparison(value) {
  if (value === ">" || value === ">=" || value === "<" || value === "<=" || value === "=") {
    return value;
  }
  return ">=";
}
function matchesComparison(total, target, comparison) {
  switch (comparison) {
    case ">":
      return total > target;
    case "<":
      return total < target;
    case "<=":
      return total <= target;
    case "=":
      return total === target;
    default:
      return total >= target;
  }
}
function sumBigInts(values) {
  return values.reduce((sum, value) => sum + value, 0n);
}
function createGamingResult(generator, request) {
  switch (generator.id) {
    case "coinflip":
      return textResult(generator, request.input, createCoinFlips(request));
    case "dice":
      return fieldsResult(generator, request.input, rollDice(request));
    case "dice-probability":
      return fieldsResult(generator, request.input, calculateDiceProbability(request));
    case "lottery":
      return fieldsResult(generator, request.input, createLottery(request));
    case "minecraft-seed":
      return textResult(generator, request.input, createMinecraftSeed());
    case "pokemon":
      return textResult(generator, request.input, createPokemon(request));
    default:
      return void 0;
  }
}
function createCoinFlips(request) {
  const count = parseInteger(request.fields.count ?? request.input, 1, 1, 100);
  return Array.from({ length: count }, () => randomIntegerInRange(2) === 1 ? "HEADS" : "TAILS");
}
function createLottery(request) {
  const min = parseInteger(request.fields.min ?? "", 1, 0, 1e6);
  const max = parseInteger(request.fields.max ?? "", 59, 1, 1e6);
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  const available = upper - lower + 1;
  const count = parseInteger(request.fields.count ?? "", 6, 1, Math.min(100, available));
  const numbers = shuffle(Array.from({ length: available }, (_, index2) => lower + index2)).slice(0, count).sort((left, right) => left - right);
  return {
    count: `${count}`,
    numbers: numbers.join(", "),
    range: `${lower}-${upper}`
  };
}
function createMinecraftSeed() {
  const high = BigInt(randomIntegerInRange(4294967296));
  const low = BigInt(randomIntegerInRange(4294967296));
  const unsigned = high << 32n | low;
  const signed = unsigned > 0x7fffffffffffffffn ? unsigned - 0x10000000000000000n : unsigned;
  return `${signed}`;
}
function createPokemon(request) {
  const type = normalisePokemonType(request.fields.type);
  const pool = type === "any" ? KANTO_POKEMON : KANTO_POKEMON.filter((pokemon) => pokemon.types.includes(type));
  const count = parseInteger(request.fields.count ?? "", 1, 1, Math.min(100, pool.length));
  const entries = shuffle(pool).slice(0, count).map(formatPokemon);
  return entries.length === 1 ? entries[0] : entries;
}
function normalisePokemonType(value) {
  const type = value?.trim().toLowerCase();
  return POKEMON_TYPES.includes(type) ? type : "any";
}
function formatPokemon(pokemon) {
  return `#${String(pokemon.id).padStart(3, "0")} ${pokemon.name} - ${pokemon.types.join("/")}`;
}
const ACTIVE_COMPANY_STYLES = ["professional", "creative", "modern", "traditional", "tech"];
const COMPANY_STYLES = [...ACTIVE_COMPANY_STYLES, "mixed"];
const COMPANY_INDUSTRIES = ["general", "tech", "finance", "retail", "healthcare", "consulting", "food", "fashion", "construction", "education"];
const SURNAMES = ["Smith", "Johnson", "Williams", "Brown", "Taylor", "Morgan", "Bennett", "Carter", "Reed", "Parker"];
const CREATIVE_ADJECTIVES = ["Neon", "Bright", "Wild", "Fresh", "Spark", "Lunar", "Golden", "North", "Signal", "Velvet"];
const CREATIVE_NOUNS = ["Digital", "Studio", "Ventures", "Collective", "Works", "Lab", "Forge", "Canvas", "Motion", "House"];
const MODERN_PREFIXES = ["Byte", "Cloud", "Nova", "Astra", "Pulse", "Edge", "Flow", "Core", "Loop", "Vertex"];
const MODERN_SUFFIXES = ["Tech", "Edge", "Flow", "Stack", "Base", "Ops", "Link", "Grid", "Wave", "Logic"];
const TRADITIONAL_PREFIXES = ["Heritage", "Classic", "Premier", "Crown", "Union", "Summit", "Sterling", "Anchor", "Liberty", "Keystone"];
const TECH_PREFIXES = ["Data", "Cyber", "Quantum", "Neural", "Vector", "Cloud", "Code", "Signal", "Nexa", "Infra"];
const TECH_CORES = ["Sync", "Core", "Net", "Stack", "Works", "Forge", "Labs", "Grid", "Flow", "Ops"];
const GENERAL_SUFFIXES = ["Group", "Partners", "Industries", "Solutions", "Holdings", "Company", "Associates", "Enterprises"];
const INDUSTRY_SUFFIXES = {
  construction: ["Construction", "Builders", "Development", "Properties", "Works"],
  consulting: ["Consulting", "Advisory", "Partners", "Group", "Strategy"],
  education: ["Education", "Academy", "Learning", "Institute", "School"],
  fashion: ["Fashion", "Apparel", "Style", "Boutique", "Design"],
  finance: ["Capital", "Financial", "Investments", "Bank", "Holdings"],
  food: ["Foods", "Kitchen", "Restaurant", "Cafe", "Catering"],
  general: GENERAL_SUFFIXES,
  healthcare: ["Health", "Medical", "Clinic", "Care", "Wellness"],
  retail: ["Retail", "Store", "Shop", "Market", "Commerce"],
  tech: ["Technologies", "Systems", "Labs", "Digital", "Software"]
};
function createCompanies(request) {
  const count = parseCount(request.fields.count ?? "", 10, 100);
  const style = parseChoice(request.fields.style, COMPANY_STYLES, "mixed");
  const industry = parseChoice(request.fields.industry, COMPANY_INDUSTRIES, "general");
  return singleOrList(Array.from({ length: count }, () => createCompanyName(style, industry)));
}
function createCompanyName(style, industry) {
  const selectedStyle = style === "mixed" ? randomChoice(ACTIVE_COMPANY_STYLES) : style;
  const suffix = randomChoice(INDUSTRY_SUFFIXES[industry]);
  switch (selectedStyle) {
    case "creative":
      return `${randomChoice(CREATIVE_ADJECTIVES)} ${randomChoice(CREATIVE_NOUNS)} ${suffix}`;
    case "modern":
      return `${randomChoice(MODERN_PREFIXES)}${randomChoice(MODERN_SUFFIXES)} ${suffix}`;
    case "professional":
      return `${randomChoice(SURNAMES)} ${randomChoice(["& Associates", "Group", "Partners", "LLC", "Corp"])}`;
    case "tech":
      return `${randomChoice(TECH_PREFIXES)}${randomChoice(TECH_CORES)} ${randomChoice(INDUSTRY_SUFFIXES.tech)}`;
    case "traditional":
      return `${randomChoice(TRADITIONAL_PREFIXES)} ${suffix}`;
  }
}
const DIGITS$3 = "0123456789";
const PHONE_COUNTRIES = ["US", "CA", "GB", "DE", "FR", "ES", "IT", "NL", "AU", "JP", "CN", "IN", "BR", "MX"];
const PHONE_FORMATS = ["national", "international", "e164"];
const POSTAL_LOCALES = [
  "en_GB",
  "en_US",
  "en_CA",
  "en_IN",
  "en_AU",
  "pt_BR",
  "es_AR",
  "fr_FR",
  "es_ES",
  "it_IT",
  "de_DE",
  "pt_PT",
  "nl_NL",
  "pl_PL",
  "ru_RU",
  "tr_TR",
  "uk_UA",
  "bn_BD",
  "ja_JP",
  "zh_CN",
  "zh_TW",
  "ko_KR",
  "id_ID",
  "th_TH",
  "vi_VN",
  "fa_IR",
  "ar_SA",
  "ar_EG"
];
const POSTAL_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
function createPhoneNumbers(request) {
  const count = parseCount(request.fields.count ?? "", 10, 100);
  const country = parseUpperChoice(request.fields.country, PHONE_COUNTRIES, "US");
  const format = parseChoice(request.fields.format, PHONE_FORMATS, "national");
  const unique = parseBoolean(request.fields.unique, false);
  return createUniqueOrRepeated(count, unique, () => formatPhoneNumber(country, format));
}
function createZipCodes(request) {
  const count = parseCount(request.fields.count ?? "", 10, 100);
  const locale = parseLocale$1(request.fields.locale);
  return singleOrList(Array.from({ length: count }, () => createPostalCode(locale)));
}
function createUniqueOrRepeated(count, unique, createValue) {
  if (!unique) {
    return singleOrList(Array.from({ length: count }, createValue));
  }
  const values = /* @__PURE__ */ new Set();
  let attempts = 0;
  while (values.size < count && attempts < count * 20) {
    values.add(createValue());
    attempts += 1;
  }
  return singleOrList([...values]);
}
function formatPhoneNumber(country, format) {
  const profile = phoneProfile(country);
  const nationalDigits = profile.createNationalDigits();
  if (format === "e164") {
    return `+${profile.countryCode}${nationalDigits}`;
  }
  if (format === "international") {
    return `+${profile.countryCode} ${profile.formatInternational(nationalDigits)}`;
  }
  return profile.formatNational(nationalDigits);
}
function phoneProfile(country) {
  switch (country) {
    case "AU":
      return fixedPrefixPhone("61", () => `4${randomCharacters(DIGITS$3, 8)}`, (value) => `0${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6)}`);
    case "BR":
      return fixedPrefixPhone("55", () => `${randomChoice(["11", "21", "31", "41", "51"])}9${randomCharacters(DIGITS$3, 8)}`, (value) => `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`);
    case "CA":
      return nanpPhone("1", ["204", "236", "249", "343", "416", "438", "514", "604", "647", "778"]);
    case "CN":
      return fixedPrefixPhone("86", () => `1${randomChoice(["3", "5", "7", "8"])}${randomCharacters(DIGITS$3, 9)}`, (value) => `${value.slice(0, 3)} ${value.slice(3, 7)} ${value.slice(7)}`);
    case "DE":
      return fixedPrefixPhone("49", () => `15${randomCharacters(DIGITS$3, 9)}`, (value) => `0${value.slice(0, 3)} ${value.slice(3)}`);
    case "ES":
      return fixedPrefixPhone("34", () => `${randomChoice(["6", "7", "9"])}${randomCharacters(DIGITS$3, 8)}`, (value) => `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6)}`);
    case "FR":
      return fixedPrefixPhone("33", () => `${randomChoice(["6", "7"])}${randomCharacters(DIGITS$3, 8)}`, (value) => `0${value.slice(0, 1)} ${value.slice(1, 3)} ${value.slice(3, 5)} ${value.slice(5, 7)} ${value.slice(7)}`);
    case "GB":
      return fixedPrefixPhone("44", () => `7${randomCharacters(DIGITS$3, 9)}`, (value) => `0${value.slice(0, 4)} ${value.slice(4, 7)} ${value.slice(7)}`);
    case "IN":
      return fixedPrefixPhone("91", () => `${randomChoice(["6", "7", "8", "9"])}${randomCharacters(DIGITS$3, 9)}`, (value) => `${value.slice(0, 5)} ${value.slice(5)}`);
    case "IT":
      return fixedPrefixPhone("39", () => `3${randomCharacters(DIGITS$3, 9)}`, (value) => `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6)}`);
    case "JP":
      return fixedPrefixPhone("81", () => `90${randomCharacters(DIGITS$3, 8)}`, (value) => `0${value.slice(0, 2)}-${value.slice(2, 6)}-${value.slice(6)}`);
    case "MX":
      return fixedPrefixPhone("52", () => `${randomChoice(["55", "33", "81"])}${randomCharacters(DIGITS$3, 8)}`, (value) => `${value.slice(0, 2)} ${value.slice(2, 6)} ${value.slice(6)}`);
    case "NL":
      return fixedPrefixPhone("31", () => `6${randomCharacters(DIGITS$3, 8)}`, (value) => `0${value.slice(0, 1)} ${value.slice(1, 5)} ${value.slice(5)}`);
    case "US":
      return nanpPhone("1", ["202", "212", "303", "312", "415", "617", "702", "718", "805", "917"]);
  }
}
function fixedPrefixPhone(countryCode, createNationalDigits, formatNational) {
  return {
    countryCode,
    createNationalDigits,
    formatInternational: (nationalDigits) => formatNational(nationalDigits).replace(/^0/, ""),
    formatNational
  };
}
function nanpPhone(countryCode, areaCodes) {
  return {
    countryCode,
    createNationalDigits: () => `${randomChoice(areaCodes)}${randomIntegerInRange(8) + 2}${randomCharacters(DIGITS$3, 2)}${randomCharacters(DIGITS$3, 4)}`,
    formatInternational: (value) => `${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6)}`,
    formatNational: (value) => `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`
  };
}
function createPostalCode(locale) {
  switch (locale) {
    case "de_DE":
    case "es_ES":
    case "fr_FR":
    case "it_IT":
    case "pt_BR":
    case "es_AR":
    case "ru_RU":
    case "tr_TR":
    case "uk_UA":
    case "bn_BD":
    case "fa_IR":
    case "ar_SA":
    case "ar_EG":
    case "vi_VN":
      return randomCharacters(DIGITS$3, 5);
    case "en_IN":
      return randomDigits(6);
    case "en_CA":
      return `${randomCharacters(POSTAL_LETTERS, 1)}${randomCharacters(DIGITS$3, 1)}${randomCharacters(POSTAL_LETTERS, 1)} ${randomCharacters(DIGITS$3, 1)}${randomCharacters(POSTAL_LETTERS, 1)}${randomCharacters(DIGITS$3, 1)}`;
    case "en_GB":
      return `${randomCharacters(POSTAL_LETTERS, 2)}${randomIntegerInRange(90) + 10} ${randomCharacters(DIGITS$3, 1)}${randomCharacters(POSTAL_LETTERS, 2)}`;
    case "en_US":
      return `${randomIntegerInRange(9e4) + 1e4}`;
    case "en_AU":
      return randomDigits(4);
    case "nl_NL":
      return `${randomIntegerInRange(9e3) + 1e3} ${randomCharacters(POSTAL_LETTERS, 2)}`;
    case "id_ID":
      return randomDigits(5);
    case "ja_JP":
      return `${randomDigits(3)}-${randomDigits(4)}`;
    case "ko_KR":
    case "th_TH":
      return randomDigits(5);
    case "zh_CN":
      return randomDigits(6);
    case "zh_TW":
      return `${randomDigits(3)}-${randomDigits(2)}-${randomDigits(2)}`;
    case "pl_PL":
      return `${randomIntegerInRange(90) + 10}-${String(randomIntegerInRange(1e3)).padStart(3, "0")}`;
    case "pt_PT":
      return `${randomIntegerInRange(9e3) + 1e3}-${String(randomIntegerInRange(1e3)).padStart(3, "0")}`;
  }
}
function randomDigits(length) {
  return String(randomIntegerInRange(10 ** length)).padStart(length, "0");
}
function parseUpperChoice(input, options, fallback) {
  const normalised = input?.trim().toUpperCase();
  return options.find((option) => option === normalised) ?? fallback;
}
function parseLocale$1(input) {
  const normalised = input?.trim();
  return POSTAL_LOCALES.find((option) => option === normalised) ?? "en_GB";
}
const HEX = "0123456789abcdef";
const IP_VERSIONS = ["ipv4", "ipv6", "both"];
const MAC_FORMATS = ["colon", "hyphen", "dot", "cisco", "plain"];
function createIpAddresses(request) {
  const version = parseChoice(request.fields.version, IP_VERSIONS, "ipv4");
  return createIpAddressList(request, () => {
    if (version === "both") {
      return randomChoice([createIpv4Address, createIpv6Address])(request);
    }
    return version === "ipv6" ? createIpv6Address(request) : createIpv4Address(request);
  });
}
function createIpv4Addresses(request) {
  return createIpAddressList(request, createIpv4Address);
}
function createIpv6Addresses(request) {
  return createIpAddressList(request, createIpv6Address);
}
function createMacAddresses(request) {
  const count = parseCount(request.fields.count ?? "", 10, 100);
  const unique = parseBoolean(request.fields.unique, false);
  return createTextList$1(count, unique, () => createMacAddress(request));
}
function createIpAddressList(request, createValue) {
  const count = parseCount(request.fields.count ?? "", 10, 100);
  const unique = parseBoolean(request.fields.unique, false);
  return createTextList$1(count, unique, () => createValue(request));
}
function createTextList$1(count, unique, createValue) {
  const values = [];
  const seen = /* @__PURE__ */ new Set();
  const maxAttempts = count * 10;
  let attempts = 0;
  while (values.length < count && attempts < maxAttempts) {
    attempts += 1;
    const value = createValue();
    if (unique && seen.has(value)) {
      continue;
    }
    values.push(value);
    seen.add(value);
  }
  return singleOrList(values);
}
function createIpv4Address(request) {
  const includePrivate = parseBoolean(request.fields.includePrivate, true);
  const includeLocalhost = parseBoolean(request.fields.includeLocalhost, false);
  return createConstrainedValue(() => createIpv4Candidate(), (octets) => {
    if (isReservedIpv4(octets)) {
      return false;
    }
    if (!includePrivate && isPrivateIpv4(octets)) {
      return false;
    }
    if (!includeLocalhost && octets[0] === 127) {
      return false;
    }
    return true;
  }).join(".");
}
function createIpv6Address(request) {
  const includePrivate = parseBoolean(request.fields.includePrivate, true);
  const includeLocalhost = parseBoolean(request.fields.includeLocalhost, false);
  const groups = createConstrainedValue(() => createIpv6Candidate(), (candidate) => {
    if (candidate.every((group) => group === "0000")) {
      return false;
    }
    if (!includeLocalhost && candidate.slice(0, 7).every((group) => group === "0000") && candidate[7] === "0001") {
      return false;
    }
    if (!includePrivate && isUniqueLocalIpv6(candidate[0])) {
      return false;
    }
    return true;
  });
  return groups.join(":");
}
function createMacAddress(request) {
  const format = parseChoice(request.fields.format, MAC_FORMATS, "colon");
  const uppercase = parseBoolean(request.fields.uppercase, false);
  const local = parseBoolean(request.fields.local, true);
  const unicast = parseBoolean(request.fields.unicast, true);
  const bytes2 = Array.from({ length: 6 }, () => randomIntegerInRange(256));
  bytes2[0] = local ? bytes2[0] | 2 : bytes2[0] & 253;
  bytes2[0] = unicast ? bytes2[0] & 254 : bytes2[0] | 1;
  const octets = bytes2.map((byte) => byte.toString(16).padStart(2, "0"));
  const value = formatMacAddress(octets, format);
  return uppercase ? value.toUpperCase() : value;
}
function createConstrainedValue(createValue, isValid) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const value = createValue();
    if (isValid(value)) {
      return value;
    }
  }
  return createValue();
}
function createIpv4Candidate() {
  return Array.from({ length: 4 }, () => randomIntegerInRange(256));
}
function createIpv6Candidate() {
  return Array.from({ length: 8 }, () => randomCharacters(HEX, 4));
}
function isReservedIpv4([first, second, third, fourth]) {
  return first === 0 || first >= 224 || first === 127 || first === 169 && second === 254 || first === 192 && second === 0 && third === 2 || first === 198 && second === 51 && third === 100 || first === 203 && second === 0 && third === 113 || first === 255 && second === 255 && third === 255 && fourth === 255;
}
function isPrivateIpv4([first, second]) {
  return first === 10 || first === 172 && second >= 16 && second <= 31 || first === 192 && second === 168;
}
function isUniqueLocalIpv6(firstGroup) {
  const firstByte = Number.parseInt(firstGroup.slice(0, 2), 16);
  return (firstByte & 254) === 252;
}
function formatMacAddress(octets, format) {
  switch (format) {
    case "cisco":
      return `${octets[0]}${octets[1]}.${octets[2]}${octets[3]}.${octets[4]}${octets[5]}`;
    case "dot":
      return octets.join(".");
    case "hyphen":
      return octets.join("-");
    case "plain":
      return octets.join("");
    case "colon":
      return octets.join(":");
  }
}
const DIGITS$2 = "0123456789";
const IBAN_COUNTRIES = ["DE", "FR", "GB", "IT", "ES", "NL"];
const CARD_BRANDS = ["visa", "mastercard", "amex", "discover"];
const CARDHOLDER_FIRST_NAMES = [
  "ALEX",
  "CASEY",
  "JORDAN",
  "MORGAN",
  "RILEY",
  "SAM",
  "TAYLOR",
  "AVERY",
  "JAMIE",
  "QUINN"
];
const CARDHOLDER_LAST_NAMES = [
  "ANDERSON",
  "BROWN",
  "CLARK",
  "DAVIS",
  "EVANS",
  "GARCIA",
  "HARRIS",
  "JOHNSON",
  "MILLER",
  "WILSON"
];
const COORDINATE_FORMATS = ["decimal", "dms", "dm"];
const COORDINATE_REGIONS = [
  "global",
  "north-america",
  "south-america",
  "europe",
  "africa",
  "asia",
  "oceania",
  "usa",
  "canada",
  "uk",
  "australia"
];
const COORDINATE_BOUNDS = {
  africa: { label: "Africa", maxLat: 38, maxLon: 52, minLat: -35, minLon: -18 },
  asia: { label: "Asia", maxLat: 55, maxLon: 180, minLat: -10, minLon: 26 },
  australia: { label: "Australia", maxLat: -10, maxLon: 154, minLat: -44, minLon: 112 },
  canada: { label: "Canada", maxLat: 72, maxLon: -52, minLat: 42, minLon: -141 },
  europe: { label: "Europe", maxLat: 71, maxLon: 40, minLat: 36, minLon: -10 },
  global: { label: "Global", maxLat: 90, maxLon: 180, minLat: -90, minLon: -180 },
  "north-america": { label: "North America", maxLat: 72, maxLon: -52, minLat: 15, minLon: -168 },
  oceania: { label: "Oceania", maxLat: 0, maxLon: 180, minLat: -50, minLon: 110 },
  "south-america": { label: "South America", maxLat: 13, maxLon: -34, minLat: -56, minLon: -82 },
  uk: { label: "United Kingdom", maxLat: 59, maxLon: 2, minLat: 49, minLon: -8 },
  usa: { label: "United States", maxLat: 49, maxLon: -66, minLat: 24, minLon: -125 }
};
function createCards(request) {
  const count = parseCount(request.fields.count ?? "", 1, 100);
  return singleOrList(Array.from({ length: count }, () => createCard(request)));
}
function createCoordinateRecords(request) {
  const count = parseCount(request.fields.count ?? "", 1, 100);
  return singleOrList(Array.from({ length: count }, () => createCoordinates(request)));
}
function createIbans(request) {
  const count = parseCount(request.fields.count ?? "", 10, 25);
  const country = parseIbanCountry(request.fields.country);
  return singleOrList(Array.from({ length: count }, () => createIban$1(country)));
}
function createCard(request) {
  const brand = parseChoice(request.fields.type ?? request.fields.brand, CARD_BRANDS, "visa");
  const includeDetails = parseBoolean(request.fields.includeDetails ?? request.fields.include_details, true);
  const includeName = parseBoolean(request.fields.includeName ?? request.fields.include_name, true);
  const profile = cardProfile(brand);
  const prefix = randomChoice(profile.prefixes);
  const body = `${prefix}${randomCharacters(DIGITS$2, profile.length - prefix.length - 1)}`;
  const number = `${body}${luhnCheckDigit$1(body)}`;
  const card = {
    brand: profile.label,
    luhnValid: "true",
    number,
    type: brand,
    warning: "TESTING ONLY - no real account or funds"
  };
  return {
    ...card,
    ...includeName ? { name: createCardholderName() } : {},
    ...includeDetails ? createCardDetails(profile) : {}
  };
}
function cardProfile(brand) {
  switch (brand) {
    case "amex":
      return { cvvLength: 4, label: "American Express", length: 15, prefixes: ["34", "37"] };
    case "discover":
      return { cvvLength: 3, label: "Discover", length: 16, prefixes: ["6011", "65"] };
    case "mastercard":
      return {
        cvvLength: 3,
        label: "Mastercard",
        length: 16,
        prefixes: [`${randomIntegerInRange(5) + 51}`, `${randomIntegerInRange(500) + 2221}`]
      };
    case "visa":
      return { cvvLength: 3, label: "Visa", length: 16, prefixes: ["4"] };
  }
}
function createCardDetails(profile) {
  return {
    cvv: randomCharacters(DIGITS$2, profile.cvvLength),
    expiration: createCardExpiration()
  };
}
function createCardExpiration() {
  const month = String(randomIntegerInRange(12) + 1).padStart(2, "0");
  const year = randomIntegerInRange(6) + 27;
  return `${month}/${year}`;
}
function createCardholderName() {
  return `${randomChoice(CARDHOLDER_FIRST_NAMES)} ${randomChoice(CARDHOLDER_LAST_NAMES)}`;
}
function createCoordinates(request) {
  const region = parseChoice(request.fields.region, COORDINATE_REGIONS, "global");
  const format = parseChoice(request.fields.format, COORDINATE_FORMATS, "decimal");
  const precision = parseInteger(request.fields.precision ?? "", 6, 1, 8);
  const bounds = customBounds(request) ?? COORDINATE_BOUNDS[region];
  const latitude = randomCoordinate$1(bounds.minLat, bounds.maxLat);
  const longitude = randomCoordinate$1(bounds.minLon, bounds.maxLon);
  const decimal = `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
  return {
    decimal,
    format,
    geoUri: `geo:${latitude.toFixed(precision)},${longitude.toFixed(precision)}`,
    googleMapsUrl: `https://maps.google.com/maps?q=${latitude.toFixed(precision)},${longitude.toFixed(precision)}`,
    latitude: latitude.toFixed(precision),
    longitude: longitude.toFixed(precision),
    pair: formatCoordinatePair(latitude, longitude, format, precision),
    precision: `${precision}`,
    region: bounds.label
  };
}
function customBounds(request) {
  const minLatInput = request.fields.minLat ?? request.fields.min_lat;
  const maxLatInput = request.fields.maxLat ?? request.fields.max_lat;
  const minLonInput = request.fields.minLon ?? request.fields.min_lon;
  const maxLonInput = request.fields.maxLon ?? request.fields.max_lon;
  if (!minLatInput && !maxLatInput && !minLonInput && !maxLonInput) {
    return void 0;
  }
  const minLat = parseNumber(minLatInput ?? "", -90, -90, 90);
  const maxLat = parseNumber(maxLatInput ?? "", 90, -90, 90);
  const minLon = parseNumber(minLonInput ?? "", -180, -180, 180);
  const maxLon = parseNumber(maxLonInput ?? "", 180, -180, 180);
  return {
    label: "Custom bounds",
    maxLat: Math.max(minLat, maxLat),
    maxLon: Math.max(minLon, maxLon),
    minLat: Math.min(minLat, maxLat),
    minLon: Math.min(minLon, maxLon)
  };
}
function randomCoordinate$1(min, max) {
  return min + randomUnitInterval() * (max - min);
}
function formatCoordinatePair(latitude, longitude, format, precision) {
  if (format === "dms") {
    return `${formatDms(latitude, "lat")}, ${formatDms(longitude, "lon")}`;
  }
  if (format === "dm") {
    return `${formatDm(latitude, "lat")}, ${formatDm(longitude, "lon")}`;
  }
  return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
}
function formatDms(value, axis) {
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutesFloat = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return `${degrees}°${minutes}'${seconds.toFixed(2)}"${hemisphere(value, axis)}`;
}
function formatDm(value, axis) {
  const absolute = Math.abs(value);
  const degrees = Math.floor(absolute);
  const minutes = (absolute - degrees) * 60;
  return `${degrees}°${minutes.toFixed(4)}'${hemisphere(value, axis)}`;
}
function hemisphere(value, axis) {
  if (axis === "lat") {
    return value >= 0 ? "N" : "S";
  }
  return value >= 0 ? "E" : "W";
}
function luhnCheckDigit$1(body) {
  const sum = body.split("").reverse().reduce((total, character, index2) => {
    let digit = Number.parseInt(character, 10);
    if (index2 % 2 === 0) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    return total + digit;
  }, 0);
  return `${(10 - sum % 10) % 10}`;
}
function createIban$1(country) {
  const bban = createBban$1(country);
  return `${country}${ibanCheckDigits$1(country, bban)}${bban}`;
}
function parseIbanCountry(input) {
  const normalised = input?.trim().toUpperCase();
  const country = IBAN_COUNTRIES.find((option) => option === normalised);
  return country ?? "GB";
}
function createBban$1(country) {
  switch (country) {
    case "DE":
      return randomCharacters(DIGITS$2, 18);
    case "ES":
      return randomCharacters(DIGITS$2, 20);
    case "FR":
      return `${randomCharacters(DIGITS$2, 10)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 11)}${randomCharacters(DIGITS$2, 2)}`;
    case "GB":
      return `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 4)}${randomCharacters(DIGITS$2, 14)}`;
    case "IT":
      return `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 1)}${randomCharacters(DIGITS$2, 10)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 12)}`;
    case "NL":
      return `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 4)}${randomCharacters(DIGITS$2, 10)}`;
  }
}
function ibanCheckDigits$1(countryCode, bban) {
  const rearranged = `${bban}${countryCode}00`;
  const numeric = rearranged.split("").map((character) => {
    const code = character.charCodeAt(0);
    return code >= 65 && code <= 90 ? `${code - 55}` : character;
  }).join("");
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number.parseInt(digit, 10)) % 97;
  }
  return String(98 - remainder).padStart(2, "0");
}
const USERNAME_STYLES = ["professional", "gamer", "quirky", "simple", "cool", "mixed"];
const ACTIVE_USERNAME_STYLES = ["professional", "gamer", "quirky", "simple", "cool"];
const FIRST_NAMES$1 = ["alex", "sam", "jordan", "casey", "taylor", "morgan", "riley", "jamie", "avery", "quinn"];
const LAST_NAMES$1 = ["smith", "wilson", "parker", "stone", "reed", "carter", "blake", "foster", "grant", "hale"];
const GAMER_PREFIXES = ["Shadow", "Dragon", "Neon", "Nova", "Cyber", "Pixel", "Storm", "Blaze", "Ghost", "Vortex"];
const GAMER_NOUNS = ["Hunter", "Slayer", "Ranger", "Knight", "Pilot", "Runner", "Striker", "Mage", "Ninja", "Rider"];
const QUIRKY_WORDS = ["Pizza", "Coffee", "Waffle", "Banana", "Otter", "Moon", "Bubble", "Toast", "Mango", "Comet"];
const COOL_PREFIXES = ["neon", "pixel", "lunar", "signal", "vector", "rapid", "cosmic", "solar", "quiet", "sharp"];
const COOL_NOUNS = ["wave", "vibe", "orbit", "relay", "snap", "cipher", "zone", "bolt", "arcade", "signal"];
const DIGITS$1 = "0123456789";
function createUsernames(request) {
  const count = parseCount(request.fields.count ?? "", 10, 100);
  const style = parseChoice(request.fields.style, USERNAME_STYLES, "mixed");
  const minLength = parseInteger(request.fields.minLength ?? request.fields.min_length ?? "", 6, 3, 20);
  const maxLength = parseInteger(request.fields.maxLength ?? request.fields.max_length ?? "", 15, 3, 20);
  const includeNumbers = parseBoolean(request.fields.includeNumbers ?? request.fields.include_numbers, true);
  const unique = parseBoolean(request.fields.unique, true);
  const lengthRange = {
    max: Math.max(minLength, maxLength),
    min: Math.min(minLength, maxLength)
  };
  if (!unique) {
    return singleOrList(Array.from({ length: count }, () => createUsername(style, lengthRange, includeNumbers)));
  }
  const usernames = /* @__PURE__ */ new Set();
  let attempts = 0;
  while (usernames.size < count && attempts < count * 40) {
    usernames.add(createUsername(style, lengthRange, includeNumbers));
    attempts += 1;
  }
  return singleOrList([...usernames]);
}
function createUsername(style, lengthRange, includeNumbers) {
  const selectedStyle = style === "mixed" ? randomChoice(ACTIVE_USERNAME_STYLES) : style;
  const base = usernameBase(selectedStyle);
  const suffix = includeNumbers ? randomCharacters(DIGITS$1, randomChoice([2, 3, 4])) : "";
  return fitUsername(`${base}${suffix}`, lengthRange, includeNumbers);
}
function usernameBase(style) {
  switch (style) {
    case "cool":
      return `${randomChoice(COOL_PREFIXES)}${randomChoice(COOL_NOUNS)}`;
    case "gamer":
      return `${randomChoice(GAMER_PREFIXES)}${randomChoice(GAMER_NOUNS)}`;
    case "professional":
      return `${randomChoice(FIRST_NAMES$1)}.${randomChoice(LAST_NAMES$1)}`;
    case "quirky":
      return `${randomChoice(QUIRKY_WORDS)}${randomChoice(["Fan", "Lover", "Cat", "Wizard", "Pilot"])}`;
    case "simple":
      return `user${randomCharacters(DIGITS$1, 4)}`;
  }
}
function fitUsername(value, lengthRange, includeNumbers) {
  let username = slugify(value).replaceAll("-", "_");
  if (username.length > lengthRange.max) {
    username = username.slice(0, lengthRange.max);
  }
  while (username.length < lengthRange.min) {
    username += includeNumbers ? randomChoice([...DIGITS$1]) : randomChoice(["x", "z", "q"]);
  }
  return username;
}
const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming"
];
const ZODIAC_SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces"
];
function createIdentifierResult(generator, request) {
  switch (generator.id) {
    case "card":
      return fieldsResult(generator, request.input, createCards(request));
    case "company":
      return textResult(generator, request.input, createCompanies(request));
    case "coordinates":
      return fieldsResult(generator, request.input, createCoordinateRecords(request));
    case "iban":
      return textResult(generator, request.input, createIbans(request));
    case "ip-address":
      return textResult(generator, request.input, createIpAddresses(request));
    case "ipv4":
      return textResult(generator, request.input, createIpv4Addresses(request));
    case "ipv6":
      return textResult(generator, request.input, createIpv6Addresses(request));
    case "mac":
      return textResult(generator, request.input, createMacAddresses(request));
    case "minecraft-uuid":
      return fieldsResult(generator, request.input, createMinecraftUuids(request));
    case "phone":
      return textResult(generator, request.input, createPhoneNumbers(request));
    case "us-state":
      return textResult(generator, request.input, createUsStates(request));
    case "username":
      return textResult(generator, request.input, createUsernames(request));
    case "zodiac":
      return textResult(generator, request.input, createZodiacSigns(request));
    case "zip":
      return textResult(generator, request.input, createZipCodes(request));
    default:
      return void 0;
  }
}
function createTextList(request, createValue) {
  const count = parseCount(request.fields.count ?? "", 1, 1e3);
  return singleOrList(Array.from({ length: count }, createValue));
}
function createRecordList(request, createValue) {
  const count = parseCount(request.fields.count ?? "", 1, 1e3);
  return singleOrList(Array.from({ length: count }, createValue));
}
function createMinecraftUuid() {
  const uuid = crypto.randomUUID();
  return {
    compact: uuid.replaceAll("-", ""),
    uuid
  };
}
function createMinecraftUuids(request) {
  return createRecordList(request, createMinecraftUuid);
}
function createUsStates(request) {
  return createTextList(request, () => randomChoice(US_STATES));
}
function createZodiacSigns(request) {
  return createTextList(request, () => randomChoice(ZODIAC_SIGNS));
}
const NUMBER_TYPES = ["integer", "decimal", "prime", "percentage", "even", "odd", "negative"];
function createNumberResult(generator, request) {
  switch (generator.id) {
    case "fraction":
      return fieldsResult(generator, request.input, createFraction(request));
    case "hex-number":
      return textResult(generator, request.input, createBaseNumber(request, 16));
    case "number":
      return textResult(generator, request.input, createNumbers(request));
    case "binary":
      return textResult(generator, request.input, createBinary(request));
    case "octal-number":
      return textResult(generator, request.input, createBaseNumber(request, 8));
    default:
      return void 0;
  }
}
function createNumbers(request) {
  const type = parseChoice(request.fields.type ?? request.fields.mode, NUMBER_TYPES, "integer");
  const count = parseInteger(request.fields.count ?? "", 10, 1, 1e3);
  const values = Array.from({ length: count }, () => createNumberValue(request, type));
  return singleOrList(values);
}
function createNumberValue(request, type) {
  switch (type) {
    case "decimal":
      return createDecimal(request);
    case "even":
      return `${createParityInteger(request, 0)}`;
    case "negative":
      return `${createNegativeInteger(request)}`;
    case "odd":
      return `${createParityInteger(request, 1)}`;
    case "percentage":
      return `${createPercentage(request)}%`;
    case "prime":
      return `${createPrime(request)}`;
    case "integer":
      return `${createInteger(request)}`;
  }
}
function createBinaryValues(request) {
  const count = parseCount(request.fields.count ?? "", 10, 1e3);
  const bits = parseInteger(request.fields.bits ?? "", 8, 1, 64);
  return Array.from({ length: count }, () => randomCharacters("01", bits));
}
function createBinary(request) {
  return singleOrList(createBinaryValues(request));
}
function createInteger(request) {
  const min = parseInteger(request.fields.min ?? "", 1, -1e6, 1e6);
  const max = parseInteger(request.fields.max ?? "", 100, -1e6, 1e6);
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return lower + randomIntegerInRange(upper - lower + 1);
}
function createDecimal(request) {
  const min = parseNumber(request.fields.min ?? "", 0, -1e9, 1e9);
  const max = parseNumber(request.fields.max ?? "", 1, -1e9, 1e9);
  const decimals = parseInteger(request.fields.decimals ?? "", 2, 1, 10);
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return (lower + randomUnitInterval() * (upper - lower)).toFixed(decimals);
}
function createPercentage(request) {
  const decimals = parseInteger(request.fields.decimals ?? "", 2, 0, 10);
  return (randomUnitInterval() * 100).toFixed(decimals);
}
function createNegativeInteger(request) {
  const min = parseInteger(request.fields.min ?? "", -100, -1e6, -1);
  const max = parseInteger(request.fields.max ?? "", -1, -1e6, -1);
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return lower + randomIntegerInRange(upper - lower + 1);
}
function createParityInteger(request, parity) {
  const min = parseInteger(request.fields.min ?? "", 1, -1e6, 1e6);
  const max = parseInteger(request.fields.max ?? "", 100, -1e6, 1e6);
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  const first = firstWithParity(lower, parity);
  const last = firstWithParity(upper, parity === 0 ? 0 : 1);
  const final = last > upper ? last - 2 : last;
  if (first > upper || final < first) {
    throw new Error(`No ${parity === 0 ? "even" : "odd"} number exists in the selected range.`);
  }
  return first + randomIntegerInRange(Math.floor((final - first) / 2) + 1) * 2;
}
function firstWithParity(value, parity) {
  const remainder = Math.abs(value % 2);
  return remainder === parity ? value : value + 1;
}
function createPrime(request) {
  const min = parseInteger(request.fields.min ?? "", 1, -1e6, 1e6);
  const max = parseInteger(request.fields.max ?? "", 100, -1e6, 1e6);
  const lower = Math.max(2, Math.min(min, max));
  const upper = Math.max(2, Math.max(min, max));
  const primes = primesInRange(lower, upper);
  if (primes.length === 0) {
    throw new Error("No prime number exists in the selected range.");
  }
  return primes[randomIntegerInRange(primes.length)];
}
function primesInRange(min, max) {
  const primes = [];
  for (let value = min; value <= max; value += 1) {
    if (isPrime(value)) {
      primes.push(value);
    }
  }
  return primes;
}
function isPrime(value) {
  if (value < 2) {
    return false;
  }
  if (value === 2) {
    return true;
  }
  if (value % 2 === 0) {
    return false;
  }
  for (let divisor = 3; divisor * divisor <= value; divisor += 2) {
    if (value % divisor === 0) {
      return false;
    }
  }
  return true;
}
function createBaseNumber(request, base) {
  const count = parseCount(request.fields.count ?? "", 10, 100);
  const length = parseInteger(request.fields.length ?? "", 8, 1, 64);
  const includePrefix = parseBoolean(request.fields.prefix, true);
  const uppercase = base === 16 ? parseBoolean(request.fields.uppercase, true) : false;
  const unique = parseBoolean(request.fields.unique, false);
  const digits = base === 16 ? "0123456789abcdef" : "01234567";
  const prefix = includePrefix ? base === 16 ? "0x" : "0o" : "";
  const values = unique ? createUniqueBaseNumbers({ count, digits, length, prefix, uppercase }) : Array.from({ length: count }, () => createBaseNumberValue({ digits, length, prefix, uppercase }));
  return singleOrList(values);
}
function createUniqueBaseNumbers({
  count,
  digits,
  length,
  prefix,
  uppercase
}) {
  const values = /* @__PURE__ */ new Set();
  let attempts = 0;
  while (values.size < count && attempts < count * 30) {
    values.add(createBaseNumberValue({ digits, length, prefix, uppercase }));
    attempts += 1;
  }
  return [...values];
}
function createBaseNumberValue({
  digits,
  length,
  prefix,
  uppercase
}) {
  const value = randomCharacters(digits, length);
  return `${prefix}${uppercase ? value.toUpperCase() : value}`;
}
function createFraction(request) {
  const count = parseCount(request.fields.count ?? "", 1, 100);
  const values = Array.from({ length: count }, () => createFractionRecord(request));
  return singleOrList(values);
}
function createFractionRecord(request) {
  const type = parseFractionType(request.fields.type);
  const shouldSimplify = request.fields.simplify !== "no";
  const maxNumerator = parseInteger(request.fields.maxNumerator ?? "", 12, 1, 1e4);
  const maxDenominator = parseInteger(request.fields.maxDenominator ?? "", 12, 2, 1e4);
  const raw = createRawFraction(type, maxNumerator, maxDenominator);
  const reduced = shouldSimplify ? simplifyFraction(raw.numerator, raw.denominator) : raw;
  const mixed = toMixedNumber(reduced.numerator, reduced.denominator);
  return {
    decimal: `${reduced.numerator / reduced.denominator}`,
    denominator: `${reduced.denominator}`,
    fraction: `${reduced.numerator}/${reduced.denominator}`,
    mixed: formatMixedNumber(mixed),
    numerator: `${reduced.numerator}`,
    simplified: shouldSimplify ? "yes" : "no",
    type
  };
}
function parseFractionType(value) {
  if (value === "improper" || value === "mixed") {
    return value;
  }
  return "proper";
}
function createRawFraction(type, maxNumerator, maxDenominator) {
  if (type === "proper") {
    const denominator2 = randomIntegerInRange(maxDenominator - 1) + 2;
    return {
      denominator: denominator2,
      numerator: randomIntegerInRange(Math.min(maxNumerator, denominator2 - 1)) + 1
    };
  }
  if (type === "mixed") {
    const denominator2 = randomIntegerInRange(maxDenominator - 1) + 2;
    const whole = randomIntegerInRange(maxNumerator) + 1;
    const numerator2 = randomIntegerInRange(denominator2 - 1) + 1;
    return {
      denominator: denominator2,
      numerator: whole * denominator2 + numerator2
    };
  }
  const denominator = randomIntegerInRange(maxDenominator - 1) + 2;
  const numeratorMax = Math.max(maxNumerator, denominator);
  const numerator = denominator + randomIntegerInRange(numeratorMax - denominator + 1);
  return { denominator, numerator };
}
function simplifyFraction(numerator, denominator) {
  const divisor = greatestCommonDivisor(numerator, denominator);
  return {
    denominator: denominator / divisor,
    numerator: numerator / divisor
  };
}
function toMixedNumber(numerator, denominator) {
  return {
    denominator,
    numerator: numerator % denominator,
    whole: Math.floor(numerator / denominator)
  };
}
function formatMixedNumber(value) {
  if (value.whole === 0) {
    return `${value.numerator}/${value.denominator}`;
  }
  if (value.numerator === 0) {
    return `${value.whole}`;
  }
  return `${value.whole} ${value.numerator}/${value.denominator}`;
}
function greatestCommonDivisor(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a || 1;
}
const PERSON_LOCALES = ["en_GB", "en_US", "fr_FR", "es_ES", "it_IT", "de_DE", "pt_PT", "nl_NL", "pl_PL"];
const GENDERS = ["male", "female"];
const DIGITS = "0123456789";
const FIRST_NAMES = {
  female: ["Ada", "Amara", "Bea", "Dina", "Grace", "Iris", "Lena", "Nia", "Rae", "Sofia"],
  male: ["Caleb", "Eli", "Jules", "Kai", "Milo", "Owen", "Sam", "Theo", "Luca", "Noah"]
};
const LAST_NAMES = ["Archer", "Blake", "Chen", "Diaz", "Ellis", "Foster", "Grant", "Hale", "Ito", "Jones", "Khan", "Lee", "Moore", "Nguyen", "Patel", "Stone"];
const STREETS = ["Arcade Road", "Beacon Street", "Circuit Lane", "Foundry Avenue", "Harbour Way", "Signal Street", "Vector Close", "Wave Terrace"];
const JOB_TITLES = ["Software Engineer", "Product Manager", "Design Lead", "QA Analyst", "Data Engineer", "Operations Manager", "Support Specialist", "Marketing Manager"];
const COMPANIES = ["Arc Labs", "Beacon Works", "Circuit Studio", "Foundry Systems", "Signal Dynamics", "Vector Analytics"];
const CITIES_BY_LOCALE = {
  en_GB: ["Aberdeen", "Belfast", "Birmingham", "Bristol", "Cardiff", "Edinburgh", "Glasgow", "Leeds", "Liverpool", "London", "Manchester", "Newcastle upon Tyne", "Nottingham", "Sheffield", "Southampton", "Swansea", "Bournemouth", "Bristol", "Bath", "Coventry", "Nottingham", "Leicester", "Liverpool", "Cambridge", "Oxford"],
  de_DE: ["Aachen", "Berlin", "Bielefeld", "Bochum", "Bonn", "Braunschweig", "Bremen", "Cologne", "Dresden", "Düsseldorf", "Dortmund", "Duisburg", "Frankfurt", "Freiburg", "Hamburg", "Hannover", "Karlsruhe", "Leipzig", "Mannheim", "Munich", "Nuremberg", "Stuttgart", "Wiesbaden", "Wuppertal", "Kiel", "Essen"],
  en_US: ["Austin", "Boston", "Chicago", "Denver", "Detroit", "Fort Worth", "Houston", "Indianapolis", "Jacksonville", "Los Angeles", "Miami", "New York", "Nashville", "Orlando", "Philadelphia", "Phoenix", "Portland", "Raleigh", "San Diego", "San Francisco", "Seattle", "San Antonio", "San Jose", "Charlotte", "Atlanta", "Las Vegas"],
  fr_FR: ["Bordeaux", "Le Havre", "Lille", "Lyon", "Marseille", "Nantes", "Nice", "Paris", "Reims", "Rennes", "Rouen", "Saint-Étienne", "Strasbourg", "Toulouse", "Toulon", "Grenoble", "Montpellier", "Dijon", "Nîmes", "Limoges", "Angers"],
  es_ES: ["Alicante", "Bilbao", "Burgos", "Gijón", "Granada", "Madrid", "Málaga", "Murcia", "Palma", "Seville", "Salamanca", "Santander", "Santiago de Compostela", "Toledo", "Valencia", "Zaragoza", "Vitoria-Gasteiz", "Córdoba", "Oviedo", "Valladolid", "A Coruña", "León"],
  it_IT: ["Bari", "Bologna", "Catania", "Florence", "Genoa", "Milan", "Naples", "Palermo", "Padua", "Parma", "Rome", "Turin", "Venice", "Verona", "Trieste", "Brescia", "Reggio Calabria", "Modena", "Siena", "Pisa", "Vicenza"],
  nl_NL: ["Amersfoort", "Amsterdam", "Arnhem", "Breda", "Eindhoven", "Enschede", "Groningen", "Haarlem", "Leeuwarden", "Maastricht", "Nijmegen", "Utrecht", "Rotterdam", "The Hague", "Tilburg", "Almere", "Zwolle", "Apeldoorn", "Delft", "Breda", "Venlo"],
  pl_PL: ["Białystok", "Bydgoszcz", "Gdańsk", "Katowice", "Kraków", "Lublin", "Łódź", "Łódź", "Poznań", "Rzeszów", "Szczecin", "Torun", "Warsaw", "Wrocław", "Zabrze", "Bydgoszcz", "Częstochowa", "Gdynia", "Opole", "Olsztyn", "Poznań"],
  pt_PT: ["Aveiro", "Coimbra", "Faro", "Funchal", "Guimarães", "Lisbon", "Madeira", "Porto", "Setúbal", "Sintra", "Vila Nova de Gaia", "Braga", "Évora", "Leiria", "Viseu", "Ponta Delgada", "Coimbra", "Covilhã", "Évora", "Faro", "Tomar"]
};
const LOCALE_DATA = {
  en_GB: { country: "United Kingdom", countryCode: "GB", phoneCode: "44", postCode: () => `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 2)}${randomIntegerInRange(90) + 10} ${randomCharacters(DIGITS, 1)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 2)}`, state: () => randomChoice(["ENG", "NIR", "SCT", "WAL"]), taxId: () => `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 2)}${randomIntegerInRange(1e7)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 1)}` },
  de_DE: { country: "Germany", countryCode: "DE", phoneCode: "49", postCode: () => randomCharacters(DIGITS, 5), state: () => randomChoice(["BE", "BY", "HH", "HE", "NW"]), taxId: () => `${randomCharacters(DIGITS, 11)}` },
  en_US: { country: "United States", countryCode: "US", phoneCode: "1", postCode: () => `${randomIntegerInRange(9e4) + 1e4}`, state: () => randomChoice(["CA", "IL", "NY", "OR", "TX", "WA"]), taxId: () => `${randomCharacters(DIGITS, 3)}-${randomCharacters(DIGITS, 2)}-${randomCharacters(DIGITS, 4)}` },
  es_ES: { country: "Spain", countryCode: "ES", phoneCode: "34", postCode: () => randomCharacters(DIGITS, 5), state: () => randomChoice(["AN", "CT", "MD", "VC", "PV"]), taxId: () => `${randomCharacters(DIGITS, 8)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 1)}` },
  fr_FR: { country: "France", countryCode: "FR", phoneCode: "33", postCode: () => randomCharacters(DIGITS, 5), state: () => randomChoice(["IDF", "NAQ", "ARA", "OCC", "PAC"]), taxId: () => `${randomCharacters(DIGITS, 13)}` },
  it_IT: { country: "Italy", countryCode: "IT", phoneCode: "39", postCode: () => randomCharacters(DIGITS, 5), state: () => randomChoice(["LAZ", "LOM", "PIE", "TOS", "VEN"]), taxId: () => `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6)}${randomCharacters(DIGITS, 2)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 1)}${randomCharacters(DIGITS, 2)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 1)}${randomCharacters(DIGITS, 3)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 1)}` },
  nl_NL: { country: "Netherlands", countryCode: "NL", phoneCode: "31", postCode: () => `${randomIntegerInRange(9e3) + 1e3} ${randomCharacters("ABCDEFGHJKLMNPQRSTUVWXYZ", 2)}`, state: () => randomChoice(["NH", "ZH", "UT", "GE", "NB"]), taxId: () => `${randomCharacters(DIGITS, 9)}` },
  pl_PL: { country: "Poland", countryCode: "PL", phoneCode: "48", postCode: () => `${randomIntegerInRange(90) + 10}-${String(randomIntegerInRange(1e3)).padStart(3, "0")}`, state: () => randomChoice(["DS", "MA", "MZ", "PM", "WP"]), taxId: () => `${randomCharacters(DIGITS, 10)}` },
  pt_PT: { country: "Portugal", countryCode: "PT", phoneCode: "351", postCode: () => `${randomIntegerInRange(9e3) + 1e3}-${String(randomIntegerInRange(1e3)).padStart(3, "0")}`, state: () => randomChoice(["LX", "PT", "BR", "AV", "FA"]), taxId: () => `${randomCharacters(DIGITS, 9)}` }
};
function createPeopleResult(generator, request) {
  switch (generator.id) {
    case "person":
      return fieldsResult(generator, request.input, createPeople(request));
    default:
      return void 0;
  }
}
function createPeople(request) {
  const count = parseCount(request.fields.count ?? "", 1, 100);
  return singleOrList(Array.from({ length: count }, () => createPerson(request)));
}
function createPerson(request) {
  const locale = parseLocale(request.fields.locale);
  const localeData = LOCALE_DATA[locale];
  const gender = parseGender(request.fields.gender);
  const firstName = randomChoice(FIRST_NAMES[gender]);
  const lastName = randomChoice(LAST_NAMES);
  const fullName = `${firstName} ${lastName}`;
  const age = createAge(request);
  const birthDate = createBirthDate(age);
  const username = `${slugify(fullName)}${randomCharacters(DIGITS, 3)}`;
  const person = {
    address: `${randomIntegerInRange(190) + 10} ${randomChoice(STREETS)}`,
    age: `${age}`,
    birthDate,
    city: randomChoice(citiesFor(locale)),
    country: localeData.country,
    email: `${username}@example.com`,
    firstName,
    gender,
    lastName,
    latitude: randomCoordinate(-90, 90),
    longitude: randomCoordinate(-180, 180),
    name: fullName,
    phone: createPhone(localeData),
    postCode: localeData.postCode(),
    secondaryAddress: randomChoice(["Apt 4B", "Suite 12", "Unit 8", ""]),
    ssn: localeData.taxId(),
    state: localeData.state(),
    title: titleFor(gender),
    username
  };
  return {
    ...person,
    ...parseBoolean(request.fields.includeFinancial ?? request.fields.include_financial, true) ? createFinancialData(localeData.countryCode) : {},
    ...parseBoolean(request.fields.includeProfessional ?? request.fields.include_professional, true) ? createProfessionalData() : {}
  };
}
function createAge(request) {
  const minAge = parseInteger(request.fields.ageMin ?? request.fields.age_min ?? request.fields.minAge ?? "", 18, 1, 120);
  const maxAge = parseInteger(request.fields.ageMax ?? request.fields.age_max ?? request.fields.maxAge ?? "", 80, 1, 120);
  const lower = Math.min(minAge, maxAge);
  const upper = Math.max(minAge, maxAge);
  return lower + randomIntegerInRange(upper - lower + 1);
}
function createBirthDate(age) {
  const date = /* @__PURE__ */ new Date();
  date.setUTCFullYear(date.getUTCFullYear() - age);
  date.setUTCMonth(randomIntegerInRange(12));
  date.setUTCDate(randomIntegerInRange(28) + 1);
  return date.toISOString().slice(0, 10);
}
function createFinancialData(countryCode) {
  const card = createCreditCard();
  return {
    bankAccount: randomCharacters(DIGITS, 8),
    creditCardExpiration: `${String(randomIntegerInRange(12) + 1).padStart(2, "0")}/${randomIntegerInRange(6) + 27}`,
    creditCardNumber: card.number,
    creditCardType: card.type,
    iban: createIban(countryCode),
    swiftBic: `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 4)}${countryCode}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 2)}XXX`
  };
}
function createProfessionalData() {
  return {
    company: randomChoice(COMPANIES),
    jobTitle: randomChoice(JOB_TITLES)
  };
}
function createCreditCard() {
  const type = randomChoice(["Visa", "Mastercard", "American Express"]);
  const prefix = type === "American Express" ? randomChoice(["34", "37"]) : type === "Mastercard" ? `${randomIntegerInRange(5) + 51}` : "4";
  const length = type === "American Express" ? 15 : 16;
  const body = `${prefix}${randomCharacters(DIGITS, length - prefix.length - 1)}`;
  return {
    number: `${body}${luhnCheckDigit(body)}`,
    type
  };
}
function createIban(countryCode) {
  const ibanCountry = normaliseIbanCountry(countryCode);
  const bban = createBban(ibanCountry);
  return `${ibanCountry}${ibanCheckDigits(ibanCountry, bban)}${bban}`;
}
function normaliseIbanCountry(countryCode) {
  switch (countryCode) {
    case "DE":
    case "ES":
    case "FR":
    case "GB":
    case "IT":
    case "NL":
      return countryCode;
    default:
      return "GB";
  }
}
function createBban(countryCode) {
  switch (countryCode) {
    case "DE":
      return randomCharacters(DIGITS, 18);
    case "ES":
      return randomCharacters(DIGITS, 20);
    case "FR":
      return `${randomCharacters(DIGITS, 10)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 11)}${randomCharacters(DIGITS, 2)}`;
    case "GB":
      return `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 4)}${randomCharacters(DIGITS, 14)}`;
    case "IT":
      return `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 1)}${randomCharacters(DIGITS, 10)}${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 12)}`;
    case "NL":
      return `${randomCharacters("ABCDEFGHIJKLMNOPQRSTUVWXYZ", 4)}${randomCharacters(DIGITS, 10)}`;
  }
}
function ibanCheckDigits(countryCode, bban) {
  const rearranged = `${bban}${countryCode}00`;
  const numeric = rearranged.split("").map((character) => {
    const code = character.charCodeAt(0);
    return code >= 65 && code <= 90 ? `${code - 55}` : character;
  }).join("");
  let remainder = 0;
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number.parseInt(digit, 10)) % 97;
  }
  return String(98 - remainder).padStart(2, "0");
}
function luhnCheckDigit(body) {
  const sum = body.split("").reverse().reduce((total, character, index2) => {
    let digit = Number.parseInt(character, 10);
    if (index2 % 2 === 0) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    return total + digit;
  }, 0);
  return `${(10 - sum % 10) % 10}`;
}
function createPhone(localeData) {
  return `+${localeData.phoneCode} ${randomCharacters(DIGITS, 3)} ${randomCharacters(DIGITS, 3)} ${randomCharacters(DIGITS, 4)}`;
}
function citiesFor(locale) {
  return CITIES_BY_LOCALE[locale];
}
function parseGender(input) {
  const normalised = input?.trim().toLowerCase();
  const gender = GENDERS.find((option) => option === normalised);
  return gender ?? randomChoice(GENDERS);
}
function parseLocale(input) {
  const normalised = input?.trim();
  return PERSON_LOCALES.find((option) => option === normalised) ?? "en_GB";
}
function randomCoordinate(min, max) {
  return (min + randomIntegerInRange(1e6) / 1e6 * (max - min)).toFixed(6);
}
function titleFor(gender) {
  return gender === "male" ? randomChoice(["Mr.", "Dr.", "Prof."]) : randomChoice(["Ms.", "Mrs.", "Dr.", "Prof."]);
}
function createProductResult(generator, request) {
  const { input } = request;
  switch (generator.id) {
    case "utm":
      return textResult(generator, input, createUtmLink(request));
    default:
      return void 0;
  }
}
function createUtmLink(request) {
  let url;
  const input = primaryValueFor(request, "url", "https://nicholasgriffin.dev/");
  try {
    url = new URL(input);
  } catch {
    try {
      url = new URL(`https://${input}`);
    } catch {
      url = new URL("https://nicholasgriffin.dev/");
    }
  }
  url.searchParams.set("utm_source", fieldValueFor(request, "source", "pashi"));
  url.searchParams.set("utm_medium", fieldValueFor(request, "medium", "generate"));
  url.searchParams.set(
    "utm_campaign",
    slugify(fieldValueFor(request, "campaign", url.hostname.replace(/^www\./, ""))) || "campaign"
  );
  return url.toString();
}
function primaryValueFor(request, key, fallback) {
  return request.fields[key]?.trim() || request.input || fallback;
}
function fieldValueFor(request, key, fallback) {
  return request.fields[key]?.trim() || fallback;
}
const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const NUMERIC = "0123456789";
function arrayBufferToPem(label, value) {
  const base64 = bytesToBase64$1(new Uint8Array(value));
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----
${lines.join("\n")}
-----END ${label}-----`;
}
function requireCryptoKeyPair(value) {
  if ("privateKey" in value && "publicKey" in value) {
    return value;
  }
  throw new Error("Key generation did not return a key pair.");
}
function requireArrayBuffer(value) {
  if (value instanceof ArrayBuffer) {
    return value;
  }
  throw new Error("Key export did not return binary key material.");
}
function requireJsonWebKey(value) {
  if (!(value instanceof ArrayBuffer)) {
    return value;
  }
  throw new Error("Key export did not return JSON key material.");
}
function createRandomToken(format, length) {
  switch (format) {
    case "alphanumeric":
      return randomCharacters(ALPHANUMERIC, length);
    case "base64":
      return encodedToken(length, (bytes2) => bytesToBase64$1(bytes2).replace(/=+$/, ""));
    case "base64url":
      return encodedToken(length, bytesToBase64Url);
    case "hex":
      return randomHex(length).toUpperCase();
    case "numeric":
      return randomCharacters(NUMERIC, length);
    case "uuid":
      return crypto.randomUUID();
  }
}
function encodedToken(length, encode) {
  let value = "";
  while (value.length < length) {
    value += encode(randomBytes(Math.ceil(length * 0.75) + 2));
  }
  return value.slice(0, length);
}
const HASH_ALGORITHMS = ["md5", "sha1", "sha256", "sha512"];
const HASH_METADATA = {
  md5: {
    bits: "128",
    description: "MD5 128-bit digest",
    hexLength: "32",
    webCryptoName: "MD5"
  },
  sha1: {
    bits: "160",
    description: "Secure Hash Algorithm 1 160-bit digest",
    hexLength: "40",
    webCryptoName: "SHA-1"
  },
  sha256: {
    bits: "256",
    description: "Secure Hash Algorithm 256-bit digest",
    hexLength: "64",
    webCryptoName: "SHA-256"
  },
  sha512: {
    bits: "512",
    description: "Secure Hash Algorithm 512-bit digest",
    hexLength: "128",
    webCryptoName: "SHA-512"
  }
};
async function createHashes(request) {
  const algorithm = parseChoice(request.fields.algorithm, HASH_ALGORITHMS, "sha256");
  const includeInput = parseBoolean(request.fields.includeInput ?? request.fields.include_input, false);
  const uppercase = parseBoolean(request.fields.uppercase, false);
  const input = request.fields.value?.trim() || request.fields.input?.trim() || request.input;
  const count = parseCount(request.fields.count ?? "", 1, 25);
  const metadata = HASH_METADATA[algorithm];
  const records = await Promise.all(
    Array.from({ length: count }, async () => {
      const value = input || bytesToBase64Url(randomBytes(32));
      const digest = await createDigest(value, metadata.webCryptoName);
      const hash = uppercase ? digest.toUpperCase() : digest;
      const record = {
        algorithm: algorithm.toUpperCase(),
        bits: metadata.bits,
        description: metadata.description,
        hash,
        hexLength: metadata.hexLength
      };
      return includeInput ? { ...record, input: value } : record;
    })
  );
  return singleOrList(records);
}
const JWT_ALGORITHMS = ["HS256", "HS384", "HS512", "RS256", "RS384", "RS512"];
async function createJwtTokens(request) {
  const algorithm = parseChoice(request.fields.algorithm, JWT_ALGORITHMS, "HS256");
  const count = parseCount(request.fields.count ?? "", 1, 10);
  const tokens = await Promise.all(
    Array.from({ length: count }, () => createJwtToken(request, algorithm))
  );
  return singleOrList(tokens);
}
async function createJwtToken(request, algorithm) {
  const issuedAt = Math.floor(Date.now() / 1e3);
  const expiresIn = parseInteger(request.fields.expiresIn ?? request.fields.expires_in ?? "", 3600, 60, 31536e3);
  const includeNbf = parseBoolean(request.fields.includeNbf ?? request.fields.include_nbf, false);
  const includeJti = parseBoolean(request.fields.includeJti ?? request.fields.include_jti, true);
  const header = { alg: algorithm, typ: "JWT" };
  const payload = {
    ...customClaims(request.fields.customClaims ?? request.fields.custom_claims),
    aud: request.fields.audience?.trim() || "https://api.example.com",
    exp: issuedAt + expiresIn,
    iat: issuedAt,
    iss: request.fields.issuer?.trim() || "pashi",
    ...includeJti ? { jti: crypto.randomUUID() } : {},
    ...includeNbf ? { nbf: issuedAt } : {},
    sub: request.fields.subject?.trim() || "user_123"
  };
  const tokenBody = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const signer = await createSigner(algorithm);
  const signature = await signer.sign(tokenBody);
  return {
    algorithm,
    expiresIn: `${expiresIn}`,
    header: JSON.stringify(header),
    payload: JSON.stringify(payload),
    signature,
    token: `${tokenBody}.${signature}`,
    ...signer.material
  };
}
async function createSigner(algorithm) {
  if (algorithm.startsWith("HS")) {
    const secret = randomBytes(32);
    return {
      material: {
        secret: bytesToBase64Url(secret)
      },
      sign: (tokenBody) => signHmac(tokenBody, secret, algorithm)
    };
  }
  const keyPair = requireCryptoKeyPair(await crypto.subtle.generateKey(
    {
      hash: hashNameFor(algorithm),
      modulusLength: 2048,
      name: "RSASSA-PKCS1-v1_5",
      publicExponent: new Uint8Array([1, 0, 1])
    },
    true,
    ["sign", "verify"]
  ));
  const [privateKey, publicKey] = await Promise.all([
    crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
    crypto.subtle.exportKey("spki", keyPair.publicKey)
  ]);
  return {
    material: {
      privateKey: arrayBufferToPem("PRIVATE KEY", requireArrayBuffer(privateKey)),
      publicKey: arrayBufferToPem("PUBLIC KEY", requireArrayBuffer(publicKey))
    },
    sign: (tokenBody) => signRsa(tokenBody, keyPair.privateKey)
  };
}
function customClaims(value) {
  if (!value?.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(value);
    return isPlainClaimObject(parsed) ? sanitizeClaimObject(parsed) : {};
  } catch {
    return {};
  }
}
function isPlainClaimObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function sanitizeClaimObject(value) {
  const claims = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!/^[a-zA-Z0-9_.:-]{1,64}$/.test(key)) {
      continue;
    }
    if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") {
      claims[key] = entry;
    }
  }
  return claims;
}
function base64UrlJson(value) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}
async function signHmac(value, secret, algorithm) {
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { hash: hashNameFor(algorithm), name: "HMAC" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}
async function signRsa(value, privateKey) {
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", privateKey, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signature));
}
function hashNameFor(algorithm) {
  switch (algorithm) {
    case "HS384":
    case "RS384":
      return "SHA-384";
    case "HS512":
    case "RS512":
      return "SHA-512";
    case "HS256":
    case "RS256":
      return "SHA-256";
  }
}
const KEY_ALGORITHMS = ["aes", "hmac", "rsa"];
const KEY_FORMATS = ["hex", "base64", "base64url", "pem"];
async function createEncryptionKeys(request) {
  const count = parseCount(request.fields.count ?? "", 1, 10);
  const keys = await Promise.all(Array.from({ length: count }, () => createEncryptionKey(request)));
  return singleOrList(keys);
}
async function createEncryptionKey(request) {
  const algorithm = parseChoice(request.fields.algorithm, KEY_ALGORITHMS, "aes");
  if (algorithm === "rsa") {
    return createRsaKeyPair(request);
  }
  return createSymmetricKey(request, algorithm);
}
function createSymmetricKey(request, algorithm) {
  const keySize = parseSymmetricKeySize(request, algorithm);
  const format = parseChoice(request.fields.format, KEY_FORMATS, "hex");
  const includeIv = parseBoolean(request.fields.includeIv ?? request.fields.include_iv, algorithm === "aes");
  const keyBytes = randomBytes(keySize / 8);
  const record = {
    algorithm: algorithm === "aes" ? `AES-${keySize}` : `HMAC-SHA-${keySize}`,
    bits: `${keySize}`,
    format: format === "pem" ? "base64" : format,
    key: encodeKeyMaterial(keyBytes, format === "pem" ? "base64" : format)
  };
  if (!includeIv) {
    return record;
  }
  const iv = randomBytes(algorithm === "aes" ? 16 : 32);
  return {
    ...record,
    iv: encodeKeyMaterial(iv, format === "pem" ? "base64" : format),
    ivBytes: `${iv.byteLength}`
  };
}
async function createRsaKeyPair(request) {
  const keySize = parseInteger(request.fields.keySize ?? request.fields.key_size ?? request.fields.bits ?? "", 2048, 2048, 4096);
  const generatedKey = await crypto.subtle.generateKey(
    {
      hash: "SHA-256",
      modulusLength: keySize,
      name: "RSASSA-PKCS1-v1_5",
      publicExponent: new Uint8Array([1, 0, 1])
    },
    true,
    ["sign", "verify"]
  );
  const keyPair = requireCryptoKeyPair(generatedKey);
  const [privateKey, publicKey] = await Promise.all([
    crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
    crypto.subtle.exportKey("spki", keyPair.publicKey)
  ]);
  return {
    algorithm: `RSA-${keySize}`,
    bits: `${keySize}`,
    format: "pem",
    privateKey: arrayBufferToPem("PRIVATE KEY", requireArrayBuffer(privateKey)),
    publicKey: arrayBufferToPem("PUBLIC KEY", requireArrayBuffer(publicKey))
  };
}
function parseSymmetricKeySize(request, algorithm) {
  const fallback = algorithm === "aes" ? 256 : 512;
  const rawSize = parseInteger(request.fields.keySize ?? request.fields.key_size ?? request.fields.bits ?? "", fallback, 128, 512);
  if (algorithm === "aes") {
    return closestAllowedSize(rawSize, [128, 192, 256]);
  }
  return closestAllowedSize(rawSize, [256, 384, 512]);
}
function closestAllowedSize(value, allowedSizes) {
  return allowedSizes.reduce(
    (best, size) => Math.abs(size - value) < Math.abs(best - value) ? size : best
  );
}
function encodeKeyMaterial(bytes2, format) {
  switch (format) {
    case "base64":
      return bytesToBase64$1(bytes2);
    case "base64url":
      return bytesToBase64Url(bytes2);
    case "hex":
      return Array.from(bytes2, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
}
const SSH_KEY_TYPES = ["rsa"];
const SSH_KEY_FORMATS = ["pem", "both"];
async function createSshKeys(request) {
  const count = parseCount(request.fields.count ?? "", 1, 5);
  const keys = await Promise.all(Array.from({ length: count }, () => createSshKey(request)));
  return singleOrList(keys);
}
async function createSshKey(request) {
  const type = parseChoice(request.fields.type, SSH_KEY_TYPES, "rsa");
  const format = parseChoice(request.fields.format, SSH_KEY_FORMATS, "both");
  const passphrase = request.fields.passphrase?.trim();
  if (type !== "rsa") {
    throw new Error("Only RSA SSH keys are supported.");
  }
  if (passphrase) {
    throw new Error("Passphrase-protected SSH keys are not supported yet.");
  }
  const bits = parseSshKeyBits(request);
  const comment = sanitizeSshComment(request.fields.comment);
  const generatedKey = await crypto.subtle.generateKey(
    {
      hash: "SHA-256",
      modulusLength: bits,
      name: "RSASSA-PKCS1-v1_5",
      publicExponent: new Uint8Array([1, 0, 1])
    },
    true,
    ["sign", "verify"]
  );
  const keyPair = requireCryptoKeyPair(generatedKey);
  const [privateKey, publicKey, publicJwk] = await Promise.all([
    crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
    crypto.subtle.exportKey("spki", keyPair.publicKey),
    crypto.subtle.exportKey("jwk", keyPair.publicKey)
  ]);
  const publicBlob = createRsaSshPublicBlob(requireJsonWebKey(publicJwk));
  const authorizedKey = `ssh-rsa ${bytesToBase64$1(publicBlob)}${comment ? ` ${comment}` : ""}`;
  const fingerprint = await createSshFingerprint(publicBlob);
  const record = {
    authorizedKey,
    bits: `${bits}`,
    comment,
    fingerprint,
    format,
    passphraseProtected: "false",
    privateKeyPem: arrayBufferToPem("PRIVATE KEY", requireArrayBuffer(privateKey)),
    publicKeyPem: arrayBufferToPem("PUBLIC KEY", requireArrayBuffer(publicKey)),
    recommendedUse: bits === 4096 ? "Legacy systems, maximum RSA security" : "Development and test SSH authentication",
    type: "rsa"
  };
  if (format === "pem") {
    return {
      bits: record.bits,
      comment: record.comment,
      fingerprint: record.fingerprint,
      format: record.format,
      privateKeyPem: record.privateKeyPem,
      publicKeyPem: record.publicKeyPem,
      type: record.type
    };
  }
  return record;
}
function parseSshKeyBits(request) {
  const rawBits = parseInteger(request.fields.bits ?? request.fields.keySize ?? request.fields.key_size ?? "", 2048, 2048, 4096);
  return rawBits >= 4096 ? 4096 : 2048;
}
function sanitizeSshComment(value) {
  return (value ?? "pashi@localhost").replace(/[\r\n\t]+/g, " ").trim().slice(0, 120);
}
function createRsaSshPublicBlob(jwk) {
  if (jwk.kty !== "RSA" || !jwk.e || !jwk.n) {
    throw new Error("RSA public key export failed.");
  }
  return concatBytes$1([
    createSshString(new TextEncoder().encode("ssh-rsa")),
    createSshMpint(base64UrlToBytes(jwk.e)),
    createSshMpint(base64UrlToBytes(jwk.n))
  ]);
}
function createSshString(bytes2) {
  return concatBytes$1([uint32Bytes(bytes2.byteLength), bytes2]);
}
function createSshMpint(bytes2) {
  const stripped = stripLeadingZeroes(bytes2);
  const encoded = stripped[0] && stripped[0] >= 128 ? concatBytes$1([new Uint8Array([0]), stripped]) : stripped;
  return createSshString(encoded);
}
function stripLeadingZeroes(bytes2) {
  let offset = 0;
  while (offset < bytes2.length - 1 && bytes2[offset] === 0) {
    offset += 1;
  }
  return bytes2.slice(offset);
}
function uint32Bytes(value) {
  const bytes2 = new Uint8Array(4);
  const view = new DataView(bytes2.buffer);
  view.setUint32(0, value, false);
  return bytes2;
}
async function createSshFingerprint(publicBlob) {
  const digest = await crypto.subtle.digest("SHA-256", publicBlob);
  return `SHA256:${bytesToBase64$1(new Uint8Array(digest)).replace(/=+$/, "")}`;
}
const OAUTH_TOKEN_FORMATS = ["base64", "base64url", "hex", "alphanumeric"];
const OAUTH_TOKEN_TYPES = ["bearer", "mac", "basic"];
const SALT_ENCODINGS = ["base64", "base64url", "hex", "alphanumeric"];
const WEBHOOK_SECRET_ALGORITHMS = ["sha256", "sha384", "sha512"];
const WEBHOOK_SECRET_FORMATS = ["hex", "base64", "alphanumeric"];
function createOauthTokens(request) {
  const count = parseCount(request.fields.count ?? "", 1, 10);
  const format = parseChoice(request.fields.format, OAUTH_TOKEN_FORMATS, "base64url");
  const tokenType = parseChoice(request.fields.tokenType ?? request.fields.token_type, OAUTH_TOKEN_TYPES, "bearer");
  const accessTokenLength = parseInteger(
    request.fields.accessTokenLength ?? request.fields.access_token_length ?? request.fields.length ?? request.input,
    64,
    32,
    256
  );
  const refreshTokenLength = parseInteger(
    request.fields.refreshTokenLength ?? request.fields.refresh_token_length ?? "",
    128,
    32,
    256
  );
  const expiresIn = parseInteger(request.fields.expiresIn ?? request.fields.expires_in ?? "", 3600, 300, 86400);
  const scope = sanitizeScope(request.fields.scope ?? "read write");
  const includeRefresh = parseBoolean(request.fields.includeRefresh ?? request.fields.include_refresh, true);
  return singleOrList(
    Array.from({ length: count }, () => {
      const token = {
        accessToken: createFormattedToken(format, accessTokenLength),
        expiresIn: `${expiresIn}`,
        scope,
        tokenType: formatTokenType(tokenType)
      };
      if (!includeRefresh) {
        return token;
      }
      return {
        ...token,
        refreshToken: createFormattedToken(format, refreshTokenLength)
      };
    })
  );
}
function createSalts(request) {
  const count = parseCount(request.fields.count ?? "", 1, 25);
  const length = parseInteger(request.fields.length ?? request.input, 32, 8, 128);
  const encoding = parseChoice(request.fields.encoding, SALT_ENCODINGS, "base64");
  const includeLength = parseBoolean(request.fields.includeLength ?? request.fields.include_length, false);
  return singleOrList(
    Array.from({ length: count }, () => {
      const salt = {
        encoding,
        salt: createFormattedToken(encoding, length)
      };
      return includeLength ? { ...salt, length: `${length}` } : salt;
    })
  );
}
async function createWebhookSecrets(request) {
  const count = parseCount(request.fields.count ?? "", 1, 10);
  const length = parseInteger(request.fields.length ?? request.input, 32, 16, 64);
  const algorithm = parseChoice(request.fields.algorithm, WEBHOOK_SECRET_ALGORITHMS, "sha256");
  const format = parseChoice(request.fields.format, WEBHOOK_SECRET_FORMATS, "hex");
  const includeExample = parseBoolean(request.fields.includeExample ?? request.fields.include_example, true);
  const includeTimestamp = parseBoolean(request.fields.includeTimestamp ?? request.fields.include_timestamp, false);
  const secrets = await Promise.all(
    Array.from({ length: count }, async () => {
      const secret = createFormattedToken(format, length);
      const webhookSecret = {
        algorithm: hmacLabel(algorithm),
        format,
        secret
      };
      if (!includeExample) {
        return webhookSecret;
      }
      const timestamp = `${Math.floor(Date.now() / 1e3)}`;
      const payload = JSON.stringify({
        data: {
          object: "checkout.session",
          status: "complete"
        },
        event: "payment.completed",
        id: `evt_${createRandomToken("alphanumeric", 16)}`
      });
      const signedPayload = includeTimestamp ? `${timestamp}.${payload}` : payload;
      const signature = await signHmacHex(signedPayload, secret, algorithm);
      return {
        ...webhookSecret,
        payload,
        signature: `${algorithm}=${signature}`,
        signatureHeader: `X-Webhook-Signature: ${algorithm}=${signature}`,
        ...includeTimestamp ? { timestamp, timestampHeader: `X-Webhook-Timestamp: ${timestamp}` } : {}
      };
    })
  );
  return singleOrList(secrets);
}
function createFormattedToken(format, length) {
  const token = createRandomToken(format, length);
  return format === "hex" ? token.toLowerCase() : token;
}
function formatTokenType(tokenType) {
  switch (tokenType) {
    case "basic":
      return "Basic";
    case "bearer":
      return "Bearer";
    case "mac":
      return "MAC";
  }
}
function hmacHashName(algorithm) {
  switch (algorithm) {
    case "sha256":
      return "SHA-256";
    case "sha384":
      return "SHA-384";
    case "sha512":
      return "SHA-512";
  }
}
function hmacLabel(algorithm) {
  return `HMAC-${hmacHashName(algorithm)}`;
}
async function signHmacHex(value, secret, algorithm) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: hmacHashName(algorithm), name: "HMAC" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function sanitizeScope(value) {
  return value.split(/\s+/).map((scope) => scope.replace(/[^a-zA-Z0-9:._/-]/g, "")).filter(Boolean).join(" ").slice(0, 240);
}
const API_TOKEN_FORMATS = ["alphanumeric", "hex", "base64", "base64url"];
const API_KEY_FORMATS = ["alphanumeric", "hex", "base64", "base64url", "uuid", "numeric"];
const PASSWORD_CHARSETS = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
};
const SIMILAR_PASSWORD_CHARACTERS = /[il1ILo0O]/g;
const PIN_DIGITS = "0123456789";
async function createSecurityResult(generator, request) {
  switch (generator.id) {
    case "api-key":
      return fieldsResult(generator, request.input, createApiKeys(request));
    case "api-token":
      return textResult(generator, request.input, createApiTokens(request));
    case "bearer-token":
      return textResult(generator, request.input, createBearerTokens(request));
    case "encryption-key":
      return fieldsResult(generator, request.input, await createEncryptionKeys(request));
    case "hash":
      return fieldsResult(generator, request.input, await createHashes(request));
    case "jwt-token":
      return fieldsResult(generator, request.input, await createJwtTokens(request));
    case "oauth-token":
      return fieldsResult(generator, request.input, createOauthTokens(request));
    case "password":
      return textResult(generator, request.input, createPasswords(request));
    case "passphrase":
      return textResult(generator, request.input, createPassphrases(request));
    case "pin":
      return textResult(generator, request.input, createPins(request));
    case "port-number":
      return textResult(generator, request.input, createPortNumbers(request));
    case "salt":
      return fieldsResult(generator, request.input, createSalts(request));
    case "ssh-key":
      return fieldsResult(generator, request.input, await createSshKeys(request));
    case "webhook-secret":
      return fieldsResult(generator, request.input, await createWebhookSecrets(request));
    default:
      return void 0;
  }
}
function createApiKeys(request) {
  const count = parseCount(request.fields.count ?? "", 1, 25);
  const includeSecret = parseBoolean(request.fields.includeSecret ?? request.fields.include_secret, false);
  if (includeSecret) {
    const keyLength = parseInteger(request.fields.keyLength ?? request.fields.key_length ?? "", 32, 8, 128);
    const secretLength = parseInteger(request.fields.secretLength ?? request.fields.secret_length ?? "", 64, 16, 256);
    const keyPrefix = sanitizePrefix(request.fields.keyPrefix ?? request.fields.key_prefix ?? "key_", 20);
    const secretPrefix = sanitizePrefix(request.fields.secretPrefix ?? request.fields.secret_prefix ?? "secret_", 20);
    return singleOrList(
      Array.from({ length: count }, () => ({
        apiKey: `${keyPrefix}${createRandomToken("alphanumeric", keyLength)}`,
        apiSecret: `${secretPrefix}${createRandomToken("base64url", secretLength)}`,
        format: "key-secret",
        keyLength: `${keyLength}`,
        secretLength: `${secretLength}`
      }))
    );
  }
  const length = parseInteger(request.fields.length ?? request.input, 32, 8, 256);
  const format = parseChoice(request.fields.format, API_KEY_FORMATS, "alphanumeric");
  const prefix = sanitizePrefix(request.fields.prefix ?? "sk_", 20);
  return singleOrList(
    Array.from({ length: count }, () => ({
      apiKey: `${prefix}${createRandomToken(format, length)}`,
      format,
      length: `${format === "uuid" ? 36 : length}`
    }))
  );
}
function createApiTokens(request) {
  const count = parseCount(request.fields.count ?? "", 10, 25);
  const length = parseInteger(request.fields.length ?? "", 32, 16, 128);
  const format = parseChoice(request.fields.format, API_TOKEN_FORMATS, "alphanumeric");
  const prefix = sanitizePrefix(request.fields.prefix ?? "token_", 20);
  return singleOrList(
    Array.from({ length: count }, () => `${prefix}${createRandomToken(format, length)}`)
  );
}
function createPasswords(request) {
  const length = parseInteger(request.fields.length ?? request.input, 16, 4, 128);
  const count = parseCount(request.fields.count ?? "", 5, 25);
  const charsets = passwordCharsets(request);
  return singleOrList(Array.from({ length: count }, () => createPassword(length, charsets)));
}
function createPassphrases(request) {
  const wordCount = parseInteger(request.fields.wordCount ?? request.fields.word_count ?? request.input, 5, 3, 10);
  const count = parseCount(request.fields.count ?? "", 5, 25);
  const separator = sanitizeSeparator(request.fields.separator ?? "-");
  const capitalize = parseBoolean(request.fields.capitalize, false);
  const includeNumbers = parseBoolean(request.fields.includeNumbers ?? request.fields.include_numbers, false);
  return singleOrList(
    Array.from(
      { length: count },
      () => createPassphrase({
        capitalize,
        includeNumbers,
        separator,
        wordCount
      })
    )
  );
}
function createPins(request) {
  const length = parseInteger(request.fields.length ?? request.input, 4, 4, 8);
  const count = parseCount(request.fields.count ?? "", 10, 100);
  const options = {
    excludeRepeating: parseBoolean(request.fields.excludeRepeating ?? request.fields.exclude_repeating, false),
    excludeSequential: parseBoolean(request.fields.excludeSequential ?? request.fields.exclude_sequential, false),
    uniqueDigits: parseBoolean(request.fields.uniqueDigits ?? request.fields.unique_digits, false)
  };
  return singleOrList(Array.from({ length: count }, () => createPin(length, options)));
}
function createToken(request, fallbackBytes) {
  const bytes2 = parseInteger(request.fields.bytes ?? request.input, fallbackBytes, 8, 128);
  return bytesToBase64Url(randomBytes(bytes2));
}
function passwordCharsets(request) {
  const excludeSimilar = parseBoolean(request.fields.excludeSimilar, false);
  const customSymbols = request.fields.customSymbols?.trim().slice(0, 100) || PASSWORD_CHARSETS.symbols;
  const selected = [
    parseBoolean(request.fields.uppercase, true) ? PASSWORD_CHARSETS.uppercase : "",
    parseBoolean(request.fields.lowercase, true) ? PASSWORD_CHARSETS.lowercase : "",
    parseBoolean(request.fields.numbers, true) ? PASSWORD_CHARSETS.numbers : "",
    parseBoolean(request.fields.symbols, true) ? customSymbols : ""
  ].map((charset) => excludeSimilar ? charset.replace(SIMILAR_PASSWORD_CHARACTERS, "") : charset).filter(Boolean);
  return selected.length > 0 ? selected : [PASSWORD_CHARSETS.uppercase, PASSWORD_CHARSETS.lowercase, PASSWORD_CHARSETS.numbers];
}
function createPassword(length, charsets) {
  const requiredCharacters = charsets.map((charset) => randomChoice([...charset]));
  const allCharacters = charsets.join("");
  const remainingLength = Math.max(0, length - requiredCharacters.length);
  const remainingCharacters = Array.from({ length: remainingLength }, () => randomChoice([...allCharacters]));
  return shuffle([...requiredCharacters, ...remainingCharacters]).join("");
}
function createPassphrase({
  capitalize,
  includeNumbers,
  separator,
  wordCount
}) {
  const words2 = Array.from({ length: wordCount }, () => {
    const word = randomChoice(PASSPHRASE_WORDS);
    return capitalize ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word;
  });
  if (includeNumbers) {
    words2.push(`${randomIntegerBetween(10, 999)}`);
  }
  return words2.join(separator);
}
function createPin(length, options) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const pin = options.uniqueDigits ? createUniqueDigitPin(length) : randomCharacters(PIN_DIGITS, length);
    if (isAllowedPin(pin, options)) {
      return pin;
    }
  }
  throw new Error("Could not generate a PIN with the selected constraints.");
}
function createUniqueDigitPin(length) {
  return shuffle([...PIN_DIGITS]).slice(0, length).join("");
}
function isAllowedPin(pin, options) {
  if (options.excludeRepeating && new Set(pin).size === 1) {
    return false;
  }
  if (options.excludeSequential && isSequentialPin(pin)) {
    return false;
  }
  return !options.uniqueDigits || new Set(pin).size === pin.length;
}
function isSequentialPin(pin) {
  const digits = [...pin].map((digit) => Number.parseInt(digit, 10));
  const ascending = digits.every((digit, index2) => index2 === 0 || digit === digits[index2 - 1] + 1);
  const descending = digits.every((digit, index2) => index2 === 0 || digit === digits[index2 - 1] - 1);
  return ascending || descending;
}
function createBearerTokens(request) {
  const count = parseCount(request.fields.count ?? "", 1, 1e3);
  return singleOrList(Array.from({ length: count }, () => `Bearer ${createToken(request, 48)}`));
}
function createPortNumber(request) {
  const min = parseInteger(request.fields.min ?? "", 1024, 1, 65535);
  const max = parseInteger(request.fields.max ?? "", 65535, 1, 65535);
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return lower + randomIntegerInRange(upper - lower + 1);
}
function createPortNumbers(request) {
  const count = parseCount(request.fields.count ?? "", 1, 1e3);
  return singleOrList(Array.from({ length: count }, () => `${createPortNumber(request)}`));
}
function sanitizePrefix(value, maxLength) {
  return value.trim().replace(/[^a-zA-Z0-9._-]/g, "").slice(0, maxLength);
}
function sanitizeSeparator(value) {
  return value.slice(0, 5);
}
const STRING_TYPES = [
  "alphanumeric",
  "letters",
  "words",
  "sentences",
  "paragraphs",
  "hex",
  "base64",
  "binary",
  "lorem"
];
const LETTER_CASES = ["lower", "upper", "mixed"];
const ALPHABETS = {
  binary: "01",
  lower: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
};
const EMOJIS = [
  "⚡",
  "✨",
  "🌙",
  "🔥",
  "💿",
  "🧪",
  "🎲",
  "🎯",
  "🚀",
  "🛠️",
  "📦",
  "🔐",
  "🧠",
  "💾",
  "🪩",
  "🧩",
  "📡",
  "🎮",
  "🗡️",
  "🌀"
];
function createStringResult(generator, request) {
  switch (generator.id) {
    case "emoji":
      return textResult(generator, request.input, createEmojis(request));
    case "string":
      return textResult(generator, request.input, createStrings(request));
    default:
      return void 0;
  }
}
function createStrings(request) {
  const type = parseChoice(request.fields.type, STRING_TYPES, "alphanumeric");
  const count = parseCount(request.fields.count ?? "", 1, 100);
  return singleOrList(Array.from({ length: count }, () => createStringValue(type, request)));
}
function createStringValue(type, request) {
  switch (type) {
    case "alphanumeric":
      return randomCharacters(alphanumericAlphabet(request), parseInteger(request.fields.length ?? request.input, 32, 1, 1e3));
    case "base64":
      return bytesToBase64$1(randomBytes(parseInteger(request.fields.byteCount ?? "", 32, 1, 256)));
    case "binary":
      return randomCharacters(ALPHABETS.binary, parseInteger(request.fields.length ?? request.input, 32, 1, 1e3));
    case "hex":
      return randomHex(parseInteger(request.fields.length ?? request.input, 32, 1, 1e3));
    case "letters":
      return randomCharacters(letterAlphabet(parseChoice(request.fields.case, LETTER_CASES, "mixed")), parseInteger(request.fields.length ?? request.input, 32, 1, 1e3));
    case "lorem":
      return createParagraphs(LOREM_WORDS, parseInteger(request.fields.paragraphCount ?? "", 2, 1, 10), parseInteger(request.fields.sentenceCount ?? "", 3, 1, 20));
    case "paragraphs":
      return createParagraphs(TEXT_WORDS, parseInteger(request.fields.paragraphCount ?? "", 2, 1, 10), parseInteger(request.fields.sentenceCount ?? "", 3, 1, 20));
    case "sentences":
      return Array.from(
        { length: parseInteger(request.fields.sentenceCount ?? "", 3, 1, 20) },
        () => createSentence(TEXT_WORDS)
      ).join(" ");
    case "words":
      return Array.from(
        { length: parseInteger(request.fields.wordCount ?? request.input, 5, 1, 100) },
        () => randomChoice(TEXT_WORDS)
      ).join(" ");
  }
}
function createEmojis(request) {
  const count = parseInteger(request.fields.count ?? request.input, 6, 1, 100);
  const separator = request.fields.separator ?? "";
  return Array.from({ length: count }, () => randomChoice(EMOJIS)).join(separator);
}
function alphanumericAlphabet(request) {
  const uppercase = parseBoolean(request.fields.uppercase, true);
  const lowercase = parseBoolean(request.fields.lowercase, true);
  const numbers = parseBoolean(request.fields.numbers, true);
  const alphabet = [
    uppercase ? ALPHABETS.upper : "",
    lowercase ? ALPHABETS.lower : "",
    numbers ? ALPHABETS.numbers : ""
  ].join("");
  return alphabet || `${ALPHABETS.upper}${ALPHABETS.lower}${ALPHABETS.numbers}`;
}
function letterAlphabet(letterCase) {
  switch (letterCase) {
    case "lower":
      return ALPHABETS.lower;
    case "upper":
      return ALPHABETS.upper;
    case "mixed":
      return `${ALPHABETS.upper}${ALPHABETS.lower}`;
  }
}
function createParagraphs(words2, paragraphs, sentences2) {
  return Array.from(
    { length: paragraphs },
    () => Array.from({ length: sentences2 }, () => createSentence(words2)).join(" ")
  ).join("\n\n");
}
function createSentence(words2) {
  const wordCount = randomIntegerBetween(8, 16);
  const sentence = Array.from({ length: wordCount }, () => randomChoice(words2)).join(" ");
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}.`;
}
function createToolsResult(generator, request) {
  switch (generator.id) {
    case "list-randomizer":
      return textResult(generator, request.input, randomiseList(request).join("\n"));
    case "name-picker":
      return textResult(generator, request.input, pickListItem(request));
    case "secret-santa":
      return fieldsResult(generator, request.input, createSecretSanta(request));
    case "teams":
      return fieldsResult(generator, request.input, createTeams(request));
    case "yes-no":
      return textResult(generator, request.input, createYesNo(request));
    default:
      return void 0;
  }
}
function randomiseList(request) {
  const items = parseItems(request);
  return shuffle(items);
}
function createYesNo(request) {
  const yesWeight = parseInteger(request.fields.yesWeight ?? "", 50, 0, 100);
  return randomIntegerInRange(100) < yesWeight ? "Yes" : "No";
}
function pickListItem(request) {
  const items = parseItems(request);
  return items[randomIntegerInRange(items.length)];
}
function createTeams(request) {
  const members = shuffle(parseItems(request));
  const teamCount = parseInteger(request.fields.teams ?? "", 2, 2, Math.max(2, members.length));
  const teams = Array.from(
    { length: teamCount },
    (_, index2) => ({ members: [], name: `Team ${index2 + 1}` })
  );
  members.forEach((member, index2) => {
    teams[index2 % teams.length].members.push(member);
  });
  return Object.fromEntries(teams.map((team) => [team.name, team.members.join(", ")]));
}
function createSecretSanta(request) {
  const members = parseItems(request);
  if (members.length < 2) {
    throw new Error("Add at least two people.");
  }
  const donors = shuffle(members);
  const receivers = rotate(donors);
  return Object.fromEntries(donors.map((member, index2) => [member, receivers[index2]]));
}
function rotate(items) {
  return items.map((_, index2) => items[(index2 + 1) % items.length]);
}
function parseItems(request) {
  const items = parseDelimitedList(request.fields.items || request.input);
  if (items.length === 0) {
    throw new Error("Add at least one list item.");
  }
  return items;
}
const AI_MODE_VALUES = /* @__PURE__ */ new Set(["ai", "cloudflare-ai", "workers-ai"]);
const CONTROL_FIELD_IDS = /* @__PURE__ */ new Set(["ai", "mode"]);
function createGeneratorRequest(input, fields = {}) {
  return {
    fields,
    input: input.trim()
  };
}
function createGeneratorRequestFromSearchParams(params) {
  const input = params.get("input") ?? params.get("data") ?? "";
  const fields = Object.fromEntries(
    [...params.entries()].filter(([key]) => key !== "input" && key !== "data")
  );
  return createGeneratorRequest(input, fields);
}
function fieldValue(request, key, fallback = "") {
  return (request.fields[key] ?? fallback).trim();
}
function generatorDataFields(request) {
  return Object.fromEntries(
    Object.entries(request.fields).filter(([key]) => !CONTROL_FIELD_IDS.has(key))
  );
}
function usesAiMode(request) {
  const mode = fieldValue(request, "mode").toLowerCase();
  const ai = fieldValue(request, "ai").toLowerCase();
  return AI_MODE_VALUES.has(mode) || ai === "true" || ai === "1";
}
const AI_MODEL = "@cf/zai-org/glm-4.7-flash";
const MAX_FIELD_COUNT = 12;
const SYSTEM_PROMPT = [
  "You generate concise fake data for Pashi.",
  "Return only data that matches the supplied JSON schema.",
  "Every object value must be a string.",
  "Do not include markdown, commentary, secrets, or real personal data."
].join(" ");
const TEXT_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    meta: { type: "string", description: "Short status or count summary." },
    result: { type: "string", description: "Generated text output." }
  },
  required: ["meta", "result"]
};
const FIELDS_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    meta: { type: "string", description: "Short record count summary." },
    result: {
      type: "array",
      description: "Generated records with string values only.",
      minItems: 1,
      maxItems: MAX_FIELD_COUNT,
      items: {
        type: "object",
        additionalProperties: { type: "string" }
      }
    }
  },
  required: ["meta", "result"]
};
const PALETTE_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    meta: { type: "string", description: "Short colour count summary." },
    result: {
      type: "array",
      description: "CSS hex colours.",
      minItems: 1,
      maxItems: 12,
      items: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" }
    }
  },
  required: ["meta", "result"]
};
async function createAiResult(generator, request, ai) {
  if (!usesAiMode(request)) {
    return void 0;
  }
  if (!isAiSupportedResultKind(generator.result.kind)) {
    throw new Error("AI mode is not available for image generators.");
  }
  if (!ai) {
    throw new Error("AI mode is not configured.");
  }
  const output = await ai.run(AI_MODEL, {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: createPrompt(generator, request) }
    ],
    max_completion_tokens: 900,
    response_format: {
      type: "json_schema",
      json_schema: schemaFor(generator.result.kind)
    },
    temperature: 0.7
  });
  const payload = parseAiPayload(readAiContent(output));
  return {
    input: request.input,
    kind: generator.result.kind,
    label: generator.label,
    meta: payload.meta,
    result: payload.result,
    type: generator.id
  };
}
function createPrompt(generator, request) {
  return JSON.stringify({
    fields: generatorDataFields(request),
    generator: {
      description: generator.description,
      id: generator.id,
      label: generator.label,
      resultKind: generator.result.kind
    },
    input: request.input
  });
}
function isAiSupportedResultKind(kind) {
  return kind !== "image";
}
function schemaFor(kind) {
  switch (kind) {
    case "fields":
      return FIELDS_RESULT_SCHEMA;
    case "palette":
      return PALETTE_RESULT_SCHEMA;
    case "text":
      return TEXT_RESULT_SCHEMA;
  }
}
function parseAiPayload(value) {
  const payload = typeof value === "string" ? parseJson(value) : value;
  if (!isAiPayload(payload)) {
    throw new Error("AI returned an invalid payload.");
  }
  return payload;
}
function readAiContent(output) {
  if (isResponseOutput(output)) {
    return output.response;
  }
  if (isChatCompletionOutput(output)) {
    return output.choices[0]?.message.content;
  }
  if (typeof output === "string") {
    return output;
  }
  throw new Error("AI returned an empty result.");
}
function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error("AI returned invalid JSON.");
  }
}
function isAiPayload(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value) || !("meta" in value) || !("result" in value) || typeof value.meta !== "string") {
    return false;
  }
  return typeof value.result === "string" || isStringArray(value.result) || isStringRecord(value.result) || isStringRecordArray(value.result);
}
function isResponseOutput(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "response" in value;
}
function isChatCompletionOutput(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "choices" in value && Array.isArray(value.choices);
}
async function createJsonResult(generator, request, env) {
  const aiResult = await createAiResult(generator, request, env?.AI);
  if (aiResult) {
    return aiResult;
  }
  const engineeringResult = await createEngineeringResult(generator, request);
  if (engineeringResult) {
    return engineeringResult;
  }
  const securityResult = await createSecurityResult(generator, request);
  if (securityResult) {
    return securityResult;
  }
  const result = createDateResult(generator, request) ?? createCssResult(generator, request) ?? createChartResult(generator, request) ?? createDeveloperResult(generator, request) ?? createDesignResult(generator, request) ?? createGamingResult(generator, request) ?? createIdentifierResult(generator, request) ?? createNumberResult(generator, request) ?? createPeopleResult(generator, request) ?? createProductResult(generator, request) ?? createStringResult(generator, request) ?? createToolsResult(generator, request);
  if (!result) {
    throw new Error("Unknown generator type.");
  }
  return result;
}
async function createExportResponse(type, format, request, env) {
  const generator = findGenerator(type);
  if (!generator) {
    return json({ error: "Unknown generator type." }, 404);
  }
  if (generator.result.kind === "image") {
    return json({ error: "Image generators are exported from their image endpoint." }, 400);
  }
  if (!isExportFormat(format)) {
    return json({ error: "Unsupported export format." }, 400);
  }
  if (usesAiMode(request) && (!env || !createFeatureStatus(env).ai.available)) {
    return json({ error: "AI mode is not available." }, 503);
  }
  try {
    const result = await createJsonResult(generator, request, env?.AI ? { AI: env.AI } : void 0);
    return new Response(formatExportResult(result, format), {
      headers: {
        "Content-Disposition": `attachment; filename="${safeFilename(type)}.${format}"`,
        "Content-Type": contentTypeFor(format),
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Export failed." },
      400
    );
  }
}
function formatExportResult(result, format) {
  if (format === "json") {
    return JSON.stringify(result, null, 2);
  }
  if (format === "csv") {
    return formatCsv(result.result);
  }
  return formatText(result);
}
function formatCsv(value) {
  if (typeof value === "string") {
    return `${csvRow(["value"])}
${csvRow([value])}
`;
  }
  if (Array.isArray(value)) {
    if (isRecordArray(value)) {
      const columns = uniqueKeys(value);
      return [
        csvRow(columns),
        ...value.map((record) => csvRow(columns.map((column) => record[column] ?? "")))
      ].join("\n").concat("\n");
    }
    return [
      csvRow(["index", "value"]),
      ...value.map((item, index2) => csvRow([`${index2 + 1}`, item]))
    ].join("\n").concat("\n");
  }
  const entries = Object.entries(value);
  return [
    csvRow(entries.map(([key]) => key)),
    csvRow(entries.map(([, entryValue]) => entryValue))
  ].join("\n").concat("\n");
}
function formatText(result) {
  const { result: value } = result;
  if (typeof value === "string") {
    return `${value}
`;
  }
  if (Array.isArray(value)) {
    if (isRecordArray(value)) {
      return `${value.map(formatRecordText).join("\n\n")}
`;
    }
    return `${value.join("\n")}
`;
  }
  return `${formatRecordText(value)}
`;
}
function formatRecordText(record) {
  return recordToText(record);
}
function contentTypeFor(format) {
  switch (format) {
    case "csv":
      return "text/csv; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "txt":
      return "text/plain; charset=utf-8";
  }
}
const CODE_128_PATTERNS = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112"
];
function createBarcodeResponse(request) {
  const value = request.fields.value?.trim() || request.input || "PASHI";
  if (!isCode128BValue(value)) {
    return json({ error: "Barcode supports ASCII characters from space to tilde." }, 400);
  }
  const height = parseInteger(request.fields.height ?? "", 160, 80, 480);
  const scale = parseInteger(request.fields.scale ?? "", 2, 1, 6);
  const showText = request.fields.text !== "hide";
  const modules = createCode128Modules(value);
  const width = modules.length * scale + 32;
  const barHeight = showText ? height - 34 : height - 18;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Barcode for ${escapeXml(value)}">
<rect width="100%" height="100%" fill="#fff7d7"/>
${modules.split("").map((bit, index2) => bit === "1" ? `<rect x="${16 + index2 * scale}" y="12" width="${scale}" height="${barHeight}" fill="#0d1024"/>` : "").join("")}
${showText ? `<text x="${width / 2}" y="${height - 12}" text-anchor="middle" font-family="monospace" font-size="16" fill="#0d1024">${escapeXml(value)}</text>` : ""}
</svg>`;
  return new Response(svg, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "image/svg+xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
function createCode128Modules(value) {
  const codes = [104, ...Array.from(value, (character) => character.charCodeAt(0) - 32)];
  const checksum = codes.reduce(
    (sum, code, index2) => sum + (index2 === 0 ? code : code * index2),
    0
  ) % 103;
  return [...codes, checksum, 106].map((code) => CODE_128_PATTERNS[code]).join("").split("").flatMap((width, index2) => Array.from({ length: Number.parseInt(width, 10) }, () => index2 % 2 === 0 ? "1" : "0")).join("");
}
function isCode128BValue(value) {
  return value.length > 0 && value.length <= 80 && /^[ -~]+$/.test(value);
}
function createEmojiImageResponse(request) {
  const emoji = request.fields.emoji?.trim() || request.input || "⚡";
  const size = parseInteger(request.fields.size ?? "", 512, 128, 1024);
  const background = normaliseHexColour(request.fields.background) || "0d1024";
  return createEmojiSvgResponse(emoji, { background, size });
}
function createEmojiSvgResponse(emoji, options) {
  const label = escapeXml(`Emoji image for ${emoji}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${options.size}" height="${options.size}" viewBox="0 0 ${options.size} ${options.size}" role="img" aria-label="${label}">
<rect width="100%" height="100%" fill="#${options.background}"/>
<circle cx="${options.size / 2}" cy="${options.size / 2}" r="${options.size * 0.42}" fill="#fff7d7"/>
<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" font-size="${options.size * 0.5}">${escapeXml(emoji.slice(0, 16))}</text>
</svg>`;
  return new Response(svg, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": "image/svg+xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
const QR_VERSION_CONFIGS = [
  { version: 1, dataCodewords: 19, eccCodewords: 7, blockDataCodewords: [19] },
  { version: 2, dataCodewords: 34, eccCodewords: 10, blockDataCodewords: [34] },
  { version: 3, dataCodewords: 55, eccCodewords: 15, blockDataCodewords: [55] },
  { version: 4, dataCodewords: 80, eccCodewords: 20, blockDataCodewords: [80] },
  { version: 5, dataCodewords: 108, eccCodewords: 26, blockDataCodewords: [108] },
  { version: 6, dataCodewords: 136, eccCodewords: 18, blockDataCodewords: [68, 68] },
  { version: 7, dataCodewords: 156, eccCodewords: 20, blockDataCodewords: [78, 78] },
  { version: 8, dataCodewords: 194, eccCodewords: 24, blockDataCodewords: [97, 97] },
  { version: 9, dataCodewords: 232, eccCodewords: 30, blockDataCodewords: [116, 116] },
  { version: 10, dataCodewords: 274, eccCodewords: 18, blockDataCodewords: [68, 68, 69, 69] }
];
const ALIGNMENT_PATTERN_POSITIONS = [
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50]
];
const QR_MODE_BYTE = 4;
const QR_ERROR_CORRECTION_LOW = 1;
const FORMAT_XOR_MASK = 21522;
const FORMAT_GENERATOR = 1335;
const GF_GENERATOR = 285;
const QR_QUIET_ZONE = 4;
const MAX_QR_PAYLOAD_BYTES = 271;
const DEFAULT_QR_SIZE = "300x300";
const QR_SIZE_PATTERN = /^([1-9]\d{1,3})x([1-9]\d{1,3})$/;
const PNG_SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const PNG_MAX_DEFLATE_BLOCK_BYTES = 65535;
function normaliseQrSize(value) {
  if (typeof value !== "string" || !value.trim()) {
    return { height: 300, label: DEFAULT_QR_SIZE, width: 300 };
  }
  const trimmed = value.trim().toLowerCase();
  const match = trimmed.match(QR_SIZE_PATTERN);
  if (!match) {
    return { height: 300, label: DEFAULT_QR_SIZE, width: 300 };
  }
  const width = Number.parseInt(match[1], 10);
  const height = Number.parseInt(match[2], 10);
  if (width > 1e3 || height > 1e3) {
    return { height: 300, label: DEFAULT_QR_SIZE, width: 300 };
  }
  return { height, label: `${width}x${height}`, width };
}
function assertQrPayloadByteLength(payload) {
  const payloadBytes = new TextEncoder().encode(payload).length;
  if (payloadBytes > MAX_QR_PAYLOAD_BYTES) {
    throw new Error(`QR payloads are limited to ${MAX_QR_PAYLOAD_BYTES} UTF-8 bytes.`);
  }
  return payloadBytes;
}
class BitBuffer {
  bits = [];
  append(value, bitCount) {
    for (let shift = bitCount - 1; shift >= 0; shift -= 1) {
      this.bits.push(value >>> shift & 1);
    }
  }
  get length() {
    return this.bits.length;
  }
  toCodewords() {
    const codewords = [];
    for (let index2 = 0; index2 < this.bits.length; index2 += 8) {
      let codeword = 0;
      for (let offset = 0; offset < 8; offset += 1) {
        codeword = codeword << 1 | (this.bits[index2 + offset] ?? 0);
      }
      codewords.push(codeword);
    }
    return codewords;
  }
}
function makeGaloisTables() {
  const exp = new Array(512).fill(0);
  const log = new Array(256).fill(0);
  let value = 1;
  for (let index2 = 0; index2 < 255; index2 += 1) {
    exp[index2] = value;
    log[value] = index2;
    value <<= 1;
    if (value & 256) {
      value ^= GF_GENERATOR;
    }
  }
  for (let index2 = 255; index2 < exp.length; index2 += 1) {
    exp[index2] = exp[index2 - 255];
  }
  return { exp, log };
}
const GF_TABLES = makeGaloisTables();
function gfMultiply(left, right) {
  return left === 0 || right === 0 ? 0 : GF_TABLES.exp[GF_TABLES.log[left] + GF_TABLES.log[right]];
}
function makeGeneratorPolynomial(degree) {
  let coefficients = [1];
  for (let index2 = 0; index2 < degree; index2 += 1) {
    const next = new Array(coefficients.length + 1).fill(0);
    for (let coefficientIndex = 0; coefficientIndex < coefficients.length; coefficientIndex += 1) {
      next[coefficientIndex] ^= coefficients[coefficientIndex];
      next[coefficientIndex + 1] ^= gfMultiply(
        coefficients[coefficientIndex],
        GF_TABLES.exp[index2]
      );
    }
    coefficients = next;
  }
  return coefficients;
}
function computeErrorCorrection(dataCodewords, degree) {
  const generator = makeGeneratorPolynomial(degree);
  const remainder = [...dataCodewords, ...new Array(degree).fill(0)];
  for (let index2 = 0; index2 < dataCodewords.length; index2 += 1) {
    const factor = remainder[index2];
    if (factor === 0) {
      continue;
    }
    for (let offset = 0; offset < generator.length; offset += 1) {
      remainder[index2 + offset] ^= gfMultiply(generator[offset], factor);
    }
  }
  return remainder.slice(dataCodewords.length);
}
function selectVersion(payloadBytes) {
  return QR_VERSION_CONFIGS.find((config) => {
    const characterCountBits = config.version < 10 ? 8 : 16;
    const requiredBits = 4 + characterCountBits + payloadBytes.length * 8;
    return requiredBits <= config.dataCodewords * 8;
  });
}
function buildDataCodewords(payloadBytes, config) {
  const bits = new BitBuffer();
  const characterCountBits = config.version < 10 ? 8 : 16;
  bits.append(QR_MODE_BYTE, 4);
  bits.append(payloadBytes.length, characterCountBits);
  for (const byte of payloadBytes) {
    bits.append(byte, 8);
  }
  const totalBits = config.dataCodewords * 8;
  bits.append(0, Math.min(4, totalBits - bits.length));
  while (bits.length % 8 !== 0) {
    bits.append(0, 1);
  }
  const codewords = bits.toCodewords();
  for (let pad2 = 236; codewords.length < config.dataCodewords; pad2 ^= 236 ^ 17) {
    codewords.push(pad2);
  }
  return codewords;
}
function buildFinalCodewords(dataCodewords, config) {
  const blocks = config.blockDataCodewords.map((blockLength, blockIndex) => {
    const offset = config.blockDataCodewords.slice(0, blockIndex).reduce((total, length) => total + length, 0);
    const data = dataCodewords.slice(offset, offset + blockLength);
    return {
      data,
      ecc: computeErrorCorrection(data, config.eccCodewords)
    };
  });
  const result = [];
  const maxDataLength = Math.max(...blocks.map((block) => block.data.length));
  for (let index2 = 0; index2 < maxDataLength; index2 += 1) {
    for (const block of blocks) {
      if (index2 < block.data.length) {
        result.push(block.data[index2]);
      }
    }
  }
  for (let index2 = 0; index2 < config.eccCodewords; index2 += 1) {
    for (const block of blocks) {
      result.push(block.ecc[index2]);
    }
  }
  return result;
}
function createMatrix(size) {
  return Array.from({ length: size }, () => new Array(size).fill(false));
}
function createReservedMatrix(size) {
  return Array.from({ length: size }, () => new Array(size).fill(false));
}
function setModule(matrix, reserved, row, column, dark) {
  if (row < 0 || column < 0 || row >= matrix.length || column >= matrix.length) {
    return;
  }
  matrix[row][column] = dark;
  reserved[row][column] = true;
}
function addFinderPattern(matrix, reserved, row, column) {
  for (let deltaRow = -1; deltaRow <= 7; deltaRow += 1) {
    for (let deltaColumn = -1; deltaColumn <= 7; deltaColumn += 1) {
      const patternRow = row + deltaRow;
      const patternColumn = column + deltaColumn;
      const inPattern = deltaRow >= 0 && deltaRow <= 6 && deltaColumn >= 0 && deltaColumn <= 6;
      const dark = inPattern && (deltaRow === 0 || deltaRow === 6 || deltaColumn === 0 || deltaColumn === 6 || deltaRow >= 2 && deltaRow <= 4 && deltaColumn >= 2 && deltaColumn <= 4);
      setModule(matrix, reserved, patternRow, patternColumn, dark);
    }
  }
}
function addAlignmentPattern(matrix, reserved, centerRow, centerColumn) {
  for (let deltaRow = -2; deltaRow <= 2; deltaRow += 1) {
    for (let deltaColumn = -2; deltaColumn <= 2; deltaColumn += 1) {
      const distance = Math.max(Math.abs(deltaRow), Math.abs(deltaColumn));
      setModule(matrix, reserved, centerRow + deltaRow, centerColumn + deltaColumn, distance !== 1);
    }
  }
}
function addFunctionPatterns(matrix, reserved, version) {
  const size = matrix.length;
  addFinderPattern(matrix, reserved, 0, 0);
  addFinderPattern(matrix, reserved, 0, size - 7);
  addFinderPattern(matrix, reserved, size - 7, 0);
  for (let index2 = 8; index2 < size - 8; index2 += 1) {
    const dark = index2 % 2 === 0;
    setModule(matrix, reserved, 6, index2, dark);
    setModule(matrix, reserved, index2, 6, dark);
  }
  for (const row of ALIGNMENT_PATTERN_POSITIONS[version - 1] ?? []) {
    for (const column of ALIGNMENT_PATTERN_POSITIONS[version - 1] ?? []) {
      const overlapsFinder = row === 6 && (column === 6 || column === size - 7) || column === 6 && row === size - 7;
      if (!overlapsFinder) {
        addAlignmentPattern(matrix, reserved, row, column);
      }
    }
  }
  for (let index2 = 0; index2 < 9; index2 += 1) {
    if (index2 !== 6) {
      setModule(matrix, reserved, 8, index2, false);
      setModule(matrix, reserved, index2, 8, false);
    }
  }
  for (let index2 = 0; index2 < 8; index2 += 1) {
    setModule(matrix, reserved, size - 1 - index2, 8, false);
    setModule(matrix, reserved, 8, size - 1 - index2, false);
  }
  setModule(matrix, reserved, 4 * version + 9, 8, true);
}
function placeCodewords(matrix, reserved, codewords) {
  const bits = codewords.flatMap(
    (codeword) => Array.from({ length: 8 }, (_, index2) => codeword >>> 7 - index2 & 1)
  );
  const size = matrix.length;
  let bitIndex = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right -= 1;
    }
    for (let vertical = 0; vertical < size; vertical += 1) {
      const row = upward ? size - 1 - vertical : vertical;
      for (let columnOffset = 0; columnOffset < 2; columnOffset += 1) {
        const column = right - columnOffset;
        if (!reserved[row][column]) {
          matrix[row][column] = (bits[bitIndex] ?? 0) === 1;
          bitIndex += 1;
        }
      }
    }
    upward = !upward;
  }
}
function getMaskBit(mask, row, column) {
  switch (mask) {
    case 0:
      return (row + column) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return column % 3 === 0;
    case 3:
      return (row + column) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(column / 3)) % 2 === 0;
    case 5:
      return row * column % 2 + row * column % 3 === 0;
    case 6:
      return (row * column % 2 + row * column % 3) % 2 === 0;
    default:
      return ((row + column) % 2 + row * column % 3) % 2 === 0;
  }
}
function applyMask(matrix, reserved, mask) {
  return matrix.map(
    (row, rowIndex) => row.map(
      (dark, columnIndex) => !reserved[rowIndex][columnIndex] && getMaskBit(mask, rowIndex, columnIndex) ? !dark : dark
    )
  );
}
function scoreAdjacentRuns(matrix) {
  let penalty = 0;
  for (const row of matrix) {
    let runColor = row[0];
    let runLength = 1;
    for (let column = 1; column < row.length; column += 1) {
      if (row[column] === runColor) {
        runLength += 1;
        continue;
      }
      if (runLength >= 5) {
        penalty += 3 + runLength - 5;
      }
      runColor = row[column];
      runLength = 1;
    }
    if (runLength >= 5) {
      penalty += 3 + runLength - 5;
    }
  }
  return penalty;
}
function transposeMatrix(matrix) {
  return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}
function scoreQrMatrix(matrix) {
  let penalty = scoreAdjacentRuns(matrix) + scoreAdjacentRuns(transposeMatrix(matrix));
  const size = matrix.length;
  for (let row = 0; row < size - 1; row += 1) {
    for (let column = 0; column < size - 1; column += 1) {
      const color = matrix[row][column];
      if (matrix[row][column + 1] === color && matrix[row + 1][column] === color && matrix[row + 1][column + 1] === color) {
        penalty += 3;
      }
    }
  }
  let darkCount = 0;
  for (const row of matrix) {
    for (const dark of row) {
      if (dark) {
        darkCount += 1;
      }
    }
  }
  const percent = darkCount * 100 / (size * size);
  penalty += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return penalty;
}
function getFormatBits(mask) {
  const data = QR_ERROR_CORRECTION_LOW << 3 | mask;
  let bits = data << 10;
  for (let bit = 14; bit >= 10; bit -= 1) {
    if ((bits >>> bit & 1) !== 0) {
      bits ^= FORMAT_GENERATOR << bit - 10;
    }
  }
  return ((data << 10 | bits) ^ FORMAT_XOR_MASK) & 32767;
}
function getBit(value, index2) {
  return (value >>> index2 & 1) !== 0;
}
function addFormatBits(matrix, reserved, mask) {
  const size = matrix.length;
  const bits = getFormatBits(mask);
  for (let index2 = 0; index2 <= 5; index2 += 1) {
    setModule(matrix, reserved, 8, index2, getBit(bits, index2));
  }
  setModule(matrix, reserved, 8, 7, getBit(bits, 6));
  setModule(matrix, reserved, 8, 8, getBit(bits, 7));
  setModule(matrix, reserved, 7, 8, getBit(bits, 8));
  for (let index2 = 9; index2 < 15; index2 += 1) {
    setModule(matrix, reserved, 14 - index2, 8, getBit(bits, index2));
  }
  for (let index2 = 0; index2 < 8; index2 += 1) {
    setModule(matrix, reserved, size - 1 - index2, 8, getBit(bits, index2));
  }
  for (let index2 = 8; index2 < 15; index2 += 1) {
    setModule(matrix, reserved, 8, size - 15 + index2, getBit(bits, index2));
  }
  setModule(matrix, reserved, size - 8, 8, true);
}
function createQrMatrix(payload) {
  const payloadBytes = new TextEncoder().encode(payload);
  const config = selectVersion(payloadBytes);
  if (!config) {
    throw new Error("QR payload is too long for the first-party encoder");
  }
  const size = 21 + (config.version - 1) * 4;
  const matrix = createMatrix(size);
  const reserved = createReservedMatrix(size);
  addFunctionPatterns(matrix, reserved, config.version);
  placeCodewords(
    matrix,
    reserved,
    buildFinalCodewords(buildDataCodewords(payloadBytes, config), config)
  );
  let bestMask = 0;
  let bestMatrix = applyMask(matrix, reserved, 0);
  let bestScore = scoreQrMatrix(bestMatrix);
  for (let mask = 1; mask < 8; mask += 1) {
    const candidate = applyMask(matrix, reserved, mask);
    const score = scoreQrMatrix(candidate);
    if (score < bestScore) {
      bestMask = mask;
      bestMatrix = candidate;
      bestScore = score;
    }
  }
  const finalReserved = createReservedMatrix(size);
  addFormatBits(bestMatrix, finalReserved, bestMask);
  return bestMatrix;
}
function renderQrSvg(matrix, width, height) {
  const viewBoxSize = matrix.length + QR_QUIET_ZONE * 2;
  const path = matrix.flatMap(
    (row, rowIndex) => row.map(
      (dark, columnIndex) => dark ? `M${columnIndex + QR_QUIET_ZONE} ${rowIndex + QR_QUIET_ZONE}h1v1h-1z` : ""
    )
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${viewBoxSize} ${viewBoxSize}" shape-rendering="crispEdges"><path fill="#fff" d="M0 0h${viewBoxSize}v${viewBoxSize}H0z"/><path fill="#000" d="${path}"/></svg>`;
}
function qrPixelValue(matrix, x, y, width, height) {
  const viewBoxSize = matrix.length + QR_QUIET_ZONE * 2;
  const viewBoxX = Math.floor(x * viewBoxSize / width);
  const viewBoxY = Math.floor(y * viewBoxSize / height);
  const moduleX = viewBoxX - QR_QUIET_ZONE;
  const moduleY = viewBoxY - QR_QUIET_ZONE;
  return moduleX >= 0 && moduleY >= 0 && moduleX < matrix.length && moduleY < matrix.length && matrix[moduleY][moduleX] ? 0 : 255;
}
function createQrGrayscaleScanlines(matrix, width, height) {
  const scanlines = new Uint8Array((width + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width + 1);
    scanlines[rowOffset] = 0;
    for (let x = 0; x < width; x += 1) {
      scanlines[rowOffset + x + 1] = qrPixelValue(matrix, x, y, width, height);
    }
  }
  return scanlines;
}
function writeUint32(value) {
  return new Uint8Array([
    value >>> 24 & 255,
    value >>> 16 & 255,
    value >>> 8 & 255,
    value & 255
  ]);
}
function concatBytes(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}
function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let index2 = 0; index2 < table.length; index2 += 1) {
    let value = index2;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 3988292384 ^ value >>> 1 : value >>> 1;
    }
    table[index2] = value >>> 0;
  }
  return table;
}
const CRC_TABLE = makeCrcTable();
function crc32(bytes2) {
  let crc = 4294967295;
  for (const byte of bytes2) {
    crc = CRC_TABLE[(crc ^ byte) & 255] ^ crc >>> 8;
  }
  return (crc ^ 4294967295) >>> 0;
}
function adler32(bytes2) {
  let a = 1;
  let b = 0;
  for (const byte of bytes2) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return (b << 16 | a) >>> 0;
}
function pngChunk(type, data) {
  const typeBytes = new TextEncoder().encode(type);
  const payload = concatBytes([typeBytes, data]);
  return concatBytes([writeUint32(data.length), payload, writeUint32(crc32(payload))]);
}
function zlibStore(bytes2) {
  const blocks = [new Uint8Array([120, 1])];
  for (let offset = 0; offset < bytes2.length; offset += PNG_MAX_DEFLATE_BLOCK_BYTES) {
    const chunk = bytes2.subarray(offset, offset + PNG_MAX_DEFLATE_BLOCK_BYTES);
    const finalBlock = offset + PNG_MAX_DEFLATE_BLOCK_BYTES >= bytes2.length;
    const length = chunk.length;
    blocks.push(
      new Uint8Array([
        finalBlock ? 1 : 0,
        length & 255,
        length >>> 8 & 255,
        ~length & 255,
        ~length >>> 8 & 255
      ]),
      chunk
    );
  }
  blocks.push(writeUint32(adler32(bytes2)));
  return concatBytes(blocks);
}
function createQrSvg(payload, width, height) {
  return renderQrSvg(createQrMatrix(payload), width, height);
}
function createQrPng(payload, width, height) {
  const matrix = createQrMatrix(payload);
  const header = new Uint8Array(13);
  header.set(writeUint32(width), 0);
  header.set(writeUint32(height), 4);
  header[8] = 8;
  header[9] = 0;
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;
  return concatBytes([
    PNG_SIGNATURE,
    pngChunk("IHDR", header),
    pngChunk("IDAT", zlibStore(createQrGrayscaleScanlines(matrix, width, height))),
    pngChunk("IEND", new Uint8Array())
  ]);
}
function createQrResponse(input, params) {
  const payload = input.trim();
  if (!payload) {
    return json({ error: "Pass a non-empty input." }, 400);
  }
  try {
    assertQrPayloadByteLength(payload);
  } catch {
    return json(
      { error: `QR payloads are limited to ${MAX_QR_PAYLOAD_BYTES} UTF-8 bytes.` },
      400
    );
  }
  const format = params.get("format") === "svg" ? "svg" : "png";
  const size = normaliseQrSize(params.get("size"));
  const image = format === "svg" ? createQrSvg(payload, size.width, size.height) : createQrPng(payload, size.width, size.height);
  return new Response(image, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": format === "svg" ? "image/svg+xml; charset=utf-8" : "image/png",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
function createImageResponse(generator, request, params) {
  switch (generator.id) {
    case "barcode":
      return createBarcodeResponse(request);
    case "emoji-image":
      return createEmojiImageResponse(request);
    case "qr":
      return createQrResponse(request.input, params);
    default:
      return json({ error: "Unknown image generator type." }, 404);
  }
}
async function createGeneratorResponse(type, request, params = new URLSearchParams(), env) {
  const generator = findGenerator(type);
  if (!generator) {
    return json({ error: "Unknown generator type." }, 404);
  }
  const generatedAt = (/* @__PURE__ */ new Date()).toISOString();
  if (usesAiMode(request) && (!env || !createFeatureStatus(env).ai.available)) {
    return json({ error: "AI mode is not available." }, 503);
  }
  if (generator.result.kind === "image") {
    const response = createImageResponse(generator, request, params);
    response.headers.set("X-Generated-At", generatedAt);
    return response;
  }
  try {
    const result = await createJsonResult(generator, request, env?.AI ? { AI: env.AI } : void 0);
    return json({
      ...result,
      generatedAt
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Generation failed." },
      400
    );
  }
}
function createSitemapResponse(origin) {
  return new Response(createSitemapXml(origin), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
function createSitemapXml(origin) {
  const urls = [
    "/",
    ...listGeneratorTools().map((tool2) => `/${tool2.id}`),
    ...listConverterTools().map((tool2) => `/convert/${tool2.id}`)
  ];
  const entries = urls.map(
    (path) => `  <url>
    <loc>${escapeXml(`${origin}${path}`)}</loc>
  </url>`
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}
const BODY_INPUT_FIELD_IDS = /* @__PURE__ */ new Set(["data", "file", "input"]);
async function readGeneratorBody(c) {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return { fields: {}, input: "" };
  }
  return {
    fields: fieldsFromJsonBody(body),
    input: isInputBody(body) ? body.input : ""
  };
}
async function readConverterBody(c) {
  const params = new URL(c.req.url).searchParams;
  const queryFields = fieldsFromSearchParams(params);
  const contentType2 = c.req.header("content-type")?.toLowerCase() ?? "";
  const queryInput = params.get("input") || params.get("data") || "";
  if (contentType2.includes("application/json")) {
    let body;
    try {
      body = await c.req.json();
    } catch {
      return { fields: queryFields, input: "" };
    }
    return {
      fields: {
        ...queryFields,
        ...fieldsFromJsonBody(body)
      },
      input: isInputBody(body) ? body.input : queryInput
    };
  }
  if (contentType2.includes("multipart/form-data")) {
    try {
      return bodyFromFormData(await c.req.formData(), queryFields, queryInput);
    } catch {
      return { fields: queryFields, input: queryInput };
    }
  }
  if (contentType2.includes("application/x-www-form-urlencoded")) {
    const bodyParams = new URLSearchParams(await c.req.text());
    return {
      fields: {
        ...queryFields,
        ...fieldsFromSearchParams(bodyParams)
      },
      input: bodyParams.get("input") || bodyParams.get("data") || queryInput
    };
  }
  const input = await c.req.text();
  return {
    fields: queryFields,
    input: input || queryInput
  };
}
function isInputBody(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && "input" in value && typeof value.input === "string";
}
function normaliseFields(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).flatMap(
      ([key, fieldValue2]) => typeof fieldValue2 === "string" ? [[key, fieldValue2]] : []
    )
  );
}
function fieldsFromJsonBody(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return {
    ...fieldsFromObject(value),
    ..."fields" in value ? normaliseFields(value.fields) : {}
  };
}
function fieldsFromSearchParams(params) {
  return Object.fromEntries(
    [...params.entries()].filter(([key]) => !BODY_INPUT_FIELD_IDS.has(key))
  );
}
async function bodyFromFormData(formData, queryFields = {}, fallbackInput = "") {
  const fields = {
    ...queryFields,
    ...fieldsFromFormData(formData)
  };
  const file = formData.get("file");
  if (file instanceof File) {
    if (!fields.sourceName && file.name) {
      fields.sourceName = file.name;
    }
    return {
      fields,
      input: await file.text()
    };
  }
  return {
    fields,
    input: stringFormField(formData, "input") || stringFormField(formData, "data") || fallbackInput
  };
}
function fieldsFromFormData(formData) {
  const fields = {};
  for (const [key, value] of formData.entries()) {
    if (BODY_INPUT_FIELD_IDS.has(key) || typeof value !== "string") {
      continue;
    }
    fields[key] = value;
  }
  return fields;
}
function stringFormField(formData, key) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
function fieldsFromObject(value) {
  return Object.fromEntries(
    Object.entries(value).flatMap(
      ([key, fieldValue2]) => !BODY_INPUT_FIELD_IDS.has(key) && typeof fieldValue2 === "string" ? [[key, fieldValue2]] : []
    )
  );
}
const app = new Hono({ strict: false });
app.use("*", blockBots);
app.get("/api/info", (c) => c.json(createApiIndexResponse(c.env)));
app.get("/sitemap.xml", (c) => {
  const origin = new URL(c.req.url).origin;
  return createSitemapResponse(origin);
});
app.get("/export/:type/:format", async (c) => {
  const generator = findGenerator(c.req.param("type"));
  const request = createGeneratorRequestFromSearchParams(new URL(c.req.url).searchParams);
  if (generator?.modes?.includes("ai") && usesAiMode(request)) {
    const denied = await requireApiKey(c);
    if (denied) {
      return denied;
    }
  }
  return createExportResponse(
    c.req.param("type"),
    c.req.param("format"),
    request,
    c.env
  );
});
app.post("/export/:type/:format", async (c) => {
  const body = await readGeneratorBody(c);
  const generator = findGenerator(c.req.param("type"));
  const request = createGeneratorRequest(body.input, body.fields);
  if (generator?.modes?.includes("ai") && usesAiMode(request)) {
    const denied = await requireApiKey(c);
    if (denied) {
      return denied;
    }
  }
  return createExportResponse(
    c.req.param("type"),
    c.req.param("format"),
    request,
    c.env
  );
});
app.get("/api/:type", async (c) => {
  const type = c.req.param("type");
  const params = new URL(c.req.url).searchParams;
  const request = createGeneratorRequestFromSearchParams(params);
  const generatorTool = findGenerator(type);
  if (generatorTool) {
    if (generatorTool.modes?.includes("ai") && usesAiMode(request)) {
      const denied = await requireApiKey(c);
      if (denied) {
        return denied;
      }
    }
    return createGeneratorResponse(
      type,
      request,
      params,
      c.env
    );
  }
  const converterTool = findConverterTool(type);
  if (converterTool) {
    if (converterTool.runtime === "container") {
      const denied = await requireApiKey(c);
      if (denied) {
        return denied;
      }
      const application = c.get("application");
      if (!application) {
        return c.json({ error: "API key authentication is unavailable." }, 503);
      }
      return createConverterResponse(type, request, c.env, params, application.id);
    }
    return createConverterResponse(type, request, c.env, params);
  }
  return c.json({ error: "Unknown tool type." }, 404);
});
app.post("/api/:type", async (c) => {
  const type = c.req.param("type");
  const generatorTool = findGenerator(type);
  if (generatorTool) {
    const body = await readGeneratorBody(c);
    const request = createGeneratorRequest(body.input, body.fields);
    if (generatorTool.modes?.includes("ai") && usesAiMode(request)) {
      const denied = await requireApiKey(c);
      if (denied) {
        return denied;
      }
    }
    return createGeneratorResponse(
      type,
      request,
      new URLSearchParams(),
      c.env
    );
  }
  const converterTool = findConverterTool(type);
  if (converterTool) {
    if (converterTool.runtime === "container") {
      const denied = await requireApiKey(c);
      if (denied) {
        return denied;
      }
      const application = c.get("application");
      if (!application) {
        return c.json({ error: "API key authentication is unavailable." }, 503);
      }
      const contentType2 = c.req.header("content-type")?.toLowerCase() ?? "";
      if (isQueuedConversionUploadRequest(converterTool.id, contentType2)) {
        return createQueuedConversionUploadResponse(
          converterTool.id,
          c.req.raw,
          c.env,
          application.id,
          type
        );
      }
      const body2 = await readConverterBody(c);
      return createConverterResponse(
        type,
        createGeneratorRequest(body2.input, body2.fields),
        c.env,
        void 0,
        application.id
      );
    }
    const body = await readConverterBody(c);
    return createConverterResponse(type, createGeneratorRequest(body.input, body.fields), c.env);
  }
  return c.json({ error: "Unknown tool type." }, 404);
});
const index = {
  fetch: app.fetch,
  queue: processConversionQueue
};
export {
  ConversionContainer,
  index as default
};
