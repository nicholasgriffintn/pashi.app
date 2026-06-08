import { FormEvent, useMemo, useState } from "react";
import "./App.css";

const DEFAULT_PROMPT = "https://pashi.app";

function PashiMascot() {
	return (
		<svg
			aria-label="Pashi mascot"
			className="mascot"
			role="img"
			viewBox="0 0 260 260"
			xmlns="http://www.w3.org/2000/svg"
		>
			<defs>
				<linearGradient id="pashi-fur" x1="34" x2="222" y1="30" y2="224">
					<stop stopColor="#fff5d6" />
					<stop offset="0.55" stopColor="#f3a93f" />
					<stop offset="1" stopColor="#ec2f72" />
				</linearGradient>
				<linearGradient id="pashi-shadow" x1="68" x2="225" y1="61" y2="210">
					<stop stopColor="#24ffe8" />
					<stop offset="1" stopColor="#6a38ff" />
				</linearGradient>
			</defs>
			<path className="mascot-speed" d="M29 58h74M18 91h57M35 215h94M175 32h44" />
			<path
				className="mascot-shadow"
				d="M65 82c8-37 41-58 73-37l13 9 34-30c8-7 20 0 18 11l-9 51c16 16 25 38 22 63-5 46-46 83-94 81-48-3-83-42-79-89 1-14 6-28 14-40L45 65c-4-11 8-21 18-15l36 23c-12 4-24 8-34 9Z"
			/>
			<path
				className="mascot-head"
				d="M58 80c8-37 41-58 73-37l14 9 34-30c8-7 20 0 18 11l-9 51c16 16 25 38 22 63-5 46-46 83-94 81-48-3-83-42-79-89 1-14 6-28 14-40L39 63c-4-11 8-21 18-15l36 23c-12 4-24 8-35 9Z"
			/>
			<path className="mascot-mask" d="M75 116c18-24 62-30 97-11 18 10 22 31 9 48-19 24-64 31-98 12-18-10-21-31-8-49Z" />
			<path className="mascot-eye" d="M91 126c8-10 29-11 38-1-12 18-29 19-38 1Z" />
			<path className="mascot-eye" d="M145 123c10-8 29-5 36 7-14 15-31 13-36-7Z" />
			<path className="mascot-spark" d="M122 91l13-35 7 34 33-12-27 23 27 22-34-9-12 36-8-36-33 11 26-24-25-21Z" />
			<path className="mascot-mouth" d="M114 165c16 10 37 9 53-5" />
		</svg>
	);
}

function App() {
	const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
	const [qrPayload, setQrPayload] = useState(DEFAULT_PROMPT);
	const [error, setError] = useState("");

	const qrUrl = useMemo(() => {
		const params = new URLSearchParams({
			data: qrPayload,
			format: "png",
			size: "520x520",
		});
		return `/api/qr?${params.toString()}`;
	}, [qrPayload]);

	function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const nextPayload = prompt.trim();
		if (!nextPayload) {
			setError("Give Pashi something to snap.");
			return;
		}

		setError("");
		setQrPayload(nextPayload);
	}

	return (
		<main className="shell">
			<section className="hero" aria-labelledby="pashi-title">
				<div className="copy">
					<p className="eyebrow">Snap-made generators</p>
					<h1 id="pashi-title">Pashi</h1>
					<p className="intro">
						Generate useful little things in a snap. First up: QR images for
						links, notes, and anything else that fits in a pocket-sized code.
					</p>

					<form className="generator" onSubmit={handleSubmit}>
						<label htmlFor="payload">QR payload</label>
						<div className="input-row">
							<input
								id="payload"
								name="payload"
								onChange={(event) => setPrompt(event.target.value)}
								placeholder="Paste a link or short message"
								type="text"
								value={prompt}
							/>
							<button type="submit">Snap</button>
						</div>
						{error ? <p className="error">{error}</p> : null}
					</form>
				</div>

				<div className="showcase" aria-live="polite">
					<PashiMascot />
					<div className="qr-frame">
						<img alt={`QR code for ${qrPayload}`} src={qrUrl} />
					</div>
				</div>
			</section>
		</main>
	);
}

export default App;
