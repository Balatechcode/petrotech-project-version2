// this new file

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/supabase' // Optional: if using types

export function createClient() {
  return createServerComponentClient<Database>({ cookies })
}
