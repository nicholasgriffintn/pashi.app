import type { ConversionEnv } from "./converters/conversion-pipeline";
import { createFeatureStatus, createServiceStatus } from "./features";

export async function createHealthResponse(env: ConversionEnv) {
	const services = createServiceStatus(env);
	const checks: Record<string, "fail" | "pass" | "skip"> = {};

	if (env.CONVERSION_BUCKET) {
		try {
			await env.CONVERSION_BUCKET.head("health-probe");
			checks.bucket = "pass";
		} catch {
			checks.bucket = "fail";
		}
	} else {
		checks.bucket = "skip";
	}

	checks.catalogue = "pass";

	const healthy = !Object.values(checks).includes("fail");

	return Response.json(
		{
			checks,
			features: createFeatureStatus(env),
			services,
			status: healthy ? "ok" : "degraded",
			time: new Date().toISOString(),
		},
		{
			headers: { "Cache-Control": "no-store" },
			status: healthy ? 200 : 503,
		},
	);
}
