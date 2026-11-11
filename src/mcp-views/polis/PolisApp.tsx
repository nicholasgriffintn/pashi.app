import type { PolisRecording } from "../../shared/polis";
import { Toast, useToast } from "../shared/Toast";
import { MapModes, NamePlate, Transport } from "./MapOverlays";
import { OpeningCard } from "./OpeningCard";
import { CitizenCard } from "./panels/CitizenCard";
import { PlaybackBar } from "./PlaybackBar";
import { SetupScreen } from "./SetupScreen";
import { SidePanel } from "./SidePanel";
import { usePolisEngine } from "./usePolisEngine";
import { useTownContext } from "./useTownContext";

export function PolisApp({ recording, siteUrl }: { recording?: PolisRecording; siteUrl: string }) {
	const { show, toast } = useToast();
	const engine = usePolisEngine({ notify: show, recording, siteUrl });
	const { setContainer } = engine;
	const started = engine.status !== null;

	useTownContext(engine.status);

	return (
		<main className="view polis">
			<div className="polis-stage">
				<div className="polis-map">
					<div ref={setContainer} className="polis-canvas-host" />
					{engine.status ? (
						<>
							<NamePlate engine={engine} />
							<MapModes engine={engine} />
							{engine.status.playback ? (
								<PlaybackBar
									engine={engine}
									status={engine.status}
									playback={engine.status.playback}
								/>
							) : (
								<Transport engine={engine} />
							)}
							<CitizenCard engine={engine} />
						</>
					) : null}
					{engine.engineError ? (
						<div className="polis-cover">
							<p className="polis-card alert" role="alert">
								{engine.engineError}
							</p>
						</div>
					) : null}
					{started || engine.engineError ? null : engine.viewOnly ? (
						<OpeningCard
							title={engine.restoring ? `Rebuilding ${engine.restoring.name}` : "Opening the town"}
							message={engine.ready || engine.restoring ? undefined : "Building the map…"}
							progress={engine.restoring?.progress ?? 0}
						/>
					) : (
						<SetupScreen engine={engine} />
					)}
				</div>
				{started ? <SidePanel engine={engine} /> : null}
			</div>
			<Toast toast={toast} />
		</main>
	);
}
