/// <reference types="vite/client" />
declare const GITHUB_RUNTIME_PERMANENT_NAME: string
declare const BASE_KV_SERVICE_URL: string

interface ImportMetaEnv {
	readonly VITE_ONPREM_LLM_ENDPOINT?: string
	readonly VITE_ONPREM_LLM_TOKEN?: string
	readonly DEV?: boolean
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}