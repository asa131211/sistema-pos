"use client"

import { memo, useCallback } from "react"
import { usePrintOptimizer } from "@/hooks/use-print-optimizer"

interface TicketData {
  ticketNumber: string
  productName: string
  productPrice: number
  saleDate: string
  paymentMethod: string
  seller: string
  isFree: boolean
  type: string
}

interface TicketPrinterProps {
  tickets: TicketData[]
  onPrintStart?: () => void
  onPrintComplete?: () => void
  onPrintError?: (error: string) => void
}

const TicketPrinter = memo(({ tickets, onPrintStart, onPrintComplete, onPrintError }: TicketPrinterProps) => {
  const { optimizedPrint } = usePrintOptimizer()

  const printTickets = useCallback(() => {
    if (!tickets || tickets.length === 0) {
      onPrintError?.("No hay tickets para imprimir")
      return
    }

    onPrintStart?.()

    try {
      // Generar HTML de tickets sin marcos y más grandes
      const ticketsHTML = tickets
        .filter((ticket) => ticket && ticket.productName)
        .map(
          (ticket, index) => `
          <div class="ticket">
            <div class="header">
              <div class="logo">🐅</div>
              <div class="title">SANCHEZ PARK</div>
              <div class="subtitle">${ticket.type}</div>
              <div class="number">#${ticket.ticketNumber}</div>
              ${ticket.isFree ? '<div class="promo">🎁 PROMOCIÓN 10+1</div>' : ""}
            </div>
            
            <div class="content">
              <div class="row">
                <span class="label">Producto:</span>
                <span class="value">${ticket.productName.length > 25 ? ticket.productName.substring(0, 25) + "..." : ticket.productName}</span>
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
                <div class="total">
                  ${ticket.isFree ? "🎁 TICKET GRATIS" : `TOTAL: S/. ${ticket.productPrice.toFixed(2)}`}
                </div>
              </div>
            </div>
            
            <div class="footer">
              <div class="info">${ticket.saleDate}</div>
              <div class="info">${ticket.seller.length > 20 ? ticket.seller.substring(0, 20) + "..." : ticket.seller}</div>
              <div class="info">${ticket.paymentMethod}</div>
              <div class="info">Ticket ${index + 1} de ${tickets.length}</div>
              ${ticket.isFree ? '<div class="promo-note">¡Promoción 10+1!</div>' : ""}
              <div class="thanks">¡Gracias por su compra!</div>
              <div class="brand">Sanchez Park</div>
              <div class="note">Conserve este ticket</div>
            </div>
          </div>
        `,
        )
        .join("")

      // CSS específico para tickets más grandes sin marcos
      const ticketCSS = `
        <style>
          @media print {
            .ticket {
              width: 100mm !important;
              margin: 0 auto !important;
              padding: 8mm !important;
              background: white !important;
              page-break-after: always !important;
              page-break-inside: avoid !important;
              min-height: auto !important;
              display: block !important;
              font-size: 12px !important;
              line-height: 1.3 !important;
            }
            
            .ticket:last-child {
              page-break-after: auto !important;
            }
            
            .header {
              text-align: center !important;
              border-bottom: 2px dashed #000 !important;
              padding-bottom: 4mm !important;
              margin-bottom: 4mm !important;
            }
            
            .logo {
              font-size: 24px !important;
              margin-bottom: 2mm !important;
              line-height: 1 !important;
            }
            
            .title {
              font-size: 18px !important;
              font-weight: bold !important;
              margin-bottom: 2mm !important;
              line-height: 1 !important;
            }
            
            .subtitle {
              font-size: 12px !important;
              margin-bottom: 2mm !important;
              line-height: 1 !important;
            }
            
            .number {
              font-size: 16px !important;
              font-weight: bold !important;
              margin-bottom: 2mm !important;
              line-height: 1 !important;
            }
            
            .promo {
              background: #000 !important;
              color: white !important;
              padding: 2mm 4mm !important;
              font-size: 10px !important;
              font-weight: bold !important;
              display: inline-block !important;
              margin-top: 2mm !important;
            }
            
            .content {
              margin: 4mm 0 !important;
            }
            
            .row {
              display: flex !important;
              justify-content: space-between !important;
              margin-bottom: 2mm !important;
              font-size: 12px !important;
              line-height: 1.3 !important;
            }
            
            .label {
              font-weight: bold !important;
              flex: 1 !important;
            }
            
            .value {
              text-align: right !important;
              flex: 1 !important;
            }
            
            .total-section {
              border-top: 2px dashed #000 !important;
              padding-top: 4mm !important;
              margin-top: 4mm !important;
            }
            
            .total {
              text-align: center !important;
              font-size: 14px !important;
              font-weight: bold !important;
              padding: 4mm !important;
              background: #f0f0f0 !important;
              line-height: 1.3 !important;
            }
            
            .footer {
              border-top: 2px dashed #000 !important;
              padding-top: 4mm !important;
              margin-top: 4mm !important;
              text-align: center !important;
            }
            
            .info {
              font-size: 10px !important;
              margin-bottom: 1mm !important;
              line-height: 1.2 !important;
            }
            
            .thanks {
              font-size: 12px !important;
              font-weight: bold !important;
              margin: 4mm 0 2mm 0 !important;
              line-height: 1.2 !important;
            }
            
            .brand {
              font-size: 10px !important;
              font-weight: bold !important;
              margin-bottom: 1mm !important;
              line-height: 1.2 !important;
            }
            
            .note {
              font-size: 8px !important;
              font-style: italic !important;
              line-height: 1.2 !important;
              margin-top: 2mm !important;
            }
            
            .promo-note {
              font-size: 8px !important;
              font-weight: bold !important;
              margin: 2mm 0 !important;
              background: #f0f0f0 !important;
              padding: 1mm !important;
              line-height: 1.2 !important;
            }
          }
        </style>
      `

      const fullContent = ticketCSS + ticketsHTML

      // Usar el optimizador de impresión con tamaño más grande
      optimizedPrint(fullContent, {
        pageSize: "100mm auto",
        margins: "0",
        colorAdjust: true,
        fontSize: "12px",
      })

      onPrintComplete?.()
    } catch (error) {
      console.error("Error al imprimir tickets:", error)
      onPrintError?.("Error al preparar los tickets para impresión")
    }
  }, [tickets, optimizedPrint, onPrintStart, onPrintComplete, onPrintError])

  return { printTickets }
})

TicketPrinter.displayName = "TicketPrinter"

export default TicketPrinter
