const EXPORT_FORMATS = ["csv", "json", "txt"] as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export function listExportFormats() {
	return EXPORT_FORMATS;
}

export function isExportFormat(format: string): format is ExportFormat {
	return EXPORT_FORMATS.includes(format as ExportFormat);
}
