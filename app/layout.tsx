// layout.tsx

import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Invitation Card Maker - Create Beautiful Digital Invitations",
  description:
    "Professional invitation card maker with admin panel for template management. Create stunning personalized invitations for weddings, birthdays, parties, and special events.",
  keywords:
    "invitation cards, digital invitations, wedding invitations, birthday cards, party invitations, card maker, template management",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
