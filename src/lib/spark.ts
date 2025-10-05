export type SparkApi = {
  llmPrompt: (strings: TemplateStringsArray, ...expr: unknown[]) => unknown
  llm: (prompt: unknown, model: string) => Promise<string>
}

export const getSpark = (): SparkApi | undefined => {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { spark?: SparkApi }
  return w.spark
}
