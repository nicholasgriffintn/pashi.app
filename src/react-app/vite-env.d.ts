/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_PASHI_DEV_API_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
