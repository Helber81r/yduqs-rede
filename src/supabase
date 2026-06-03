import { createClient } from '@supabase/supabase-js'

// ⚠️  Substitua pelos seus valores do Supabase:
//     Settings → API → Project URL e anon public key
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    '❌ VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não definidos.\n' +
    'Crie um arquivo .env na raiz do projeto com essas variáveis.'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
