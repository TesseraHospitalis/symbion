import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bdnojpohkheurcaacmtp.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbm9qcG9ra2hldXJjYWFjbXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExMTM0NzksImV4cCI6MjA1NjY4OTQ3OX0.GBmc5_7uncNz61GuDA8SMINqzUipyMB1hvDF_wWIdtA'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const storage = {
  async set(key, value, shared = false) {
    const table = key.startsWith('meta:') ? 'metadata' : 'signals'
    const { error } = await supabase
      .from(table)
      .upsert({ key, value: JSON.parse(value), shared }, { onConflict: 'key' })
    if (error) throw error
    return { key, value, shared }
  },

  async get(key, shared = false) {
    const table = key.startsWith('meta:') ? 'metadata' : 'signals'
    const { data, error } = await supabase
      .from(table)
      .select('value')
      .eq('key', key)
      .single()
    if (error) throw error
    return data ? { key, value: JSON.stringify(data.value), shared } : null
  },

  async list(prefix = '', shared = false) {
    const table = prefix.startsWith('meta:') ? 'metadata' : 'signals'
    const { data, error } = await supabase
      .from(table)
      .select('key')
      .like('key', `${prefix}%`)
      .order('key', { ascending: false })
    if (error) throw error
    return { keys: data.map(r => r.key), prefix, shared }
  },

  async delete(key, shared = false) {
    const table = key.startsWith('meta:') ? 'metadata' : 'signals'
    const { error } = await supabase.from(table).delete().eq('key', key)
    if (error) throw error
    return { key, deleted: true, shared }
  }
}