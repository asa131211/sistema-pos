"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Eye, Printer, Settings, Leaf } from "lucide-react"
import { usePrintOptimizer } from "@/hooks/use-print-optimizer"

interface PrintPreviewProps {
  ticketData: any
  onPrint?: () => void
  showSettings?: boolean
}

export function PrintPreview({ ticketData, onPrint, showSettings = false }: PrintPreviewProps) {
  const { optimizedPrint } = usePrintOptimizer()

  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket - ${ticketData.id}</title>
          <style>
            @page {
              size: 100mm auto;
              margin: 0;
            }
            @media print {
              body { margin: 0; padding: 0; }
              * { -webkit-print-color-adjust: exact; }
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Courier New', monospace;
            }
            .ticket-container {
              width: 100mm;
              padding: 8mm;
              background: white;
              color: black;
              font-size: 12px;
              line-height: 1.3;
            }
            .ticket-header {
              text-align: center;
              margin-bottom: 4mm;
              border-bottom: 2px dashed #000;
              padding-bottom: 4mm;
            }
            .ticket-title {
              font-weight: bold;
              font-size: 18px;
              margin-bottom: 2mm;
            }
            .ticket-info {
              font-size: 12px;
              margin-bottom: 1mm;
            }
            .ticket-items {
              margin-bottom: 4mm;
            }
            .ticket-item {
              margin-bottom: 2mm;
            }
            .item-line {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 1mm;
            }
            .item-name {
              flex: 1;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              max-width: 70mm;
            }
            .item-price {
              margin-left: 4mm;
              white-space: nowrap;
              font-weight: bold;
            }
            .item-details {
              font-size: 10px;
              color: #666;
            }
            .ticket-totals {
              border-top: 2px dashed #000;
              padding-top: 4mm;
              margin-bottom: 4mm;
            }
            .total-line {
              display: flex;
              justify-content: space-between;
              margin-bottom: 1mm;
            }
            .total-main {
              font-weight: bold;
              font-size: 14px;
              padding: 4mm;
              background: #f0f0f0;
              text-align: center;
            }
            .ticket-footer {
              text-align: center;
              font-size: 10px;
              border-top: 2px dashed #000;
              padding-top: 4mm;
            }
            .footer-info {
              margin-bottom: 1mm;
            }
            .footer-thanks {
              font-size: 12px;
              font-weight: bold;
              margin: 4mm 0 2mm 0;
            }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            <!-- Header -->
            <div class="ticket-header">
              <div style="font-size: 24px; margin-bottom: 2mm;">🐅</div>
              <div class="ticket-title">SANCHEZ PARK</div>
              <div class="ticket-info">Ticket: ${ticketData.id.slice(-6)}</div>
              <div class="ticket-info">
                ${ticketData.timestamp.toLocaleString("es-PE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            <!-- Items -->
            <div class="ticket-items">
              ${ticketData.items
                .map(
                  (item) => `
                <div class="ticket-item">
                  <div class="item-line">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">S/ ${item.total.toFixed(2)}</span>
                  </div>
                  <div class="item-details">
                    Cantidad: ${item.quantity} x S/ ${item.price.toFixed(2)}
                  </div>
                </div>
              `,
                )
                .join("")}
            </div>

            <!-- Totals -->
            <div class="ticket-totals">
              <div class="total-main">
                TOTAL: S/ ${ticketData.total.toFixed(2)}
              </div>
              ${
                ticketData.received
                  ? `
                <div class="total-line">
                  <span>Recibido:</span>
                  <span>S/ ${ticketData.received.toFixed(2)}</span>
                </div>
              `
                  : ""
              }
              ${
                ticketData.change
                  ? `
                <div class="total-line">
                  <span>Cambio:</span>
                  <span>S/ ${ticketData.change.toFixed(2)}</span>
                </div>
              `
                  : ""
              }
            </div>

            <!-- Footer -->
            <div class="ticket-footer">
              <div class="footer-info">Pago: ${ticketData.paymentMethod}</div>
              <div class="footer-info">Cajero: ${ticketData.cashier}</div>
              <div class="footer-thanks">¡Gracias por su compra!</div>
              <div class="footer-info">Sanchez Park</div>
              <div style="font-size: 8px; font-style: italic; margin-top: 2mm;">Conserve este ticket</div>
            </div>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open("", "_blank", "width=400,height=700")
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()

      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 300)
    }

    onPrint?.()
  }

  return (
    <div className="space-y-4">
      {/* Savings Badge */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1">
          <Leaf className="h-3 w-3" />
          Tamaño optimizado
        </Badge>
        <Badge variant="outline">100mm ancho</Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Vista Previa - Ticket Grande
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Optimized Preview */}
          <div
            className="bg-white rounded-lg p-4 mx-auto shadow-sm"
            style={{ width: "100mm", fontSize: "12px", fontFamily: "monospace" }}
          >
            {/* Header */}
            <div className="text-center mb-4 border-b-2 border-dashed border-gray-400 pb-4">
              <div className="text-2xl mb-2">🐅</div>
              <div className="font-bold text-lg">SANCHEZ PARK</div>
              <div className="text-sm opacity-70">Ticket: {ticketData.id.slice(-6)}</div>
              <div className="text-sm opacity-70">
                {ticketData.timestamp.toLocaleString("es-PE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 mb-4">
              {ticketData.items.map((item, index) => (
                <div key={index}>
                  <div className="flex justify-between items-start">
                    <span className="flex-1 text-sm font-medium">{item.name}</span>
                    <span className="ml-4 text-sm font-bold">S/ {item.total.toFixed(2)}</span>
                  </div>
                  <div className="text-xs opacity-60">
                    Cantidad: {item.quantity} x S/ {item.price.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            {/* Totals */}
            <div className="space-y-2 mb-4">
              <div className="text-center font-bold text-lg p-4 bg-gray-100 rounded">
                TOTAL: S/ {ticketData.total.toFixed(2)}
              </div>
              {ticketData.received && (
                <div className="flex justify-between text-sm">
                  <span>Recibido:</span>
                  <span>S/ {ticketData.received.toFixed(2)}</span>
                </div>
              )}
              {ticketData.change && (
                <div className="flex justify-between text-sm">
                  <span>Cambio:</span>
                  <span>S/ {ticketData.change.toFixed(2)}</span>
                </div>
              )}
            </div>

            <Separator className="my-4" />

            {/* Footer */}
            <div className="text-center text-sm space-y-1">
              <div>Pago: {ticketData.paymentMethod}</div>
              <div>Cajero: {ticketData.cashier}</div>
              <div className="font-bold text-base mt-4 mb-2">¡Gracias por su compra!</div>
              <div className="font-bold">Sanchez Park</div>
              <div className="text-xs italic mt-2">Conserve este ticket</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="flex-1 gap-2">
              <Printer className="h-4 w-4" />
              Imprimir Ticket Grande
            </Button>
            {showSettings && (
              <Button variant="outline" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Optimization Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• Tamaño: 100mm de ancho (más grande)</div>
            <div>• Sin marcos ni bordes</div>
            <div>• Fuente: 12px (más legible)</div>
            <div>• Espaciado amplio</div>
            <div>• Optimizado para papel térmico</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
