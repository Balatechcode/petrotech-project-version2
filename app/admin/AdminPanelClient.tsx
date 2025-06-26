// app/admin/AdminPanelClient.tsx (Client Component)
"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Upload,
  Edit,
  Trash2,
  Crown,
  CheckCircle,
  Loader2,
  Image as ImageIcon,
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

type PhotoArea = {
  x: number
  y: number
  width: number
  height: number
}

type TemplateCategory = 
  | 'wedding' 
  | 'birthday' 
  | 'party' 
  | 'baby-shower' 
  | 'engagement'

interface Template {
  id: string
  name: string
  category: TemplateCategory
  image_url: string
  photo_area: PhotoArea
  is_premium: boolean
  price: number
  created_at: string
  downloads: number
  tags: string[]
}

type FormData = {
  name: string
  category: TemplateCategory | ''
  description: string
  isPremium: boolean
  price: string
  tags: string
}

type FormErrors = {
  name: boolean
  category: boolean
  image: boolean
  photoArea: boolean
  price: boolean
}

const MAX_IMAGE_SIZE_MB = 5
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export default function AdminPanelClient({ initialTemplates }: { initialTemplates: Template[] }) {
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSelectingArea, setIsSelectingArea] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null)
  const [photoArea, setPhotoArea] = useState<PhotoArea>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [formErrors, setFormErrors] = useState<FormErrors>({
    name: false,
    category: false,
    image: false,
    photoArea: false,
    price: false,
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState<FormData>({
    name: "",
    category: "",
    description: "",
    isPremium: false,
    price: "0.00",
    tags: "",
  })

  const validateImage = (file: File): { valid: boolean; message?: string } => {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return {
        valid: false,
        message: 'Only PNG, JPEG, and WebP images are allowed',
      }
    }

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      return {
        valid: false,
        message: `Image must be less than ${MAX_IMAGE_SIZE_MB}MB`,
      }
    }

    return { valid: true }
  }

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const validatedTemplates = data?.map(template => ({
        ...template,
        image_url: validateImageUrl(template.image_url) 
          ? template.image_url
          : template.image_url 
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${template.image_url.split('/').pop()}`
            : "/placeholder.svg"
      })) || []

      setTemplates(validatedTemplates)
    } catch (error) {
      console.error("Error loading templates:", error)
      toast.error("Failed to load templates")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop()
    const fileName = `template-${Date.now()}.${fileExt}`
    const filePath = `public/${fileName}`
    
    const { error } = await supabase.storage
      .from('templates')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) throw error
  
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${filePath}`
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateImage(file)
    if (!validation.valid) {
      toast.error(validation.message || 'Invalid image')
      return
    }

    setSelectedImageFile(file)
    setFormErrors(prev => ({ ...prev, image: false }))

    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const validateForm = (): boolean => {
    const errors = {
      name: !formData.name.trim(),
      category: !formData.category,
      image: !editingTemplate && !selectedImageFile,
      photoArea: photoArea.width === 0 || photoArea.height === 0,
      price: formData.isPremium && (isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0
    )}

    setFormErrors(errors)
    return !Object.values(errors).some(Boolean)
  }

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelectingArea) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    setSelectionStart({ x, y })
  }

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelectingArea || !selectionStart) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const newPhotoArea = {
      x: Math.min(selectionStart.x, x),
      y: Math.min(selectionStart.y, y),
      width: Math.abs(x - selectionStart.x),
      height: Math.abs(y - selectionStart.y),
    }

    if (newPhotoArea.width < 50 || newPhotoArea.height < 50) {
      toast.warning('Photo area should be at least 50x50 pixels')
      return
    }

    setPhotoArea(newPhotoArea)
    setFormErrors(prev => ({ ...prev, photoArea: false }))
    setSelectionStart(null)
    setIsSelectingArea(false)
  }

  const drawImageWithSelection = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !imagePreview) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      const maxWidth = 800
      const ratio = Math.min(maxWidth / img.width, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      if (photoArea.width > 0 && photoArea.height > 0) {
        ctx.strokeStyle = "#ff0000"
        ctx.lineWidth = 2
        ctx.setLineDash([5, 5])
        ctx.strokeRect(
          photoArea.x * ratio,
          photoArea.y * ratio,
          photoArea.width * ratio,
          photoArea.height * ratio
        )

        ctx.fillStyle = "rgba(255, 0, 0, 0.1)"
        ctx.fillRect(
          photoArea.x * ratio,
          photoArea.y * ratio,
          photoArea.width * ratio,
          photoArea.height * ratio
        )
      }
    }
    img.src = imagePreview
  }, [imagePreview, photoArea])

  useEffect(() => {
    if (imagePreview) {
      drawImageWithSelection()
    }
  }, [imagePreview, photoArea, drawImageWithSelection])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error("Please fill all required fields correctly")
      return
    }

    setIsUploading(true)

    try {
      const tags = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      let imageUrl = editingTemplate?.image_url || null
      let oldImagePath = ""

      if (selectedImageFile) {
        try {
          toast.info("Uploading image...")
          imageUrl = await uploadImage(selectedImageFile)
          
          if (editingTemplate?.image_url) {
            oldImagePath = editingTemplate.image_url.split("/").pop() || ""
          }
        } catch (error) {
          console.error("Image upload failed:", error)
          throw new Error("Failed to upload image")
        }
      }

      const templateData = {
        name: formData.name.substring(0, 100),
        category: formData.category as TemplateCategory,
        image_url: imageUrl,
        photo_area: photoArea,
        is_premium: formData.isPremium,
        price: formData.isPremium ? parseFloat(formData.price) : 0,
        created_at: editingTemplate?.created_at || new Date().toISOString(),
        downloads: editingTemplate?.downloads || 0,
        tags: tags.length > 0 ? tags : null,
      }

      let result
      if (editingTemplate) {
        const { data, error } = await supabase
          .from("templates")
          .update(templateData)
          .eq("id", editingTemplate.id)
          .select()
          .single()

        if (error) throw error
        result = data
      } else {
        const { data, error } = await supabase
          .from("templates")
          .insert(templateData)
          .select()
          .single()

        if (error) throw error
        result = data
      }

      if (oldImagePath && selectedImageFile) {
        try {
          await supabase.storage.from("templates").remove([oldImagePath])
        } catch (cleanupError) {
          console.warn("Failed to delete old image:", cleanupError)
        }
      }

      setTemplates((prev) =>
        editingTemplate
          ? prev.map((t) => (t.id === editingTemplate.id ? result : t))
          : [result, ...prev]
      )

      toast.success(`Template ${editingTemplate ? "updated" : "created"} successfully!`)
      resetForm()
    } catch (error: any) {
      console.error("Operation failed:", error)
      toast.error(error.message || "Failed to save template")
    } finally {
      setIsUploading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      description: "",
      isPremium: false,
      price: "0.00",
      tags: "",
    })
    setSelectedImageFile(null)
    setImagePreview(null)
    setPhotoArea({ x: 0, y: 0, width: 0, height: 0 })
    setEditingTemplate(null)
    setFormErrors({
      name: false,
      category: false,
      image: false,
      photoArea: false,
      price: false,
    })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template? This action cannot be undone.")) return

    try {
      const template = templates.find(t => t.id === id)
      if (!template) throw new Error("Template not found")

      const { error } = await supabase.from("templates").delete().eq("id", id)
      if (error) throw error

      if (template.image_url) {
        const imagePath = template.image_url.split("/").pop()
        if (imagePath) {
          await supabase.storage.from("templates").remove([imagePath])
        }
      }

      setTemplates(templates.filter((t) => t.id !== id))
      toast.success("Template deleted successfully!")
    } catch (error) {
      console.error("Error deleting template:", error)
      toast.error("Failed to delete template")
    }
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      category: template.category,
      description: template || "",
      isPremium: template.is_premium,
      price: template.price.toString(),
      tags: template.tags?.join(", ") || "",
    })
    setPhotoArea(template.photo_area)
    setImagePreview(template.image_url)
    setFormErrors({
      name: false,
      category: false,
      image: false,
      photoArea: false,
      price: false,
    })
  }

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch = template.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
      const matchesCategory =
        filterCategory === "all" || template.category === filterCategory
      return matchesSearch && matchesCategory
    })
  }, [templates, searchTerm, filterCategory])

  return (
    <div className="min-h-screen bg-gray-50">
     <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Template Management
            </h1>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center text-green-600">
              <CheckCircle className="w-4 h-4 mr-1" />
              Supabase Connected
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>
                {editingTemplate ? (
                  <>
                    Edit Template
                    <span className="block text-sm font-normal text-gray-600 mt-1">
                      {editingTemplate.name}
                    </span>
                  </>
                ) : (
                  "Create New Template"
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      setFormErrors(prev => ({ ...prev, name: false }));
                    }}
                    placeholder="e.g., Elegant Rose Wedding"
                    className={formErrors.name ? "border-red-500" : ""}
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-xs mt-1">Name is required</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => {
                      setFormData({ ...formData, category: value as TemplateCategory });
                      setFormErrors(prev => ({ ...prev, category: false }));
                    }}
                  >
                    <SelectTrigger className={formErrors.category ? "border-red-500" : ""}>
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
                  {formErrors.category && (
                    <p className="text-red-500 text-xs mt-1">Category is required</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="tags">Tags (comma separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    placeholder="elegant, floral, modern"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Used for search and filtering
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPremium"
                      checked={formData.isPremium}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          isPremium: e.target.checked,
                          price: e.target.checked ? "2.99" : "0.00"
                        });
                        setFormErrors(prev => ({ ...prev, price: false }));
                      }}
                      className="rounded"
                    />
                    <Label htmlFor="isPremium" className="flex items-center">
                      <Crown className="w-4 h-4 mr-1 text-yellow-500" />
                      Premium Template
                    </Label>
                  </div>

                  {formData.isPremium && (
                    <div className="flex-1">
                      <Label htmlFor="price">Price ($) *</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => {
                          setFormData({ ...formData, price: e.target.value });
                          setFormErrors(prev => ({ ...prev, price: false }));
                        }}
                        placeholder="2.99"
                        className={formErrors.price ? "border-red-500" : ""}
                      />
                      {formErrors.price && (
                        <p className="text-red-500 text-xs mt-1">
                          {isNaN(parseFloat(formData.price)) 
                            ? "Valid number required" 
                            : "Price must be greater than 0"}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="template-image">
                    Template Image (PNG/JPEG) *
                  </Label>
                  <input
                    ref={fileInputRef}
                    id="template-image"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {editingTemplate ? "Change Image" : "Upload Template Image"}
                  </Button>
                  {formErrors.image && (
                    <p className="text-red-500 text-xs mt-1">Image is required</p>
                  )}
                  {selectedImageFile && (
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedImageFile.name} ({Math.round(selectedImageFile.size / 1024)}KB)
                    </p>
                  )}
                  {editingTemplate && !selectedImageFile && (
                    <p className="text-xs text-gray-500 mt-1">
                      Current image will be kept if no new image is selected
                    </p>
                  )}
                </div>

                {(imagePreview || editingTemplate) && (
                  <div>
                    <Label>Define Photo Area *</Label>
                    <div className="mt-2 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs">X Position</Label>
                          <Input
                            type="number"
                            value={photoArea.x}
                            onChange={(e) =>
                              setPhotoArea({
                                ...photoArea,
                                x: Number(e.target.value) || 0,
                              })
                            }
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Y Position</Label>
                          <Input
                            type="number"
                            value={photoArea.y}
                            onChange={(e) =>
                              setPhotoArea({
                                ...photoArea,
                                y: Number(e.target.value) || 0,
                              })
                            }
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Width</Label>
                          <Input
                            type="number"
                            value={photoArea.width}
                            onChange={(e) =>
                              setPhotoArea({
                                ...photoArea,
                                width: Number(e.target.value) || 0,
                              })
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
                              setPhotoArea({
                                ...photoArea,
                                height: Number(e.target.value) || 0,
                              })
                            }
                            className="text-xs"
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant={isSelectingArea ? "default" : "outline"}
                        onClick={() => setIsSelectingArea(!isSelectingArea)}
                        className="w-full"
                      >
                        {isSelectingArea
                          ? "Click and drag on image to select area"
                          : "Select Photo Area Visually"}
                      </Button>

                      {formErrors.photoArea && (
                        <p className="text-red-500 text-xs mt-1">
                          Photo area is required (minimum 50x50 pixels)
                        </p>
                      )}

                      {photoArea.width > 0 && photoArea.height > 0 && (
                        <div className="text-sm text-green-600 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Photo area defined: {photoArea.width} ×{" "}
                          {photoArea.height} pixels
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {editingTemplate ? "Updating..." : "Saving..."}
                      </>
                    ) : editingTemplate ? (
                      "Update Template"
                    ) : (
                      "Create Template"
                    )}
                  </Button>

                  {(editingTemplate || formData.name || selectedImageFile) && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      disabled={isUploading}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview & Photo Area Selection</CardTitle>
            </CardHeader>
            <CardContent>
              {imagePreview || editingTemplate ? (
                <div className="space-y-4">
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      className="max-w-full h-auto border border-gray-300 rounded cursor-crosshair"
                      onMouseDown={handleCanvasMouseDown}
                      onMouseUp={handleCanvasMouseUp}
                    />
                    {isSelectingArea && (
                      <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center pointer-events-none">
                        <p className="bg-white px-4 py-2 rounded-lg shadow-lg text-sm">
                          Drag to select photo area
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    {isSelectingArea ? (
                      <p className="text-blue-600 font-medium">
                        Select the area where user photos should be placed
                      </p>
                    ) : photoArea.width > 0 && photoArea.height > 0 ? (
                      <p className="text-green-600">
                        Photo area selected. Click button above to modify.
                      </p>
                    ) : (
                      <p className="text-amber-600">
                        Please select the photo area before saving.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-64 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center gap-2">
                  <ImageIcon className="w-8 h-8 text-gray-400" />
                  <p className="text-gray-500">No image selected</p>
                  <p className="text-sm text-gray-400">
                    Upload an image to see preview
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>
              Template Library
              <span className="text-sm font-normal text-gray-600 ml-2">
                ({filteredTemplates.length} of {templates.length} templates)
              </span>
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <div className="flex-1">
                <Input
                  placeholder="Search templates by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Categories" />
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
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg">
                  {searchTerm || filterCategory !== "all" 
                    ? "No matching templates found" 
                    : "No templates yet"}
                </p>
                <p className="text-gray-400 mt-2">
                  {searchTerm || filterCategory !== "all"
                    ? "Try a different search or category"
                    : "Create your first template to get started"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => {
                  const isValidImage = validateImageUrl(template.image_url);
                  
                  return (
                    <Card
                      key={template.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="aspect-[3/4] bg-gray-100 relative">
                        {isValidImage ? (
                          <img
                            src={template.image_url}
                            alt={template.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder.svg";
                              target.className = "w-full h-full object-contain p-4";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <span className="text-gray-500">No preview available</span>
                          </div>
                        )}
                        {template.is_premium && (
                          <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                            <Crown className="w-3 h-3 mr-1" />${template.price.toFixed(2)}
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-1 line-clamp-1">
                          {template.name}
                        </h3>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600 capitalize">
                            {template.category.replace("-", " ")}
                          </span>
                          <span className="text-xs text-gray-500">
                            {template.downloads} download{template.downloads !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {template.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {template.tags.slice(0, 3).map((tag, index) => (
                              <span
                                key={index}
                                className="text-xs bg-gray-100 px-2 py-1 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {template.tags.length > 3 && (
                              <span className="text-xs text-gray-500">
                                +{template.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(template.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
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