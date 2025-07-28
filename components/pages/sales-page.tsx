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
import { Sparkles, Star, Zap, TrendingUp } from "lucide-react"

interface Product {
  id: string
  name: string
  price: number
  image: string
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

  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))

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
    return sidebarCollapsed ? "ml-20" : "ml-72"
  }

  const getProductsGridWidth = () => {
    return sidebarCollapsed ? "pr-80" : "pr-80"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
      <div className={cn("transition-all duration-300 ease-in-out p-6 space-y-6", getMarginLeft())}>
        {/* Sistema de caja */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
          <CashRegister onStatusChange={setCashRegisterOpen} />
        </div>

        {/* Alertas */}
        {!cashRegisterOpen && (
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-2xl shadow-lg">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6" />
              <div>
                <h3 className="font-bold text-lg">Caja Cerrada</h3>
                <p className="text-orange-100">Abre la caja registradora para comenzar a realizar ventas</p>
              </div>
            </div>
          </div>
        )}

        {!isOnline && (
          <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-4 rounded-2xl shadow-lg">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6" />
              <div>
                <h3 className="font-bold text-lg">Modo Offline</h3>
                <p className="text-red-100">Las ventas se sincronizarán automáticamente cuando vuelva la conexión</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-8">
          {/* Área de productos con ancho adaptativo */}
          <div className={cn("flex-1 transition-all duration-300 ease-in-out", getProductsGridWidth())}>
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <ShoppingCart className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-blue-600 bg-clip-text text-transparent dark:from-white dark:to-blue-400">
                    Punto de Venta
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 text-lg">
                    Selecciona productos para agregar al carrito
                  </p>
                </div>
              </div>

              {/* Barra de búsqueda */}
              <div className="relative">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-white/20">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <Input
                    placeholder="🔍 Buscar productos por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 pr-4 py-4 text-lg bg-transparent border-0 focus:ring-2 focus:ring-blue-500/20 rounded-2xl"
                  />
                </div>
              </div>
            </div>

            {/* Grid de productos con columnas adaptativas */}
            <div
              className={cn(
                "grid gap-6 pb-8 transition-all duration-300 ease-in-out",
                sidebarCollapsed
                  ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
              )}
            >
              {filteredProducts.map((product) => {
                const shortcut = shortcuts.find((s) => s.productId === product.id)
                return (
                  <Card
                    key={product.id}
                    className={cn(
                      "cursor-pointer transition-all duration-300 border-0 shadow-lg hover:shadow-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl overflow-hidden",
                      !cashRegisterOpen ? "opacity-50 cursor-not-allowed" : "hover:scale-105 hover:-translate-y-2",
                    )}
                  >
                    <CardContent className="p-0">
                      {/* Imagen del producto */}
                      <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 overflow-hidden">
                        <img
                          src={product.image || "/placeholder.svg?height=300&width=300&text=Sin+Imagen"}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = "/placeholder.svg?height=300&width=300&text=Error"
                          }}
                        />

                        {/* Badge de atajo */}
                        {shortcut && (
                          <Badge className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold shadow-lg border-0">
                            <Zap className="h-3 w-3 mr-1" />
                            {shortcut.key.toUpperCase()}
                          </Badge>
                        )}

                        {/* Botón de agregar */}
                        <Button
                          size="lg"
                          onClick={() => addToCart(product)}
                          disabled={!cashRegisterOpen}
                          data-product-shortcut={shortcut?.key}
                          className="absolute bottom-4 right-4 h-12 w-12 p-0 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-xl border-0 opacity-0 group-hover:opacity-100 transition-all duration-300"
                        >
                          <Plus className="h-6 w-6" />
                        </Button>
                      </div>

                      {/* Información del producto */}
                      <div className="p-6">
                        <h3 className="font-bold text-lg mb-2 line-clamp-2 text-slate-800 dark:text-white">
                          {product.name}
                        </h3>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                              S/. {product.price.toFixed(2)}
                            </span>
                            <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          </div>

                          <Button
                            size="sm"
                            onClick={() => addToCart(product)}
                            disabled={!cashRegisterOpen}
                            className="h-10 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 rounded-xl shadow-lg"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

          {/* Carrito fijo optimizado */}
          <div className="fixed right-6 top-6 bottom-6 w-80 flex flex-col">
            <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden h-full">
              {/* Header compacto del carrito */}
              <div className="p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <ShoppingCart className="h-6 w-6" />
                    <div>
                      <h2 className="text-lg font-bold">Carrito de Compras</h2>
                      <p className="text-blue-100 text-xs">Productos seleccionados</p>
                    </div>
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-2 py-1 text-sm font-bold">
                    {cart.reduce((total, item) => total + item.quantity, 0)} items
                  </Badge>
                </div>
              </div>

              {/* Promoción 10+1 compacta */}
              {promotion.hasPromotion && (
                <div className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white">
                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-2 mb-1">
                      <Gift className="h-4 w-4" />
                      <span className="font-bold text-sm">¡Promoción 10+1!</span>
                    </div>
                    <p className="text-sm font-bold">
                      🎉 {promotion.freeItems} ticket{promotion.freeItems > 1 ? "s" : ""} GRATIS
                    </p>
                  </div>
                </div>
              )}

              {/* Contenido del carrito optimizado */}
              <ScrollArea className="flex-1 p-3">
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                      <ShoppingCart className="h-12 w-12 text-white/50 mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-white mb-1">Carrito vacío</h3>
                      <p className="text-white/70 text-sm">Agrega productos para comenzar</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center space-x-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20"
                      >
                        {/* Imagen compacta */}
                        <div className="relative">
                          <img
                            src={item.image || "/placeholder.svg?height=40&width=40&text=Sin+Imagen"}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = "/placeholder.svg?height=40&width=40&text=Error"
                            }}
                          />
                          <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 flex items-center justify-center text-xs bg-blue-500 border border-white">
                            {item.quantity}
                          </Badge>
                        </div>

                        {/* Info compacta */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs truncate text-white mb-1">{item.name}</h4>
                          <p className="text-xs text-white/70">S/. {item.price.toFixed(2)} c/u</p>
                          <p className="text-sm font-bold text-green-300">
                            S/. {(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>

                        {/* Controles compactos */}
                        <div className="flex items-center space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, -1)}
                            className="h-6 w-6 p-0 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 text-white"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, 1)}
                            className="h-6 w-6 p-0 rounded-full border border-white/30 bg-white/10 hover:bg-white/20 text-white"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => removeFromCart(item.id)}
                            className="h-6 w-6 p-0 ml-1 rounded-full bg-red-500/20 hover:bg-red-500/40 border-red-400/30"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Footer compacto del carrito */}
              <div className="p-4 bg-white/10 backdrop-blur-sm border-t border-white/20">
                <div className="space-y-4">
                  {/* Total compacto */}
                  <div className="flex justify-between items-center text-xl font-bold bg-green-500/20 backdrop-blur-sm p-3 rounded-xl border border-green-400/30">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-5 w-5 text-green-300" />
                      <span className="text-white">Total:</span>
                    </div>
                    <span className="text-green-300 text-2xl">S/. {getTotalAmount().toFixed(2)}</span>
                  </div>

                  {/* Método de pago compacto */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-white/90 flex items-center space-x-1">
                      <CreditCard className="h-3 w-3" />
                      <span>Método de Pago</span>
                    </Label>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
                      <div className="flex items-center space-x-3 p-2 rounded-lg border border-white/20 bg-white/5">
                        <RadioGroupItem value="efectivo" id="efectivo" className="border-white/50" />
                        <Label htmlFor="efectivo" className="flex items-center cursor-pointer flex-1 text-white">
                          <div className="p-2 bg-green-500/20 rounded-lg mr-3">
                            <Banknote className="h-4 w-4 text-green-300" />
                          </div>
                          <div>
                            <span className="font-bold text-sm">Efectivo</span>
                            <p className="text-xs text-white/70">Pago en efectivo</p>
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-3 p-2 rounded-lg border border-white/20 bg-white/5">
                        <RadioGroupItem value="transferencia" id="transferencia" className="border-white/50" />
                        <Label htmlFor="transferencia" className="flex items-center cursor-pointer flex-1 text-white">
                          <div className="p-2 bg-blue-500/20 rounded-lg mr-3">
                            <CreditCard className="h-4 w-4 text-blue-300" />
                          </div>
                          <div>
                            <span className="font-bold text-sm">Transferencia</span>
                            <p className="text-xs text-white/70">Pago digital</p>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Botones compactos */}
                  <div className="space-y-2">
                    <Button
                      onClick={() => setShowCheckout(true)}
                      disabled={cart.length === 0 || !cashRegisterOpen}
                      className="w-full h-12 text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 shadow-xl border-0 rounded-xl"
                      data-shortcut="process-sale"
                    >
                      <div className="flex items-center space-x-2">
                        <ShoppingCart className="h-4 w-4" />
                        <span>Procesar Venta</span>
                        <Badge className="bg-white/20 text-white px-1 py-0.5 text-xs">Enter</Badge>
                      </div>
                    </Button>

                    <Button
                      onClick={clearCart}
                      variant="outline"
                      disabled={cart.length === 0}
                      className="w-full h-10 border border-white/30 bg-white/10 hover:bg-white/20 text-white rounded-xl"
                      data-shortcut="clear-cart"
                    >
                      <div className="flex items-center space-x-2">
                        <Trash2 className="h-3 w-3" />
                        <span className="text-sm">Limpiar Carrito</span>
                        <Badge variant="outline" className="text-xs border-white/30 text-white/80">
                          X
                        </Badge>
                      </div>
                    </Button>
                  </div>

                  {/* Indicador de sincronización con GIF personalizado */}
                  {!isOnline && (
                    <div className="flex items-center justify-center space-x-2 text-xs text-white/80 bg-red-500/20 p-2 rounded-lg border border-red-400/30">
                      <img src="/loading-wheel.gif" alt="Sincronizando..." className="w-4 h-4" />
                      <span>Sincronizando...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Modal de confirmación */}
          <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
            <DialogContent className="max-w-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-0 rounded-3xl shadow-2xl">
              <DialogHeader className="text-center pb-6">
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Confirmar Venta
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Lista de productos */}
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                    <Package className="h-4 w-4" />
                    <span>Productos:</span>
                  </h4>
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center text-sm p-3 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-700 dark:to-blue-800 rounded-xl border border-slate-200 dark:border-slate-600"
                    >
                      <span className="font-medium">
                        {item.name} x{item.quantity}
                      </span>
                      <span className="font-bold text-green-600">S/. {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Promoción en el modal */}
                {promotion.hasPromotion && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 p-4 rounded-2xl border-2 border-green-200 dark:border-green-700">
                    <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-300 mb-3">
                      <Gift className="h-5 w-5" />
                      <span className="font-bold text-lg">¡Promoción 10+1!</span>
                      <Sparkles className="h-4 w-4 animate-pulse" />
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400 text-center space-y-1">
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
                  <div className="flex justify-between font-bold text-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 p-4 rounded-2xl border-2 border-green-200 dark:border-green-700">
                    <span className="text-slate-700 dark:text-slate-300">TOTAL A PAGAR:</span>
                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      S/. {getTotalAmount().toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 p-3 rounded-xl border border-blue-200 dark:border-blue-700">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Método de Pago:</span>
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
                    className="flex-1 h-14 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 border-0 rounded-2xl font-bold text-lg shadow-xl"
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
    </div>
  )
}
