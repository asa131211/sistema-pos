"use client"

import { useCallback } from "react"

interface PrintTicket {
  ticketNumber: string
  productName: string
  productPrice: number
  saleDate: string
  paymentMethod: string
  seller: string
  isFree: boolean
  type: string
}

interface PrintManagerProps {
  onPrintComplete?: () => void
  onPrintError?: (error: string) => void
}

export const PrintManager = ({ onPrintComplete, onPrintError }: PrintManagerProps) => {
  const printTickets = useCallback(
    (tickets: PrintTicket[]) => {
      if (!tickets || tickets.length === 0) {
        onPrintError?.("No hay tickets para imprimir")
        return
      }

      try {
        // CSS ultra-optimizado para eliminar páginas en blanco
        const printCSS = `
        <style>
          @media print {
            * {
              margin: 0 !important;
              padding: 0 !important;
              box-sizing: border-box !important;
            }
            
            html {
              width: 80mm !important;
              height: auto !important;
            }
            
            body {
              width: 80mm !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: 'Courier New', monospace !important;
              font-size: 11px !important;
              line-height: 1.2 !important;
              color: #000 !important;
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            @page {
              size: 80mm auto !important;
              margin: 0 !important;
            }
            
            .ticket {
              width: 80mm !important;
              margin: 0 !important;
              padding: 8px !important;
              border: 1px solid #000 !important;
              background: white !important;
              page-break-after: always !important;
              page-break-inside: avoid !important;
              display: block !important;
              min-height: 120mm !important;
            }
            
            .ticket:last-child {
              page-break-after: avoid !important;
            }
            
            .header {
              text-align: center !important;
              border-bottom: 1px dashed #000 !important;
              padding-bottom: 8px !important;
              margin-bottom: 8px !important;
            }
            
            .logo {
              font-size: 24px !important;
              margin-bottom: 4px !important;
            }
            
            .title {
              font-size: 16px !important;
              font-weight: bold !important;
              margin-bottom: 2px !important;
            }
            
            .subtitle {
              font-size: 12px !important;
              margin-bottom: 4px !important;
            }
            
            .number {
              font-size: 14px !important;
              font-weight: bold !important;
              margin-bottom: 4px !important;
            }
            
            .promo-badge {
              background: #000 !important;
              color: white !important;
              padding: 2px 4px !important;
              font-size: 10px !important;
              font-weight: bold !important;
              display: inline-block !important;
            }
            
            .content {
              margin: 8px 0 !important;
            }
            
            .row {
              display: flex !important;
              justify-content: space-between !important;
              margin-bottom: 4px !important;
              font-size: 11px !important;
            }
            
            .label {
              font-weight: bold !important;
            }
            
            .value {
              text-align: right !important;
            }
            
            .total-section {
              border-top: 1px dashed #000 !important;
              padding-top: 4px !important;
              margin-top: 8px !important;
            }
            
            .total {
              text-align: center !important;
              font-size: 14px !important;
              font-weight: bold !important;
              padding: 4px !important;
              border: 1px solid #000 !important;
            }
            
            .footer {
              border-top: 1px dashed #000 !important;
              padding-top: 8px !important;
              margin-top: 8px !important;
              text-align: center !important;
            }
            
            .info {
              font-size: 10px !important;
              margin-bottom: 2px !important;
            }
            
            .thanks {
              font-size: 12px !important;
              font-weight: bold !important;
              margin: 6px 0 4px !important;
            }
            
            .brand {
              font-size: 11px !important;
              font-weight: bold !important;
              margin-bottom: 2px !important;
            }
            
            .note {
              font-size: 9px !important;
              font-style: italic !important;
            }
            
            /* Ocultar todo excepto tickets */
            body > *:not(.print-area) {
              display: none !important;
            }
            
            .print-area {
              display: block !important;
              visibility: visible !important;
            }
          }
          
          .print-area {
            display: none;
            position: absolute;
            left: -9999px;
            top: -9999px;
          }
        </style>
      `

        // Generar HTML de tickets
        const ticketsHTML = tickets
          .map(
            (ticket, index) => `
        <div class="ticket">
          <div class="header">
            <div class="logo">🐅</div>
            <div class="title">SANCHEZ PARK</div>
            <div class="subtitle">Ticket de ${ticket.type}</div>
            <div class="number">#${ticket.ticketNumber}</div>
            ${ticket.isFree ? '<div class="promo-badge">🎁 PROMOCIÓN 10+1</div>' : ""}
          </div>
          
          <div class="content">
            <div class="row">
              <span class="label">Producto:</span>
              <span class="value">${ticket.productName}</span>
            </div>
            <div class="row">
              <span class="label">Cantidad:</span>
              <span class="value">1 unidad</span>
            </div>
            <div class="row">
              <span class="label">Precio:</span>
              <span class="value">${ticket.isFree ? "GRATIS" : `S/. ${ticket.productPrice.toFixed(2)}`}</span>
            </div>
            <div class="total-section">
              <div class="total">${ticket.isFree ? "🎁 TICKET GRATIS" : `TOTAL: S/. ${ticket.productPrice.toFixed(2)}`}</div>
            </div>
          </div>
          
          <div class="footer">
            <div class="info">Fecha: ${ticket.saleDate}</div>
            <div class="info">Vendedor: ${ticket.seller}</div>
            <div class="info">Pago: ${ticket.paymentMethod}</div>
            <div class="info">Ticket: ${index + 1} de ${tickets.length}</div>
            ${ticket.isFree ? '<div class="info">¡Felicidades! Ticket de promoción 10+1</div>' : ""}
            <div class="thanks">¡Gracias por su compra!</div>
            <div class="brand">Sanchez Park</div>
            <div class="note">Conserve este ticket</div>
          </div>
        </div>
      `,
          )
          .join("")

        // Limpiar contenedor anterior
        const existingArea = document.getElementById("print-area")
        if (existingArea) {
          existingArea.remove()
        }

        // Crear área de impresión
        const printArea = document.createElement("div")
        printArea.id = "print-area"
        printArea.className = "print-area"
        printArea.innerHTML = printCSS + ticketsHTML

        // Agregar al DOM
        document.body.appendChild(printArea)

        // Configurar impresión
        const originalTitle = document.title
        document.title = `Tickets-${Date.now()}`

        // Función de limpieza
        const cleanup = () => {
          document.title = originalTitle
          const area = document.getElementById("print-area")
          if (area) {
            area.remove()
          }
          onPrintComplete?.()
        }

        // Event listeners
        const afterPrint = () => {
          cleanup()
          window.removeEventListener("afterprint", afterPrint)
        }

        window.addEventListener("afterprint", afterPrint)

        // Imprimir después de un breve delay
        setTimeout(() => {
          window.print()
          // Limpieza de respaldo
          setTimeout(cleanup, 3000)
        }, 100)
      } catch (error) {
        console.error("Error en impresión:", error)
        onPrintError?.("Error al preparar la impresión")
      }
    },
    [onPrintComplete, onPrintError],
  )

  return { printTickets }
}

export default PrintManager
