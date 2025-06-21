// app/admin/page.tsx (Server Component)
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import AdminPanelClient from './AdminPanelClient'

export default async function AdminPanel() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (user?.role == "admin") {
    redirect('/auth')
  }

  // Load templates on server
  const { data: templates, error } = await supabase
    .from('templates')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error loading templates:", error)
  }

  // Validate image URLs
  const validatedTemplates = templates?.map(template => ({
    ...template,
    image_url: validateImageUrl(template.image_url) 
      ? template.image_url
      : template.image_url 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${template.image_url.split('/').pop()}`
        : "/placeholder.svg"
  })) || []

  return <AdminPanelClient initialTemplates={validatedTemplates} />
}

function validateImageUrl(url: string): boolean {
  if (!url) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}