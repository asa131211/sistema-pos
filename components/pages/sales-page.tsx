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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Search,
  CreditCard,
  Banknote,
  AlertTriangle,
  Gift,
  Package,
} from "lucide-react"
import { toast } from "sonner"
import CashRegister from "@/components/cash-register"
import { cn } from "@/lib/utils"

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

  const categories = ["all", ...new Set(products.map((p) => p.category).filter(Boolean))]

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

    // Generar HTML para impresión
    const allTicketsHTML = allTickets
      .map(
        (ticket, index) => `
    <div class="print-ticket" style="page-break-after: ${index === allTickets.length - 1 ? "auto" : "always"};">
      <div class="ticket-header">
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

  // Calcular márgenes dinámicos basados en el estado del sidebar
  const getMarginLeft = () => {
    return sidebarCollapsed ? "ml-16" : "ml-64"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className={cn("transition-all duration-300 ease-in-out", getMarginLeft())}>
        {/* Sistema de caja */}
        <div className="bg-white border-b border-gray-200">
          <CashRegister onStatusChange={setCashRegisterOpen} />
        </div>

        {/* Alertas */}
        {!cashRegisterOpen && (
          <div className="bg-orange-50 border-l-4 border-orange-400 p-4 m-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-orange-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-orange-800">Caja Cerrada</h3>
                <p className="text-sm text-orange-700">Abre la caja registradora para comenzar a realizar ventas</p>
              </div>
            </div>
          </div>
        )}

        {!isOnline && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 m-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Modo Offline</h3>
                <p className="text-sm text-red-700">
                  Las ventas se sincronizarán automáticamente cuando vuelva la conexión
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex">
          {/* Área principal de productos */}
          <div className="flex-1 p-6 pr-80">
            {/* Barra de búsqueda y filtros */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex items-center space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48 border-gray-300">
                    <SelectValue placeholder="Todas las categorías" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las categorías</SelectItem>
                    {categories
                      .filter((cat) => cat !== "all")
                      .map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Atajos de teclado */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Atajos de Teclado Disponibles
              </h3>
              <div className="flex items-center space-x-3">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setShowCheckout(true)}
                  disabled={cart.length === 0 || !cashRegisterOpen}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Procesar Venta
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-blue-300 text-blue-600 hover:bg-blue-50 bg-transparent"
                >
                  1 evolution 360
                </Button>
              </div>
            </div>

            {/* Grid de productos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const shortcut = shortcuts.find((s) => s.productId === product.id)
                return (
                  <Card
                    key={product.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-lg bg-white border border-gray-200",
                      !cashRegisterOpen ? "opacity-50 cursor-not-allowed" : "hover:border-purple-300",
                    )}
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-0">
                      {/* Imagen del producto */}
                      <div className="relative aspect-square bg-gray-100 overflow-hidden rounded-t-lg">
                        <img
                          src={product.image || "/placeholder.svg?height=300&width=300&text=Sin+Imagen"}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/placeholder.svg?height=300&width=300&text=Error"
                          }}
                        />

                        {/* Badge de atajo */}
                        {shortcut && (
                          <Badge className="absolute top-2 left-2 bg-yellow-400 text-black font-bold">
                            {shortcut.key.toUpperCase()}
                          </Badge>
                        )}
                      </div>

                      {/* Información del producto */}
                      <div className="p-4">
                        <h3 className="font-medium text-gray-900 mb-1 line-clamp-2">{product.name}</h3>

                        {product.category && (
                          <div className="flex items-center mb-2">
                            <Badge variant="secondary" className="text-xs">
                              {product.category}
                            </Badge>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="text-lg font-bold text-green-600">S/. {product.price.toFixed(2)}</div>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(product)
                            }}
                            disabled={!cashRegisterOpen}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Carrito fijo */}
          <div className="fixed right-0 top-16 bottom-0 w-80 bg-white border-l border-gray-200 flex flex-col">
            {/* Header del carrito */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Carrito de Compras</h2>
                </div>
                <Badge className="bg-purple-100 text-purple-800">
                  {cart.reduce((total, item) => total + item.quantity, 0)}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 mt-1">Agrega productos y procesa ventas rápidamente</p>
            </div>

            {/* Promoción 10+1 */}
            {promotion.hasPromotion && (
              <div className="p-4 bg-green-50 border-b border-green-200">
                <div className="flex items-center space-x-2 text-green-700 mb-2">
                  <Gift className="h-4 w-4" />
                  <span className="font-medium text-sm">¡Promoción 10+1!</span>
                </div>
                <p className="text-sm text-green-600">
                  🎉 {promotion.freeItems} ticket{promotion.freeItems > 1 ? "s" : ""} GRATIS
                </p>
              </div>
            )}

            {/* Contenido del carrito */}
            <ScrollArea className="flex-1 p-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Carrito vacío</h3>
                  <p className="text-sm text-gray-500">Agrega productos para comenzar</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      {/* Imagen compacta */}
                      <img
                        src={item.image || "/placeholder.svg?height=40&width=40&text=Sin+Imagen"}
                        alt={item.name}
                        className="w-10 h-10 object-cover rounded"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg?height=40&width=40&text=Error"
                        }}
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                        <p className="text-xs text-gray-500">S/. {item.price.toFixed(2)} c/u</p>
                        <p className="text-sm font-medium text-green-600">
                          S/. {(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>

                      {/* Controles */}
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateQuantity(item.id, -1)}
                          className="h-6 w-6 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>

                        <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>

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
                          variant="outline"
                          onClick={() => removeFromCart(item.id)}
                          className="h-6 w-6 p-0 ml-1 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer del carrito */}
            <div className="p-4 border-t border-gray-200 space-y-4">
              {/* Total */}
              <div className="flex justify-between items-center text-lg font-semibold bg-green-50 p-3 rounded-lg">
                <span className="text-gray-900">Total:</span>
                <span className="text-green-600">S/. {getTotalAmount().toFixed(2)}</span>
              </div>

              {/* Método de pago */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Método de Pago</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
                  <div className="flex items-center space-x-2 p-2 rounded border border-gray-200">
                    <RadioGroupItem value="efectivo" id="efectivo" />
                    <Label htmlFor="efectivo" className="flex items-center cursor-pointer flex-1">
                      <Banknote className="h-4 w-4 text-green-600 mr-2" />
                      <span>Efectivo</span>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 p-2 rounded border border-gray-200">
                    <RadioGroupItem value="transferencia" id="transferencia" />
                    <Label htmlFor="transferencia" className="flex items-center cursor-pointer flex-1">
                      <CreditCard className="h-4 w-4 text-blue-600 mr-2" />
                      <span>Transferencia</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Botones */}
              <div className="space-y-2">
                <Button
                  onClick={() => setShowCheckout(true)}
                  disabled={cart.length === 0 || !cashRegisterOpen}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Procesar
                </Button>

                <Button
                  onClick={clearCart}
                  variant="outline"
                  disabled={cart.length === 0}
                  className="w-full bg-transparent"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpiar
                </Button>
              </div>

              {/* Indicador de sincronización */}
              {!isOnline && (
                <div className="flex items-center justify-center space-x-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                  <img src="/loading-wheel.gif" alt="Sincronizando..." className="w-4 h-4" />
                  <span>Sincronizando...</span>
                </div>
              )}
            </div>
          </div>

          {/* Modal de confirmación */}
          <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-gray-900">Confirmar Venta</DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Lista de productos */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  <h4 className="font-medium text-gray-700 flex items-center space-x-2">
                    <Package className="h-4 w-4" />
                    <span>Productos:</span>
                  </h4>
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">
                        {item.name} x{item.quantity}
                      </span>
                      <span className="font-semibold text-green-600">
                        S/. {(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Promoción en el modal */}
                {promotion.hasPromotion && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center justify-center space-x-2 text-green-700 mb-3">
                      <Gift className="h-5 w-5" />
                      <span className="font-semibold">¡Promoción 10+1!</span>
                    </div>
                    <div className="text-sm text-green-600 text-center space-y-1">
                      <p>
                        Tickets pagados: <span className="font-semibold">{promotion.totalItems}</span>
                      </p>
                      <p>
                        Tickets gratis: <span className="font-semibold">{promotion.freeItems}</span>
                      </p>
                      <p className="font-semibold text-base">Total tickets: {promotion.totalTickets}</p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Total y método de pago */}
                <div className="space-y-4">
                  <div className="flex justify-between font-semibold text-xl bg-green-50 p-4 rounded-lg">
                    <span className="text-gray-900">TOTAL A PAGAR:</span>
                    <span className="text-green-600">S/. {getTotalAmount().toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-sm bg-gray-50 p-3 rounded-lg">
                    <span className="font-medium text-gray-700">Método de Pago:</span>
                    <span className="capitalize font-semibold">
                      {paymentMethod === "efectivo" ? "💵 Efectivo" : "💳 Transferencia"}
                    </span>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex space-x-3 pt-4">
                  <Button
                    onClick={processSale}
                    disabled={processing}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {processing ? (
                      <div className="flex items-center space-x-2">
                        <img src="/loading-wheel.gif" alt="Procesando..." className="w-4 h-4" />
                        <span>Procesando...</span>
                      </div>
                    ) : (
                      "✅ Confirmar Venta"
                    )}
                  </Button>

                  <Button onClick={() => setShowCheckout(false)} variant="outline" className="flex-1">
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
    </div>
  )
}
