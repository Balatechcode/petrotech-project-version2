"use client"

import type React from "react"

import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Upload, Edit, Trash2, Crown, CheckCircle } from "lucide-react"
import Link from "next/link"

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

export default function AdminPanel() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null)
  const [photoArea, setPhotoArea] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [storageStatus, setStorageStatus] = useState<"localStorage" | "supabase" | "checking">("localStorage")

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    isPremium: false,
    price: "0.00",
    tags: "",
  })

  // Load templates on component mount
  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    // For now, always use localStorage to avoid Supabase setup issues
    setStorageStatus("localStorage")
    loadFromLocalStorage()
  }

  const loadFromLocalStorage = () => {
    try {
      const savedTemplates = localStorage.getItem("invitation-templates")
      if (savedTemplates) {
        const parsedTemplates = JSON.parse(savedTemplates)
        setTemplates(parsedTemplates)
      } else {
        // Initialize with sample templates if none exist
        const sampleTemplates: Template[] = [
          {
            id: "sample-1",
            name: "Elegant Wedding Frame",
            category: "wedding",
            image_url: "/placeholder.svg?height=600&width=400",
            photo_area: { x: 150, y: 200, width: 100, height: 150 },
            is_premium: false,
            price: 0.0,
            created_at: new Date().toISOString(),
            downloads: 12,
            tags: ["elegant", "classic", "white"],
          },
          {
            id: "sample-2",
            name: "Birthday Celebration",
            category: "birthday",
            image_url: "/placeholder.svg?height=600&width=400",
            photo_area: { x: 100, y: 150, width: 200, height: 200 },
            is_premium: false,
            price: 0.0,
            created_at: new Date().toISOString(),
            downloads: 8,
            tags: ["colorful", "fun", "party"],
          },
          {
            id: "sample-3",
            name: "Baby Shower Joy",
            category: "baby-shower",
            image_url: "/placeholder.svg?height=600&width=400",
            photo_area: { x: 120, y: 180, width: 160, height: 160 },
            is_premium: true,
            price: 2.99,
            created_at: new Date().toISOString(),
            downloads: 25,
            tags: ["cute", "pastel", "baby"],
          },
          {
            id: "sample-4",
            name: "Engagement Bliss",
            category: "engagement",
            image_url: "/placeholder.svg?height=600&width=400",
            photo_area: { x: 130, y: 170, width: 140, height: 180 },
            is_premium: true,
            price: 1.99,
            created_at: new Date().toISOString(),
            downloads: 15,
            tags: ["romantic", "gold", "elegant"],
          },
          {
            id: "sample-5",
            name: "Party Time",
            category: "party",
            image_url: "/placeholder.svg?height=600&width=400",
            photo_area: { x: 110, y: 160, width: 180, height: 180 },
            is_premium: false,
            price: 0.0,
            created_at: new Date().toISOString(),
            downloads: 32,
            tags: ["vibrant", "celebration", "modern"],
          },
        ]
        setTemplates(sampleTemplates)
        localStorage.setItem("invitation-templates", JSON.stringify(sampleTemplates))
      }
    } catch (error) {
      console.error("Error loading from localStorage:", error)
      setTemplates([])
    }
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string)
        setPhotoArea({ x: 0, y: 0, width: 0, height: 0 })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    setSelectionStart({ x, y })
  }

  const handleCanvasMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !selectionStart) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    const newPhotoArea = {
      x: Math.min(selectionStart.x, x),
      y: Math.min(selectionStart.y, y),
      width: Math.abs(x - selectionStart.x),
      height: Math.abs(y - selectionStart.y),
    }

    setPhotoArea(newPhotoArea)
    setSelectionStart(null)
    setIsSelecting(false)
  }

  const drawImageWithSelection = () => {
    const canvas = canvasRef.current
    if (!canvas || !selectedImage) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      // Draw selection rectangle
      if (photoArea.width > 0 && photoArea.height > 0) {
        ctx.strokeStyle = "#ff0000"
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(photoArea.x, photoArea.y, photoArea.width, photoArea.height)

        // Draw semi-transparent overlay
        ctx.fillStyle = "rgba(255, 0, 0, 0.1)"
        ctx.fillRect(photoArea.x, photoArea.y, photoArea.width, photoArea.height)
      }
    }
    img.src = selectedImage
  }

  useEffect(() => {
    if (selectedImage) {
      drawImageWithSelection()
    }
  }, [selectedImage, photoArea])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedImage || !formData.name || !formData.category) {
      alert("Please fill all required fields and upload an image")
      return
    }

    if (photoArea.width === 0 || photoArea.height === 0) {
      alert("Please define the photo area by clicking 'Select Area Visually' and dragging on the image")
      return
    }

    setIsUploading(true)

    try {
      // Parse tags
      const tags = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      // Create new template using localStorage (no Supabase dependency)
      const newTemplate: Template = {
        id: `template-${Date.now()}-${Math.random().toString(36).substring(2)}`,
        name: formData.name,
        category: formData.category,
        image_url: selectedImage, // Store as base64 data URL
        photo_area: photoArea,
        is_premium: formData.isPremium,
        price: Number.parseFloat(formData.price),
        created_at: new Date().toISOString(),
        downloads: 0,
        tags: tags,
      }

      // Update local state and localStorage
      const updatedTemplates = [newTemplate, ...templates]
      setTemplates(updatedTemplates)
      localStorage.setItem("invitation-templates", JSON.stringify(updatedTemplates))

      // Reset form
      setFormData({
        name: "",
        category: "",
        description: "",
        isPremium: false,
        price: "0.00",
        tags: "",
      })
      setSelectedImage(null)
      setPhotoArea({ x: 0, y: 0, width: 0, height: 0 })
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      alert("Template uploaded successfully!")
    } catch (error) {
      console.error("Error uploading template:", error)
      alert("Error uploading template. Please try again.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return

    try {
      // Update local state and localStorage
      const updatedTemplates = templates.filter((template) => template.id !== id)
      setTemplates(updatedTemplates)
      localStorage.setItem("invitation-templates", JSON.stringify(updatedTemplates))

      alert("Template deleted successfully!")
    } catch (error) {
      console.error("Error deleting template:", error)
      alert("Error deleting template")
    }
  }

  // Memoize filtered templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = filterCategory === "all" || template.category === filterCategory
      return matchesSearch && matchesCategory
    })
  }, [templates, searchTerm, filterCategory])

  return (
    <div className="min-h-screen bg-gray-50">
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
            <h1 className="text-3xl font-bold text-gray-800">Admin Panel - Template Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center text-blue-600 text-sm">
              <CheckCircle className="w-4 h-4 mr-1" />
              Local Storage Active
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Form */}
          <Card>
            <CardHeader>
              <CardTitle>Upload New Template</CardTitle>
              <p className="text-sm text-gray-600">Upload PNG templates with transparent areas for photo placement</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Elegant Rose Wedding"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wedding">Wedding</SelectItem>
                      <SelectItem value="birthday">Birthday</SelectItem>
                      <SelectItem value="party">Party</SelectItem>
                      <SelectItem value="baby-shower">Baby Shower</SelectItem>
                      <SelectItem value="engagement">Engagement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="elegant, floral, modern"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPremium"
                      checked={formData.isPremium}
                      onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="isPremium" className="flex items-center">
                      <Crown className="w-4 h-4 mr-1 text-yellow-500" />
                      Premium Template
                    </Label>
                  </div>

                  {formData.isPremium && (
                    <div className="flex-1">
                      <Label htmlFor="price">Price ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="2.99"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the template"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="template-image">Template Image (PNG with transparency) *</Label>
                  <input
                    ref={fileInputRef}
                    id="template-image"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleImageUpload}
                    className="hidden"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full mt-2"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Template Image
                  </Button>
                </div>

                {selectedImage && (
                  <div>
                    <Label>Define Photo Area *</Label>
                    <div className="mt-2 space-y-4">
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs">X</Label>
                          <Input
                            type="number"
                            value={photoArea.x}
                            onChange={(e) => setPhotoArea({ ...photoArea, x: Number.parseInt(e.target.value) || 0 })}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y</Label>
                          <Input
                            type="number"
                            value={photoArea.y}
                            onChange={(e) => setPhotoArea({ ...photoArea, y: Number.parseInt(e.target.value) || 0 })}
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Width</Label>
                          <Input
                            type="number"
                            value={photoArea.width}
                            onChange={(e) =>
                              setPhotoArea({ ...photoArea, width: Number.parseInt(e.target.value) || 0 })
                            }
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Height</Label>
                          <Input
                            type="number"
                            value={photoArea.height}
                            onChange={(e) =>
                              setPhotoArea({ ...photoArea, height: Number.parseInt(e.target.value) || 0 })
                            }
                            className="text-xs"
                          />
                        </div>
                      </div>

                      <Button type="button" variant="outline" onClick={() => setIsSelecting(true)} className="w-full">
                        {isSelecting ? "Click and drag on image to select area" : "Select Photo Area Visually"}
                      </Button>

                      {photoArea.width > 0 && photoArea.height > 0 && (
                        <div className="text-sm text-green-600 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Photo area defined: {photoArea.width} × {photoArea.height} pixels
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={isUploading}>
                  {isUploading ? "Saving Template..." : "Save Template"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview & Photo Area Selection</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedImage ? (
                <div className="space-y-4">
                  <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto border border-gray-300 cursor-crosshair rounded"
                    onMouseDown={handleCanvasMouseDown}
                    onMouseUp={handleCanvasMouseUp}
                  />
                  <div className="text-sm text-gray-600 space-y-1">
                    {isSelecting ? (
                      <p className="text-blue-600 font-medium">📍 Click and drag to select the photo area</p>
                    ) : photoArea.width > 0 && photoArea.height > 0 ? (
                      <p className="text-green-600">
                        ✅ Photo area selected. Click 'Select Photo Area Visually' to modify.
                      </p>
                    ) : (
                      <p className="text-amber-600">⚠️ Please select the photo area before saving.</p>
                    )}
                    <p>Red rectangle shows where user photos will be placed.</p>
                  </div>
                </div>
              ) : (
                <div className="h-64 border-2 border-dashed border-gray-300 flex items-center justify-center rounded">
                  <div className="text-center text-gray-500">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p>Upload an image to see preview</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Template List */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Template Library ({templates.length} templates)</CardTitle>
            <div className="flex gap-4 mt-4">
              <div className="flex-1">
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
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
          </CardHeader>
          <CardContent>
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg">No templates found</p>
                <p className="text-gray-400">Upload your first template to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-[3/4] bg-gray-100 relative">
                      <img
                        src={template.image_url || "/placeholder.svg"}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                      {template.is_premium && (
                        <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                          <Crown className="w-3 h-3 mr-1" />${template.price}
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-1">{template.name}</h3>
                      <p className="text-sm text-gray-600 capitalize mb-2">{template.category.replace("-", " ")}</p>
                      <p className="text-xs text-gray-500 mb-2">Downloads: {template.downloads}</p>
                      {template.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {template.tags.map((tag, index) => (
                            <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
