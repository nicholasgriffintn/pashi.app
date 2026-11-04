export type PolychatSessionStatus =
	| { status: "connected"; pro: boolean }
	| { status: "disconnected" };

export type PolychatConnectOutcome = "connected" | "denied" | "expired" | "failed";
