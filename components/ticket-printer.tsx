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
      // Generar HTML de tickets sin elementos vacíos
      const ticketsHTML = tickets
        .filter((ticket) => ticket && ticket.productName) // Filtrar tickets válidos
        .map(
          (ticket, index) => `
          <div class="ticket no-break">
            <div class="ticket-header">
              <div class="logo">🐅</div>
              <div class="title">SANCHEZ PARK</div>
              <div class="subtitle">Ticket de ${ticket.type}</div>
              <div class="number">#${ticket.ticketNumber}</div>
              ${ticket.isFree ? '<div class="promo">🎁 PROMOCIÓN 10+1</div>' : ""}
            </div>
            
            <div class="ticket-body">
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
                <div class="total">
                  ${ticket.isFree ? "🎁 TICKET GRATIS" : `TOTAL: S/. ${ticket.productPrice.toFixed(2)}`}
                </div>
              </div>
            </div>
            
            <div class="ticket-footer">
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
          ${index < tickets.length - 1 ? '<div class="page-break"></div>' : ""}
        `,
        )
        .join("")

      // CSS específico para tickets
      const ticketCSS = `
        <style>
          @media print {
            .ticket {
              width: 76mm !important;
              margin: 0 auto !important;
              padding: 6mm !important;
              border: 1px solid #000 !important;
              background: white !important;
              font-size: 10px !important;
              line-height: 1.2 !important;
            }
            
            .ticket-header {
              text-align: center !important;
              border-bottom: 1px dashed #000 !important;
              padding-bottom: 4mm !important;
              margin-bottom: 4mm !important;
            }
            
            .logo {
              font-size: 18px !important;
              margin-bottom: 2mm !important;
            }
            
            .title {
              font-size: 14px !important;
              font-weight: bold !important;
              margin-bottom: 1mm !important;
            }
            
            .subtitle {
              font-size: 10px !important;
              margin-bottom: 2mm !important;
            }
            
            .number {
              font-size: 12px !important;
              font-weight: bold !important;
              margin-bottom: 2mm !important;
            }
            
            .promo {
              background: #000 !important;
              color: white !important;
              padding: 1mm 2mm !important;
              font-size: 8px !important;
              font-weight: bold !important;
              display: inline-block !important;
            }
            
            .ticket-body {
              margin: 4mm 0 !important;
            }
            
            .row {
              display: flex !important;
              justify-content: space-between !important;
              margin-bottom: 1mm !important;
              font-size: 9px !important;
            }
            
            .label {
              font-weight: bold !important;
            }
            
            .value {
              text-align: right !important;
            }
            
            .total-section {
              border-top: 1px dashed #000 !important;
              padding-top: 2mm !important;
              margin-top: 4mm !important;
            }
            
            .total {
              text-align: center !important;
              font-size: 11px !important;
              font-weight: bold !important;
              padding: 2mm !important;
              border: 1px solid #000 !important;
            }
            
            .ticket-footer {
              border-top: 1px dashed #000 !important;
              padding-top: 4mm !important;
              margin-top: 4mm !important;
              text-align: center !important;
            }
            
            .info {
              font-size: 8px !important;
              margin-bottom: 0.5mm !important;
            }
            
            .thanks {
              font-size: 10px !important;
              font-weight: bold !important;
              margin: 3mm 0 2mm !important;
            }
            
            .brand {
              font-size: 9px !important;
              font-weight: bold !important;
              margin-bottom: 1mm !important;
            }
            
            .note {
              font-size: 7px !important;
              font-style: italic !important;
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
