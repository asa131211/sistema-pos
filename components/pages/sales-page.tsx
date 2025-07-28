"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, addDoc, doc, updateDoc, getDoc } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ShoppingCart, Plus, Minus, Trash2, Search, Gift, Package, Keyboard, Tag } from "lucide-react"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  price: number
  image: string
  category?: string
}

interface CartItem extends Product {
  quantity: number
}

interface SalesPageProps {
  sidebarCollapsed?: boolean
}

export default function SalesPage({ sidebarCollapsed = false }: SalesPageProps) {
  const [user] = useAuthState(auth)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [paymentMethod, setPaymentMethod] = useState("efectivo")
  const [showCheckout, setShowCheckout] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [cashRegisterOpen, setCashRegisterOpen] = useState(false)
  const [shortcuts, setShortcuts] = useState<any[]>([])
  const [isOnline, setIsOnline] = useState(true)

  // Detectar estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

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

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Calcular promoción 10+1
  const calculatePromotion = () => {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0)
    const freeItems = Math.floor(totalItems / 10)
    const totalTickets = totalItems + freeItems

    return {
      totalItems,
      freeItems,
      totalTickets,
      hasPromotion: freeItems > 0,
    }
  }

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

  const saveOfflineSale = (saleData: any) => {
    try {
      const offlineData = {
        sales: [saleData],
        timestamp: Date.now(),
      }
      localStorage.setItem("offline_sales", JSON.stringify(offlineData))
      toast.success("💾 Venta guardada offline - Se sincronizará cuando vuelva la conexión")
      return true
    } catch (error) {
      console.error("Error saving offline sale:", error)
      toast.error("Error al guardar venta offline")
      return false
    }
  }

  const generateAndPrintTickets = () => {
    const promotion = calculatePromotion()
    const allTickets = []
    let ticketCounter = 1

    // Crear tickets pagados
    cart.forEach((item) => {
      for (let i = 0; i < item.quantity; i++) {
        allTickets.push({
          ticketNumber: String(ticketCounter).padStart(3, "0"),
          productName: item.name,
          productPrice: item.price,
          saleDate: new Date().toLocaleString("es-ES"),
          paymentMethod: paymentMethod === "efectivo" ? "Efectivo" : "Transferencia",
          seller: user?.displayName || user?.email || "Vendedor",
          isFree: false,
          type: "PAGADO",
        })
        ticketCounter++
      }
    })

    // Agregar tickets gratis
    if (promotion.hasPromotion) {
      const productsInCart = cart.filter((item) => item.quantity > 0)
      const freeTicketsToDistribute = promotion.freeItems

      for (let i = 0; i < freeTicketsToDistribute; i++) {
        const productIndex = i % productsInCart.length
        const selectedProduct = productsInCart[productIndex]

        allTickets.push({
          ticketNumber: String(ticketCounter).padStart(3, "0"),
          productName: selectedProduct.name,
          productPrice: 0,
          saleDate: new Date().toLocaleString("es-ES"),
          paymentMethod: "PROMOCIÓN 10+1",
          seller: user?.displayName || user?.email || "Vendedor",
          isFree: true,
          type: "GRATIS",
        })
        ticketCounter++
      }
    }

    // Generar HTML para impresión con logo del tigre
    const allTicketsHTML = allTickets
      .map(
        (ticket, index) => `
    <div class="print-ticket" style="page-break-after: ${index === allTickets.length - 1 ? "auto" : "always"};">
      <div class="ticket-header">
        <div class="ticket-logo">
          <img src="/tiger-logo-bw.png" alt="Sanchez Park" class="ticket-logo-img" />
        </div>
        <div class="ticket-title">SANCHEZ PARK</div>
        <div class="ticket-subtitle">Ticket de ${ticket.type}</div>
        <div class="ticket-number">#${ticket.ticketNumber}</div>
        ${ticket.isFree ? '<div class="ticket-promo">🎁 PROMOCIÓN 10+1</div>' : ""}
      </div>
      
      <div class="ticket-content">
        <div class="ticket-row">
          <span class="ticket-label">Producto:</span>
          <span class="ticket-value">${ticket.productName}</span>
        </div>
        <div class="ticket-row">
          <span class="ticket-label">Cantidad:</span>
          <span class="ticket-value">1 unidad</span>
        </div>
        <div class="ticket-row">
          <span class="ticket-label">Precio:</span>
          <span class="ticket-value">${ticket.isFree ? "GRATIS" : `S/. ${ticket.productPrice.toFixed(2)}`}</span>
        </div>
        <div class="ticket-total-section">
          <div class="ticket-total">${ticket.isFree ? "🎁 TICKET GRATIS" : `TOTAL: S/. ${ticket.productPrice.toFixed(2)}`}</div>
        </div>
      </div>
      
      <div class="ticket-footer">
        <div class="ticket-info">Fecha: ${ticket.saleDate}</div>
        <div class="ticket-info">Vendedor: ${ticket.seller}</div>
        <div class="ticket-info">Pago: ${ticket.paymentMethod}</div>
        <div class="ticket-info">Ticket: ${index + 1} de ${allTickets.length}</div>
        ${ticket.isFree ? '<div class="ticket-promo-note">¡Felicidades! Ticket de promoción 10+1</div>' : ""}
        <div class="ticket-thanks">¡Gracias por su compra!</div>
        <div class="ticket-brand">Sanchez Park</div>
        <div class="ticket-note">Conserve este ticket</div>
      </div>
    </div>
  `,
      )
      .join("")

    // Crear contenedor de impresión
    let printContainer = document.getElementById("print-container")
    if (!printContainer) {
      printContainer = document.createElement("div")
      printContainer.id = "print-container"
      printContainer.className = "print-only"
      document.body.appendChild(printContainer)
    }

    printContainer.innerHTML = allTicketsHTML
    console.log(`✅ ${allTickets.length} tickets listos para impresión`)
    window.print()
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
      const promotion = calculatePromotion()
      const saleData = {
        items: cart,
        total: getTotalAmount(),
        paymentMethod,
        sellerId: user?.uid,
        sellerEmail: user?.email,
        timestamp: new Date(),
        date: new Date().toISOString().split("T")[0],
        promotion: {
          totalItems: promotion.totalItems,
          freeItems: promotion.freeItems,
          totalTickets: promotion.totalTickets,
          hasPromotion: promotion.hasPromotion,
        },
      }

      if (isOnline) {
        // Modo online
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
      } else {
        // Modo offline
        saveOfflineSale(saleData)
      }

      // Generar e imprimir tickets
      generateAndPrintTickets()

      setCart([])
      setShowCheckout(false)

      if (promotion.hasPromotion) {
        toast.success(`🎉 Venta procesada! ${promotion.freeItems} tickets gratis por promoción 10+1`, {
          duration: 4000,
        })
      } else {
        toast.success("Venta procesada exitosamente", {
          duration: 2000,
        })
      }
    } catch (error) {
      console.error("Error processing sale:", error)
      toast.error("Error al procesar la venta")
    } finally {
      setProcessing(false)
    }
  }

  const promotion = calculatePromotion()

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 ml-16">
      <div className="p-6 space-y-6">
        {/* Barra de búsqueda y filtros */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-64 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                <SelectItem value="juegos">Juegos</SelectItem>
                <SelectItem value="consolas">Consolas</SelectItem>
                <SelectItem value="accesorios">Accesorios</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Atajos de teclado */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Keyboard className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Atajos de Teclado Disponibles</h3>
          </div>
          <div className="flex items-center space-x-3">
            <Button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium">
              ✓ Procesar Venta
            </Button>
            <Button
              variant="outline"
              className="border-blue-500 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-medium bg-transparent"
            >
              1 evolution 360
            </Button>
          </div>
        </div>

        <div className="flex gap-6">
          {/* Área de productos */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const shortcut = shortcuts.find((s) => s.productId === product.id)
                return (
                  <Card
                    key={product.id}
                    className="cursor-pointer transition-all duration-200 hover:shadow-lg bg-white border border-gray-200 rounded-2xl overflow-hidden"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-0">
                      {/* Imagen del producto */}
                      <div className="relative aspect-square bg-gray-100 overflow-hidden">
                        <img
                          src={product.image || "/placeholder.svg?height=300&width=300&text=Sin+Imagen"}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/placeholder.svg?height=300&width=300&text=Error"
                          }}
                        />
                        {shortcut && (
                          <Badge className="absolute top-3 left-3 bg-blue-600 text-white">
                            {shortcut.key.toUpperCase()}
                          </Badge>
                        )}
                      </div>

                      {/* Información del producto */}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Tag className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">juegos</span>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-600">S/. {product.price.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Carrito de compras */}
          <div className="w-80">
            <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShoppingCart className="h-5 w-5 text-purple-600" />
                    <h2 className="font-semibold text-gray-900">Carrito de Compras</h2>
                  </div>
                  <Badge variant="secondary" className="bg-red-100 text-red-700">
                    {cart.reduce((total, item) => total + item.quantity, 0)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">Agrega productos y procesa ventas rápidamente</p>
              </div>

              <ScrollArea className="h-64 p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Carrito vacío</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl">
                        <img
                          src={item.image || "/placeholder.svg?height=40&width=40&text=Sin+Imagen"}
                          alt={item.name}
                          className="w-10 h-10 object-cover rounded-lg"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{item.name}</h4>
                          <p className="text-xs text-gray-600">S/. {item.price.toFixed(2)} c/u</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="h-6 w-6 p-0 rounded-full"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="h-6 w-6 p-0 rounded-full"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFromCart(item.id)}
                            className="h-6 w-6 p-0 ml-2 rounded-full"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t border-gray-200 space-y-4">
                {/* Método de pago */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Método de Pago</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                      <SelectItem value="transferencia">💳 Transferencia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Total */}
                <div className="bg-gray-50 p-3 rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-green-600">S/. {getTotalAmount().toFixed(2)}</span>
                  </div>
                </div>

                {/* Botones */}
                <div className="space-y-2">
                  <Button
                    onClick={() => setShowCheckout(true)}
                    disabled={cart.length === 0 || !cashRegisterOpen}
                    className="w-full bg-green-600 hover:bg-green-700 text-white h-12 rounded-xl font-medium"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Procesar
                  </Button>
                  <Button
                    onClick={clearCart}
                    variant="outline"
                    disabled={cart.length === 0}
                    className="w-full h-10 rounded-xl bg-transparent"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Limpiar
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Modal de confirmación */}
        <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
          <DialogContent className="max-w-lg bg-white rounded-3xl">
            <DialogHeader className="text-center pb-6">
              <DialogTitle className="text-2xl font-bold text-gray-900">Confirmar Venta</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Lista de productos */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                <h4 className="font-semibold text-gray-700 flex items-center space-x-2">
                  <Package className="h-4 w-4" />
                  <span>Productos:</span>
                </h4>
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-xl">
                    <span className="font-medium">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="font-bold text-green-600">S/. {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Promoción en el modal */}
              {promotion.hasPromotion && (
                <div className="bg-green-50 p-4 rounded-2xl border border-green-200">
                  <div className="flex items-center justify-center space-x-2 text-green-700 mb-3">
                    <Gift className="h-5 w-5" />
                    <span className="font-bold text-lg">¡Promoción 10+1!</span>
                  </div>
                  <div className="text-sm text-green-600 text-center space-y-1">
                    <p>
                      Tickets pagados: <span className="font-bold">{promotion.totalItems}</span>
                    </p>
                    <p>
                      Tickets gratis: <span className="font-bold text-green-700">{promotion.freeItems}</span>
                    </p>
                    <p className="font-bold text-lg">Total tickets: {promotion.totalTickets}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Total y método de pago */}
              <div className="space-y-4">
                <div className="flex justify-between font-bold text-xl bg-green-50 p-4 rounded-2xl border border-green-200">
                  <span className="text-gray-700">TOTAL A PAGAR:</span>
                  <span className="text-green-600">S/. {getTotalAmount().toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm bg-gray-50 p-3 rounded-xl">
                  <span className="font-medium text-gray-700">Método de Pago:</span>
                  <span className="capitalize font-bold">
                    {paymentMethod === "efectivo" ? "💵 Efectivo" : "💳 Transferencia"}
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={processSale}
                  disabled={processing}
                  className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-lg"
                >
                  {processing ? (
                    <div className="flex items-center space-x-2">
                      <img src="/loading-wheel.gif" alt="Procesando..." className="w-5 h-5" />
                      <span>Procesando...</span>
                    </div>
                  ) : (
                    "✅ Confirmar Venta"
                  )}
                </Button>

                <Button
                  onClick={() => setShowCheckout(false)}
                  variant="outline"
                  className="flex-1 h-14 border-2 rounded-2xl font-bold"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Contenedor oculto para impresión */}
        <div id="print-container" className="print-only"></div>
      </div>
    </div>
  )
}
