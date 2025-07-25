"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc } from "firebase/firestore"
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
import { ShoppingCart, Plus, Minus, Trash2, Search, CreditCard, Banknote, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import CashRegister from "@/components/cash-register"

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
  const [cashRegisterOpen, setCashRegisterOpen] = useState(false)
  const [shortcuts, setShortcuts] = useState<any[]>([])

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

  useEffect(() => {
    // Cargar atajos del usuario
    const loadShortcuts = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            setShortcuts(userDoc.data().shortcuts || [])
          }
        } catch (error) {
          console.error("Error loading shortcuts:", error)
        }
      }
    }
    loadShortcuts()
  }, [user])

  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const addToCart = (product: Product) => {
    if (!cashRegisterOpen) {
      toast.error("Debes abrir la caja antes de realizar ventas")
      return
    }

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

    if (!cashRegisterOpen) {
      toast.error("Debes abrir la caja antes de procesar ventas")
      return
    }

    setProcessing(true)
    try {
      const saleData = {
        items: cart,
        total: getTotalAmount(),
        paymentMethod,
        sellerId: user?.uid,
        sellerEmail: user?.email,
        timestamp: serverTimestamp(),
        date: new Date().toISOString().split("T")[0],
      }

      await addDoc(collection(db, "sales"), saleData)

      // Actualizar caja registradora
      const today = new Date().toISOString().split("T")[0]
      const cashRegId = `${user?.uid}-${today}`
      const cashRegRef = doc(db, "cash-registers", cashRegId)
      const cashRegDoc = await getDoc(cashRegRef)

      if (cashRegDoc.exists()) {
        const currentData = cashRegDoc.data()
        const saleAmount = getTotalAmount()

        await updateDoc(cashRegRef, {
          totalSales: currentData.totalSales + saleAmount,
          cashSales: paymentMethod === "efectivo" ? currentData.cashSales + saleAmount : currentData.cashSales,
          transferSales:
            paymentMethod === "transferencia" ? currentData.transferSales + saleAmount : currentData.transferSales,
          currentAmount:
            paymentMethod === "efectivo" ? currentData.currentAmount + saleAmount : currentData.currentAmount,
        })
      }

      // Imprimir tickets individuales
      printTickets()

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
          <div style="width: 80mm; font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.2; text-align: center; padding: 5mm;">
            <div style="margin-bottom: 8mm;">
              <div style="font-size: 16px; font-weight: bold; margin-bottom: 2mm;">SANCHEZ PARK</div>
              <div style="font-size: 10px; margin-bottom: 1mm;">Sistema de Punto de Venta</div>
              <div style="font-size: 10px;">RUC: 20123456789</div>
            </div>
            
            <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 3mm 0; margin: 3mm 0; text-align: left;">
              <div style="text-align: center; font-weight: bold; margin-bottom: 2mm;">TICKET DE VENTA</div>
              <div style="margin-bottom: 1mm;">Fecha: ${new Date().toLocaleString("es-ES")}</div>
              <div style="margin-bottom: 1mm;">Vendedor: ${user?.displayName || user?.email}</div>
              <div style="margin-bottom: 2mm;">Ticket: ${Date.now()}</div>
              
              <div style="border-top: 1px dashed #000; padding-top: 2mm; margin-top: 2mm;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
                  <span style="width: 60%; text-align: left;">${item.name}</span>
                  <span style="width: 40%; text-align: right;">S/. ${item.price.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 1mm;">
                  <span>Cantidad: 1</span>
                  <span>Subtotal: S/. ${item.price.toFixed(2)}</span>
                </div>
              </div>
              
              <div style="border-top: 1px dashed #000; padding-top: 2mm; margin-top: 2mm;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
                  <span>TOTAL:</span>
                  <span>S/. ${item.price.toFixed(2)}</span>
                </div>
                <div style="margin-top: 1mm;">
                  <span>Pago: ${paymentMethod === "efectivo" ? "Efectivo" : "Transferencia"}</span>
                </div>
              </div>
            </div>
            
            <div style="margin-top: 5mm; font-size: 10px;">
              <div>¡Gracias por su compra!</div>
              <div>Conserve este ticket</div>
              <div style="margin-top: 2mm;">www.sanchezpark.com</div>
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
                    body { 
                      margin: 0; 
                      padding: 0;
                      font-family: 'Courier New', monospace;
                    }
                    @page { 
                      size: 80mm auto; 
                      margin: 0; 
                    }
                  }
                  body {
                    font-family: 'Courier New', monospace;
                    margin: 0;
                    padding: 0;
                  }
                </style>
              </head>
              <body>
                ${ticketContent}
                <script>
                  window.onload = function() {
                    setTimeout(function() {
                      window.print();
                      window.close();
                    }, 500);
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
    <div className="space-y-6">
      {/* Sistema de caja */}
      <CashRegister onStatusChange={setCashRegisterOpen} />

      {!cashRegisterOpen && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-orange-700 dark:text-orange-300">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Caja cerrada - Abre la caja para realizar ventas</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-6 h-full">
        {/* Productos */}
        <div className="flex-1">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Punto de Venta</h1>
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
            {filteredProducts.map((product) => {
              const shortcut = shortcuts.find((s) => s.productId === product.id)
              return (
                <Card
                  key={product.id}
                  className={`cursor-pointer hover:shadow-lg transition-all duration-200 ${
                    !cashRegisterOpen ? "opacity-50" : "hover:scale-105"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="aspect-square mb-3 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden relative">
                      <img
                        src={product.image || "/placeholder.svg?height=200&width=200&text=Sin+Imagen"}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg?height=200&width=200&text=Error"
                        }}
                      />
                      {shortcut && (
                        <Badge className="absolute top-2 left-2 bg-blue-600">{shortcut.key.toUpperCase()}</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm mb-2 line-clamp-2">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-green-600">S/. {product.price.toFixed(2)}</span>
                      <Button
                        size="sm"
                        onClick={() => addToCart(product)}
                        className="h-8 w-8 p-0"
                        disabled={!cashRegisterOpen}
                        data-product-shortcut={shortcut?.key}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Carrito */}
        <div className="w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Carrito de Compras
              </h2>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {cart.reduce((total, item) => total + item.quantity, 0)} items
              </Badge>
            </div>
          </div>

          <ScrollArea className="h-96 p-4">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Carrito vacío</p>
                <p className="text-sm">Agrega productos para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border"
                  >
                    <img
                      src={item.image || "/placeholder.svg?height=40&width=40&text=Sin+Imagen"}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = "/placeholder.svg?height=40&width=40&text=Error"
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-sm text-gray-500">S/. {item.price.toFixed(2)} c/u</p>
                      <p className="text-sm font-semibold text-green-600">
                        Subtotal: S/. {(item.price * item.quantity).toFixed(2)}
                      </p>
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
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
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

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xl font-bold bg-white dark:bg-gray-800 p-3 rounded-lg border">
                <span>Total:</span>
                <span className="text-green-600">S/. {getTotalAmount().toFixed(2)}</span>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Método de Pago</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="flex items-center space-x-2 p-2 rounded border">
                    <RadioGroupItem value="efectivo" id="efectivo" />
                    <Label htmlFor="efectivo" className="flex items-center cursor-pointer">
                      <Banknote className="mr-2 h-4 w-4 text-green-600" />
                      Efectivo
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded border">
                    <RadioGroupItem value="transferencia" id="transferencia" />
                    <Label htmlFor="transferencia" className="flex items-center cursor-pointer">
                      <CreditCard className="mr-2 h-4 w-4 text-blue-600" />
                      Transferencia
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={() => setShowCheckout(true)}
                  disabled={cart.length === 0 || !cashRegisterOpen}
                  className="w-full h-12 text-lg font-semibold"
                  data-shortcut="process-sale"
                >
                  Procesar Venta (Enter)
                </Button>
                <Button
                  onClick={clearCart}
                  variant="outline"
                  disabled={cart.length === 0}
                  className="w-full bg-transparent"
                  data-shortcut="clear-cart"
                >
                  Limpiar Carrito (X)
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de confirmación */}
        <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">Confirmar Venta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                <h4 className="font-medium">Productos:</h4>
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                    <span>
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-semibold">S/. {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg bg-green-50 p-3 rounded">
                <span>TOTAL:</span>
                <span className="text-green-600">S/. {getTotalAmount().toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm bg-blue-50 p-2 rounded">
                <span>Método de Pago:</span>
                <span className="capitalize font-medium">
                  {paymentMethod === "efectivo" ? "💵 Efectivo" : "💳 Transferencia"}
                </span>
              </div>
              <div className="flex space-x-2">
                <Button onClick={processSale} disabled={processing} className="flex-1 h-12">
                  {processing ? "Procesando..." : "✅ Confirmar Venta"}
                </Button>
                <Button onClick={() => setShowCheckout(false)} variant="outline" className="flex-1 h-12">
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
