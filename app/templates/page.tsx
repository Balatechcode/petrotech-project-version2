"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Search, Crown, Lock, Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useUser } from "@/hooks/useUser"

interface Template {
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
  downloads: number
  tags: string[]
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [loading, setLoading] = useState(true)
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null)
  const { user } = useUser()
  const [userPurchases, setUserPurchases] = useState<string[]>([])
  const searchParams = useSearchParams()

  // Load templates and user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        await Promise.all([
          loadTemplates(),
          user?.id ? loadUserPurchases(user.id) : Promise.resolve()
        ])
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [user?.id])

  // Handle URL category parameter
  useEffect(() => {
    const categoryParam = searchParams.get("category")
    if (categoryParam && categoryParam !== filterCategory) {
      setFilterCategory(categoryParam)
    }
  }, [searchParams])

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error("Error loading templates:", error)
      throw error
    }
  }

  const loadUserPurchases = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_purchases')
        .select('template_id')
        .eq('user_id', userId)

      if (error) throw error

      setUserPurchases(data?.map(p => p.template_id) || [])
    } catch (error) {
      console.error("Error loading purchases:", error)
      throw error
    }
  }

  const handleTemplateClick = async (template: Template) => {
    // Check premium access
    if (template.is_premium && !userPurchases.includes(template.id)) {
      if (!user) {
        alert("Please sign in to purchase premium templates")
        return
      }

      const confirmPurchase = window.confirm(
        `Purchase "${template.name}" for $${template.price}?`
      )
      
      if (confirmPurchase) {
        try {
          setPurchaseLoading(template.id)
          await handlePurchase(template)
        } finally {
          setPurchaseLoading(null)
        }
      }
      return
    }

    // For free or purchased templates
    await incrementDownloads(template.id)
    window.location.href = `/editor?template=${template.id}`
  }

  const handlePurchase = async (template: Template) => {
    if (!user?.id) return
    
    try {
      // Record purchase
      const { error } = await supabase
        .from('user_purchases')
        .insert({
          user_id: user.id,
          template_id: template.id,
          amount_paid: template.price
        })

      if (error) throw error

      // Update local state
      setUserPurchases([...userPurchases, template.id])
      await incrementDownloads(template.id)
      
      // Navigate to editor after purchase
      window.location.href = `/editor?template=${template.id}`
    } catch (error) {
      console.error("Purchase failed:", error)
      alert("Purchase failed. Please try again.")
      throw error
    }
  }

  const incrementDownloads = async (templateId: string) => {
    try {
      const { error } = await supabase.rpc('increment_downloads', {
        template_id: templateId
      })

      if (error) throw error
    } catch (error) {
      console.error("Error updating downloads:", error)
    }
  }

  // Filter templates with memoization
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch = 
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        template.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesCategory = filterCategory === "all" || template.category === filterCategory
      return matchesSearch && matchesCategory
    })
  }, [templates, searchTerm, filterCategory])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-gray-600" />
          <p className="text-xl text-gray-600">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Choose Your Template</h1>
          </div>
          {!user && (
            <Link href="/auth" className="w-full md:w-auto">
              <Button variant="outline" className="w-full md:w-auto">
                Sign In
              </Button>
            </Link>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search templates or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="wedding">Wedding</SelectItem>
              <SelectItem value="birthday">Birthday</SelectItem>
              <SelectItem value="party">Party</SelectItem>
              <SelectItem value="baby-shower">Baby Shower</SelectItem>
              <SelectItem value="engagement">Engagement</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-xl text-gray-600 mb-4">No templates found</p>
            <p className="text-gray-500 mb-8">
              {templates.length === 0
                ? "No templates have been uploaded yet. Please check back later."
                : "Try adjusting your search or filter criteria."}
            </p>
            {user?.role === 'admin' && (
              <Link href="/admin">
                <Button variant="outline">Go to Admin Panel</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => {
              const isPurchased = userPurchases.includes(template.id)
              const canUse = !template.is_premium || isPurchased
              const isPurchasing = purchaseLoading === template.id

              return (
                <Card
                  key={template.id}
                  className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${
                    !canUse ? "opacity-80" : "hover:scale-[1.02] cursor-pointer"
                  }`}
                  onClick={() => !isPurchasing && handleTemplateClick(template)}
                >
                  <div className="aspect-[3/4] bg-gray-100 relative">
                    <img
                      src={template.image_url || "/placeholder.svg"}
                      alt={template.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {template.is_premium && (
                      <div className="absolute top-2 right-2">
                        {isPurchased ? (
                          <div className="bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                            <Crown className="w-3 h-3 mr-1" />
                            Owned
                          </div>
                        ) : (
                          <div className="bg-yellow-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                            <Crown className="w-3 h-3 mr-1" />${template.price}
                          </div>
                        )}
                      </div>
                    )}
                    {!canUse && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-white" />
                      </div>
                    )}
                    {isPurchasing && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1 line-clamp-1">{template.name}</h3>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600 capitalize">
                        {template.category.replace("-", " ")}
                      </span>
                      <span className="text-xs text-gray-500">
                        {template.downloads} {template.downloads === 1 ? 'download' : 'downloads'}
                      </span>
                    </div>
                    {template.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {tag}
                          </span>
                        ))}
                        {template.tags.length > 3 && (
                          <span className="text-xs text-gray-500">+{template.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}