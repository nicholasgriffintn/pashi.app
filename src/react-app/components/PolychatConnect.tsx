import { useSearchParams } from "react-router-dom";

import { usePolychatConnection } from "../lib/use-polychat-session";

const CONNECT_OUTCOMES: Record<string, string> = {
	denied: "That request was turned down in Polychat.",
	expired: "That request expired, or started in another browser. Start again here.",
	failed: "Polychat could not finish connecting. Try again.",
};

export function PolychatConnect() {
	const { connect, disconnect, session } = usePolychatConnection();
	const [searchParams] = useSearchParams();
	const isConnected = session.status === "connected";
	const outcome = CONNECT_OUTCOMES[searchParams.get("polychat") ?? ""];

	return (
		<div className="api-key-field polychat-connect" data-configured={isConnected || undefined}>
			<div className="api-key-field-head">
				<span className="polychat-connect-title">Polychat</span>
				<span className="api-key-field-status">
					{isConnected ? (session.pro ? "Pro" : "Connected") : "Not connected"}
				</span>
			</div>

			{isConnected ? (
				<>
					<p className="api-key-field-hint">
						{session.pro
							? "AI and media conversion are on, and Polychat can use every Pashi tool."
							: "AI is on, and Polychat can use Pashi text tools. Media conversion needs Polychat Pro."}
					</p>
					<button
						className="polychat-connect-action"
						disabled={disconnect.isPending}
						onClick={() => disconnect.mutate()}
						type="button"
					>
						Disconnect
					</button>
				</>
			) : (
				<>
					<p className="api-key-field-hint">
						{outcome ??
							"Connect your account to use AI here, on your Polychat plan. Polychat gets Pashi tools in your chats too."}
					</p>
					<button
						className="polychat-connect-action"
						disabled={connect.isPending}
						onClick={() => connect.mutate()}
						type="button"
					>
						{connect.isPending ? "Asking Polychat" : "Connect Polychat"}
					</button>
					{connect.error ? <p role="alert">{connect.error.message}</p> : null}
				</>
			)}
		</div>
	);
}
