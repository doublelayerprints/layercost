import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export interface CloudConfig {
  url: string
  key: string
}

function readCloudConfig(): CloudConfig | undefined {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) return undefined
  return { url, key }
}

/** True only when the build contains both public Supabase settings. */
export function isCloudConfigured(): boolean {
  return readCloudConfig() !== undefined
}

let clientPromise: Promise<SupabaseClient<Database>> | undefined

/**
 * Loads the Supabase client lazily. Guest mode never imports the library,
 * so the cloud chunk stays out of the initial download.
 */
export function loadSupabaseClient(): Promise<SupabaseClient<Database>> {
  const config = readCloudConfig()
  if (!config) return Promise.reject(new Error('cloud_not_configured'))
  if (clientPromise) return clientPromise

  clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
    createClient<Database>(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    }),
  )
  return clientPromise
}
