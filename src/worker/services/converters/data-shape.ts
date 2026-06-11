import { isRecord, type StringRecord } from "../../../shared/records.ts";
import { parseCsv } from "../../utils/csv.ts";

export type DataShapeFormat = "csv-shape" | "json-shape";

export const DATA_SHAPE_FORMATS: readonly DataShapeFormat[] = [
	"json-shape",
	"csv-shape",
];

export class DataShapeError extends Error {}

type PrimitiveKind = "array" | "boolean" | "null" | "number" | "object" | "string";

interface ColumnStats {
	empty: number;
	examples: string[];
	name: string;
	types: Record<string, number>;
}

export function isDataShapeFormat(value: string): value is DataShapeFormat {
	return DATA_SHAPE_FORMATS.some((format) => format === value);
}

export function inspectDataShape(input: string, format: DataShapeFormat) {
	switch (format) {
		case "csv-shape":
			return inspectCsvShape(input);
		case "json-shape":
			return inspectJsonShape(input);
	}
}

function inspectJsonShape(input: string) {
	const value = parseJson(input);
	return JSON.stringify(describeJsonValue(value), null, 2);
}

function inspectCsvShape(input: string) {
	const records = parseCsv(input);
	if (records.length === 0) {
		throw new DataShapeError("Enter CSV with a header row and at least one data row.");
	}

	return JSON.stringify({
		columns: columnStats(records),
		columnCount: Object.keys(records[0] ?? {}).length,
		rowCount: records.length,
	}, null, 2);
}

function parseJson(input: string): unknown {
	try {
		return JSON.parse(input);
	} catch {
		throw new DataShapeError("Enter valid JSON.");
	}
}

function describeJsonValue(value: unknown): unknown {
	if (Array.isArray(value)) {
		const samples = value.slice(0, 25);
		return {
			kind: "array",
			length: value.length,
			items: mergeJsonShapes(samples.map(describeJsonValue)),
		};
	}

	if (isRecord(value)) {
		return {
			kind: "object",
			properties: Object.fromEntries(
				Object.entries(value)
					.sort(([left], [right]) => left.localeCompare(right))
					.map(([key, item]) => [key, describeJsonValue(item)]),
			),
		};
	}

	return {
		kind: primitiveKind(value),
		example: value,
	};
}

function mergeJsonShapes(shapes: unknown[]): unknown {
	if (shapes.length === 0) {
		return { kind: "unknown" };
	}

	const kinds = new Set(shapes.map((shape) => isRecord(shape) ? String(shape.kind ?? "unknown") : "unknown"));
	if (kinds.size > 1) {
		return {
			kind: "union",
			options: [...kinds].sort(),
		};
	}

	const [shape] = shapes;
	if (!isRecord(shape) || shape.kind !== "object") {
		return shape;
	}

	const propertyNames = new Set<string>();
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
			[...propertyNames].sort().map((property): [string, unknown] => {
				const propertyShapes = shapes
					.map((item) => isRecord(item) && isRecord(item.properties) ? item.properties[property] : undefined)
					.filter((item) => item !== undefined);
				return [property, mergeJsonShapes(propertyShapes)];
			}),
		),
	};
}

function primitiveKind(value: unknown): PrimitiveKind {
	if (value === null) {
		return "null";
	}

	if (Array.isArray(value)) {
		return "array";
	}

	if (isRecord(value)) {
		return "object";
	}

	return typeof value as PrimitiveKind;
}

function columnStats(records: readonly StringRecord[]) {
	const stats = new Map<string, ColumnStats>();
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

function inferScalarType(value: string) {
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
