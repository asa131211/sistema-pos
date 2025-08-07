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
      width: 100% !important;
      height: 13cm !important;
      margin: 0 auto !important;
      padding: 12px !important;
      background: white !important;
      page-break-after: always !important;
      page-break-inside: avoid !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      font-size: 14px !important;
      line-height: 1.4 !important;
      font-weight: bold !important;
      border: 2px solid #000 !important;
    }
    
    .ticket:last-child {
      page-break-after: auto !important;
    }
    
    .header {
      text-align: center !important;
      border-bottom: 2px solid #000 !important;
      padding-bottom: 10px !important;
      margin-bottom: 10px !important;
      flex-shrink: 0 !important;
    }
    
    .logo {
      font-size: 32px !important;
      margin-bottom: 6px !important;
      line-height: 1 !important;
      font-weight: 900 !important;
    }
    
    .title {
      font-size: 24px !important;
      font-weight: 900 !important;
      margin-bottom: 4px !important;
      line-height: 1 !important;
      letter-spacing: 2px !important;
    }
    
    .subtitle {
      font-size: 16px !important;
      margin-bottom: 4px !important;
      line-height: 1 !important;
      font-weight: bold !important;
    }
    
    .number {
      font-size: 20px !important;
      font-weight: 900 !important;
      margin-bottom: 6px !important;
      line-height: 1 !important;
      letter-spacing: 1px !important;
    }
    
    .promo {
      background: #000 !important;
      color: white !important;
      padding: 4px 8px !important;
      font-size: 12px !important;
      font-weight: 900 !important;
      display: inline-block !important;
      margin-top: 4px !important;
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
      line-height: 1.4 !important;
      font-weight: bold !important;
      padding: 2px 0 !important;
    }
    
    .label {
      font-weight: 900 !important;
      flex: 1 !important;
      letter-spacing: 0.5px !important;
    }
    
    .value {
      text-align: right !important;
      flex: 1 !important;
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
      background: #f0f0f0 !important;
      line-height: 1.4 !important;
      border: 2px solid #000 !important;
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
      line-height: 1.3 !important;
      font-weight: bold !important;
    }
    
    .thanks {
      font-size: 18px !important;
      font-weight: 900 !important;
      margin: 8px 0 6px 0 !important;
      line-height: 1.3 !important;
      letter-spacing: 1px !important;
    }
    
    .brand {
      font-size: 16px !important;
      font-weight: 900 !important;
      margin-bottom: 4px !important;
      line-height: 1.3 !important;
      letter-spacing: 1px !important;
    }
    
    .note {
      font-size: 12px !important;
      font-style: italic !important;
      line-height: 1.3 !important;
      margin-top: 4px !important;
      font-weight: bold !important;
    }
    
    .promo-note {
      font-size: 12px !important;
      font-weight: 900 !important;
      margin: 4px 0 !important;
      background: #f0f0f0 !important;
      padding: 2px !important;
      line-height: 1.3 !important;
      border: 1px solid #000 !important;
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
