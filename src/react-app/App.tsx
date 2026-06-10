import { useEffect, useState } from "react";

import { AppModeTabs, type AppMode } from "./components/AppModeTabs";
import { ConverterConsole } from "./components/ConverterConsole";
import { GeneratorConsole } from "./components/GeneratorConsole";
import { pushAppPath, replaceAppPath } from "./lib/navigation";
import { fetchPashiInfo, type FeatureStatusMap } from "./lib/pashi-info";
import "./App.css";

function getInitialMode(): AppMode {
	return window.location.pathname.startsWith("/convert/") ? "convert" : "generate";
}

function App() {
	const [mode, setMode] = useState<AppMode>(getInitialMode);
	const [features, setFeatures] = useState<FeatureStatusMap | undefined>();
	const conversionsUnavailable = features ? !features.conversions.available : false;
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
					setFeatures(info.features);
				}
			})
			.catch(() => {
				if (!ignore) {
					setFeatures(undefined);
				}
			});

		return () => {
			ignore = true;
		};
	}, []);

	useEffect(() => {
		if (!conversionsUnavailable || mode !== "convert") {
			return;
		}

		replaceAppPath("/");
	}, [conversionsUnavailable, mode]);

	function handleModeChange(nextMode: AppMode) {
		if (nextMode === "convert" && conversionsUnavailable) {
			return;
		}

		const nextPath =
			nextMode === "convert" ? "/convert/markdown-to-jira" : "/";
		pushAppPath(nextPath);
		setMode(nextMode);
	}

	const modeTabs = (
		<AppModeTabs
			disabledModes={conversionsUnavailable ? { convert: "Conversions are not available." } : undefined}
			mode={effectiveMode}
			onChange={handleModeChange}
		/>
	);

	if (effectiveMode === "convert") {
		return <ConverterConsole modeTabs={modeTabs} />;
	}
	return <GeneratorConsole modeTabs={modeTabs} />;
}

export default App;
