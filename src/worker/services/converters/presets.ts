const CONVERTER_FIELD_PRESETS: Record<string, Record<string, string>> = {
	"audio-bitrate-changer": { bitrate: "192k" },
	"audio-channel-remover": { channels: "1" },
	"audio-format-converter": {},
	"audio-mono-stereo-converter": { channels: "2" },
	"audio-sample-rate-converter": { sampleRate: "44100" },
	"audio-thumbnail-generator": { operation: "waveform", outputFormat: "png" },
	"audio-trimmer": { duration: "10", operation: "trim" },
	"audio-waveform-generator": { operation: "waveform", outputFormat: "png" },
	"slackmoji": { operation: "slackmoji", outputFormat: "gif" },
	"change-video-fps": { fps: "30" },
	"extract-audio-from-video": { operation: "extract-audio", outputFormat: "mp3" },
	"markdown-to-html-converter": { outputFormat: "wordpress-html" },
	"resize-video-dimensions": { height: "720", operation: "resize", width: "1280" },
	"video-audio-remover": { operation: "remove-audio" },
	"video-bitrate-changer": { bitrate: "2500k" },
	"video-compressor": { bitrate: "2500k" },
	"video-compressor-simple": { bitrate: "2500k" },
	"video-duration-cutter": { duration: "10", operation: "trim" },
	"video-frame-extractor": { operation: "thumbnail", outputFormat: "png" },
	"video-frame-sequence-exporter": { operation: "thumbnail", outputFormat: "png" },
	"video-format-converter": {},
	"video-grayscale": { operation: "grayscale" },
	"video-keyframe-extractor": { operation: "thumbnail", outputFormat: "png" },
	"video-speed-changer": { speed: "1.25" },
	"video-thumbnail-generator": { operation: "thumbnail", outputFormat: "png" },
};

export function applyConverterPresetFields(type: string, fields: Record<string, string>) {
	const preset = CONVERTER_FIELD_PRESETS[type.trim().toLowerCase()];
	if (!preset) {
		return fields;
	}

	return {
		...preset,
		...fields,
	};
}
