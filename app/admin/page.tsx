"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Upload,
  Edit,
  Trash2,
  Crown,
  CheckCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/hooks/useUser";

interface Template {
  id: string;
  name: string;
  category: string;
  image_url: string;
  photo_area: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  is_premium: boolean;
  price: number;
  created_at: string;
  downloads: number;
  tags: string[];
}

const validateImageUrl = (url: string) => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export default function AdminPanel() {
  const { user } = useUser();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [photoArea, setPhotoArea] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    isPremium: false,
    price: "0.00",
    tags: "",
  });

  // Load templates on component mount
  useEffect(() => {
      loadTemplates();
  }, [user?.role]);

  const loadTemplates = async () => {
    try {
      console.log("Loading templates...");
      
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log("Templates loaded:", data);
      
      const validatedTemplates = data?.map(template => {
        if (!validateImageUrl(template.image_url)) {
          console.warn("Invalid image URL for template:", template.id);
          return {
            ...template,
            image_url: template.image_url 
              ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${template.image_url.split('/').pop()}`
              : "/placeholder.svg"
          };
          console.log("${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${fileName}")
        }
        return template;
      });

      setTemplates(validatedTemplates || []);
      
    } catch (error) {
      console.error("Error loading templates:", error);
      setMessageType("error");
      setMessage("Failed to load templates");
    }
  };

  const uploadImage = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `public/template-${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('templates')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;
  
      console.log("${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${fileName}")
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/templates/${fileName}`;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setSelectionStart({ x, y });
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !selectionStart) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setPhotoArea({
      x: Math.min(selectionStart.x, x),
      y: Math.min(selectionStart.y, y),
      width: Math.abs(x - selectionStart.x),
      height: Math.abs(y - selectionStart.y),
    });
    setSelectionStart(null);
    setIsSelecting(false);
  };

  const drawImageWithSelection = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imagePreview) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw selection rectangle
      if (photoArea.width > 0 && photoArea.height > 0) {
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          photoArea.x,
          photoArea.y,
          photoArea.width,
          photoArea.height
        );

        // Draw semi-transparent overlay
        ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
        ctx.fillRect(
          photoArea.x,
          photoArea.y,
          photoArea.width,
          photoArea.height
        );
      }
    };
    img.src = imagePreview;
  };

  useEffect(() => {
    if (imagePreview) {
      drawImageWithSelection();
    }
  }, [imagePreview, photoArea]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (
      (!selectedImageFile && !editingTemplate) ||
      !formData.name ||
      !formData.category
    ) {
      setMessageType("error");
      setMessage("Please fill all required fields and upload an image");
      return;
    }

    if (photoArea.width === 0 || photoArea.height === 0) {
      setMessageType("error");
      setMessage("Please define the photo area");
      return;
    }

    if (formData.isPremium && isNaN(parseFloat(formData.price))) {
      setMessageType("error");
      setMessage("Please enter a valid price for premium templates");
      return;
    }

    setIsUploading(true);
    setMessageType("");
    setMessage("");

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user)
        throw new Error(userError?.message || "User not authenticated");

      // Parse tags (array of text)
      const tags = formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Image handling
      let imageUrl = editingTemplate?.image_url || null;
      let shouldDeleteOldImage = false;
      let oldImagePath = "";

      if (selectedImageFile) {
        try {
          setMessage("Uploading image...");

          // Get old image path before uploading new one
          if (editingTemplate?.image_url) {
            oldImagePath = editingTemplate.image_url.split("/").pop() || "";
            shouldDeleteOldImage = true;
          }

          // Upload new image
          imageUrl = await uploadImage(selectedImageFile);
          if (!imageUrl)
            throw new Error("Image upload failed - no URL returned");
        } catch (uploadError: any) {
          console.error("Image upload failed:", uploadError);
          throw new Error(`Image upload failed: ${uploadError.message}`);
        }
      }

      // Prepare template data
      const templateData = {
        name: formData.name.substring(0, 100), // Limit to 100 chars
        category: formData.category,
        image_url: imageUrl,
        photo_area: photoArea,
        is_premium: formData.isPremium,
        price: formData.isPremium ? parseFloat(formData.price) : 0,
        created_at: editingTemplate?.created_at || new Date().toISOString(),
        created_by: user.email || user.id,
        downloads: editingTemplate?.downloads || 0,
        tags: tags.length > 0 ? tags : null,
      };

      // Database operation
      let result;
      try {
        setMessage(
          editingTemplate ? "Updating template..." : "Creating template..."
        );

        if (editingTemplate) {
          const { data, error } = await supabase
            .from("templates")
            .update(templateData)
            .eq("id", editingTemplate.id)
            .select()
            .single();

          if (error) throw error;
          result = data;
        } else {
          const { data, error } = await supabase
            .from("templates")
            .insert(templateData)
            .select()
            .single();

          if (error) throw error;
          result = data;
        }

        // Clean up old image after successful update
        if (shouldDeleteOldImage && oldImagePath) {
          try {
            await supabase.storage.from("templates").remove([oldImagePath]);
          } catch (cleanupError) {
            console.warn("Failed to delete old image:", cleanupError);
          }
        }

        // Update local state
        setTemplates((prev) =>
          editingTemplate
            ? prev.map((t) => (t.id === editingTemplate.id ? result : t))
            : [result, ...prev]
        );

        // Success feedback
        setMessageType("success");
        setMessage(
          `Template ${editingTemplate ? "updated" : "created"} successfully!`
        );
        resetForm();
      } catch (dbError: any) {
        // If database operation failed but we uploaded a new image, try to delete it
        if (selectedImageFile && imageUrl) {
          try {
            const newImagePath = imageUrl.split("/").pop() || "";
            await supabase.storage.from("templates").remove([newImagePath]);
          } catch (rollbackError) {
            console.error("Failed to rollback image upload:", rollbackError);
          }
        }
        throw dbError;
      }
    } catch (error: any) {
      console.error("Operation failed:", error);
      setMessageType("error");
      setMessage(error.message || "Failed to save template");

      // Specific error handling
      if (error.message.includes("storage")) {
        setMessage("Storage error - please try a different image");
      } else if (error.message.includes("permission")) {
        setMessage("Permission denied - contact your administrator");
      } else if (error.message.includes("duplicate")) {
        setMessage("Template with this name already exists");
      }
    } finally {
      setIsUploading(false);

      // Auto-clear success message after 3 seconds
      if (messageType === "success") {
        setTimeout(() => {
          setMessage("");
          setMessageType("");
        }, 3000);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      description: "",
      isPremium: false,
      price: "0.00",
      tags: "",
    });
    setSelectedImageFile(null);
    setImagePreview(null);
    setPhotoArea({ x: 0, y: 0, width: 0, height: 0 });
    setEditingTemplate(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      // First delete from database
      const { error } = await supabase.from("templates").delete().eq("id", id);

      if (error) throw error;

      // Then update local state
      setTemplates(templates.filter((t) => t.id !== id));
      setMessageType("success");
      setMessage("Template deleted successfully!");
    } catch (error) {
      console.error("Error deleting template:", error);
      setMessageType("error");
      setMessage("Error deleting template");
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      description: "",
      isPremium: template.is_premium,
      price: template.price.toString(),
      tags: template.tags?.join(", ") || "",
    });
    setPhotoArea(template.photo_area);
    setImagePreview(template.image_url);
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch = template.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        filterCategory === "all" || template.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchTerm, filterCategory]);

  if (user?.role == "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Admin Access Required</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this page.
            </p>
            <Link href="/auth">
              <Button>Return to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-gray-800">
              Admin Panel - Template Management
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center text-green-600 text-sm">
              <CheckCircle className="w-4 h-4 mr-1" />
              Supabase Connected
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 mb-4 rounded-md ${
              messageType === "error"
                ? "bg-red-100 text-red-700 border border-red-200"
                : "bg-green-100 text-green-700 border border-green-200"
            }`}
          >
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Form */}
          <Card>
            <CardHeader>
              <CardTitle>
                {editingTemplate
                  ? `Edit "${editingTemplate.name}"`
                  : "Upload New Template"}
              </CardTitle>
              <p className="text-sm text-gray-600">
                {editingTemplate
                  ? "Update template details"
                  : "Upload PNG templates with transparent areas"}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Elegant Rose Wedding"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
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
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    placeholder="elegant, floral, modern"
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isPremium"
                      checked={formData.isPremium}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isPremium: e.target.checked,
                        })
                      }
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
                        onChange={(e) =>
                          setFormData({ ...formData, price: e.target.value })
                        }
                        placeholder="2.99"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="template-image">
                    Template Image (PNG with transparency) *
                  </Label>
                  <input
                    ref={fileInputRef}
                    id="template-image"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleImageChange}
                    className="hidden"
                    required={!editingTemplate}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full mt-2"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {editingTemplate ? "Change Image" : "Upload Template Image"}
                  </Button>
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
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label className="text-xs">X</Label>
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
                          <Label className="text-xs">Y</Label>
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
                        variant="outline"
                        onClick={() => setIsSelecting(true)}
                        className="w-full"
                      >
                        {isSelecting
                          ? "Click and drag on image to select area"
                          : "Select Photo Area Visually"}
                      </Button>

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

                <div className="flex gap-2">
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
                      "Save Template"
                    )}
                  </Button>

                  {editingTemplate && (
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

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Preview & Photo Area Selection</CardTitle>
            </CardHeader>
            <CardContent>
              {imagePreview || editingTemplate ? (
                <div className="space-y-4">
                  <canvas
                    ref={canvasRef}
                    className="max-w-full h-auto border border-gray-300 cursor-crosshair rounded"
                    onMouseDown={handleCanvasMouseDown}
                    onMouseUp={handleCanvasMouseUp}
                  />
                  <div className="text-sm text-gray-600 space-y-1">
                    {isSelecting ? (
                      <p className="text-blue-600 font-medium">
                        📍 Click and drag to select the photo area
                      </p>
                    ) : photoArea.width > 0 && photoArea.height > 0 ? (
                      <p className="text-green-600">
                        ✅ Photo area selected. Click 'Select Photo Area
                        Visually' to modify.
                      </p>
                    ) : (
                      <p className="text-amber-600">
                        ⚠️ Please select the photo area before saving.
                      </p>
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
            <CardTitle>
              Template Library ({templates.length} templates)
            </CardTitle>
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
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg">No templates found</p>
                <p className="text-gray-400">
                  Upload your first template to get started
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => {
                  const isValidImage = validateImageUrl(template.image_url);
                  
                  return (
                    <Card
                      key={template.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="aspect-[3/4] bg-gray-100 relative">
                        {isValidImage ? (
                          <>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                            </div>
                            <img
                              src={template.image_url}
                              alt={template.name}
                              className="w-full h-full object-cover opacity-0 transition-opacity duration-300"
                              onLoad={(e) => {
                                (e.target as HTMLImageElement).classList.remove('opacity-0');
                              }}
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/placeholder.svg";
                                target.className = "w-full h-full object-contain p-4";
                              }}
                            />
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-200">
                            <span className="text-gray-500">No preview available</span>
                          </div>
                        )}
                        {template.is_premium && (
                          <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
                            <Crown className="w-3 h-3 mr-1" />${template.price}
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
                            {template.downloads}{" "}
                            {template.downloads === 1 ? "download" : "downloads"}
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
                                +{template.tags.length - 3}
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
  );
}