import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      templates: {
        Row: {
          id: string
          name: string
          category: string
          image_url: string
          photo_area: {
            x: number
            y: number
            width: number
            height: number
          }
          is_premium: boolean
          price: number
          created_at: string
          created_by: string
          downloads: number
          tags: string[]
        }
        Insert: {
          id?: string
          name: string
          category: string
          image_url: string
          photo_area: {
            x: number
            y: number
            width: number
            height: number
          }
          is_premium?: boolean
          price?: number
          created_by: string
          downloads?: number
          tags?: string[]
        }
        Update: {
          id?: string
          name?: string
          category?: string
          image_url?: string
          photo_area?: {
            x: number
            y: number
            width: number
            height: number
          }
          is_premium?: boolean
          price?: number
          downloads?: number
          tags?: string[]
        }
      }
      user_purchases: {
        Row: {
          id: string
          user_id: string
          template_id: string
          purchased_at: string
          amount_paid: number
        }
        Insert: {
          user_id: string
          template_id: string
          amount_paid: number
        }
        Update: {
          id?: string
          user_id?: string
          template_id?: string
          amount_paid?: number
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          is_admin: boolean
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          is_admin?: boolean
        }
      }
    }
  }
}
