interface ImportMeta {
  glob(patterns: string | string[], options?: { query?: string; import?: string; eager?: boolean }): Record<string, unknown>;
}
