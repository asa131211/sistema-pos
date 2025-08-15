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
              width: 100% !important;
              height: auto !important;
            }
            
            body {
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              font-family: 'Courier New', monospace !important;
              font-size: 14px !important;
              line-height: 1.4 !important;
              color: #000 !important;
              background: white !important;
              font-weight: bold !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            @page {
              size: 100% 13cm !important;
              margin: 0 !important;
            }
            
            .ticket {
              width: 100% !important;
              height: 13cm !important;
              margin: 0 !important;
              padding: 12px !important;
              border: 2px solid #000 !important;
              background: white !important;
              page-break-after: always !important;
              page-break-inside: avoid !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              font-weight: bold !important;
            }
            
            .ticket:last-child {
              page-break-after: avoid !important;
            }
            
            .header {
              text-align: center !important;
              border-bottom: 2px solid #000 !important;
              padding-bottom: 10px !important;
              margin-bottom: 10px !important;
              flex-shrink: 0 !important;
            }
            
            .logo {
              width: 60px !important;
              height: 60px !important;
              margin: 0 auto 6px !important;
              display: block !important;
              object-fit: contain !important;
            }
            
            .title {
              font-size: 24px !important;
              font-weight: 900 !important;
              margin-bottom: 4px !important;
              letter-spacing: 2px !important;
            }
            
            .subtitle {
              font-size: 16px !important;
              margin-bottom: 4px !important;
              font-weight: bold !important;
            }
            
            .number {
              font-size: 20px !important;
              font-weight: 900 !important;
              margin-bottom: 6px !important;
              letter-spacing: 1px !important;
            }
            
            .promo-badge {
              background: #000 !important;
              color: white !important;
              padding: 4px 8px !important;
              font-size: 12px !important;
              font-weight: 900 !important;
              display: inline-block !important;
              letter-spacing: 1px !important;
            }
            
            .content {
              margin: 12px 0 !important;
              flex-grow: 1 !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: center !important;
            }
            
            .row {
              display: flex !important;
              justify-content: space-between !important;
              margin-bottom: 8px !important;
              font-size: 16px !important;
              font-weight: bold !important;
              padding: 2px 0 !important;
            }
            
            .label {
              font-weight: 900 !important;
              letter-spacing: 0.5px !important;
            }
            
            .value {
              text-align: right !important;
              font-weight: bold !important;
            }
            
            .total-section {
              border-top: 2px solid #000 !important;
              padding-top: 8px !important;
              margin-top: 12px !important;
              flex-shrink: 0 !important;
            }
            
            .total {
              text-align: center !important;
              font-size: 20px !important;
              font-weight: 900 !important;
              padding: 8px !important;
              border: 2px solid #000 !important;
              background: #f0f0f0 !important;
              letter-spacing: 1px !important;
            }
            
            .footer {
              border-top: 2px solid #000 !important;
              padding-top: 10px !important;
              margin-top: 10px !important;
              text-align: center !important;
              flex-shrink: 0 !important;
            }
            
            .info {
              font-size: 14px !important;
              margin-bottom: 4px !important;
              font-weight: bold !important;
            }
            
            .thanks {
              font-size: 18px !important;
              font-weight: 900 !important;
              margin: 8px 0 6px !important;
              letter-spacing: 1px !important;
            }
            
            .brand {
              font-size: 16px !important;
              font-weight: 900 !important;
              margin-bottom: 4px !important;
              letter-spacing: 1px !important;
            }
            
            .note {
              font-size: 12px !important;
              font-style: italic !important;
              font-weight: bold !important;
              margin-top: 4px !important;
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
            <img src="/tiger-logo-ticket.png" alt="Logo" class="logo" />
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
