import { sha256 } from "./generation";
import { openValue, sealValue } from "./sealed-value";

export async function readSealedRecord(
	store: KVNamespace,
	prefix: string,
	token: string,
): Promise<unknown> {
	const sealed = await store.get(`${prefix}${await sha256(token)}`);
	const opened = sealed ? await openValue(token, sealed) : undefined;

	return opened ? JSON.parse(opened) : undefined;
}

export async function writeSealedRecord(
	store: KVNamespace,
	prefix: string,
	token: string,
	value: unknown,
	expirationTtl?: number,
) {
	await store.put(
		`${prefix}${await sha256(token)}`,
		await sealValue(token, JSON.stringify(value)),
		expirationTtl ? { expirationTtl } : undefined,
	);
}

export async function deleteSealedRecord(store: KVNamespace, prefix: string, token: string) {
	await store.delete(`${prefix}${await sha256(token)}`);
}
