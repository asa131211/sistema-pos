import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { AnalyticsWrapper } from "@/analytics"
import { Suspense } from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sanchez Park",
  description: "Sistema completo de punto de venta Sanchez Park con gestión de inventario y reportes en tiempo real",
  manifest: "/manifest.json",
  themeColor: "#3b82f6",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  applicationName: "Sanchez Park POS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sanchez Park",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Sanchez Park",
  },
  twitter: {
    title: "Sanchez Park",
  },
  icons: {
    icon: [
      { url: "/icono.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/icono.ico", sizes: "16x16", type: "image/x-icon" },
    ],
    apple: [{ url: "/icono.ico", sizes: "180x180", type: "image/x-icon" }],
    shortcut: "/icono.ico",
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Sanchez Park" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icono.ico" />
        <link rel="icon" href="/icono.ico" />
        <link rel="shortcut icon" href="/icono.ico" />
      </head>
      <body className={inter.className}>
        <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>
        <Toaster position="top-right" />
        <AnalyticsWrapper />
      </body>
    </html>
  )
}
