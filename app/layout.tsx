import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { AnalyticsWrapper } from "@/analytics"
import { Suspense } from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sanchez Park - Punto de Venta Profesional",
  description: "Sistema completo de punto de venta Sanchez Park con gestión de inventario y reportes en tiempo real",
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  openGraph: {
    title: "Sanchez Park - Punto de Venta Profesional",
  },
  twitter: {
    title: "Sanchez Park - Punto de Venta",
  },
  icons: {
    icon: [
      { url: "/tiger-logo.png", sizes: "32x32", type: "image/png" },
      { url: "/tiger-logo.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: "/tiger-logo.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/tiger-logo.png",
  },
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <link rel="apple-touch-icon" href="/tiger-logo.png" />
        <link rel="icon" href="/tiger-logo.png" />
        <link rel="shortcut icon" href="/tiger-logo.png" />
      </head>
      <body className={inter.className}>
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
        <Toaster position="top-right" />
        <AnalyticsWrapper />
      </body>
    </html>
  )
}
