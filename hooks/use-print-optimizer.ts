"use client"

import { useCallback, useRef } from "react"

interface PrintOptions {
  pageSize?: string
  margins?: string
  orientation?: "portrait" | "landscape"
  colorAdjust?: boolean
}

export const usePrintOptimizer = () => {
  const printTimeoutRef = useRef<NodeJS.Timeout>()

  const optimizedPrint = useCallback((content: string, options: PrintOptions = {}) => {
    // Limpiar timeout anterior
    if (printTimeoutRef.current) {
      clearTimeout(printTimeoutRef.current)
    }

    const { pageSize = "80mm auto", margins = "0", orientation = "portrait", colorAdjust = true } = options

    // CSS base optimizado
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
            background: white !important;
            color: #000 !important;
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
      setTimeout(cleanup, 2000)
    }, 150)

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
    optimizedPrint,
    cancelPrint,
  }
}
