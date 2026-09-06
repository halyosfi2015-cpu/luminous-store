import 'server-only'
import { createAdminClient } from '@/src/lib/supabase'

/**
 * Key-value store backed by the `site_settings` table (key TEXT UNIQUE, value JSONB).
 * Used to persist runtime toggles/config so they survive server restarts.
 */

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle()
    if (error || !data) return fallback
    const raw = (data as { value: unknown }).value
    if (typeof raw === 'string') {
      try { return JSON.parse(raw) as T } catch { return fallback }
    }
    return raw as T ?? fallback
  } catch {
    return fallback
  }
}

export async function setSetting<T>(key: string, value: T): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('site_settings')
      .upsert([{ key, value }] as unknown as never[], { onConflict: 'key' })
    return !error
  } catch {
    return false
  }
}

export async function removeSetting(key: string): Promise<boolean> {
  try {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('site_settings')
      .delete()
      .eq('key', key)
    return !error
  } catch {
    return false
  }
}