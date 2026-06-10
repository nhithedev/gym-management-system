export function getRuntimeDatabaseUrl(
  value = process.env.DATABASE_URL,
): string | undefined {
  if (!value) return undefined

  try {
    const url = new URL(value)
    const isSupabasePooler = url.hostname.endsWith('.pooler.supabase.com')

    if (isSupabasePooler && url.port === '5432') {
      url.port = '6543'
      url.searchParams.set('pgbouncer', 'true')
      url.searchParams.set('connection_limit', '1')
      url.searchParams.set('pool_timeout', '20')
      url.searchParams.set('connect_timeout', '20')
    }

    return url.toString()
  } catch {
    return value
  }
}
