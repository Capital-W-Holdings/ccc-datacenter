import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Warning: Supabase credentials not found. Database operations will fail.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

// Helper function to handle Supabase errors
export function handleSupabaseError(error: unknown): never {
  console.error('Supabase error:', error)
  throw new Error(
    error instanceof Error ? error.message : 'Database operation failed'
  )
}

// Type-safe query helpers
export async function queryOne<T>(
  query: PromiseLike<{ data: T | null; error: unknown }>
): Promise<T | null> {
  const { data, error } = await query
  if (error) handleSupabaseError(error)
  return data
}

export async function queryMany<T>(
  query: PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const { data, error } = await query
  if (error) handleSupabaseError(error)
  return data || []
}

export async function mutate<T>(
  query: PromiseLike<{ data: T | null; error: unknown }>
): Promise<T> {
  const { data, error } = await query
  if (error) handleSupabaseError(error)
  if (!data) throw new Error('Mutation returned no data')
  return data
}
