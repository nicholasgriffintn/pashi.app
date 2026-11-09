export async function mapWithConcurrency<T, R>(
	items: readonly T[],
	limit: number,
	work: (item: T) => Promise<R>,
): Promise<R[]> {
	const results: R[] = [];
	let next = 0;

	async function runner() {
		while (next < items.length) {
			const index = next;

			next += 1;
			results[index] = await work(items[index]);
		}
	}

	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));

	return results;
}
