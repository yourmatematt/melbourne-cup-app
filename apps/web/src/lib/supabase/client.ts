import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createClient() {
  console.log('🔧 Creating Supabase client with regular supabase-js instead of SSR')

  const client = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    }
  )

  // Add debugging to see what method is being used
  const originalFrom = client.from.bind(client)
  client.from = function(relation) {
    console.log(`🔍 Supabase query starting for table: ${relation}`)
    const query = originalFrom(relation)

    // Override the select method to log details
    const originalSelect = query.select.bind(query)
    query.select = function(columns, options) {
      console.log(`📊 SELECT query: table=${relation}, columns=${columns}, options=`, options)
      return originalSelect(columns, options)
    }

    return query
  }

  return client
}