import { useEffect, useState } from "react";

import { AppModeTabs, type AppMode } from "./components/AppModeTabs";
import { ConverterConsole } from "./components/ConverterConsole";
import { GeneratorConsole } from "./components/GeneratorConsole";
import { lastToolPath, rememberLastToolPath } from "./lib/last-tool";
import { pushAppPath, replaceAppPath } from "./lib/navigation";
import { fetchPashiInfo, type FeatureStatusMap } from "./lib/pashi-info";

import "./App.css";

type FeaturesState =
	| { status: "error" }
	| { status: "loading" }
	| { features: FeatureStatusMap; status: "ready" };

function getInitialMode(): AppMode {
	return window.location.pathname.startsWith("/convert/") ? "convert" : "generate";
}

function App() {
	const [mode, setMode] = useState<AppMode>(getInitialMode);
	const [featuresState, setFeaturesState] = useState<FeaturesState>({ status: "loading" });
	const [probeAttempt, setProbeAttempt] = useState(0);
	const conversionsUnavailable =
		featuresState.status === "error" ||
		(featuresState.status === "ready" && !featuresState.features.conversions.available);
	const effectiveMode = conversionsUnavailable && mode === "convert" ? "generate" : mode;

	useEffect(() => {
		function handlePopState() {
			setMode(getInitialMode());
		}

		window.addEventListener("popstate", handlePopState);

		return () => window.removeEventListener("popstate", handlePopState);
	}, []);

	useEffect(() => {
		let ignore = false;

		fetchPashiInfo()
			.then((info) => {
				if (!ignore) {
					setFeaturesState({ features: info.features, status: "ready" });
				}
			})
			.catch(() => {
				if (!ignore) {
					setFeaturesState({ status: "error" });
				}
			});

		return () => {
			ignore = true;
		};
	}, [probeAttempt]);

	useEffect(() => {
		if (!conversionsUnavailable || mode !== "convert") {
			return;
		}

		replaceAppPath("/");
	}, [conversionsUnavailable, mode]);

	function handleModeChange(nextMode: AppMode) {
		if (nextMode === "convert" && conversionsUnavailable) {
			if (featuresState.status === "error") {
				setFeaturesState({ status: "loading" });
				setProbeAttempt((attempt) => attempt + 1);
			}

			return;
		}

		rememberLastToolPath(effectiveMode, window.location.pathname);
		pushAppPath(lastToolPath(nextMode));
		setMode(nextMode);
	}

	const isProbeError = featuresState.status === "error";
	const controls = (
		<AppModeTabs
			disabledModes={
				conversionsUnavailable && !isProbeError
					? { convert: "Conversions are not available." }
					: undefined
			}
			hints={
				isProbeError ? { convert: "Could not reach Pashi. Select Convert to retry." } : undefined
			}
			mode={effectiveMode}
			onChange={handleModeChange}
		/>
	);

	if (effectiveMode === "convert") {
		return <ConverterConsole controls={controls} />;
	}

	return <GeneratorConsole controls={controls} />;
}

export default App;
