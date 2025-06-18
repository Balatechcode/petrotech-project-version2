// app/page.tsx

"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, Gift, PartyPopper, Baby, Sparkles, Settings } from "lucide-react"
import Link from "next/link"

const categories = [
  { id: "wedding", name: "Wedding", icon: Heart, color: "bg-rose-100 text-rose-700" },
  { id: "birthday", name: "Birthday", icon: Gift, color: "bg-blue-100 text-blue-700" },
  { id: "party", name: "Party", icon: PartyPopper, color: "bg-purple-100 text-purple-700" },
  { id: "baby-shower", name: "Baby Shower", icon: Baby, color: "bg-green-100 text-green-700" },
  { id: "engagement", name: "Engagement", icon: Sparkles, color: "bg-yellow-100 text-yellow-700" },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-center flex-1">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Invitation Card Maker
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Create beautiful, personalized invitation cards for your special moments
            </p>
          </div>
          <Link href="/admin">
            <Button variant="outline" className="ml-4">
              <Settings className="w-4 h-4 mr-2" />
              Admin
            </Button>
          </Link>
        </div>

        {/* Categories */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-gray-800 mb-8 text-center">Choose Your Celebration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const IconComponent = category.icon
              return (
                <Link key={category.id} href={`/templates?category=${category.id}`}>
                  <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:scale-105 border-2 hover:border-pink-200">
                    <CardContent className="p-8 text-center">
                      <div
                        className={`w-16 h-16 rounded-full ${category.color} flex items-center justify-center mx-auto mb-4`}
                      >
                        <IconComponent className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">{category.name}</h3>
                      <p className="text-gray-600 text-sm">
                        Beautiful templates for your {category.name.toLowerCase()} celebration
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Quick Start */}
        <div className="max-w-2xl mx-auto mt-16 text-center">
          <Link href="/templates">
            <Button
              size="lg"
              className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700"
            >
              Browse All Templates
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
