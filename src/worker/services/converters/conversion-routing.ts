export function isQueuedConversionUploadRequest(converterId: string, contentType = "") {
	return (
		(converterId === "image-format" && (
			contentType.includes("image/") ||
			contentType.includes("multipart/form-data") ||
			contentType.includes("application/octet-stream")
		)) ||
		(converterId === "audio-format" && (
			contentType.includes("audio/") ||
			contentType.includes("multipart/form-data") ||
			contentType.includes("application/octet-stream")
		)) ||
		(converterId === "document-format" && (
			contentType.includes("application/epub+zip") ||
			contentType.includes("application/msword") ||
			contentType.includes("application/rtf") ||
			contentType.includes("application/vnd.oasis.opendocument.text") ||
			contentType.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
			contentType.includes("multipart/form-data") ||
			contentType.includes("text/") ||
			contentType.includes("application/octet-stream")
		)) ||
		(converterId === "video-format" && (
			contentType.includes("audio/") ||
			contentType.includes("video/") ||
			contentType.includes("multipart/form-data") ||
			contentType.includes("application/octet-stream")
		))
	);
}
