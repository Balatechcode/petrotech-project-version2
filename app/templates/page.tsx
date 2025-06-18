"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Search, Crown, Lock } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

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
  const [user, setUser] = useState<any>(null)
  const [userPurchases, setUserPurchases] = useState<string[]>([])
  const searchParams = useSearchParams()

  // Load templates from Supabase
  useEffect(() => {
    loadTemplates()
    checkUser()
  }, [])

  // Handle URL category parameter
  useEffect(() => {
    const categoryParam = searchParams.get("category")
    if (categoryParam && categoryParam !== filterCategory) {
      setFilterCategory(categoryParam)
    }
  }, [searchParams])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      loadUserPurchases(user.id)
    }
  }

  const loadUserPurchases = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("user_purchases").select("template_id").eq("user_id", userId)

      if (error) throw error

      const purchasedTemplateIds = data?.map((purchase) => purchase.template_id) || []
      setUserPurchases(purchasedTemplateIds)
    } catch (error) {
      console.error("Error loading user purchases:", error)
    }
  }

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("templates").select("*").order("created_at", { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error("Error loading templates:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateClick = async (template: Template) => {
    // Check if template is premium and user hasn't purchased it
    if (template.is_premium && !userPurchases.includes(template.id)) {
      if (!user) {
        alert("Please sign in to purchase premium templates")
        return
      }

      // Show purchase dialog or redirect to payment
      const shouldPurchase = confirm(`This is a premium template ($${template.price}). Would you like to purchase it?`)

      if (shouldPurchase) {
        // Here you would integrate with a payment processor
        // For now, we'll simulate a purchase
        await simulatePurchase(template)
      }
      return
    }

    // Increment download count
    await incrementDownloads(template.id)

    // Navigate to editor
    window.location.href = `/editor?template=${template.id}`
  }

  const simulatePurchase = async (template: Template) => {
    try {
      // Insert purchase record
      const { error } = await supabase.from("user_purchases").insert({
        user_id: user.id,
        template_id: template.id,
        amount_paid: template.price,
      })

      if (error) throw error

      // Update local purchases
      setUserPurchases([...userPurchases, template.id])

      alert("Purchase successful! You can now use this template.")

      // Navigate to editor
      window.location.href = `/editor?template=${template.id}`
    } catch (error) {
      console.error("Error processing purchase:", error)
      alert("Error processing purchase. Please try again.")
    }
  }

  const incrementDownloads = async (templateId: string) => {
    try {
      const { error } = await supabase.rpc("increment_downloads", {
        template_id: templateId,
      })

      if (error) throw error
    } catch (error) {
      console.error("Error incrementing downloads:", error)
    }
  }

  // Memoize filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesCategory = filterCategory === "all" || template.category === filterCategory
      return matchesSearch && matchesCategory
    })
  }, [templates, searchTerm, filterCategory])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-800">Choose Your Template</h1>
          </div>
          {!user && (
            <Link href="/auth">
              <Button variant="outline">Sign In</Button>
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
              <SelectValue />
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
            <p className="text-xl text-gray-600 mb-4">No templates found</p>
            <p className="text-gray-500 mb-8">
              {templates.length === 0
                ? "No templates have been uploaded yet. Please contact the admin to add templates."
                : "Try adjusting your search or filter criteria."}
            </p>
            <Link href="/admin">
              <Button variant="outline">Go to Admin Panel</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => {
              const isPurchased = userPurchases.includes(template.id)
              const canUse = !template.is_premium || isPurchased

              return (
                <Card
                  key={template.id}
                  className={`cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 overflow-hidden ${
                    !canUse ? "opacity-75" : ""
                  }`}
                  onClick={() => handleTemplateClick(template)}
                >
                  <div className="aspect-[3/4] bg-gray-100 relative">
                    <img
                      src={template.image_url || "/placeholder.svg"}
                      alt={template.name}
                      className="w-full h-full object-cover"
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
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-600 capitalize mb-2">{template.category.replace("-", " ")}</p>
                    <p className="text-xs text-gray-500 mb-2">{template.downloads} downloads</p>
                    {template.tags.length > 0 && (
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
