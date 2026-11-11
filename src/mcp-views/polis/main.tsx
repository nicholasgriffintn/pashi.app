import { createRoot } from "react-dom/client";

import { FULLSCREEN_CAPABILITIES, host, readViewData } from "../shared/host";

import "../shared/view.css";
import "../shared/readings.css";
import { isPolisViewData } from "./config";
import { PolisApp } from "./PolisApp";
import { SharedPolisTown } from "./SharedPolisTown";

import "./polis.css";

const root = document.getElementById("root");

if (root) {
	const data = readViewData(isPolisViewData);

	void host.connect("pashi-polis", FULLSCREEN_CAPABILITIES);
	createRoot(root).render(
		data.mode === "shared" ? (
			<SharedPolisTown recordingUrl={data.recordingUrl} siteUrl={data.siteUrl} />
		) : (
			<PolisApp siteUrl={data.siteUrl} />
		),
	);
}
