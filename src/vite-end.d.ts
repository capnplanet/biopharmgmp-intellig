/// <reference types="vite/client" />
declare const GITHUB_RUNTIME_PERMANENT_NAME: string
declare const BASE_KV_SERVICE_URL: string

interface ImportMetaEnv {
	readonly VITE_ONPREM_LLM_ENDPOINT?: string
	readonly VITE_ONPREM_LLM_TOKEN?: string
	readonly DEV?: boolean
	readonly VITE_BACKEND_AUTH_TOKEN?: string
	readonly VITE_RBAC_ROLE?: string
	readonly VITE_FEATURE_EVIDENCE_PUSH?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}