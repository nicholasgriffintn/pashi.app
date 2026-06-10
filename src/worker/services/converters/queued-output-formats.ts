export const IMAGE_FORMAT_OUTPUTS = ["webp", "jpeg", "png", "avif", "gif", "bmp", "tiff", "ico", "mjpeg"] as const;
export const SLACKMOJI_OUTPUTS = ["gif"] as const;
export const SLACK_HDR_EMOJI_OUTPUTS = ["png"] as const;
export const DOCUMENT_FORMAT_OUTPUTS = ["docx", "odt", "rtf", "epub", "html", "md", "txt"] as const;
export const VIDEO_FORMAT_OUTPUTS = ["mp4", "webm", "mov", "mkv", "avi", "m4v", "mpeg", "mpg", "ogv", "gif", "png", "webp", "jpeg", "mp3", "wav", "flac", "m4a", "ogg", "opus"] as const;
export const AUDIO_FORMAT_OUTPUTS = ["mp3", "wav", "flac", "aac", "m4a", "ogg", "opus", "aiff", "mka", "wma", "png"] as const;

export const QUEUED_CONVERTER_OUTPUTS: Record<string, readonly string[]> = {
	"audio-format": AUDIO_FORMAT_OUTPUTS,
	"document-format": DOCUMENT_FORMAT_OUTPUTS,
	"image-format": IMAGE_FORMAT_OUTPUTS,
	"slack-hdr-emoji": SLACK_HDR_EMOJI_OUTPUTS,
	"slackmoji": SLACKMOJI_OUTPUTS,
	"video-format": VIDEO_FORMAT_OUTPUTS,
};
