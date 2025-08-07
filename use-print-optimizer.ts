"use client"

import { useState, useCallback, useRef } from "react"

interface PrintSettings {
  paperWidth: number // in mm
  fontSize: number // in px
  lineHeight: number
  padding: number // in mm
  maxItemNameLength: number
  maxCashierNameLength: number
}

interface PrintOptions {
  pageSize?: string
  margins?: string
  orientation?: "portrait" | "landscape"
  colorAdjust?: boolean
  fontSize?: string
}

interface OptimizedTicketData {
  id: string
  items: Array<{
    name: string
    quantity: number
    price: number
    total: number
    displayName: string // Truncated name for display
  }>
  total: number
  paymentMethod: string
  cashier: string
  displayCashier: string // Truncated cashier name
  timestamp: Date
  change?: number
  received?: number
}

const DEFAULT_SETTINGS: PrintSettings = {
  paperWidth: 58, // 58mm thermal paper
  fontSize: 9,
  lineHeight: 1.1,
  padding: 2,
  maxItemNameLength: 20,
  maxCashierNameLength: 15,
}

export function usePrintOptimizer() {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_SETTINGS)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const printTimeoutRef = useRef<NodeJS.Timeout>()

  const truncateText = useCallback((text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + "..."
  }, [])

  const optimizeTicketData = useCallback(
    (ticketData: any): OptimizedTicketData => {
      setIsOptimizing(true)

      try {
        const optimized: OptimizedTicketData = {
          ...ticketData,
          displayCashier: truncateText(ticketData.cashier, settings.maxCashierNameLength),
          items: ticketData.items.map((item: any) => ({
            ...item,
            displayName: truncateText(item.name, settings.maxItemNameLength),
          })),
        }

        return optimized
      } finally {
        setIsOptimizing(false)
      }
    },
    [settings, truncateText],
  )

  const calculatePaperSavings = useCallback((originalHeight: number, optimizedHeight: number): number => {
    return Math.round(((originalHeight - optimizedHeight) / originalHeight) * 100)
  }, [])

  const generateOptimizedCSS = useCallback((): string => {
    return `
      @page {
        size: ${settings.paperWidth}mm auto;
        margin: 0;
      }
      
      @media print {
        body { 
          margin: 0; 
          padding: 0; 
          font-family: 'Courier New', monospace;
          font-size: ${settings.fontSize}px;
          line-height: ${settings.lineHeight};
        }
        * { 
          -webkit-print-color-adjust: exact; 
          box-sizing: border-box;
        }
        .ticket-container {
          width: ${settings.paperWidth}mm;
          padding: ${settings.padding}mm;
          background: white;
          color: black;
        }
        .no-print { display: none !important; }
      }
      
      .ticket-container {
        font-family: 'Courier New', monospace;
        font-size: ${settings.fontSize}px;
        line-height: ${settings.lineHeight};
        width: ${settings.paperWidth}mm;
        padding: ${settings.padding}mm;
        background: white;
        color: black;
      }
      
      .ticket-header {
        text-align: center;
        margin-bottom: 2mm;
        border-bottom: 1px solid #000;
        padding-bottom: 1mm;
      }
      
      .ticket-title {
        font-weight: bold;
        font-size: ${settings.fontSize + 1}px;
      }
      
      .ticket-info {
        font-size: ${settings.fontSize - 1}px;
        opacity: 0.8;
      }
      
      .ticket-items {
        margin-bottom: 2mm;
      }
      
      .ticket-item {
        margin-bottom: 1mm;
      }
      
      .item-line {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      
      .item-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: ${settings.paperWidth - 20}mm;
      }
      
      .item-price {
        margin-left: 2mm;
        white-space: nowrap;
      }
      
      .item-details {
        font-size: ${settings.fontSize - 1}px;
        opacity: 0.7;
      }
      
      .ticket-totals {
        border-top: 1px solid #000;
        padding-top: 1mm;
        margin-bottom: 2mm;
      }
      
      .total-line {
        display: flex;
        justify-content: space-between;
      }
      
      .total-main {
        font-weight: bold;
        font-size: ${settings.fontSize + 1}px;
      }
      
      .ticket-footer {
        text-align: center;
        font-size: ${settings.fontSize - 1}px;
        border-top: 1px solid #000;
        padding-top: 1mm;
        opacity: 0.8;
      }
    `
  }, [settings])

  const updateSettings = useCallback((newSettings: Partial<PrintSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }, [])

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const optimizedPrint = useCallback((content: string, options: PrintOptions = {}) => {
    // Limpiar timeout anterior
    if (printTimeoutRef.current) {
      clearTimeout(printTimeoutRef.current)
    }

    const {
      pageSize = "100mm auto",
      margins = "0",
      orientation = "portrait",
      colorAdjust = true,
      fontSize = "12px",
    } = options

    // CSS base optimizado para tickets más grandes
    const baseCSS = `
      <style>
        @media print {
          * {
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          
          html, body {
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: 'Courier New', monospace !important;
            font-size: ${fontSize} !important;
            line-height: 1.3 !important;
            color: #000 !important;
            background: white !important;
            ${colorAdjust ? "-webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;" : ""}
          }
          
          @page {
            size: ${pageSize} !important;
            margin: ${margins} !important;
            orientation: ${orientation} !important;
          }
          
          body > *:not(.print-content) {
            display: none !important;
            visibility: hidden !important;
          }
          
          .print-content {
            display: block !important;
            visibility: visible !important;
            width: 100% !important;
            height: auto !important;
          }
          
          .page-break {
            page-break-after: always !important;
            page-break-inside: avoid !important;
          }
          
          .no-break {
            page-break-inside: avoid !important;
          }
          
          .hide-on-print {
            display: none !important;
          }
        }
        
        .print-content {
          display: none;
          position: absolute;
          left: -9999px;
          top: -9999px;
          width: 1px;
          height: 1px;
          overflow: hidden;
        }
      </style>
    `

    // Crear contenedor de impresión
    const printContainer = document.createElement("div")
    printContainer.id = "optimized-print-container"
    printContainer.className = "print-content"
    printContainer.innerHTML = baseCSS + content

    // Limpiar contenedor anterior
    const existing = document.getElementById("optimized-print-container")
    if (existing) {
      existing.remove()
    }

    // Agregar al DOM
    document.body.appendChild(printContainer)

    // Configurar impresión
    const originalTitle = document.title
    document.title = `Print-${Date.now()}`

    const cleanup = () => {
      document.title = originalTitle
      const container = document.getElementById("optimized-print-container")
      if (container) {
        container.remove()
      }
    }

    const handleAfterPrint = () => {
      cleanup()
      window.removeEventListener("afterprint", handleAfterPrint)
    }

    window.addEventListener("afterprint", handleAfterPrint)

    // Imprimir con delay optimizado
    printTimeoutRef.current = setTimeout(() => {
      try {
        window.print()
      } catch (error) {
        console.error("Error al imprimir:", error)
        cleanup()
      }

      // Limpieza de respaldo
      setTimeout(cleanup, 5000)
    }, 300)

    return cleanup
  }, [])

  const cancelPrint = useCallback(() => {
    if (printTimeoutRef.current) {
      clearTimeout(printTimeoutRef.current)
    }
    const container = document.getElementById("optimized-print-container")
    if (container) {
      container.remove()
    }
  }, [])

  return {
    settings,
    isOptimizing,
    optimizeTicketData,
    calculatePaperSavings,
    generateOptimizedCSS,
    updateSettings,
    resetSettings,
    truncateText,
    optimizedPrint,
    cancelPrint,
  }
}
