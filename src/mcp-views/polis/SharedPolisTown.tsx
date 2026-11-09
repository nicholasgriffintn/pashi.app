import { useEffect, useState } from "react";

import { isPolisRecording, type PolisRecording } from "../../shared/polis";
import { errorMessage } from "../shared/errors";
import { PolisApp } from "./PolisApp";

type SharedState =
	| { status: "loading" }
	| { status: "ready"; recording: PolisRecording }
	| { status: "missing"; message: string };

function PageStatus({ message, title }: { message: string; title: string }) {
	return (
		<main className="view">
			<section className="empty-state">
				<h1 className="card-title">{title}</h1>
				<p className="muted">{message}</p>
			</section>
		</main>
	);
}

async function fetchRecording(url: string): Promise<PolisRecording> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error("That town could not be opened");
	}

	const recording: unknown = await response.json();

	if (!isPolisRecording(recording)) {
		throw new Error("That town could not be opened");
	}

	return recording;
}

export function SharedPolisTown({
	recordingUrl,
	siteUrl,
}: {
	recordingUrl: string;
	siteUrl: string;
}) {
	const [state, setState] = useState<SharedState>({ status: "loading" });

	useEffect(() => {
		let cancelled = false;

		fetchRecording(recordingUrl)
			.then((recording) => {
				if (!cancelled) {
					setState({ status: "ready", recording });
				}
			})
			.catch((caught: unknown) => {
				if (!cancelled) {
					setState({
						status: "missing",
						message: errorMessage(caught, "That town could not be opened"),
					});
				}
			});

		return () => {
			cancelled = true;
		};
	}, [recordingUrl]);

	if (state.status === "missing") {
		return <PageStatus title="No such town" message={state.message} />;
	}

	if (state.status === "loading") {
		return <PageStatus title="Opening the town" message="Fetching its history…" />;
	}

	return <PolisApp recording={state.recording} siteUrl={siteUrl} />;
}
