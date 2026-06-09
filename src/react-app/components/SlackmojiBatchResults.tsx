import type { SlackmojiBatchResult } from "../lib/converter-api";

interface SlackmojiBatchResultsProps {
	items: SlackmojiBatchResult[];
}

function statusLabel(status: string) {
	if (!status) {
		return "queued";
	}

	return status;
}

export function SlackmojiBatchResults({ items }: SlackmojiBatchResultsProps) {
	if (items.length === 0) {
		return null;
	}

	return (
		<section className="slackmoji-batch">
			<h3>Generated animations</h3>
			<div className="slackmoji-batch-grid">
				{items.map((item) => (
					<article className="slackmoji-batch-item" key={`${item.jobId}-${item.effect}`}>
						{item.downloadUrl ? (
							<a className="slackmoji-batch-thumb" href={item.downloadUrl} rel="noreferrer" target="_blank">
								<img alt={`Slackmoji ${item.effect} result`} src={item.downloadUrl} />
							</a>
						) : null}
						<div className="slackmoji-batch-meta">
							<span className="slackmoji-batch-effect">:{item.effect}:</span>
							<span className="slackmoji-batch-status">{statusLabel(item.status)}</span>
						</div>
						{item.error ? <p className="slackmoji-batch-error">{item.error}</p> : null}
					</article>
				))}
			</div>
		</section>
	);
}
