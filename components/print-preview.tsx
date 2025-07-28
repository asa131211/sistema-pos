"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, Printer } from "lucide-react"

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

interface PrintPreviewProps {
  tickets: TicketData[]
  onPrint: () => void
}

export function PrintPreview({ tickets, onPrint }: PrintPreviewProps) {
  const [showPreview, setShowPreview] = useState(false)

  if (!tickets || tickets.length === 0) {
    return null
  }

  return (
    <Dialog open={showPreview} onOpenChange={setShowPreview}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mr-2 bg-transparent">
          <Eye className="h-4 w-4 mr-1" />
          Vista Previa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vista Previa de Tickets</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {tickets.map((ticket, index) => (
            <div key={index} className="border border-gray-300 p-3 bg-white text-black font-mono text-xs">
              {/* Header */}
              <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
                <div className="text-lg mb-1">🐅</div>
                <div className="font-bold text-sm">SANCHEZ PARK</div>
                <div className="text-xs">{ticket.type}</div>
                <div className="font-bold text-sm">#{ticket.ticketNumber}</div>
                {ticket.isFree && (
                  <div className="bg-black text-white px-2 py-1 text-xs font-bold inline-block mt-1">
                    🎁 PROMOCIÓN 10+1
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="space-y-1 mb-2">
                <div className="flex justify-between">
                  <span className="font-bold">Producto:</span>
                  <span className="text-right">
                    {ticket.productName.length > 20 ? ticket.productName.substring(0, 20) + "..." : ticket.productName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Cant:</span>
                  <span>1 ud</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Precio:</span>
                  <span>{ticket.isFree ? "GRATIS" : `S/. ${ticket.productPrice.toFixed(2)}`}</span>
                </div>

                <div className="border-t border-dashed border-gray-400 pt-1 mt-2">
                  <div className="text-center font-bold border border-gray-400 p-1">
                    {ticket.isFree ? "🎁 GRATIS" : `TOTAL: S/. ${ticket.productPrice.toFixed(2)}`}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-dashed border-gray-400 pt-2 text-center text-xs space-y-0.5">
                <div>{ticket.saleDate}</div>
                <div>{ticket.seller.length > 15 ? ticket.seller.substring(0, 15) + "..." : ticket.seller}</div>
                <div>{ticket.paymentMethod}</div>
                <div>
                  {index + 1}/{tickets.length}
                </div>
                {ticket.isFree && <div className="font-bold">¡Promoción 10+1!</div>}
                <div className="font-bold mt-1">¡Gracias por su compra!</div>
                <div className="font-bold">Sanchez Park</div>
                <div className="text-xs italic">Conserve este ticket</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            Cerrar
          </Button>
          <Button
            onClick={() => {
              onPrint()
              setShowPreview(false)
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
