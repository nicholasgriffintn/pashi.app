export interface FieldDisplayModel {
	entries: Array<[string, string]>;
	error?: string;
	status?: string;
}

export function createFieldDisplayModel(fields: Record<string, string>): FieldDisplayModel {
	const status = typeof fields.status === "string" && fields.status ? fields.status : undefined;
	const error = typeof fields.error === "string" && fields.error.trim() ? fields.error : undefined;
	const entries = Object.entries(fields).filter(([key, value]) => (
		key !== "status" &&
		key !== "error" &&
		value !== ""
	));

	return { entries, error, status };
}
