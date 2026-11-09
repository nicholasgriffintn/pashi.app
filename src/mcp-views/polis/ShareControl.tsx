import { useState } from "react";

import { Button } from "./Button";
import { yearOf } from "./format";
import type { PolisEngine } from "./usePolisEngine";

export function ShareControl({ engine }: { engine: PolisEngine }) {
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const [copyError, setCopyError] = useState(false);
	const { share } = engine;

	const copy = async (url: string) => {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
			setCopyError(false);
		} catch {
			setCopyError(true);
		}
	};

	return (
		<div className="polis-share">
			<Button
				variant="ghost"
				size="icon"
				icon="share"
				aria-label="Share the town"
				title="Share the town"
				aria-expanded={open}
				onClick={() => setOpen(!open)}
			/>
			{open ? (
				<div className="polis-popover">
					<div className="polis-popover-head">
						<p className="polis-heading">Share this town</p>
						<Button
							variant="ghost"
							size="icon"
							icon="x"
							aria-label="Close"
							onClick={() => setOpen(false)}
						/>
					</div>
					<p className="polis-small">
						Anyone with the link can watch the town back up to now, hour by hour. They cannot change
						it, and anything that happens after you share stays private until you share again.
					</p>
					{share.status === "shared" ? (
						<div className="polis-stack">
							<div className="polis-inline">
								<input
									readOnly
									value={share.url}
									aria-label="Share link"
									onFocus={(event) => event.target.select()}
								/>
								<Button
									variant="outline"
									size="icon"
									icon={copied ? "check" : "copy"}
									aria-label="Copy link"
									onClick={() => void copy(share.url)}
								/>
							</div>
							{copyError ? (
								<p className="polis-error">Copying was blocked. Select the link and copy it.</p>
							) : null}
							<p className="polis-mono">Shared up to year {yearOf(share.day)}</p>
							<div className="polis-inline">
								<Button variant="outline" size="xs" onClick={engine.shareTown}>
									Share again with the latest
								</Button>
								<Button variant="ghost" size="xs" onClick={() => void engine.stopSharing()}>
									Stop sharing
								</Button>
							</div>
						</div>
					) : (
						<Button
							variant="primary"
							size="sm"
							icon="share"
							isLoading={share.status === "sharing"}
							onClick={() => {
								setCopied(false);
								engine.shareTown();
							}}
						>
							Create a public link
						</Button>
					)}
					{share.status === "failed" ? <p className="polis-error">{share.message}</p> : null}
				</div>
			) : null}
		</div>
	);
}
