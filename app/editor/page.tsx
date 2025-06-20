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
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Template {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  photoArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  createdAt: string;
}

interface TextPositions {
  names: { x: number; y: number };
  date: { x: number; y: number };
  venue: { x: number; y: number };
}

interface TextStyle {
  fontFamily: string;
  fontSize: string;
  color: string;
  strokeColor: string;
  strokeWidth: string;
  lineSpacing: string;
  alignment: CanvasTextAlign;
}

interface PhotoAdjustment {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export default function EditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [template, setTemplate] = useState<Template | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [cardData, setCardData] = useState({
    names: "John & Jane",
    date: "December 25, 2024",
    venue: "123 Celebration Street, Party City",
  });
  const [textStyle, setTextStyle] = useState<TextStyle>({
    fontFamily: "serif",
    fontSize: "16",
    color: "#000000",
    strokeColor: "#ffffff",
    strokeWidth: "0",
    lineSpacing: "1.2",
    alignment: "center",
  });
  const [textPositions, setTextPositions] = useState<TextPositions>({
    names: { x: 0, y: -200 },
    date: { x: 0, y: -160 },
    venue: { x: 0, y: -130 },
  });
  const [photoAdjustment, setPhotoAdjustment] = useState<PhotoAdjustment>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isPhotoMode, setIsPhotoMode] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          .from('templates')
          .select('*')
          .eq('id', templateId)
          .single();

        if (error) {
          throw error;
        }

        if (data) {
          const loadedTemplate: Template = {
            id: data.id,
            name: data.name,
            category: data.category,
            imageUrl: data.image_url,
            photoArea: data.photo_area,
            createdAt: data.created_at
          };

          const img = new Image();
          img.onload = () => {
            setTemplate(loadedTemplate);
            setIsLoading(false);
          };
          img.onerror = () => {
            console.error("Failed to load template image");
            setIsLoading(false);
          };
          img.src = loadedTemplate.imageUrl;
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

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          setUserPhoto(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    if (isPhotoMode && userPhoto) {
      setIsDragging("photo");
      setDragStart({
        x: x - photoAdjustment.offsetX,
        y: y - photoAdjustment.offsetY,
      });
    } else {
      const centerX = canvas.width / 2;
      const textElements = [
        {
          key: "names",
          y: canvas.height + textPositions.names.y,
          x: centerX + textPositions.names.x,
        },
        {
          key: "date",
          y: canvas.height + textPositions.date.y,
          x: centerX + textPositions.date.x,
        },
        {
          key: "venue",
          y: canvas.height + textPositions.venue.y,
          x: centerX + textPositions.venue.x,
        },
      ];

      for (const element of textElements) {
        if (Math.abs(x - element.x) < 100 && Math.abs(y - element.y) < 30) {
          setIsDragging(element.key);
          setDragStart({
            x: x - textPositions[element.key as keyof TextPositions].x,
            y,
          });
          break;
        }
      }
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    if (isDragging === "photo") {
      setPhotoAdjustment((prev) => ({
        ...prev,
        offsetX: x - dragStart.x,
        offsetY: y - dragStart.y,
      }));
    } else if (isDragging in textPositions) {
      const key = isDragging as keyof TextPositions;
      setTextPositions((prev) => ({
        ...prev,
        [key]: {
          x: x - dragStart.x,
          y: y - canvas.height,
        },
      }));
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(null);
  };

  const handleCanvasWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    if (!isPhotoMode || !userPhoto) return;

    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setPhotoAdjustment((prev) => ({
      ...prev,
      scale: Math.max(0.5, Math.min(3, prev.scale + delta)),
    }));
  };

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !template) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 1200;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const drawTemplateImage = () => {
      return new Promise<void>((resolve) => {
        const templateImg = new Image();
        templateImg.crossOrigin = "Anonymous";
        templateImg.onload = () => {
          ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
          resolve();
        };
        templateImg.onerror = () => {
          console.error("Failed to load template image");
          resolve();
        };
        templateImg.src = template.imageUrl;
      });
    };

    const drawUserPhoto = () => {
      if (!userPhoto) return Promise.resolve();

      return new Promise<void>((resolve) => {
        const userImg = new Image();
        userImg.onload = () => {
          const photoArea = template.photoArea;
          const scaleX = canvas.width / 800;
          const scaleY = canvas.height / 1200;

          const scaledArea = {
            x: photoArea.x * scaleX,
            y: photoArea.y * scaleY,
            width: photoArea.width * scaleX,
            height: photoArea.height * scaleY,
          };

          const photoAspect = userImg.width / userImg.height;
          const areaAspect = scaledArea.width / scaledArea.height;

          let baseWidth, baseHeight;
          if (photoAspect > areaAspect) {
            baseHeight = scaledArea.height;
            baseWidth = baseHeight * photoAspect;
          } else {
            baseWidth = scaledArea.width;
            baseHeight = baseWidth / photoAspect;
          }

          const adjustedWidth = baseWidth * photoAdjustment.scale;
          const adjustedHeight = baseHeight * photoAdjustment.scale;

          const drawX = scaledArea.x + (scaledArea.width - adjustedWidth) / 2 + photoAdjustment.offsetX;
          const drawY = scaledArea.y + (scaledArea.height - adjustedHeight) / 2 + photoAdjustment.offsetY;

          ctx.save();
          ctx.beginPath();
          ctx.rect(scaledArea.x, scaledArea.y, scaledArea.width, scaledArea.height);
          ctx.clip();
          ctx.drawImage(userImg, drawX, drawY, adjustedWidth, adjustedHeight);
          ctx.restore();
          resolve();
        };
        userImg.onerror = () => {
          console.error("Failed to load user photo");
          resolve();
        };
        userImg.src = userPhoto;
      });
    };

    const drawTextElements = () => {
      const centerX = canvas.width / 2;
      const lineHeight = Number.parseFloat(textStyle.fontSize) * Number.parseFloat(textStyle.lineSpacing);

      const drawTextElement = (text: string, x: number, y: number, font: string) => {
        ctx.font = font;
        ctx.textAlign = textStyle.alignment;

        if (Number.parseFloat(textStyle.strokeWidth) > 0) {
          ctx.strokeStyle = textStyle.strokeColor;
          ctx.lineWidth = Number.parseFloat(textStyle.strokeWidth);
          ctx.strokeText(text, x, y);
        }

        ctx.fillStyle = textStyle.color;
        ctx.fillText(text, x, y);
      };

      drawTextElement(
        cardData.names,
        centerX + textPositions.names.x,
        canvas.height + textPositions.names.y,
        `bold ${Number.parseInt(textStyle.fontSize) + 8}px ${textStyle.fontFamily}`
      );

      drawTextElement(
        cardData.date,
        centerX + textPositions.date.x,
        canvas.height + textPositions.date.y,
        `${textStyle.fontSize}px ${textStyle.fontFamily}`
      );

      ctx.font = `${Number.parseInt(textStyle.fontSize) - 2}px ${textStyle.fontFamily}`;
      const venueWords = cardData.venue.split(" ");
      let line = "";
      const maxWidth = canvas.width - 100;
      let currentY = canvas.height + textPositions.venue.y;

      for (let n = 0; n < venueWords.length; n++) {
        const testLine = line + venueWords[n] + " ";
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && n > 0) {
          drawTextElement(line, centerX + textPositions.venue.x, currentY, ctx.font);
          line = venueWords[n] + " ";
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      drawTextElement(line, centerX + textPositions.venue.x, currentY, ctx.font);
    };

    const drawAll = async () => {
      await drawTemplateImage();
      await drawUserPhoto();
      drawTextElements();
    };

    drawAll();
  }, [template, userPhoto, cardData, textStyle, photoAdjustment, textPositions]);

  useEffect(() => {
    if (isClient && !isLoading) {
      drawCanvas();
    }
  }, [drawCanvas, isClient, isLoading]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `invitation-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        const file = new File([blob], "invitation.png", { type: "image/png" });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "My Invitation Card",
            text: "Check out my invitation!",
            files: [file],
          });
        } else {
          const dataUrl = canvas.toDataURL("image/png");
          const text = encodeURIComponent(
            `Join us for our celebration!\n\n${cardData.names}\n${cardData.date}\n${cardData.venue}\n\nView invitation: ${dataUrl}`
          );
          window.open(`https://wa.me/?text=${text}`, "_blank");
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <Link href="/templates">
              <Button variant="ghost" className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">
              Customize Your Invitation
            </h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              className="bg-green-600 hover:bg-green-700"
            >
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
          <div className="lg:col-span-2">
            <Card className="p-4" style={{ width: '500px'}}>
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
                    className={`w-full max-w-full h-auto border border-gray-300 rounded-lg shadow-lg ${
                      isPhotoMode ? "cursor-move" : "cursor-pointer"
                    }`}
                    style={{
                      maxHeight: "600px",
                      aspectRatio: "2/3",
                      backgroundColor: "#ffffff",
                    }}
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
                            src={userPhoto}
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
                              <p>• Scroll wheel to resize</p>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setPhotoAdjustment({
                                  scale: 1,
                                  offsetX: 0,
                                  offsetY: 0,
                                })
                              }
                              className="w-full"
                            >
                              Reset Position & Size
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setUserPhoto(null);
                              setPhotoAdjustment({
                                scale: 1,
                                offsetX: 0,
                                offsetY: 0,
                              });
                            }}
                            className="mt-2 text-red-600"
                          >
                            Remove Photo
                          </Button>
                        </div>
                      )}

                      <p className="text-sm text-gray-600 mt-4">
                        Upload a photo and use Photo Mode to adjust its position
                        and size with your mouse.
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
                        onChange={(e) =>
                          setCardData({ ...cardData, names: e.target.value })
                        }
                        placeholder="John & Jane"
                      />
                    </div>

                    <div>
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        value={cardData.date}
                        onChange={(e) =>
                          setCardData({ ...cardData, date: e.target.value })
                        }
                        placeholder="December 25, 2024"
                      />
                    </div>

                    <div>
                      <Label htmlFor="venue">Venue</Label>
                      <Input
                        id="venue"
                        value={cardData.venue}
                        onChange={(e) =>
                          setCardData({ ...cardData, venue: e.target.value })
                        }
                        placeholder="123 Celebration Street, Party City"
                      />
                    </div>

                    <div className="border-t pt-4">
                      <h4 className="font-medium text-sm mb-2">
                        Text Positioning
                      </h4>
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
                        onValueChange={(value) =>
                          setTextStyle({ ...textStyle, fontFamily: value })
                        }
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
                        onChange={(e) =>
                          setTextStyle({
                            ...textStyle,
                            fontSize: e.target.value,
                          })
                        }
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
                        onChange={(e) =>
                          setTextStyle({
                            ...textStyle,
                            lineSpacing: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="textColor">Text Color</Label>
                      <Input
                        id="textColor"
                        type="color"
                        value={textStyle.color}
                        onChange={(e) =>
                          setTextStyle({ ...textStyle, color: e.target.value })
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
                        value={textStyle.strokeWidth}
                        onChange={(e) =>
                          setTextStyle({
                            ...textStyle,
                            strokeWidth: e.target.value,
                          })
                        }
                      />
                    </div>

                    {Number.parseFloat(textStyle.strokeWidth) > 0 && (
                      <div>
                        <Label htmlFor="strokeColor">Stroke Color</Label>
                        <Input
                          id="strokeColor"
                          type="color"
                          value={textStyle.strokeColor}
                          onChange={(e) =>
                            setTextStyle({
                              ...textStyle,
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
                            textStyle.alignment === "left"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            setTextStyle({ ...textStyle, alignment: "left" })
                          }
                        >
                          <AlignLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={
                            textStyle.alignment === "center"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            setTextStyle({ ...textStyle, alignment: "center" })
                          }
                        >
                          <AlignCenter className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={
                            textStyle.alignment === "right"
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          onClick={() =>
                            setTextStyle({ ...textStyle, alignment: "right" })
                          }
                        >
                          <AlignRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

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