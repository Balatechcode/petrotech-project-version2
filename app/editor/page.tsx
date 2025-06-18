"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Download, Share2, Upload, AlignLeft, AlignCenter, AlignRight, Move } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

interface Template {
  id: string
  name: string
  category: string
  imageUrl: string
  photoArea: {
    x: number
    y: number
    width: number
    height: number
  }
  createdAt: string
}

export default function EditorPage() {
  const [template, setTemplate] = useState<Template | null>(null)
  const [userPhoto, setUserPhoto] = useState<string | null>(null)
  const [cardData, setCardData] = useState({
    names: "John & Jane",
    date: "December 25, 2024",
    venue: "123 Celebration Street, Party City",
  })

  const [textStyle, setTextStyle] = useState({
    fontFamily: "serif",
    fontSize: "16",
    color: "#000000",
    strokeColor: "#ffffff",
    strokeWidth: "0",
    lineSpacing: "1.2",
    alignment: "center",
  })

  const [textPositions, setTextPositions] = useState({
    names: { x: 0, y: -200 },
    date: { x: 0, y: -160 },
    venue: { x: 0, y: -130 },
  })

  const [photoAdjustment, setPhotoAdjustment] = useState({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  })

  const [isDragging, setIsDragging] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isPhotoMode, setIsPhotoMode] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const templateId = searchParams.get("template")
    if (templateId) {
      const savedTemplates = localStorage.getItem("invitation-templates")
      if (savedTemplates) {
        const templates = JSON.parse(savedTemplates)
        const foundTemplate = templates.find((t: Template) => t.id === templateId)
        if (foundTemplate) {
          setTemplate(foundTemplate)
        }
      }
    }
  }, [searchParams.get("template")])

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUserPhoto(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    if (isPhotoMode && userPhoto) {
      // Photo dragging mode
      setIsDragging("photo")
      setDragStart({ x: x - photoAdjustment.offsetX, y: y - photoAdjustment.offsetY })
    } else {
      // Text dragging mode - check which text element is clicked
      const centerX = canvas.width / 2
      const textElements = [
        { key: "names", y: canvas.height + textPositions.names.y, x: centerX + textPositions.names.x },
        { key: "date", y: canvas.height + textPositions.date.y, x: centerX + textPositions.date.x },
        { key: "venue", y: canvas.height + textPositions.venue.y, x: centerX + textPositions.venue.x },
      ]

      // Find closest text element (simple hit detection)
      for (const element of textElements) {
        if (Math.abs(x - element.x) < 100 && Math.abs(y - element.y) < 30) {
          setIsDragging(element.key)
          setDragStart({ x: x - textPositions[element.key as keyof typeof textPositions].x, y })
          break
        }
      }
    }
  }

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const x = (event.clientX - rect.left) * scaleX
    const y = (event.clientY - rect.top) * scaleY

    if (isDragging === "photo") {
      setPhotoAdjustment((prev) => ({
        ...prev,
        offsetX: x - dragStart.x,
        offsetY: y - dragStart.y,
      }))
    } else if (isDragging in textPositions) {
      setTextPositions((prev) => ({
        ...prev,
        [isDragging]: {
          x: x - dragStart.x,
          y: y - canvas.height,
        },
      }))
    }
  }

  const handleCanvasMouseUp = () => {
    setIsDragging(null)
  }

  const handleCanvasWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    if (!isPhotoMode || !userPhoto) return

    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.1 : 0.1
    setPhotoAdjustment((prev) => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale + delta)),
    }))
  }

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !template) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = 800
    canvas.height = 1200

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (userPhoto) {
      const userImg = new Image()
      userImg.onload = () => {
        const photoArea = template.photoArea
        const scaleX = canvas.width / 800
        const scaleY = canvas.height / 1200

        const scaledArea = {
          x: photoArea.x * scaleX,
          y: photoArea.y * scaleY,
          width: photoArea.width * scaleX,
          height: photoArea.height * scaleY,
        }

        const photoAspect = userImg.width / userImg.height
        const areaAspect = scaledArea.width / scaledArea.height

        let baseWidth, baseHeight

        if (photoAspect > areaAspect) {
          baseHeight = scaledArea.height
          baseWidth = baseHeight * photoAspect
        } else {
          baseWidth = scaledArea.width
          baseHeight = baseWidth / photoAspect
        }

        const adjustedWidth = baseWidth * photoAdjustment.scale
        const adjustedHeight = baseHeight * photoAdjustment.scale

        const drawX = scaledArea.x + (scaledArea.width - adjustedWidth) / 2 + photoAdjustment.offsetX
        const drawY = scaledArea.y + (scaledArea.height - adjustedHeight) / 2 + photoAdjustment.offsetY

        ctx.save()
        ctx.beginPath()
        ctx.rect(scaledArea.x, scaledArea.y, scaledArea.width, scaledArea.height)
        ctx.clip()
        ctx.drawImage(userImg, drawX, drawY, adjustedWidth, adjustedHeight)
        ctx.restore()

        drawTemplate()
      }
      userImg.src = userPhoto
    } else {
      drawTemplate()
    }

    function drawTemplate() {
      const templateImg = new Image()
      templateImg.onload = () => {
        ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height)
        drawText()
      }
      templateImg.src = template.imageUrl
    }

    function drawText() {
      const centerX = canvas.width / 2
      const lineHeight = Number.parseFloat(textStyle.fontSize) * Number.parseFloat(textStyle.lineSpacing)

      // Draw Names
      drawTextElement(
        cardData.names,
        centerX + textPositions.names.x,
        canvas.height + textPositions.names.y,
        `bold ${Number.parseInt(textStyle.fontSize) + 8}px ${textStyle.fontFamily}`,
      )

      // Draw Date
      drawTextElement(
        cardData.date,
        centerX + textPositions.date.x,
        canvas.height + textPositions.date.y,
        `${textStyle.fontSize}px ${textStyle.fontFamily}`,
      )

      // Draw Venue (with line wrapping)
      const venueWords = cardData.venue.split(" ")
      let line = ""
      const maxWidth = canvas.width - 100
      let currentY = canvas.height + textPositions.venue.y

      ctx.font = `${Number.parseInt(textStyle.fontSize) - 2}px ${textStyle.fontFamily}`

      for (let n = 0; n < venueWords.length; n++) {
        const testLine = line + venueWords[n] + " "
        const metrics = ctx.measureText(testLine)

        if (metrics.width > maxWidth && n > 0) {
          drawTextElement(line, centerX + textPositions.venue.x, currentY, ctx.font)
          line = venueWords[n] + " "
          currentY += lineHeight
        } else {
          line = testLine
        }
      }
      drawTextElement(line, centerX + textPositions.venue.x, currentY, ctx.font)

      function drawTextElement(text: string, x: number, y: number, font: string) {
        ctx.font = font
        ctx.textAlign = textStyle.alignment as CanvasTextAlign

        // Draw stroke if enabled
        if (Number.parseFloat(textStyle.strokeWidth) > 0) {
          ctx.strokeStyle = textStyle.strokeColor
          ctx.lineWidth = Number.parseFloat(textStyle.strokeWidth)
          ctx.strokeText(text, x, y)
        }

        // Draw fill text
        ctx.fillStyle = textStyle.color
        ctx.fillText(text, x, y)
      }
    }
  }, [template, userPhoto, cardData, textStyle, photoAdjustment, textPositions])

  useEffect(() => {
    drawCanvas()
  }, [drawCanvas])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement("a")
    link.download = `invitation-${Date.now()}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }

  const handleShare = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    try {
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
            const text = encodeURIComponent(
              `Join us for our celebration!\n\n${cardData.names}\n${cardData.date}\n${cardData.venue}`,
            )
            window.open(`https://wa.me/?text=${text}`, "_blank")
          }
        }
      })
    } catch (error) {
      console.error("Error sharing:", error)
    }
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Template not found</p>
          <Link href="/templates">
            <Button>Back to Templates</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link href="/templates">
              <Button variant="ghost" className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Customize Your Invitation</h1>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-700">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handleShare}>
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
                <div className="flex justify-center mb-4">
                  <div className="flex gap-2">
                    <Button
                      variant={isPhotoMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsPhotoMode(true)}
                      disabled={!userPhoto}
                    >
                      <Move className="w-4 h-4 mr-2" />
                      Photo Mode
                    </Button>
                    <Button
                      variant={!isPhotoMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setIsPhotoMode(false)}
                    >
                      <Move className="w-4 h-4 mr-2" />
                      Text Mode
                    </Button>
                  </div>
                </div>
                <div className="flex justify-center">
                  <canvas
                    ref={canvasRef}
                    className={`max-w-full h-auto border border-gray-300 rounded-lg shadow-lg ${
                      isPhotoMode ? "cursor-move" : "cursor-pointer"
                    }`}
                    style={{ maxHeight: "600px" }}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onWheel={handleCanvasWheel}
                  />
                </div>
                <p className="text-sm text-gray-600 text-center mt-2">
                  {isPhotoMode
                    ? "Drag to move photo, scroll to resize"
                    : "Click and drag text elements to reposition them"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <Tabs defaultValue="photo" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="photo">Photo</TabsTrigger>
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="style">Style</TabsTrigger>
              </TabsList>

              <TabsContent value="photo" className="space-y-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full mb-4">
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Your Photo
                      </Button>

                      {userPhoto && (
                        <div className="mt-4 space-y-4">
                          <img
                            src={userPhoto || "/placeholder.svg"}
                            alt="Preview"
                            className="w-20 h-20 rounded-lg mx-auto object-cover border"
                          />

                          <div className="space-y-4 border-t pt-4">
                            <h4 className="font-medium text-sm">Photo Controls</h4>
                            <div className="text-sm text-gray-600 space-y-1">
                              <p>• Switch to Photo Mode above</p>
                              <p>• Drag photo to move</p>
                              <p>• Scroll wheel to resize</p>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPhotoAdjustment({ scale: 1, offsetX: 0, offsetY: 0 })}
                              className="w-full"
                            >
                              Reset Position & Size
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUserPhoto(null)
                              setPhotoAdjustment({ scale: 1, offsetX: 0, offsetY: 0 })
                            }}
                            className="mt-2 text-red-600"
                          >
                            Remove Photo
                          </Button>
                        </div>
                      )}

                      <p className="text-sm text-gray-600 mt-4">
                        Upload a photo and use Photo Mode to adjust its position and size with your mouse.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="text" className="space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <Label htmlFor="names">Names</Label>
                      <Input
                        id="names"
                        value={cardData.names}
                        onChange={(e) => setCardData({ ...cardData, names: e.target.value })}
                        placeholder="John & Jane"
                      />
                    </div>

                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        value={cardData.date}
                        onChange={(e) => setCardData({ ...cardData, date: e.target.value })}
                        placeholder="December 25, 2024"
                      />
                    </div>

                    <div>
                      <Label htmlFor="venue">Venue</Label>
                      <Input
                        id="venue"
                        value={cardData.venue}
                        onChange={(e) => setCardData({ ...cardData, venue: e.target.value })}
                        placeholder="123 Celebration Street, Party City"
                      />
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium text-sm mb-2">Text Positioning</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>• Switch to Text Mode above</p>
                        <p>• Click and drag text to move</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setTextPositions({
                            names: { x: 0, y: -200 },
                            date: { x: 0, y: -160 },
                            venue: { x: 0, y: -130 },
                          })
                        }
                        className="w-full mt-2"
                      >
                        Reset Text Positions
                      </Button>
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
                        value={textStyle.fontFamily}
                        onValueChange={(value) => setTextStyle({ ...textStyle, fontFamily: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="serif">Serif</SelectItem>
                          <SelectItem value="sans-serif">Sans Serif</SelectItem>
                          <SelectItem value="cursive">Cursive</SelectItem>
                          <SelectItem value="monospace">Monospace</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="fontSize">Font Size</Label>
                      <Input
                        id="fontSize"
                        type="number"
                        min="12"
                        max="48"
                        value={textStyle.fontSize}
                        onChange={(e) => setTextStyle({ ...textStyle, fontSize: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="lineSpacing">Line Spacing</Label>
                      <Input
                        id="lineSpacing"
                        type="number"
                        min="0.8"
                        max="3"
                        step="0.1"
                        value={textStyle.lineSpacing}
                        onChange={(e) => setTextStyle({ ...textStyle, lineSpacing: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="textColor">Text Color</Label>
                      <Input
                        id="textColor"
                        type="color"
                        value={textStyle.color}
                        onChange={(e) => setTextStyle({ ...textStyle, color: e.target.value })}
                        className="h-10"
                      />
                    </div>

                    <div>
                      <Label htmlFor="strokeWidth">Text Stroke Width</Label>
                      <Input
                        id="strokeWidth"
                        type="number"
                        min="0"
                        max="10"
                        step="0.5"
                        value={textStyle.strokeWidth}
                        onChange={(e) => setTextStyle({ ...textStyle, strokeWidth: e.target.value })}
                      />
                    </div>

                    {Number.parseFloat(textStyle.strokeWidth) > 0 && (
                      <div>
                        <Label htmlFor="strokeColor">Stroke Color</Label>
                        <Input
                          id="strokeColor"
                          type="color"
                          value={textStyle.strokeColor}
                          onChange={(e) => setTextStyle({ ...textStyle, strokeColor: e.target.value })}
                          className="h-10"
                        />
                      </div>
                    )}

                    <div>
                      <Label>Text Alignment</Label>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant={textStyle.alignment === "left" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTextStyle({ ...textStyle, alignment: "left" })}
                        >
                          <AlignLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={textStyle.alignment === "center" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTextStyle({ ...textStyle, alignment: "center" })}
                        >
                          <AlignCenter className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={textStyle.alignment === "right" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTextStyle({ ...textStyle, alignment: "right" })}
                        >
                          <AlignRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Quick Actions */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Button onClick={handleDownload} className="w-full bg-green-600 hover:bg-green-700">
                    <Download className="w-4 h-4 mr-2" />
                    Download PNG
                  </Button>
                  <Button onClick={handleShare} variant="outline" className="w-full">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share via WhatsApp
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
