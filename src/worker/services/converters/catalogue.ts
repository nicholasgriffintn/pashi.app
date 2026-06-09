import type { ConverterTool } from "./types";

const TEXT_REQUEST_FORMATS = [
	"application/json",
	"application/x-www-form-urlencoded",
	"text/plain",
] as const;
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
	"text/plain",
] as const;
const AUDIO_REQUEST_FORMATS = [
	"application/octet-stream",
	"audio/*",
	"audio/aac",
	"audio/flac",
	"audio/mpeg",
	"audio/ogg",
	"audio/wav",
	"multipart/form-data",
] as const;
const VIDEO_REQUEST_FORMATS = [
	"audio/*",
	"application/octet-stream",
	"multipart/form-data",
	"video/*",
	"video/avi",
	"video/mpeg",
	"video/mp4",
	"video/quicktime",
	"video/webm",
] as const;
const FILE_REQUEST_FORMATS = [
	"application/json",
	"application/x-www-form-urlencoded",
	"multipart/form-data",
	"text/csv",
	"text/html",
	"text/markdown",
	"text/plain",
] as const;
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
	"text/plain",
] as const;

const CONVERTER_TOOLS: readonly ConverterTool[] = [
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
					url: "/api/markdown-to-jira",
				},
				{
					description: "Convert Markdown supplied in the query string.",
					method: "GET",
					url: "/api/markdown-to-jira?input=%23%23%20Heading",
				},
			],
			fields: [],
			methods: ["GET", "POST"],
			response: "json",
		},
		audience: "Documents",
		description: "Convert Markdown into Jira and Confluence wiki markup.",
		display: {
			actionLabel: "Convert to Jira",
			category: "Jira and Confluence",
			examples: [
				"## Release notes\n\n- **Fixed** auth\n- Added `copy` action",
				"[Pashi](https://pashi.app) is **fast**",
			],
		},
		endpoint: "/api/markdown-to-jira",
		id: "markdown-to-jira",
		input: {
			label: "Markdown",
			kind: "text",
			required: true,
		},
		label: "Markdown to Jira",
		outputs: ["jira", "confluence"],
		placeholder: "## Heading\n\n- **Bold** item\n- [Link](https://pashi.app)",
		runtime: "worker",
		status: "available",
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
					url: "/api/jira-to-markdown",
				},
			],
			fields: [],
			methods: ["GET", "POST"],
			response: "json",
		},
		audience: "Documents",
		description: "Convert Jira and Confluence wiki markup back into Markdown.",
		display: {
			actionLabel: "Convert to Markdown",
			category: "Jira and Confluence",
			examples: [
				"h2. Release notes\n\n* *Fixed* auth\n* Added {{copy}} action",
				"[Pashi|https://pashi.app] is *fast*",
			],
		},
		endpoint: "/api/jira-to-markdown",
		id: "jira-to-markdown",
		input: {
			label: "Jira markup",
			kind: "text",
			required: true,
		},
		label: "Jira to Markdown",
		outputs: ["markdown"],
		placeholder: "h2. Heading\n\n* *Bold* item\n* [Link|https://pashi.app]",
		runtime: "worker",
		status: "available",
	},
	{
		aliases: ["image-format", "image-transcode", "image-url", "remote-image", "png-to-webp", "jpg-to-webp"],
		api: {
			accepts: IMAGE_REQUEST_FORMATS,
			examples: [
				{
					description: "Fetch and convert a public image URL to WebP.",
					method: "GET",
					url: "/api/image-format?input=https%3A%2F%2Fnicholasgriffin.dev%2Favatar.png&outputFormat=webp",
				},
				{
					body: "file=@image.png; outputFormat=avif",
					contentType: "multipart/form-data",
					description: "Upload an image file and create a conversion job.",
					method: "POST",
					url: "/api/image-format",
				},
				{
					description: "Check a queued image conversion job.",
					method: "GET",
					url: "/api/image-format?job=<job-id>",
				},
			],
			fields: [
				{
					description: "Target image format.",
					id: "outputFormat",
					values: ["webp", "jpeg", "png", "avif", "gif", "bmp", "tiff", "ico", "mjpeg"],
				},
				{
					description: "Optional image quality from 1 to 100.",
					id: "quality",
				},
			],
			methods: ["GET", "POST"],
			response: "json",
		},
		audience: "Media",
		description: "Convert image URLs immediately, or upload image files into the async ffmpeg pipeline.",
		display: {
			actionLabel: "Convert image",
			category: "Media",
			examples: [],
		},
		endpoint: "/api/image-format",
		id: "image-format",
		input: {
			accept: ["image/*", ".avif", ".bmp", ".gif", ".ico", ".jpg", ".jpeg", ".mjpeg", ".png", ".tif", ".tiff", ".webp"],
			label: "Image file",
			kind: "file",
			required: true,
		},
		label: "Image formats",
		outputs: ["webp", "jpeg", "png", "avif", "gif", "bmp", "tiff", "ico", "mjpeg"],
		placeholder: "Any ffmpeg-readable image",
		runtime: "container",
		status: "available",
	},
	{
		aliases: ["file-format", "text-file", "data-file", "json-to-csv", "csv-to-json"],
		api: {
			accepts: FILE_REQUEST_FORMATS,
			examples: [
				{
					body: "name,role\nAda,admin",
					contentType: "text/csv",
					description: "Post raw CSV and choose JSON output with query fields.",
					method: "POST",
					url: "/api/file-format?outputFormat=json&sourceName=people.csv",
				},
				{
					body: "file=@people.csv; outputFormat=json",
					contentType: "multipart/form-data",
					description: "Upload a file with a file field and outputFormat field.",
					method: "POST",
					url: "/api/file-format",
				},
			],
			fields: [
				{
					description: "Target text-file format.",
					id: "outputFormat",
					required: true,
					values: ["txt", "md", "json", "csv", "html"],
				},
				{
					description: "Optional source filename used for conversion context and download names.",
					id: "sourceName",
				},
			],
			methods: ["GET", "POST"],
			response: "json",
		},
		audience: "Media",
		description: "Convert text, Markdown, JSON, CSV, and HTML files between common text formats.",
		display: {
			actionLabel: "Convert file",
			category: "Files",
			examples: [],
		},
		id: "file-format",
		endpoint: "/api/file-format",
		input: {
			accept: ["text/plain", "text/markdown", "text/csv", "text/html", "application/json", ".txt", ".md", ".markdown", ".csv", ".html", ".json"],
			label: "Text file",
			kind: "file",
			required: true,
		},
		label: "Text file formats",
		outputs: ["txt", "md", "json", "csv", "html"],
		placeholder: "TXT, Markdown, JSON, CSV, or HTML",
		runtime: "worker",
		status: "available",
	},
	{
		aliases: ["document-format", "document-convert", "docx-to-markdown", "markdown-to-docx", "md-to-docx"],
		api: {
			accepts: DOCUMENT_REQUEST_FORMATS,
			examples: [
				{
					body: "file=@notes.md; outputFormat=docx",
					contentType: "multipart/form-data",
					description: "Upload a document and create a Pandoc conversion job.",
					method: "POST",
					url: "/api/document-format",
				},
				{
					description: "Check a queued document conversion job.",
					method: "GET",
					url: "/api/document-format?job=<job-id>",
				},
			],
			fields: [
				{
					description: "Target document format. The API accepts safe Pandoc output extensions.",
					id: "outputFormat",
					required: true,
					values: ["docx", "odt", "rtf", "epub", "html", "md", "txt"],
				},
			],
			methods: ["GET", "POST"],
			response: "json",
		},
		audience: "Documents",
		description: "Convert uploaded documents through the async Cloudflare Container running Pandoc.",
		display: {
			actionLabel: "Convert document",
			category: "Documents",
			examples: [],
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
				".txt",
			],
			label: "Document file",
			kind: "file",
			required: true,
		},
		label: "Document formats",
		outputs: ["docx", "odt", "rtf", "epub", "html", "md", "txt"],
		placeholder: "DOCX, ODT, RTF, EPUB, HTML, Markdown, or TXT",
		runtime: "container",
		status: "available",
	},
	{
		aliases: ["video-format", "video-transcode", "mp4-to-webm"],
		api: {
			accepts: VIDEO_REQUEST_FORMATS,
			examples: [
				{
					body: "file=@clip.mp4; outputFormat=webm",
					contentType: "multipart/form-data",
					description: "Upload a video file and create a conversion job.",
					method: "POST",
					url: "/api/video-format",
				},
				{
					description: "Check a queued video conversion job.",
					method: "GET",
					url: "/api/video-format?job=<job-id>",
				},
			],
			fields: [
				{
					description: "Target video, audio, or animated image format.",
					id: "outputFormat",
					required: true,
					values: ["mp4", "webm", "mov", "mkv", "avi", "m4v", "mpeg", "mpg", "ogv", "gif", "mp3", "wav", "flac", "m4a", "ogg", "opus"],
				},
			],
			methods: ["GET", "POST"],
			response: "json",
		},
		audience: "Media",
		description: "Convert uploaded video through an async Cloudflare Container running ffmpeg.",
		display: {
			actionLabel: "Convert video",
			category: "Media",
			examples: [],
		},
		endpoint: "/api/video-format",
		id: "video-format",
		input: {
			accept: ["video/*", "audio/*", ".3gp", ".avi", ".flv", ".m4v", ".mkv", ".mov", ".mp4", ".mpeg", ".mpg", ".ogv", ".ts", ".webm", ".wmv"],
			label: "Video or audio file",
			kind: "file",
			required: true,
		},
		label: "Video and audio formats",
		outputs: ["mp4", "webm", "mov", "mkv", "avi", "m4v", "mpeg", "mpg", "ogv", "gif", "mp3", "wav", "flac", "m4a", "ogg", "opus"],
		placeholder: "Any ffmpeg-readable video or audio",
		runtime: "container",
		status: "available",
	},
	{
		aliases: ["audio-format", "audio-transcode", "mp3-to-wav", "wav-to-mp3"],
		api: {
			accepts: AUDIO_REQUEST_FORMATS,
			examples: [
				{
					body: "file=@clip.mp3; outputFormat=wav",
					contentType: "multipart/form-data",
					description: "Upload an audio file and create a conversion job.",
					method: "POST",
					url: "/api/audio-format",
				},
				{
					description: "Check a queued audio conversion job.",
					method: "GET",
					url: "/api/audio-format?job=<job-id>",
				},
			],
			fields: [
				{
					description: "Target audio format. The API accepts any safe ffmpeg output extension.",
					id: "outputFormat",
					required: true,
					values: ["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus", "aiff", "mka", "wma"],
				},
			],
			methods: ["GET", "POST"],
			response: "json",
		},
		audience: "Media",
		description: "Convert uploaded audio through the async Cloudflare Container running ffmpeg.",
		display: {
			actionLabel: "Convert audio",
			category: "Media",
			examples: [],
		},
		endpoint: "/api/audio-format",
		id: "audio-format",
		input: {
			accept: ["audio/*", ".aac", ".aiff", ".flac", ".m4a", ".mka", ".mp3", ".oga", ".ogg", ".opus", ".wav", ".wma"],
			label: "Audio file",
			kind: "file",
			required: true,
		},
		label: "Audio formats",
		outputs: ["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus", "aiff", "mka", "wma"],
		placeholder: "Any ffmpeg-readable audio",
		runtime: "container",
		status: "available",
	},
];

export function listConverterTools() {
	return CONVERTER_TOOLS;
}

export function findConverterTool(type: string) {
	const normalisedType = type.trim().toLowerCase();
	return CONVERTER_TOOLS.find((tool) =>
		tool.id === normalisedType || tool.aliases.includes(normalisedType),
	);
}
