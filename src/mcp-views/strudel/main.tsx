import { createRoot } from "react-dom/client";

import { host, readViewData } from "../shared/host";

import "../shared/view.css";
import { isStrudelConfig } from "./config";
import { StrudelApp } from "./StrudelApp";

import "./strudel.css";

const root = document.getElementById("root");

if (root) {
	void host.connect("pashi-strudel");
	createRoot(root).render(<StrudelApp config={readViewData(isStrudelConfig)} />);
}
