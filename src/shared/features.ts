export type FeatureKey = "ai" | "conversions";
export type ServiceKey = "ai" | "conversionBucket" | "conversionContainer" | "conversionQueue";

export interface ServiceStatus {
	available: boolean;
	label: string;
	requiredFor: readonly FeatureKey[];
	status: "available" | "missing";
}

export interface FeatureStatus {
	available: boolean;
	enabled: boolean;
	requiredServices: readonly ServiceKey[];
	unavailableServices: readonly ServiceKey[];
}

export type ServiceStatusMap = Record<ServiceKey, ServiceStatus>;
export type FeatureStatusMap = Record<FeatureKey, FeatureStatus>;

export const FEATURE_REQUIRED_SERVICES = {
	ai: ["ai"],
	conversions: ["conversionBucket", "conversionContainer", "conversionQueue"],
} as const satisfies Record<FeatureKey, readonly ServiceKey[]>;

export const SERVICE_LABELS = {
	ai: "Cloudflare Workers AI",
	conversionBucket: "Conversion R2 bucket",
	conversionContainer: "Conversion container",
	conversionQueue: "Conversion queue",
} as const satisfies Record<ServiceKey, string>;

export const SERVICE_REQUIRED_FEATURES = {
	ai: ["ai"],
	conversionBucket: ["conversions"],
	conversionContainer: ["conversions"],
	conversionQueue: ["conversions"],
} as const satisfies Record<ServiceKey, readonly FeatureKey[]>;
