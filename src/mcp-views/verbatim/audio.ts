const PCM_SAMPLE_MAX = 0x7fff;
const PCM_SAMPLE_MIN = 0x8000;
const MICROPHONE_BUFFER_SIZE = 4096;
const MICROPHONE_PROCESSOR_NAME = "pcm16-microphone-processor";
const AUDIO_LEVEL_SCALE = 4;

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
	autoGainControl: false,
	echoCancellation: true,
	noiseSuppression: true,
};

const MICROPHONE_PROCESSOR_SOURCE = `
class Pcm16MicrophoneProcessor extends AudioWorkletProcessor {
	constructor(options) {
		super();
		const size = options?.processorOptions?.bufferSize;
		this.bufferSize = Number.isInteger(size) && size > 0 ? size : ${MICROPHONE_BUFFER_SIZE};
		this.buffer = new Float32Array(this.bufferSize);
		this.offset = 0;
		this.isStopped = false;
		this.port.addEventListener("message", (event) => {
			if (event.data?.type === "stop") this.isStopped = true;
		});
		this.port.start();
	}

	process(inputs, outputs) {
		for (const channel of outputs[0] ?? []) channel.fill(0);
		if (this.isStopped) return false;
		const input = inputs[0]?.[0];
		if (!input) return true;
		let read = 0;
		while (read < input.length) {
			const length = Math.min(this.bufferSize - this.offset, input.length - read);
			this.buffer.set(input.subarray(read, read + length), this.offset);
			this.offset += length;
			read += length;
			if (this.offset === this.bufferSize) {
				this.port.postMessage({ input: this.buffer.slice() });
				this.offset = 0;
			}
		}
		return true;
	}
}
registerProcessor("${MICROPHONE_PROCESSOR_NAME}", Pcm16MicrophoneProcessor);
`;

export interface MicrophoneController {
	stop: () => void;
}

export function requestMicrophone() {
	if (!navigator.mediaDevices?.getUserMedia) {
		throw new Error("This browser cannot use a microphone here.");
	}

	return navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
}

export function stopMediaStream(stream: MediaStream | null) {
	for (const track of stream?.getTracks() ?? []) {
		track.stop();
	}
}

export function downsampleFloat32(input: Float32Array, inputRate: number, outputRate: number) {
	if (outputRate === inputRate) {
		return input.slice();
	}

	const ratio = inputRate / outputRate;
	const output = new Float32Array(Math.floor(input.length / ratio));

	for (let index = 0; index < output.length; index += 1) {
		const start = Math.floor(index * ratio);
		const end = Math.min(Math.floor((index + 1) * ratio), input.length);
		let sum = 0;

		for (let cursor = start; cursor < end; cursor += 1) {
			sum += input[cursor];
		}

		output[index] = sum / Math.max(end - start, 1);
	}

	return output;
}

export function encodePcm16(input: Float32Array) {
	const buffer = new ArrayBuffer(input.length * 2);
	const view = new DataView(buffer);

	input.forEach((value, index) => {
		const sample = Math.max(-1, Math.min(1, value));

		view.setInt16(index * 2, sample < 0 ? sample * PCM_SAMPLE_MIN : sample * PCM_SAMPLE_MAX, true);
	});

	return buffer;
}

export function pcm16Level(chunk: ArrayBuffer) {
	const view = new DataView(chunk);
	const samples = chunk.byteLength / 2;
	let sumOfSquares = 0;

	for (let index = 0; index < samples; index += 1) {
		const sample = view.getInt16(index * 2, true);
		const value = sample / (sample < 0 ? PCM_SAMPLE_MIN : PCM_SAMPLE_MAX);

		sumOfSquares += value * value;
	}

	const level = samples ? Math.sqrt(sumOfSquares / samples) * AUDIO_LEVEL_SCALE : 0;

	return Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0;
}

export function encodePcm16Wav(chunks: readonly ArrayBuffer[], sampleRate: number) {
	const dataLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
	const buffer = new ArrayBuffer(44 + dataLength);
	const view = new DataView(buffer);
	const bytes = new Uint8Array(buffer);
	const writeAscii = (offset: number, value: string) => {
		for (let index = 0; index < value.length; index += 1) {
			view.setUint8(offset + index, value.charCodeAt(index));
		}
	};

	writeAscii(0, "RIFF");
	view.setUint32(4, 36 + dataLength, true);
	writeAscii(8, "WAVE");
	writeAscii(12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * 2, true);
	view.setUint16(32, 2, true);
	view.setUint16(34, 16, true);
	writeAscii(36, "data");
	view.setUint32(40, dataLength, true);

	let offset = 44;

	for (const chunk of chunks) {
		bytes.set(new Uint8Array(chunk), offset);
		offset += chunk.byteLength;
	}

	return buffer;
}

export function wavDataUrl(wav: ArrayBuffer) {
	const bytes = new Uint8Array(wav);
	let binary = "";

	for (let index = 0; index < bytes.length; index += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
	}

	return `data:audio/wav;base64,${btoa(binary)}`;
}

function connectSilently(audioContext: AudioContext, node: AudioNode) {
	const silent = audioContext.createGain();

	silent.gain.value = 0;
	node.connect(silent);
	silent.connect(audioContext.destination);

	return silent;
}

async function startWorklet(
	audioContext: AudioContext,
	source: MediaStreamAudioSourceNode,
	onSamples: (samples: Float32Array) => void,
): Promise<MicrophoneController> {
	const moduleUrl = URL.createObjectURL(
		new Blob([MICROPHONE_PROCESSOR_SOURCE], { type: "text/javascript" }),
	);

	try {
		await audioContext.audioWorklet.addModule(moduleUrl);
	} finally {
		URL.revokeObjectURL(moduleUrl);
	}

	const worklet = new AudioWorkletNode(audioContext, MICROPHONE_PROCESSOR_NAME, {
		numberOfInputs: 1,
		numberOfOutputs: 1,
		outputChannelCount: [1],
		processorOptions: { bufferSize: MICROPHONE_BUFFER_SIZE },
	});
	const onMessage = (event: MessageEvent<{ input?: Float32Array }>) => {
		if (event.data.input) {
			onSamples(event.data.input);
		}
	};

	worklet.port.addEventListener("message", onMessage);
	worklet.port.start();
	source.connect(worklet);

	const silent = connectSilently(audioContext, worklet);

	return {
		stop: () => {
			worklet.port.postMessage({ type: "stop" });
			worklet.port.removeEventListener("message", onMessage);
			worklet.disconnect();
			silent.disconnect();
		},
	};
}

function startScriptProcessor(
	audioContext: AudioContext,
	source: MediaStreamAudioSourceNode,
	onSamples: (samples: Float32Array) => void,
): MicrophoneController {
	const processor = audioContext.createScriptProcessor(MICROPHONE_BUFFER_SIZE, 1, 1);

	processor.onaudioprocess = (event) => onSamples(event.inputBuffer.getChannelData(0));
	source.connect(processor);

	const silent = connectSilently(audioContext, processor);

	return {
		stop: () => {
			processor.disconnect();
			silent.disconnect();
		},
	};
}

export async function startPcm16Microphone({
	onChunk,
	sampleRate,
	stream,
}: {
	onChunk: (chunk: ArrayBuffer) => void;
	sampleRate: number;
	stream: MediaStream;
}): Promise<MicrophoneController> {
	const audioContext = new AudioContext();
	const source = audioContext.createMediaStreamSource(stream);
	const onSamples = (samples: Float32Array) =>
		onChunk(encodePcm16(downsampleFloat32(samples, audioContext.sampleRate, sampleRate)));

	if (audioContext.state === "suspended") {
		await audioContext.resume();
	}

	let capture: MicrophoneController;

	try {
		capture = await startWorklet(audioContext, source, onSamples);
	} catch {
		capture = startScriptProcessor(audioContext, source, onSamples);
	}

	return {
		stop: () => {
			capture.stop();
			source.disconnect();
			void audioContext.close();
		},
	};
}
