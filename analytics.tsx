"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

// Google Analytics mejorado
export function GoogleAnalytics({ GA_MEASUREMENT_ID }: { GA_MEASUREMENT_ID: string }) {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window !== "undefined" && GA_MEASUREMENT_ID) {
      // @ts-ignore
      window.gtag("config", GA_MEASUREMENT_ID, {
        page_path: pathname,
        custom_map: {
          custom_parameter: "pos_system",
        },
      })

      // Track POS specific events
      // @ts-ignore
      window.gtag("event", "page_view", {
        page_title: document.title,
        page_location: window.location.href,
        content_group1: "POS System",
      })
    }
  }, [pathname, GA_MEASUREMENT_ID])

  return (
    <>
      {GA_MEASUREMENT_ID && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', {
                  page_path: window.location.pathname,
                  send_page_view: true,
                  custom_parameter: 'pos_system'
                });
              `,
            }}
          />
        </>
      )}
      <AnalyticsWrapper />
    </>
  )
}

// Wrapper for Analytics and Speed Insights
export function AnalyticsWrapper() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  )
}

// Hook para tracking de eventos POS
export function usePOSAnalytics() {
  const trackSale = (amount: number, paymentMethod: string) => {
    if (typeof window !== "undefined" && window.gtag) {
      // @ts-ignore
      window.gtag("event", "purchase", {
        transaction_id: Date.now().toString(),
        value: amount,
        currency: "PEN",
        payment_method: paymentMethod,
        event_category: "POS",
        event_label: "Sale Completed",
      })
    }
  }

  const trackProductView = (productName: string, productId: string) => {
    if (typeof window !== "undefined" && window.gtag) {
      // @ts-ignore
      window.gtag("event", "view_item", {
        item_id: productId,
        item_name: productName,
        event_category: "POS",
        event_label: "Product Viewed",
      })
    }
  }

  const trackUserLogin = (userRole: string) => {
    if (typeof window !== "undefined" && window.gtag) {
      // @ts-ignore
      window.gtag("event", "login", {
        method: "email",
        user_role: userRole,
        event_category: "POS",
        event_label: "User Login",
      })
    }
  }

  return {
    trackSale,
    trackProductView,
    trackUserLogin,
  }
}
