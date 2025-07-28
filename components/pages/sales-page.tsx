"use client"

import { useState, useEffect } from "react"
import { collection, addDoc, getDocs } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, Plus, Minus, ShoppingCart, Trash2, CreditCard, Banknote, Smartphone, Receipt } from "lucide-react"
import { toast } from "sonner"

export default function SalesPage() {
  const [user] = useAuthState(auth)
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "products"))
      const productsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setProducts(productsData)
    } catch (error) {
      console.error("Error fetching products:", error)
      toast.error("Error al cargar productos")
    }
  }

  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.id === product.id)
    if (existingItem) {
      setCart(cart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)))
    } else {
      setCart([...cart, { ...product, quantity: 1, paymentMethod: "efectivo" }])
    }
    toast.success(`${product.name} agregado al carrito`)
  }

  const updateQuantity = (id, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(id)
      return
    }
    setCart(cart.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item)))
  }

  const updatePaymentMethod = (id, paymentMethod) => {
    setCart(cart.map((item) => (item.id === id ? { ...item, paymentMethod } : item)))
  }

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id))
  }

  const clearCart = () => {
    setCart([])
  }

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const calculatePaymentMethods = () => {
    const methods = { efectivo: 0, tarjeta: 0, yape: 0 }
    cart.forEach((item) => {
      methods[item.paymentMethod] += item.price * item.quantity
    })
    return methods
  }

  const applyPromotion = (items) => {
    // Promoción 10+1: Por cada 10 productos, 1 gratis
    const promotedItems = []

    items.forEach((item) => {
      const freeItems = Math.floor(item.quantity / 10)
      promotedItems.push({
        ...item,
        originalQuantity: item.quantity,
        freeQuantity: freeItems,
        finalQuantity: item.quantity + freeItems,
      })
    })

    return promotedItems
  }

  // Función de impresión optimizada sin páginas en blanco
  const printTicket = (items, total, paymentMethods) => {
    const ticketNumber = Date.now().toString().slice(-6)
    const currentDate = new Date().toLocaleString("es-PE")

    // Crear contenido del ticket de forma más compacta
    let ticketContent = `
🎠 SANCHEZ PARK 🎠
Sistema de Ventas
================================
Fecha: ${currentDate}
Ticket: #${ticketNumber}
Vendedor: ${user?.displayName || user?.email || "Usuario"}
================================

PRODUCTOS:
`

    // Agregar productos de forma compacta
    items.forEach((item) => {
      const subtotal = item.price * item.originalQuantity
      ticketContent += `
${item.name}
${item.originalQuantity} x S/. ${item.price.toFixed(2)} = S/. ${subtotal.toFixed(2)}`

      if (item.freeQuantity > 0) {
        ticketContent += `
¡${item.freeQuantity} GRATIS! 🎁`
      }

      ticketContent += `
Pago: ${item.paymentMethod.toUpperCase()}
--------------------------------`
    })

    // Agregar métodos de pago
    ticketContent += `

MÉTODOS DE PAGO:`
    Object.entries(paymentMethods).forEach(([method, amount]) => {
      if (amount > 0) {
        ticketContent += `
${method.toUpperCase()}: S/. ${amount.toFixed(2)}`
      }
    })

    ticketContent += `
================================
TOTAL: S/. ${total.toFixed(2)}
================================

¡Gracias por su compra!
Promoción: 10 productos = 1 GRATIS
www.sanchezpark.com

================================`

    // Crear ventana de impresión optimizada
    const printWindow = window.open("", "_blank", "width=300,height=600")
    if (!printWindow) {
      toast.error("No se pudo abrir la ventana de impresión")
      return
    }

    const ticketHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket #${ticketNumber}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      line-height: 1.2;
      color: #000;
      background: #fff;
      width: 58mm;
      max-width: 58mm;
      margin: 0;
      padding: 2mm;
    }
    
    .ticket {
      width: 100%;
      max-width: 54mm;
    }
    
    .center {
      text-align: center;
    }
    
    .bold {
      font-weight: bold;
    }
    
    .line {
      border-top: 1px solid #000;
      margin: 2px 0;
    }
    
    .double-line {
      border-top: 2px solid #000;
      margin: 3px 0;
    }
    
    .small {
      font-size: 9px;
    }
    
    .promotion {
      color: #000;
      font-weight: bold;
    }
    
    @media print {
      body {
        margin: 0 !important;
        padding: 1mm !important;
        width: 58mm !important;
        max-width: 58mm !important;
      }
      
      .ticket {
        page-break-inside: avoid;
        width: 100% !important;
        max-width: 54mm !important;
      }
      
      @page {
        size: 58mm auto;
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="center bold">🎠 SANCHEZ PARK 🎠</div>
    <div class="center small">Sistema de Ventas</div>
    <div class="double-line"></div>
    
    <div class="small">
      <div>Fecha: ${currentDate}</div>
      <div>Ticket: #${ticketNumber}</div>
      <div>Vendedor: ${user?.displayName || user?.email || "Usuario"}</div>
    </div>
    <div class="double-line"></div>
    
    <div class="bold">PRODUCTOS:</div>
    <div class="line"></div>
    
    ${items
      .map((item) => {
        const subtotal = item.price * item.originalQuantity
        return `
        <div>
          <div class="bold">${item.name}</div>
          <div>${item.originalQuantity} x S/. ${item.price.toFixed(2)} = S/. ${subtotal.toFixed(2)}</div>
          ${item.freeQuantity > 0 ? `<div class="promotion">¡${item.freeQuantity} GRATIS! 🎁</div>` : ""}
          <div class="small">Pago: ${item.paymentMethod.toUpperCase()}</div>
          <div class="line"></div>
        </div>
      `
      })
      .join("")}
    
    <div class="bold">MÉTODOS DE PAGO:</div>
    ${Object.entries(paymentMethods)
      .map(([method, amount]) => (amount > 0 ? `<div>${method.toUpperCase()}: S/. ${amount.toFixed(2)}</div>` : ""))
      .join("")}
    
    <div class="double-line"></div>
    <div class="center bold" style="font-size: 13px;">TOTAL: S/. ${total.toFixed(2)}</div>
    <div class="double-line"></div>
    
    <div class="center small">
      <div>¡Gracias por su compra!</div>
      <div>Promoción: 10 productos = 1 GRATIS</div>
      <div>www.sanchezpark.com</div>
    </div>
  </div>
</body>
</html>`

    printWindow.document.write(ticketHTML)
    printWindow.document.close()

    // Esperar a que cargue y luego imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  }

  const processSale = async () => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío")
      return
    }

    setLoading(true)
    try {
      const promotedItems = applyPromotion(cart)
      const paymentMethods = calculatePaymentMethods()

      const saleData = {
        items: promotedItems,
        total: calculateTotal(),
        paymentMethods,
        timestamp: new Date(),
        userName: user?.displayName || "Usuario",
        userId: user?.uid,
        promotion: "10+1 aplicada",
      }

      await addDoc(collection(db, "sales"), saleData)

      // Imprimir ticket optimizado
      printTicket(promotedItems, calculateTotal(), paymentMethods)

      // Mostrar resumen de promoción
      const totalFreeItems = promotedItems.reduce((sum, item) => sum + item.freeQuantity, 0)
      if (totalFreeItems > 0) {
        toast.success(`¡Venta completada! ${totalFreeItems} productos gratis por promoción 10+1`)
      } else {
        toast.success("¡Venta completada exitosamente!")
      }

      clearCart()
    } catch (error) {
      console.error("Error processing sale:", error)
      toast.error("Error al procesar la venta")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount)
  }

  const getPaymentIcon = (method) => {
    switch (method) {
      case "efectivo":
        return <Banknote className="h-4 w-4" />
      case "tarjeta":
        return <CreditCard className="h-4 w-4" />
      case "yape":
        return <Smartphone className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Panel de productos */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Productos</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                    {product.image ? (
                      <img
                        src={product.image || "/placeholder.svg"}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <div className="text-gray-400 text-4xl">📦</div>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm mb-2">{product.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-green-600">{formatCurrency(product.price)}</span>
                    <Button size="sm" onClick={() => addToCart(product)} className="h-8">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Panel del carrito */}
      <div className="space-y-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Carrito ({cart.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Carrito vacío</p>
            ) : (
              <>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="border rounded-lg p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.id)}
                            className="h-6 w-6 p-0 text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="font-semibold text-sm">{formatCurrency(item.price * item.quantity)}</span>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Método de pago:</Label>
                          <RadioGroup
                            value={item.paymentMethod}
                            onValueChange={(value) => updatePaymentMethod(item.id, value)}
                            className="flex space-x-4"
                          >
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="efectivo" id={`efectivo-${item.id}`} className="h-3 w-3" />
                              <Label htmlFor={`efectivo-${item.id}`} className="text-xs flex items-center">
                                <Banknote className="h-3 w-3 mr-1" />
                                Efectivo
                              </Label>
                            </div>
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="tarjeta" id={`tarjeta-${item.id}`} className="h-3 w-3" />
                              <Label htmlFor={`tarjeta-${item.id}`} className="text-xs flex items-center">
                                <CreditCard className="h-3 w-3 mr-1" />
                                Tarjeta
                              </Label>
                            </div>
                            <div className="flex items-center space-x-1">
                              <RadioGroupItem value="yape" id={`yape-${item.id}`} className="h-3 w-3" />
                              <Label htmlFor={`yape-${item.id}`} className="text-xs flex items-center">
                                <Smartphone className="h-3 w-3 mr-1" />
                                Yape
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Separator />

                {/* Resumen de métodos de pago */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Resumen de pagos:</h4>
                  {Object.entries(calculatePaymentMethods()).map(
                    ([method, amount]) =>
                      amount > 0 && (
                        <div key={method} className="flex items-center justify-between text-sm">
                          <div className="flex items-center">
                            {getPaymentIcon(method)}
                            <span className="ml-2 capitalize">{method}</span>
                          </div>
                          <span>{formatCurrency(amount)}</span>
                        </div>
                      ),
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>

                  <Badge variant="secondary" className="w-full justify-center">
                    🎁 Promoción 10+1 activa
                  </Badge>

                  <div className="space-y-2">
                    <Button onClick={processSale} disabled={loading} className="w-full">
                      {loading ? (
                        "Procesando..."
                      ) : (
                        <>
                          <Receipt className="mr-2 h-4 w-4" />
                          Procesar Venta
                        </>
                      )}
                    </Button>

                    <Button variant="outline" onClick={clearCart} className="w-full bg-transparent">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Limpiar Carrito
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
