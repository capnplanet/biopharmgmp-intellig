export type SparkAPI = {
  llmPrompt: (strings: TemplateStringsArray, ...expr: unknown[]) => string
  llm: (prompt: unknown, model: string) => Promise<string>
}
