import type { GeneratorRequest } from "../../request";
import {
	parseChoice,
	parseCount,
	randomChoice,
	singleOrList,
} from "../../../../utils/generation";

const ACTIVE_COMPANY_STYLES = ["professional", "creative", "modern", "traditional", "tech"] as const;
const COMPANY_STYLES = [...ACTIVE_COMPANY_STYLES, "mixed"] as const;
const COMPANY_INDUSTRIES = ["general", "tech", "finance", "retail", "healthcare", "consulting", "food", "fashion", "construction", "education"] as const;
const SURNAMES = ["Smith", "Johnson", "Williams", "Brown", "Taylor", "Morgan", "Bennett", "Carter", "Reed", "Parker"] as const;
const CREATIVE_ADJECTIVES = ["Neon", "Bright", "Wild", "Fresh", "Spark", "Lunar", "Golden", "North", "Signal", "Velvet"] as const;
const CREATIVE_NOUNS = ["Digital", "Studio", "Ventures", "Collective", "Works", "Lab", "Forge", "Canvas", "Motion", "House"] as const;
const MODERN_PREFIXES = ["Byte", "Cloud", "Nova", "Astra", "Pulse", "Edge", "Flow", "Core", "Loop", "Vertex"] as const;
const MODERN_SUFFIXES = ["Tech", "Edge", "Flow", "Stack", "Base", "Ops", "Link", "Grid", "Wave", "Logic"] as const;
const TRADITIONAL_PREFIXES = ["Heritage", "Classic", "Premier", "Crown", "Union", "Summit", "Sterling", "Anchor", "Liberty", "Keystone"] as const;
const TECH_PREFIXES = ["Data", "Cyber", "Quantum", "Neural", "Vector", "Cloud", "Code", "Signal", "Nexa", "Infra"] as const;
const TECH_CORES = ["Sync", "Core", "Net", "Stack", "Works", "Forge", "Labs", "Grid", "Flow", "Ops"] as const;
const GENERAL_SUFFIXES = ["Group", "Partners", "Industries", "Solutions", "Holdings", "Company", "Associates", "Enterprises"] as const;
const INDUSTRY_SUFFIXES: Record<(typeof COMPANY_INDUSTRIES)[number], readonly string[]> = {
	construction: ["Construction", "Builders", "Development", "Properties", "Works"],
	consulting: ["Consulting", "Advisory", "Partners", "Group", "Strategy"],
	education: ["Education", "Academy", "Learning", "Institute", "School"],
	fashion: ["Fashion", "Apparel", "Style", "Boutique", "Design"],
	finance: ["Capital", "Financial", "Investments", "Bank", "Holdings"],
	food: ["Foods", "Kitchen", "Restaurant", "Cafe", "Catering"],
	general: GENERAL_SUFFIXES,
	healthcare: ["Health", "Medical", "Clinic", "Care", "Wellness"],
	retail: ["Retail", "Store", "Shop", "Market", "Commerce"],
	tech: ["Technologies", "Systems", "Labs", "Digital", "Software"],
};

export function createCompanies(request: GeneratorRequest) {
	const count = parseCount(request.fields.count ?? "", 10, 100);
	const style = parseChoice(request.fields.style, COMPANY_STYLES, "mixed");
	const industry = parseChoice(request.fields.industry, COMPANY_INDUSTRIES, "general");
	return singleOrList(Array.from({ length: count }, () => createCompanyName(style, industry)));
}

function createCompanyName(
	style: (typeof COMPANY_STYLES)[number],
	industry: (typeof COMPANY_INDUSTRIES)[number],
) {
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
