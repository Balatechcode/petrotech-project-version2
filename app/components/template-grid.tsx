"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

const templates = {
  wedding: [
    {
      id: "wedding-1",
      name: "Elegant Rose",
      preview: "/placeholder.svg?height=300&width=200",
      style: "bg-gradient-to-br from-rose-100 to-pink-200",
      textColor: "#be185d",
      fontFamily: "serif",
    },
    {
      id: "wedding-2",
      name: "Golden Luxury",
      preview: "/placeholder.svg?height=300&width=200",
      style: "bg-gradient-to-br from-yellow-50 to-amber-100",
      textColor: "#d97706",
      fontFamily: "serif",
    },
    {
      id: "wedding-3",
      name: "Classic White",
      preview: "/placeholder.svg?height=300&width=200",
      style: "bg-gradient-to-br from-gray-50 to-slate-100",
      textColor: "#374151",
      fontFamily: "serif",
    },
  ],
  birthday: [
    {
      id: "birthday-1",
      name: "Colorful Celebration",
      preview: "/placeholder.svg?height=300&width=200",
      style: "bg-gradient-to-br from-blue-100 to-purple-200",
      textColor: "#7c3aed",
      fontFamily: "sans-serif",
    },
    {
      id: "birthday-2",
      name: "Fun & Bright",
      preview: "/placeholder.svg?height=300&width=200",
      style: "bg-gradient-to-br from-yellow-100 to-orange-200",
      textColor: "#ea580c",
      fontFamily: "sans-serif",
    },
    {
      id: "birthday-3",
      name: "Sweet Dreams",
      preview: "/placeholder.svg?height=300&width=200",
      style: "bg-gradient-to-br from-pink-100 to-rose-200",
      textColor: "#e11d48",
      fontFamily: "sans-serif",
    },
  ],
  party: [
    {
      id: "party-1",
      name: "Neon Night",
      preview: "/placeholder.svg?height=300&width=200",
      style: "bg-gradient-to-br from-purple-200 to-indigo-300",
      textColor: "#4338ca",
      fontFamily: "sans-serif",
    },
    {
      id: "party-2",
      name: "Disco Fever",
      preview: "/placeholder.svg?height=300&width=200",
      style: "bg-gradient-to-br from-pink-200 to-purple-300",
      textColor: "#a21caf",
      fontFamily: "sans-serif",
    },
  ],
  "baby-shower": [
    {
      id: "baby-1",
      name: "Soft Clouds",
      preview: "/placeholder.svg?height=300&width=200",
      style: "bg-gradient-to-br from-blue-50 to-cyan-100",
      textColor: "#0891b2",
      fontFamily: "sans-serif",
    },
    {
      id: "baby-2",
      name: "Pink Dreams",
      preview: "/placeholder.svg?height=300&width=200",
      style: "bg-gradient-to-br from-pink-50 to-rose-100",
      textColor: "#e11d48",
      fontFamily: "sans-serif",
    },
  ],
  engagement: [
    {
      id: "engagement-1",
      name: "Golden Ring",
      preview: "/placeholder.svg?height=300&width=200",
      style: "bg-gradient-to-br from-yellow-50 to-amber-100",
      textColor: "#d97706",
      fontFamily: "serif",
    },
    {
      id: "engagement-2",
      name: "Love Story",
      preview: "/placeholder.svg?height=300&width=200",
      style: "bg-gradient-to-br from-rose-50 to-pink-100",
      textColor: "#be185d",
      fontFamily: "serif",
    },
  ],
}

interface TemplateGridProps {
  category: string
  onTemplateSelect: (template: any) => void
  onBack: () => void
}

export default function TemplateGrid({ category, onTemplateSelect, onBack }: TemplateGridProps) {
  const categoryTemplates = templates[category as keyof typeof templates] || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={onBack} className="mr-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-800 capitalize">{category.replace("-", " ")} Templates</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categoryTemplates.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105"
              onClick={() => onTemplateSelect(template)}
            >
              <CardContent className="p-4">
                <div className={`aspect-[3/4] rounded-lg ${template.style} mb-4 flex items-center justify-center`}>
                  <div className="text-center p-4">
                    <div className="w-16 h-16 bg-white/50 rounded-full mx-auto mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-2 bg-white/50 rounded w-3/4 mx-auto"></div>
                      <div className="h-2 bg-white/50 rounded w-1/2 mx-auto"></div>
                      <div className="h-2 bg-white/50 rounded w-2/3 mx-auto"></div>
                    </div>
                  </div>
                </div>
                <h3 className="font-semibold text-center">{template.name}</h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
