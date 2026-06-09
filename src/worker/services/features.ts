import type { ConversionEnv } from "./converters/conversion-pipeline";
import {
	FEATURE_REQUIRED_SERVICES,
	SERVICE_LABELS,
	SERVICE_REQUIRED_FEATURES,
	type FeatureStatusMap,
	type ServiceKey,
	type ServiceStatus,
	type ServiceStatusMap,
} from "../../shared/features.ts";

export type FeatureEnv = Partial<ConversionEnv> & {
	ENABLE_AI?: string;
	ENABLE_CONVERSIONS?: string;
};

function isEnabledFlag(value: string | undefined) {
	return value?.trim().toLowerCase() === "true";
}

function serviceStatus(
	label: string,
	requiredFor: ServiceStatus["requiredFor"],
	available: boolean,
): ServiceStatus {
	return {
		available,
		label,
		requiredFor,
		status: available ? "available" : "missing",
	};
}

function unavailableServices(
	services: ServiceStatusMap,
	requiredServices: readonly ServiceKey[],
) {
	return requiredServices.filter((service) => !services[service].available);
}

export function createServiceStatus(env: FeatureEnv): ServiceStatusMap {
	return {
		ai: serviceStatus(SERVICE_LABELS.ai, SERVICE_REQUIRED_FEATURES.ai, Boolean(env.AI)),
		conversionBucket: serviceStatus(
			SERVICE_LABELS.conversionBucket,
			SERVICE_REQUIRED_FEATURES.conversionBucket,
			Boolean(env.CONVERSION_BUCKET),
		),
		conversionContainer: serviceStatus(
			SERVICE_LABELS.conversionContainer,
			SERVICE_REQUIRED_FEATURES.conversionContainer,
			Boolean(env.CONVERSION_CONTAINER),
		),
		conversionQueue: serviceStatus(
			SERVICE_LABELS.conversionQueue,
			SERVICE_REQUIRED_FEATURES.conversionQueue,
			Boolean(env.CONVERSION_QUEUE),
		),
	};
}

export function createFeatureStatus(env: FeatureEnv): FeatureStatusMap {
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
			unavailableServices: aiUnavailableServices,
		},
		conversions: {
			available: conversionsEnabled && conversionUnavailableServices.length === 0,
			enabled: conversionsEnabled,
			requiredServices: conversionRequiredServices,
			unavailableServices: conversionUnavailableServices,
		},
	};
}
