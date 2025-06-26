"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Download,
  Share2,
  Upload,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Move,
  Type,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Template {
  id: string;
  name: string;
  category: string;
  frameImageUrl: string;
  photoArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  createdAt: string;
}

interface TextStyle {
  fontFamily: string;
  fontSize: string;
  color: string;
  strokeColor: string;
  strokeWidth: string;
  alignment: CanvasTextAlign;
}

interface TextElement {
  id: string;
  content: string;
  position: { x: number; y: number };
  style: TextStyle;
}

interface PhotoState {
  url: string;
  scale: number;
  position: { x: number; y: number };
}

export default function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [template, setTemplate] = useState<Template | null>(null);
  const [userPhoto, setUserPhoto] = useState<PhotoState | null>(null);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<"photo" | "text" | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState<"photo" | "text">("photo");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Default text style
  const defaultTextStyle: TextStyle = {
    fontFamily: "serif",
    fontSize: "24",
    color: "#000000",
    strokeColor: "#ffffff",
    strokeWidth: "0",
    alignment: "center",
  };

  // Load template
  useEffect(() => {
    setIsClient(true);
    const templateId = searchParams.get("template");

    if (!templateId) {
      router.push("/templates");
      return;
    }

    const loadTemplate = async () => {
      try {
        const { data, error } = await supabase
          .from("templates")
          .select("*")
          .eq("id", templateId)
          .single();

        if (error) throw error;

        if (data) {
          const loadedTemplate: Template = {
            id: data.id,
            name: data.name,
            category: data.category,
            frameImageUrl: data.image_url,
            photoArea: data.photo_area,
            createdAt: data.created_at,
          };

          setTemplate(loadedTemplate);

          // Add default text elements
          setTextElements([
            {
              id: "names-" + Date.now(),
              content: "John & Jane",
              position: { x: 400, y: 200 },
              style: { ...defaultTextStyle, fontSize: "32" },
            },
            {
              id: "date-" + Date.now(),
              content: "December 25, 2024",
              position: { x: 400, y: 250 },
              style: { ...defaultTextStyle },
            },
            {
              id: "venue-" + Date.now(),
              content: "123 Celebration Street",
              position: { x: 400, y: 300 },
              style: { ...defaultTextStyle, fontSize: "20" },
            },
          ]);

          setIsLoading(false);
        } else {
          router.push("/templates");
        }
      } catch (error) {
        console.error("Error loading template:", error);
        router.push("/templates");
      }
    };

    loadTemplate();
  }, [searchParams, router]);

  // Handle photo upload
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          setUserPhoto({
            url: e.target.result as string,
            scale: 1,
            position: { x: 0, y: 0 },
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Canvas interaction handlers
  const handleCanvasMouseDown = (
    event: React.MouseEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    if (mode === "photo" && userPhoto) {
      setIsDragging("photo");
      setDragStart({ x, y });
    } else if (mode === "text") {
      // Check if clicking on a text element
      const clickedText = textElements.find((text) => {
        const metrics = measureText(text);
        return (
          x >= text.position.x - metrics.width / 2 &&
          x <= text.position.x + metrics.width / 2 &&
          y >= text.position.y - parseInt(text.style.fontSize) &&
          y <= text.position.y
        );
      });

      if (clickedText) {
        setIsDragging("text");
        setActiveTextId(clickedText.id);
        setDragStart({
          x: x - clickedText.position.x,
          y: y - clickedText.position.y,
        });
      }
    }
  };

  const handleCanvasMouseMove = (
    event: React.MouseEvent<HTMLCanvasElement>
  ) => {
    if (!isDragging || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    if (isDragging === "photo" && userPhoto) {
      setUserPhoto((prev) => ({
        ...prev!,
        position: {
          x: prev!.position.x + (x - dragStart.x),
          y: prev!.position.y + (y - dragStart.y),
        },
      }));
      setDragStart({ x, y });
    } else if (isDragging === "text" && activeTextId) {
      setTextElements((prev) =>
        prev.map((text) =>
          text.id === activeTextId
            ? {
                ...text,
                position: {
                  x: x - dragStart.x,
                  y: y - dragStart.y,
                },
              }
            : text
        )
      );
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(null);
  };

  const handleCanvasWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    if (mode !== "photo" || !userPhoto) return;

    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.05 : 0.05;
    setUserPhoto((prev) => ({
      ...prev!,
      scale: Math.max(0.5, Math.min(3, prev!.scale + delta)),
    }));
  };

  // Measure text width
  const measureText = (textElement: TextElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return { width: 0, height: 0 };

    const ctx = canvas.getContext("2d");
    if (!ctx) return { width: 0, height: 0 };

    ctx.font = `${textElement.style.fontSize}px ${textElement.style.fontFamily}`;
    const metrics = ctx.measureText(textElement.content);
    return {
      width: metrics.width,
      height: parseInt(textElement.style.fontSize),
    };
  };

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !template) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = 800;
    canvas.height = 1200;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw user photo as background (if exists)
    if (userPhoto) {
      const img = new Image();
      img.onload = () => {
        // Calculate dimensions to maintain aspect ratio
        const imgAspect = img.width / img.height;
        let drawWidth, drawHeight;

        if (imgAspect > 1) {
          // Landscape
          drawHeight = canvas.height * userPhoto.scale;
          drawWidth = drawHeight * imgAspect;
        } else {
          // Portrait
          drawWidth = canvas.width * userPhoto.scale;
          drawHeight = drawWidth / imgAspect;
        }

        ctx.drawImage(
          img,
          userPhoto.position.x,
          userPhoto.position.y,
          drawWidth,
          drawHeight
        );

        // Draw frame on top
        drawFrameImage();
      };
      img.onerror = () => console.error("Failed to load user photo");
      img.src = userPhoto.url;
    } else {
      // If no photo, just draw frame
      drawFrameImage();
    }

    function drawFrameImage() {
      const frameImg = new Image();
      frameImg.onload = () => {
        ctx.drawImage(frameImg, 0, 0, canvas.width, canvas.height);
        drawTextElements();
      };
      frameImg.onerror = () => console.error("Failed to load frame image");
      frameImg.src = template.frameImageUrl;
    }

    function drawTextElements() {
      textElements.forEach((text) => {
        const {
          fontFamily,
          fontSize,
          color,
          strokeColor,
          strokeWidth,
          alignment,
        } = text.style;

        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.textAlign = alignment;
        ctx.textBaseline = "alphabetic";

        // Draw text stroke if needed
        if (parseFloat(strokeWidth) > 0) {
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = parseFloat(strokeWidth);
          ctx.strokeText(text.content, text.position.x, text.position.y);
        }

        // Draw text fill
        ctx.fillStyle = color;
        ctx.fillText(text.content, text.position.x, text.position.y);

        // Draw selection indicator
        if (text.id === activeTextId) {
          const metrics = measureText(text);
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(
            text.position.x - metrics.width / 2 - 5,
            text.position.y - parseInt(fontSize) - 5,
            metrics.width + 10,
            parseInt(fontSize) + 10
          );
          ctx.setLineDash([]);
        }
      });
    }
  }, [template, userPhoto, textElements, activeTextId]);

  // Redraw canvas when dependencies change
  useEffect(() => {
    if (isClient && !isLoading) {
      drawCanvas();
    }
  }, [drawCanvas, isClient, isLoading]);

  // Text management functions
  const addTextElement = () => {
    const newText: TextElement = {
      id: `text-${Date.now()}`,
      content: "New Text",
      position: { x: 400, y: 400 },
      style: { ...defaultTextStyle },
    };
    setTextElements([...textElements, newText]);
    setActiveTextId(newText.id);
    setMode("text");
  };

  const removeTextElement = (id: string) => {
    setTextElements(textElements.filter((el) => el.id !== id));
    if (activeTextId === id) {
      setActiveTextId(textElements.length > 1 ? textElements[0].id : null);
    }
  };

  const updateTextContent = (id: string, content: string) => {
    setTextElements(
      textElements.map((el) => (el.id === id ? { ...el, content } : el))
    );
  };

  const updateTextStyle = (id: string, style: Partial<TextStyle>) => {
    setTextElements(
      textElements.map((el) =>
        el.id === id ? { ...el, style: { ...el.style, ...style } } : el
      )
    );
  };

  // Export functions
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `photo-frame-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], "photo-frame.png", { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "My Photo Frame",
            files: [file],
          });
        } else {
          const dataUrl = canvas.toDataURL("image/png");
          const text = encodeURIComponent("Check out my custom photo frame!");
          window.open(`https://wa.me/?text=${text}%0A%0A${dataUrl}`, "_blank");
        }
      }, "image/png");
    } catch (error) {
      console.error("Error sharing:", error);
      handleDownload();
    }
  };

  if (!isClient || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p>No template selected or template failed to load</p>
        <Link href="/templates">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Templates
          </Button>
        </Link>
      </div>
    );
  }

  const activeText = textElements.find((el) => el.id === activeTextId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          {/* Back Button and Title */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
            <Link href="/templates">
              <Button variant="ghost" className="flex items-center">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 text-left sm:text-center">
              Customize Your Photo Frame
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Button
              onClick={handleDownload}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              className="w-full sm:w-auto"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Canvas & Mode Selection */}
          <Card className="p-4">
            <CardContent className="p-0 flex flex-col items-center">
              {/* Mode Buttons */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant={mode === "photo" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("photo")}
                  disabled={!userPhoto}
                >
                  <Move className="w-4 h-4 mr-2" />
                  Photo Mode
                </Button>
                <Button
                  variant={mode === "text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setMode("text")}
                >
                  <Type className="w-4 h-4 mr-2" />
                  Text Mode
                </Button>
              </div>

              {/* Canvas */}
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  className={`w-full max-w-xs border border-gray-300 rounded-lg shadow-lg ${
                    mode === "photo" ? "cursor-move" : "cursor-pointer"
                  }`}
                  style={{
                    maxHeight: "600px",
                    aspectRatio: "2/3",
                    backgroundColor: "#ffffff",
                  }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                  onWheel={handleCanvasWheel}
                />
              </div>

              {/* Instruction */}
              <p className="text-sm text-gray-600 text-center mt-2">
                {mode === "photo"
                  ? "Drag to move photo, scroll to zoom"
                  : "Click text to select, drag to move"}
              </p>
            </CardContent>
          </Card>

          {/* Tabs & Controls */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <div className="bg-white rounded-xl shadow p-4">
              <Tabs defaultValue="photo" className="w-full">
                {/* Tabs Header */}
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="photo">Photo</TabsTrigger>
                  <TabsTrigger value="text">Text</TabsTrigger>
                  <TabsTrigger value="style" disabled={!activeText}>
                    Style
                  </TabsTrigger>
                </TabsList>

                {/* Photo Tab */}
                <TabsContent value="photo">
                  {/* Your Photo Upload UI */}
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
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                          className="w-full mb-4"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Your Photo
                        </Button>

                        {userPhoto && (
                          <div className="mt-4 space-y-4">
                            <img
                              src={userPhoto.url}
                              alt="Preview"
                              className="w-20 h-20 rounded-lg mx-auto object-cover border"
                            />

                            <div className="space-y-4 border-t pt-4">
                              <h4 className="font-medium text-sm">
                                Photo Controls
                              </h4>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p>• Switch to Photo Mode above</p>
                                <p>• Drag photo to move</p>
                                <p>• Scroll wheel to zoom</p>
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setUserPhoto({
                                    ...userPhoto,
                                    scale: 1,
                                    position: { x: 0, y: 0 },
                                  })
                                }
                                className="w-full"
                              >
                                Reset Position & Zoom
                              </Button>
                            </div>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setUserPhoto(null)}
                              className="mt-2 text-red-600"
                            >
                              Remove Photo
                            </Button>
                          </div>
                        )}

                        <p className="text-sm text-gray-600 mt-4">
                          Upload a photo and use Photo Mode to adjust its
                          position and zoom level.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Text Tab */}
                <TabsContent value="text">
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <Button
                        onClick={addTextElement}
                        className="w-full"
                        variant="outline"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Text Element
                      </Button>

                      {textElements.length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-medium text-sm">Text Elements</h4>
                          <div className="space-y-2">
                            {textElements.map((text) => (
                              <div
                                key={text.id}
                                className={`p-3 rounded border ${
                                  text.id === activeTextId
                                    ? "border-blue-500 bg-blue-50"
                                    : "border-gray-200"
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <Input
                                    value={text.content}
                                    onChange={(e) =>
                                      updateTextContent(text.id, e.target.value)
                                    }
                                    className="flex-1 mr-2"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeTextElement(text.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                                <Button
                                  variant={
                                    text.id === activeTextId
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  className="w-full"
                                  onClick={() => setActiveTextId(text.id)}
                                >
                                  Select to Edit
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Style Tab */}
                {activeText && (
                  <TabsContent value="style">
                    <Card>
                      <CardContent className="p-4 space-y-4">
                        <div>
                          <Label>Font Family</Label>
                          <Select
                            value={activeText.style.fontFamily}
                            onValueChange={(value) =>
                              updateTextStyle(activeText.id, {
                                fontFamily: value,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="serif">Serif</SelectItem>
                              <SelectItem value="sans-serif">
                                Sans Serif
                              </SelectItem>
                              <SelectItem value="cursive">Cursive</SelectItem>
                              <SelectItem value="monospace">
                                Monospace
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="fontSize">Font Size</Label>
                          <Input
                            id="fontSize"
                            type="number"
                            min="12"
                            max="72"
                            value={activeText.style.fontSize}
                            onChange={(e) =>
                              updateTextStyle(activeText.id, {
                                fontSize: e.target.value,
                              })
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="textColor">Text Color</Label>
                          <Input
                            id="textColor"
                            type="color"
                            value={activeText.style.color}
                            onChange={(e) =>
                              updateTextStyle(activeText.id, {
                                color: e.target.value,
                              })
                            }
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
                            value={activeText.style.strokeWidth}
                            onChange={(e) =>
                              updateTextStyle(activeText.id, {
                                strokeWidth: e.target.value,
                              })
                            }
                          />
                        </div>

                        {parseFloat(activeText.style.strokeWidth) > 0 && (
                          <div>
                            <Label htmlFor="strokeColor">Stroke Color</Label>
                            <Input
                              id="strokeColor"
                              type="color"
                              value={activeText.style.strokeColor}
                              onChange={(e) =>
                                updateTextStyle(activeText.id, {
                                  strokeColor: e.target.value,
                                })
                              }
                              className="h-10"
                            />
                          </div>
                        )}

                        <div>
                          <Label>Text Alignment</Label>
                          <div className="flex gap-2 mt-2">
                            <Button
                              variant={
                                activeText.style.alignment === "left"
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                updateTextStyle(activeText.id, {
                                  alignment: "left",
                                })
                              }
                            >
                              <AlignLeft className="w-4 h-4" />
                            </Button>
                            <Button
                              variant={
                                activeText.style.alignment === "center"
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                updateTextStyle(activeText.id, {
                                  alignment: "center",
                                })
                              }
                            >
                              <AlignCenter className="w-4 h-4" />
                            </Button>
                            <Button
                              variant={
                                activeText.style.alignment === "right"
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              onClick={() =>
                                updateTextStyle(activeText.id, {
                                  alignment: "right",
                                })
                              }
                            >
                              <AlignRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                )}
              </Tabs>
            </div>

            {/* Quick Actions Card */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <Button
                    onClick={handleDownload}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PNG
                  </Button>
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    className="w-full"
                  >
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
  );
}
