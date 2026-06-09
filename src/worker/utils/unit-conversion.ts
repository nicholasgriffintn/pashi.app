type UnitDimension =
	| "angle"
	| "area"
	| "data"
	| "energy"
	| "force"
	| "frequency"
	| "length"
	| "mass"
	| "power"
	| "pressure"
	| "speed"
	| "temperature"
	| "time"
	| "torque"
	| "volume";

interface UnitDefinition {
	aliases: readonly string[];
	dimension: UnitDimension;
	fromBase: (value: number) => number;
	label: string;
	toBase: (value: number) => number;
}

export const UNIT_OUTPUTS = [
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
	"lbft",
] as const;

export type UnitOutput = (typeof UNIT_OUTPUTS)[number];

export class UnitConversionError extends Error {}

const UNITS: Record<UnitOutput, UnitDefinition> = {
	acre: linearUnit("area", "acre", 4046.8564224, ["acres"]),
	b: linearUnit("data", "B", 1, ["byte", "bytes"]),
	bar: linearUnit("pressure", "bar", 100000, ["bars"]),
	c: temperatureUnit("temperature", "°C", (value) => value + 273.15, (value) => value - 273.15, ["celsius", "°c"]),
	cal: linearUnit("energy", "cal", 4.184, ["calorie", "calories"]),
	cm: linearUnit("length", "cm", 0.01, ["centimeter", "centimeters", "centimetre", "centimetres"]),
	deg: linearUnit("angle", "deg", Math.PI / 180, ["degree", "degrees"]),
	f: temperatureUnit("temperature", "°F", (value) => (value - 32) * 5 / 9 + 273.15, (value) => (value - 273.15) * 9 / 5 + 32, ["fahrenheit", "°f"]),
	ft: linearUnit("length", "ft", 0.3048, ["foot", "feet"]),
	g: linearUnit("mass", "g", 0.001, ["gram", "grams"]),
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
	khz: linearUnit("frequency", "kHz", 1000, ["kilohertz"]),
	kj: linearUnit("energy", "kJ", 1000, ["kilojoule", "kilojoules"]),
	km: linearUnit("length", "km", 1000, ["kilometer", "kilometers", "kilometre", "kilometres"]),
	kn: linearUnit("speed", "kn", 0.5144444444, ["knot", "knots"]),
	kw: linearUnit("power", "kW", 1000, ["kilowatt", "kilowatts"]),
	kpa: linearUnit("pressure", "kPa", 1000, ["kilopascal", "kilopascals"]),
	kph: linearUnit("speed", "km/h", 1000 / 3600, ["kmh", "kilometer-per-hour", "kilometre-per-hour"]),
	kwh: linearUnit("energy", "kWh", 3600000, ["kilowatt-hour", "kilowatt-hours"]),
	l: linearUnit("volume", "L", 1, ["liter", "liters", "litre", "litres"]),
	lb: linearUnit("mass", "lb", 0.45359237, ["pound", "pounds"]),
	lbf: linearUnit("force", "lbf", 4.4482216152605, ["pound-force", "pounds-force"]),
	lbft: linearUnit("torque", "lb-ft", 1.3558179483314, ["lb-ft", "pound-foot", "pound-feet"]),
	m: linearUnit("length", "m", 1, ["meter", "meters", "metre", "metres"]),
	mb: linearUnit("data", "MB", 1024 ** 2, ["megabyte", "megabytes"]),
	mhz: linearUnit("frequency", "MHz", 1000 ** 2, ["megahertz"]),
	mi: linearUnit("length", "mi", 1609.344, ["mile", "miles"]),
	min: linearUnit("time", "min", 60, ["minute", "minutes"]),
	ml: linearUnit("volume", "ml", 0.001, ["milliliter", "milliliters", "millilitre", "millilitres"]),
	mm: linearUnit("length", "mm", 0.001, ["millimeter", "millimeters", "millimetre", "millimetres"]),
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
	yd: linearUnit("length", "yd", 0.9144, ["yard", "yards"]),
};

const UNIT_ALIASES = createUnitAliases();

export function convertUnitText(input: string, toUnitValue: string, fromUnitValue?: string) {
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

function linearUnit(
	dimension: UnitDimension,
	label: string,
	factor: number,
	aliases: readonly string[],
): UnitDefinition {
	return {
		aliases,
		dimension,
		fromBase: (value) => value / factor,
		label,
		toBase: (value) => value * factor,
	};
}

function temperatureUnit(
	dimension: UnitDimension,
	label: string,
	toBase: (value: number) => number,
	fromBase: (value: number) => number,
	aliases: readonly string[],
): UnitDefinition {
	return { aliases, dimension, fromBase, label, toBase };
}

function createUnitAliases() {
	const aliases = new Map<string, UnitOutput>();
	for (const [unit, definition] of Object.entries(UNITS) as Array<[UnitOutput, UnitDefinition]>) {
		aliases.set(unit, unit);
		for (const alias of definition.aliases) {
			aliases.set(alias, unit);
		}
	}

	return aliases;
}

function findUnit(value: string | undefined) {
	if (!value) {
		return undefined;
	}

	const unit = UNIT_ALIASES.get(value.trim().toLowerCase());
	return unit ? { definition: UNITS[unit], unit } : undefined;
}

function parseUnitInput(input: string) {
	const match = /^\s*(-?\d+(?:\.\d+)?)\s*([A-Za-z°²/^_-]+)?\s*$/.exec(input);
	if (!match) {
		throw new UnitConversionError("Enter a value with a source unit, for example 10 m.");
	}

	return {
		unit: match[2],
		value: Number(match[1]),
	};
}

function formatNumber(value: number) {
	return Number(value.toFixed(4)).toString();
}
