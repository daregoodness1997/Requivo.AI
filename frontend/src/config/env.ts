function valueOrDefault(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized ? normalized.replace(/\/+$/, '') : fallback;
}

function booleanOrDefault(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.trim().toLowerCase() === 'true';
}

export const env = {
  useMockApi: booleanOrDefault(import.meta.env.VITE_USE_MOCK_API, true),
  apiBaseUrl: valueOrDefault(import.meta.env.VITE_API_BASE_URL, 'https://localhost:7001'),
  sseBaseUrl: valueOrDefault(
    import.meta.env.VITE_SSE_URL,
    'https://localhost:7001/api/workflow/events',
  ),
} as const;
