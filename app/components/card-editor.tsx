"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Download, Share2, Upload, AlignLeft, AlignCenter, AlignRight } from "lucide-react"
import html2canvas from "html2canvas"

interface CardEditorProps {
  template: any
  onBack: () => void
}

export default function CardEditor({ template, onBack }: CardEditorProps) {
  const [cardData, setCardData] = useState({
    title: "You're Invited!",
    subtitle: "Join us for a special celebration",
    names: "John & Jane",
    date: "December 25, 2024",
    time: "6:00 PM",
    venue: "123 Celebration Street, Party City",
    message: "We can't wait to celebrate with you!",
  })

  const [customization, setCustomization] = useState({
    fontFamily: template.fontFamily || "sans-serif",
    fontSize: "medium",
    textColor: template.textColor || "#374151",
    textAlign: "center",
  })

  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDownload = useCallback(async () => {
    if (cardRef.current) {
      try {
        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: null,
          scale: 2,
          useCORS: true,
        })

        const link = document.createElement("a")
        link.download = "invitation-card.png"
        link.href = canvas.toDataURL()
        link.click()
      } catch (error) {
        console.error("Error generating image:", error)
      }
    }
  }, [])

  const handleShare = async (platform: string) => {
    if (cardRef.current) {
      try {
        const canvas = await html2canvas(cardRef.current, {
          backgroundColor: null,
          scale: 2,
          useCORS: true,
        })

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "invitation.png", { type: "image/png" })

            if (navigator.share) {
              navigator.share({
                title: "My Invitation Card",
                text: "Check out my invitation!",
                files: [file],
              })
            } else {
              // Fallback for browsers that don't support Web Share API
              const url = URL.createObjectURL(blob)
              const shareUrls = {
                whatsapp: `https://wa.me/?text=Check out my invitation!`,
                facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`,
                instagram: `https://www.instagram.com/`,
              }

              if (shareUrls[platform as keyof typeof shareUrls]) {
                window.open(shareUrls[platform as keyof typeof shareUrls], "_blank")
              }
            }
          }
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    }
  }

  const fontSizeClasses = {
    small: "text-sm",
    medium: "text-base",
    large: "text-lg",
    xlarge: "text-xl",
  }

  const fontFamilyClasses = {
    "sans-serif": "font-sans",
    serif: "font-serif",
    mono: "font-mono",
  }

  const alignmentClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Button variant="ghost" onClick={onBack} className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold text-gray-800">Card Editor</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={() => handleShare("whatsapp")}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Preview */}
          <div className="lg:col-span-2">
            <Card className="p-4">
              <CardContent className="p-0">
                <div
                  ref={cardRef}
                  className={`aspect-[3/4] ${template.style} rounded-lg p-8 flex flex-col justify-center items-center text-center relative overflow-hidden`}
                  style={{
                    color: customization.textColor,
                    fontFamily:
                      customization.fontFamily === "serif"
                        ? "serif"
                        : customization.fontFamily === "mono"
                          ? "monospace"
                          : "sans-serif",
                  }}
                >
                  {/* Background Image */}
                  {uploadedImage && (
                    <div
                      className="absolute inset-0 bg-cover bg-center opacity-20"
                      style={{ backgroundImage: `url(${uploadedImage})` }}
                    />
                  )}

                  {/* Content */}
                  <div
                    className={`relative z-10 space-y-4 ${alignmentClasses[customization.textAlign as keyof typeof alignmentClasses]}`}
                  >
                    {/* Photo placeholder */}
                    {uploadedImage && (
                      <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden border-4 border-white/50">
                        <img
                          src={uploadedImage || "/placeholder.svg"}
                          alt="Uploaded"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <h1
                      className={`font-bold ${fontSizeClasses[customization.fontSize as keyof typeof fontSizeClasses]} mb-2`}
                    >
                      {cardData.title}
                    </h1>

                    <p className="text-sm opacity-90 mb-4">{cardData.subtitle}</p>

                    <div className="space-y-2">
                      <p className="font-semibold text-lg">{cardData.names}</p>

                      <div className="space-y-1 text-sm">
                        <p>{cardData.date}</p>
                        <p>{cardData.time}</p>
                        <p className="text-xs opacity-80">{cardData.venue}</p>
                      </div>
                    </div>

                    <p className="text-xs italic opacity-75 mt-4">{cardData.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="style">Style</TabsTrigger>
                <TabsTrigger value="photo">Photo</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={cardData.title}
                        onChange={(e) => setCardData({ ...cardData, title: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="subtitle">Subtitle</Label>
                      <Input
                        id="subtitle"
                        value={cardData.subtitle}
                        onChange={(e) => setCardData({ ...cardData, subtitle: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="names">Names</Label>
                      <Input
                        id="names"
                        value={cardData.names}
                        onChange={(e) => setCardData({ ...cardData, names: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        value={cardData.date}
                        onChange={(e) => setCardData({ ...cardData, date: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        value={cardData.time}
                        onChange={(e) => setCardData({ ...cardData, time: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="venue">Venue</Label>
                      <Textarea
                        id="venue"
                        value={cardData.venue}
                        onChange={(e) => setCardData({ ...cardData, venue: e.target.value })}
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        value={cardData.message}
                        onChange={(e) => setCardData({ ...cardData, message: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="style" className="space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <Label>Font Family</Label>
                      <Select
                        value={customization.fontFamily}
                        onValueChange={(value) => setCustomization({ ...customization, fontFamily: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sans-serif">Sans Serif</SelectItem>
                          <SelectItem value="serif">Serif</SelectItem>
                          <SelectItem value="mono">Monospace</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Font Size</Label>
                      <Select
                        value={customization.fontSize}
                        onValueChange={(value) => setCustomization({ ...customization, fontSize: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="small">Small</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="large">Large</SelectItem>
                          <SelectItem value="xlarge">Extra Large</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="textColor">Text Color</Label>
                      <Input
                        id="textColor"
                        type="color"
                        value={customization.textColor}
                        onChange={(e) => setCustomization({ ...customization, textColor: e.target.value })}
                        className="h-10"
                      />
                    </div>

                    <div>
                      <Label>Text Alignment</Label>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant={customization.textAlign === "left" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCustomization({ ...customization, textAlign: "left" })}
                        >
                          <AlignLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={customization.textAlign === "center" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCustomization({ ...customization, textAlign: "center" })}
                        >
                          <AlignCenter className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={customization.textAlign === "right" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCustomization({ ...customization, textAlign: "right" })}
                        >
                          <AlignRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="photo" className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Photo
                      </Button>
                      {uploadedImage && (
                        <div className="mt-4">
                          <img
                            src={uploadedImage || "/placeholder.svg"}
                            alt="Preview"
                            className="w-20 h-20 rounded-full mx-auto object-cover"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUploadedImage(null)}
                            className="mt-2 text-red-600"
                          >
                            Remove Photo
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Share Options */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Share Your Invitation</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare("whatsapp")}
                    className="bg-green-50 hover:bg-green-100"
                  >
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare("facebook")}
                    className="bg-blue-50 hover:bg-blue-100"
                  >
                    Facebook
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShare("instagram")}
                    className="bg-pink-50 hover:bg-pink-100"
                  >
                    Instagram
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="bg-gray-50 hover:bg-gray-100">
                    Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
