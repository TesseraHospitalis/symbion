import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://bdnojpohkheurcaacmtp.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ZabAZN2jgy0cDVyvzyKRGQ_PveCskOc'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const storage = {
  async set(key, value, shared = false) {
    const table = key.startsWith('meta:') ? 'metadata' : 'signals'

    if (table === 'metadata') {
      const parsed = JSON.parse(value)
      const { error: insertError } = await supabase
        .from('metadata')
        .insert({ key, value: parsed })
      if (insertError) {
        if (insertError.code === '23505') {
          const { error: updateError } = await supabase
            .from('metadata')
            .update({ value: parsed })
            .eq('key', key)
          if (updateError) throw updateError
        } else {
          throw insertError
        }
      }
    } else {
      const { error } = await supabase
        .from('signals')
        .upsert({ key, value: JSON.parse(value), shared }, { onConflict: 'key' })
      if (error) throw error
    }

    return { key, value, shared }
  },

  async get(key, shared = false) {
    const table = key.startsWith('meta:') ? 'metadata' : 'signals'
    const { data, error } = await supabase
      .from(table)
      .select('value')
      .eq('key', key)
      .maybeSingle()
    if (error) {
      if (error.code === 'PGRST116') return null
      throw error
    }
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