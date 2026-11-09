import { createPolisEngine } from "./engine/engine";

const engine = createPolisEngine((event) => self.postMessage(event));

self.addEventListener("message", (message) => engine.receive(message.data));
