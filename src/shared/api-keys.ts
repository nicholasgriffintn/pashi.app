export interface ApiKeySummary {
	createdAt: string;
	hint: string;
	id: string;
	name: string;
}

export interface ApiKeyList {
	keys: ApiKeySummary[];
	limit: number;
}

export interface CreatedApiKey {
	key: string;
	summary: ApiKeySummary;
}
