import type { SlackmojiBatchResult } from "../lib/converter-api";

interface SlackmojiBatchResultsProps {
	compact?: boolean;
	items: SlackmojiBatchResult[];
}

function statusLabel(status: string) {
	if (!status) {
		return "queued";
	}

	return status;
}

export function SlackmojiBatchResults({ compact = false, items }: SlackmojiBatchResultsProps) {
	if (items.length === 0) {
		return null;
	}

	const visibleItems = compact ? items.slice(0, 3) : items;
	const hiddenCount = items.length - visibleItems.length;

	return (
		<section className="slackmoji-batch" data-compact={compact}>
			<h3>Generated animations</h3>
			<div className="slackmoji-batch-grid">
				{visibleItems.map((item) => (
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
			{hiddenCount > 0 ? <p className="slackmoji-batch-more">+{hiddenCount} more</p> : null}
		</section>
	);
}
