"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ShoppingCart, Plus, Minus, Trash2, Search, CreditCard, Banknote } from "lucide-react"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  price: number
  image: string
}

interface CartItem extends Product {
  quantity: number
}

export default function SalesPage() {
  const [user] = useAuthState(auth)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("efectivo")
  const [showCheckout, setShowCheckout] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, "products")), (snapshot) => {
      const productsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[]
      setProducts(productsData)
    })

    return () => unsubscribe()
  }, [])

  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existingItem = prev.find((item) => item.id === product.id)
      if (existingItem) {
        return prev.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const updateQuantity = (id: string, change: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.id === id) {
            const newQuantity = item.quantity + change
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
          }
          return item
        })
        .filter((item) => item.quantity > 0)
    })
  }

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  const clearCart = () => {
    setCart([])
  }

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const processSale = async () => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío")
      return
    }

    setProcessing(true)
    try {
      // Crear la venta
      const saleData = {
        items: cart,
        total: getTotalAmount(),
        paymentMethod,
        sellerId: user?.uid,
        sellerEmail: user?.email,
        timestamp: serverTimestamp(),
      }

      await addDoc(collection(db, "sales"), saleData)

      // Imprimir tickets individuales
      printTickets()

      // Limpiar carrito
      setCart([])
      setShowCheckout(false)
      toast.success("Venta procesada exitosamente")
    } catch (error) {
      console.error("Error processing sale:", error)
      toast.error("Error al procesar la venta")
    } finally {
      setProcessing(false)
    }
  }

  const printTickets = () => {
    cart.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        const ticketContent = `
          <div style="width: 300px; font-family: monospace; font-size: 14px; line-height: 1.4; padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 18px;">SISTEMA POS</h2>
              <p style="margin: 5px 0;">Ticket de Venta</p>
              <p style="margin: 5px 0;">${new Date().toLocaleString("es-ES")}</p>
            </div>
            
            <div style="border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 15px 0; margin: 15px 0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: bold;">Producto:</span>
                <span>${item.name}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: bold;">Precio:</span>
                <span>S/. ${item.price.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span style="font-weight: bold;">Cantidad:</span>
                <span>1</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px;">
                <span>TOTAL:</span>
                <span>S/. ${item.price.toFixed(2)}</span>
              </div>
            </div>
            
            <div style="margin-top: 15px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>Método de Pago:</span>
                <span style="text-transform: capitalize;">${paymentMethod}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>Vendedor:</span>
                <span>${user?.email}</span>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px; font-size: 12px;">
              <p>¡Gracias por su compra!</p>
              <p>Conserve este ticket</p>
            </div>
          </div>
        `

        const printWindow = window.open("", "_blank")
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Ticket - ${item.name}</title>
                <style>
                  @media print {
                    body { margin: 0; }
                    @page { size: 80mm auto; margin: 0; }
                  }
                </style>
              </head>
              <body>
                ${ticketContent}
                <script>
                  window.onload = function() {
                    window.print();
                    window.close();
                  }
                </script>
              </body>
            </html>
          `)
          printWindow.document.close()
        }
      }
    })
  }

  return (
    <div className="flex gap-6 h-full">
      {/* Productos */}
      <div className="flex-1">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Ventas</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="aspect-square mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  <img
                    src={product.image || "/placeholder.svg?height=200&width=200"}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-semibold text-sm mb-2 line-clamp-2">{product.name}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-green-600">S/. {product.price.toFixed(2)}</span>
                  <Button size="sm" onClick={() => addToCart(product)} className="h-8 w-8 p-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Carrito */}
      <div className="w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Carrito
            </h2>
            <Badge variant="secondary">{cart.length}</Badge>
          </div>
        </div>

        <ScrollArea className="h-96 p-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>Carrito vacío</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <img
                    src={item.image || "/placeholder.svg?height=40&width=40"}
                    alt={item.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-sm text-gray-500">S/. {item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, -1)}
                      className="h-6 w-6 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, 1)}
                      className="h-6 w-6 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeFromCart(item.id)}
                      className="h-6 w-6 p-0 ml-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span>S/. {getTotalAmount().toFixed(2)}</span>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Método de Pago</Label>
              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="efectivo" id="efectivo" />
                  <Label htmlFor="efectivo" className="flex items-center cursor-pointer">
                    <Banknote className="mr-2 h-4 w-4" />
                    Efectivo
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="transferencia" id="transferencia" />
                  <Label htmlFor="transferencia" className="flex items-center cursor-pointer">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Transferencia
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Button onClick={() => setShowCheckout(true)} disabled={cart.length === 0} className="w-full">
                Procesar Venta
              </Button>
              <Button
                onClick={clearCart}
                variant="outline"
                disabled={cart.length === 0}
                className="w-full bg-transparent"
              >
                Limpiar Carrito
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Venta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Productos:</h4>
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>
                    {item.name} x{item.quantity}
                  </span>
                  <span>S/. {(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total:</span>
              <span>S/. {getTotalAmount().toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Método de Pago:</span>
              <span className="capitalize">{paymentMethod}</span>
            </div>
            <div className="flex space-x-2">
              <Button onClick={processSale} disabled={processing} className="flex-1">
                {processing ? "Procesando..." : "Confirmar Venta"}
              </Button>
              <Button onClick={() => setShowCheckout(false)} variant="outline" className="flex-1">
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
