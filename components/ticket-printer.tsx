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
      // Generar HTML de tickets ultra-compacto
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
                <span class="value">${ticket.productName.length > 20 ? ticket.productName.substring(0, 20) + "..." : ticket.productName}</span>
              </div>
              <div class="row">
                <span class="label">Cant:</span>
                <span class="value">1 ud</span>
              </div>
              <div class="row">
                <span class="label">Precio:</span>
                <span class="value">${ticket.isFree ? "GRATIS" : `S/. ${ticket.productPrice.toFixed(2)}`}</span>
              </div>
              
              <div class="total-section">
                <div class="total">
                  ${ticket.isFree ? "🎁 GRATIS" : `TOTAL: S/. ${ticket.productPrice.toFixed(2)}`}
                </div>
              </div>
            </div>
            
            <div class="footer">
              <div class="info">${ticket.saleDate}</div>
              <div class="info">${ticket.seller.length > 15 ? ticket.seller.substring(0, 15) + "..." : ticket.seller}</div>
              <div class="info">${ticket.paymentMethod}</div>
              <div class="info">${index + 1}/${tickets.length}</div>
              ${ticket.isFree ? '<div class="promo-note">¡Promoción 10+1!</div>' : ""}
              <div class="thanks">¡Gracias por su compra!</div>
              <div class="brand">Sanchez Park</div>
              <div class="note">Conserve este ticket</div>
            </div>
          </div>
        `,
        )
        .join("")

      // CSS específico para tickets compactos
      const ticketCSS = `
        <style>
          @media print {
            .ticket {
              width: 80mm !important;
              margin: 0 !important;
              padding: 2mm !important;
              border: 1px solid #000 !important;
              background: white !important;
              page-break-after: always !important;
              page-break-inside: avoid !important;
              min-height: auto !important;
              display: block !important;
            }
            
            .ticket:last-child {
              page-break-after: auto !important;
            }
            
            .header {
              text-align: center !important;
              border-bottom: 1px dashed #000 !important;
              padding-bottom: 1mm !important;
              margin-bottom: 1mm !important;
            }
            
            .logo {
              font-size: 16px !important;
              margin-bottom: 0.5mm !important;
              line-height: 1 !important;
            }
            
            .title {
              font-size: 11px !important;
              font-weight: bold !important;
              margin-bottom: 0.5mm !important;
              line-height: 1 !important;
            }
            
            .subtitle {
              font-size: 8px !important;
              margin-bottom: 0.5mm !important;
              line-height: 1 !important;
            }
            
            .number {
              font-size: 10px !important;
              font-weight: bold !important;
              margin-bottom: 0.5mm !important;
              line-height: 1 !important;
            }
            
            .promo {
              background: #000 !important;
              color: white !important;
              padding: 0.5mm 1mm !important;
              font-size: 7px !important;
              font-weight: bold !important;
              display: inline-block !important;
              margin-top: 0.5mm !important;
            }
            
            .content {
              margin: 1mm 0 !important;
            }
            
            .row {
              display: flex !important;
              justify-content: space-between !important;
              margin-bottom: 0.5mm !important;
              font-size: 8px !important;
              line-height: 1.1 !important;
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
              border-top: 1px dashed #000 !important;
              padding-top: 1mm !important;
              margin-top: 1mm !important;
            }
            
            .total {
              text-align: center !important;
              font-size: 9px !important;
              font-weight: bold !important;
              padding: 1mm !important;
              border: 1px solid #000 !important;
              line-height: 1.1 !important;
            }
            
            .footer {
              border-top: 1px dashed #000 !important;
              padding-top: 1mm !important;
              margin-top: 1mm !important;
              text-align: center !important;
            }
            
            .info {
              font-size: 7px !important;
              margin-bottom: 0.3mm !important;
              line-height: 1 !important;
            }
            
            .thanks {
              font-size: 8px !important;
              font-weight: bold !important;
              margin: 1mm 0 0.5mm 0 !important;
              line-height: 1 !important;
            }
            
            .brand {
              font-size: 7px !important;
              font-weight: bold !important;
              margin-bottom: 0.3mm !important;
              line-height: 1 !important;
            }
            
            .note {
              font-size: 6px !important;
              font-style: italic !important;
              line-height: 1 !important;
              margin-top: 0.5mm !important;
            }
            
            .promo-note {
              font-size: 6px !important;
              font-weight: bold !important;
              margin: 0.5mm 0 !important;
              background: #f0f0f0 !important;
              padding: 0.5mm !important;
              line-height: 1 !important;
            }
          }
        </style>
      `

      const fullContent = ticketCSS + ticketsHTML

      // Usar el optimizador de impresión
      optimizedPrint(fullContent, {
        pageSize: "80mm auto",
        margins: "0",
        colorAdjust: true,
        fontSize: "9px",
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
