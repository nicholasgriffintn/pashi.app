type PashiHitType = "noise" | "tone";

interface PashiImpactHit {
	end: number;
	frequency?: number;
	start: number;
	type: PashiHitType;
	volume: number;
}

interface PashiImpactSequence {
	duration: number;
	hits: PashiImpactHit[];
}

export function createPashiImpactSequence(): PashiImpactSequence {
	return {
		duration: 0.18,
		hits: [
			{ end: 0.055, start: 0, type: "noise", volume: 0.28 },
			{ end: 0.075, frequency: 180, start: 0.006, type: "tone", volume: 0.2 },
			{ end: 0.16, frequency: 760, start: 0.035, type: "tone", volume: 0.08 },
		],
	};
}

export async function playPashiImpact() {
	const AudioContext = window.AudioContext;
	if (!AudioContext) {
		return;
	}

	const audio = new AudioContext();
	const sequence = createPashiImpactSequence();
	const startedAt = audio.currentTime;

	for (const hit of sequence.hits) {
		if (hit.type === "noise") {
			playNoiseHit(audio, hit, startedAt);
		} else {
			playToneHit(audio, hit, startedAt);
		}
	}

	await closeAfter(audio, sequence.duration + 0.04);
}

function playNoiseHit(audio: AudioContext, hit: PashiImpactHit, startedAt: number) {
	const frameCount = Math.max(1, Math.floor(audio.sampleRate * (hit.end - hit.start)));
	const buffer = audio.createBuffer(1, frameCount, audio.sampleRate);
	const channel = buffer.getChannelData(0);

	for (let index = 0; index < frameCount; index += 1) {
		const fade = 1 - index / frameCount;
		channel[index] = (Math.random() * 2 - 1) * fade;
	}

	const source = audio.createBufferSource();
	const gain = audio.createGain();
	const startsAt = startedAt + hit.start;
	const endsAt = startedAt + hit.end;

	source.buffer = buffer;
	gain.gain.setValueAtTime(hit.volume, startsAt);
	gain.gain.exponentialRampToValueAtTime(0.001, endsAt);
	source.connect(gain).connect(audio.destination);
	source.start(startsAt);
	source.stop(endsAt);
}

function playToneHit(audio: AudioContext, hit: PashiImpactHit, startedAt: number) {
	if (!hit.frequency) {
		return;
	}

	const oscillator = audio.createOscillator();
	const gain = audio.createGain();
	const startsAt = startedAt + hit.start;
	const endsAt = startedAt + hit.end;

	oscillator.frequency.setValueAtTime(hit.frequency, startsAt);
	oscillator.type = "triangle";
	gain.gain.setValueAtTime(hit.volume, startsAt);
	gain.gain.exponentialRampToValueAtTime(0.001, endsAt);
	oscillator.connect(gain).connect(audio.destination);
	oscillator.start(startsAt);
	oscillator.stop(endsAt);
}

function closeAfter(audio: AudioContext, seconds: number) {
	return new Promise<void>((resolve) => {
		window.setTimeout(() => {
			void audio.close().finally(resolve);
		}, seconds * 1000);
	});
}
