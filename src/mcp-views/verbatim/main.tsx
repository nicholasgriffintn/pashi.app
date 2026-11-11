import { createRoot } from "react-dom/client";

import { host, readViewData } from "../shared/host";

import "../shared/view.css";
import "../../shared-ui/readings.css";
import { isVerbatimConfig } from "./config";
import { VerbatimApp } from "./VerbatimApp";

import "./verbatim.css";

const root = document.getElementById("root");

if (root) {
	void host.connect("pashi-verbatim");
	createRoot(root).render(
		<VerbatimApp contextLength={readViewData(isVerbatimConfig).limits.contextLength} />,
	);
}
