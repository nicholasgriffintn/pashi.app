import { useEffect, useRef, useState } from "react";

import { answerViewRequest, readViewMessage, readViewSize, ViewRequestError } from "./mcp-app-host";
import { useAppliedTheme } from "./use-theme";

export function useMcpAppHost(apiKey: string, viewOrigin: string) {
	const frameRef = useRef<HTMLIFrameElement>(null);
	const [height, setHeight] = useState<number>();
	const theme = useAppliedTheme();
	const context = useRef({ apiKey, theme });

	useEffect(() => {
		context.current = { apiKey, theme };
		frameRef.current?.contentWindow?.postMessage(
			{ jsonrpc: "2.0", method: "ui/notifications/host-context-changed", params: { theme } },
			viewOrigin,
		);
	}, [apiKey, theme, viewOrigin]);

	useEffect(() => {
		function handleMessage(event: MessageEvent) {
			const view = frameRef.current?.contentWindow;
			const message =
				view && event.source === view && event.origin === viewOrigin
					? readViewMessage(event.data)
					: undefined;

			if (!view || !message) {
				return;
			}

			const size = readViewSize(message);

			if (size) {
				setHeight(size.height);
			}

			if (message.id === undefined) {
				return;
			}

			const { id } = message;

			answerViewRequest(message, context.current).then(
				(result) => view.postMessage({ id, jsonrpc: "2.0", result }, viewOrigin),
				(error: unknown) =>
					view.postMessage(
						{
							error: {
								code: error instanceof ViewRequestError ? error.code : -32000,
								message: error instanceof Error ? error.message : "The request failed.",
							},
							id,
							jsonrpc: "2.0",
						},
						viewOrigin,
					),
			);
		}

		window.addEventListener("message", handleMessage);

		return () => window.removeEventListener("message", handleMessage);
	}, [viewOrigin]);

	return { frameRef, height };
}
