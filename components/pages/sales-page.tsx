"use client"

import { cn } from "@/lib/utils"

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
  Sparkles,
  Star,
  Zap,
  Heart,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"
import CashRegister from "@/components/cash-register"
import { useOfflineMode } from "@/hooks/use-offline-mode"

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

  // Hook para modo offline
  const { isOnline, saveOfflineSale } = useOfflineMode()

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

  // NUEVA FUNCIÓN: Calcular promoción 10+1
  const calculatePromotion = () => {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0)
    const freeItems = Math.floor(totalItems / 10) // Por cada 10, 1 gratis
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

  // NUEVA FUNCIÓN: Generar tickets con promoción
  const generatePromotionTickets = () => {
    const promotion = calculatePromotion()
    const individualTickets = []
    let ticketCounter = 1

    cart.forEach((item) => {
      // Crear tickets pagados
      for (let i = 0; i < item.quantity; i++) {
        individualTickets.push({
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

    // Agregar tickets gratis de la promoción
    if (promotion.hasPromotion) {
      // Distribuir tickets gratis entre los productos del carrito
      const productsInCart = cart.filter((item) => item.quantity > 0)
      const freeTicketsToDistribute = promotion.freeItems

      for (let i = 0; i < freeTicketsToDistribute; i++) {
        const productIndex = i % productsInCart.length
        const selectedProduct = productsInCart[productIndex]

        individualTickets.push({
          ticketNumber: String(ticketCounter).padStart(3, "0"),
          productName: selectedProduct.name,
          productPrice: 0, // Precio 0 para tickets gratis
          saleDate: new Date().toLocaleString("es-ES"),
          paymentMethod: "PROMOCIÓN 10+1",
          seller: user?.displayName || user?.email || "Vendedor",
          isFree: true,
          type: "GRATIS",
        })
        ticketCounter++
      }
    }

    return individualTickets
  }

  const generateAndPrintTickets = () => {
    const allTickets = generatePromotionTickets()
    const promotion = calculatePromotion()

    console.log(
      `🎫 Generando ${allTickets.length} tickets (${promotion.totalItems} pagados + ${promotion.freeItems} gratis)`,
    )

    // Generar HTML para todos los tickets
    const allTicketsHTML = allTickets
      .map(
        (ticket, index) => `
    <div class="print-ticket" style="page-break-after: ${index === allTickets.length - 1 ? "auto" : "always"};">
      <!-- Header -->
      <div class="ticket-header">
        <div class="ticket-title">SANCHEZ PARK</div>
        <div class="ticket-subtitle">Ticket de ${ticket.type}</div>
        <div class="ticket-number">#${ticket.ticketNumber}</div>
        ${ticket.isFree ? '<div class="ticket-promo">🎁 PROMOCIÓN 10+1</div>' : ""}
      </div>
      
      <!-- Content -->
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
      
      <!-- Footer -->
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

    // Crear o actualizar el contenedor de impresión
    let printContainer = document.getElementById("print-container")
    if (!printContainer) {
      printContainer = document.createElement("div")
      printContainer.id = "print-container"
      printContainer.className = "print-only"
      document.body.appendChild(printContainer)
    }

    printContainer.innerHTML = allTicketsHTML

    // Imprimir
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
        // Datos de promoción
        promotion: {
          totalItems: promotion.totalItems,
          freeItems: promotion.freeItems,
          totalTickets: promotion.totalTickets,
          hasPromotion: promotion.hasPromotion,
        },
      }

      if (isOnline) {
        // Modo online - guardar en Firebase
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
        // Modo offline - guardar localmente
        saveOfflineSale(saleData)
      }

      // Generar e imprimir tickets con promoción
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
      <div className="ml-72 p-6 space-y-6">
        {/* Sistema de caja mejorado */}
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20">
          <CashRegister onStatusChange={setCashRegisterOpen} />
        </div>

        {/* Alertas mejoradas */}
        {!cashRegisterOpen && (
          <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 rounded-2xl shadow-lg border border-orange-300/30">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-full">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Caja Cerrada</h3>
                <p className="text-orange-100">Abre la caja registradora para comenzar a realizar ventas</p>
              </div>
            </div>
          </div>
        )}

        {!isOnline && (
          <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-4 rounded-2xl shadow-lg border border-red-300/30">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-full animate-pulse">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Modo Offline</h3>
                <p className="text-red-100">Las ventas se sincronizarán automáticamente cuando vuelva la conexión</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-8">
          {/* Área de productos mejorada */}
          <div className="flex-1 pr-96">
            {/* Header mejorado */}
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

              {/* Barra de búsqueda mejorada */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
                <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-white/20">
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

            {/* Grid de productos mejorado */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-8">
              {filteredProducts.map((product, index) => {
                const shortcut = shortcuts.find((s) => s.productId === product.id)
                return (
                  <div key={product.id} className="group relative" style={{ animationDelay: `${index * 0.1}s` }}>
                    {/* Efecto de fondo */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl blur opacity-0 group-hover:opacity-20 transition duration-300"></div>

                    <Card
                      className={cn(
                        "relative cursor-pointer transition-all duration-300 border-0 shadow-lg hover:shadow-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-3xl overflow-hidden",
                        !cashRegisterOpen ? "opacity-50 cursor-not-allowed" : "hover:scale-105 hover:-translate-y-2",
                      )}
                    >
                      <CardContent className="p-0">
                        {/* Imagen del producto */}
                        <div className="relative aspect-square bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 overflow-hidden">
                          <img
                            src={product.image || "/placeholder.svg?height=300&width=300&text=Sin+Imagen"}
                            alt={product.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = "/placeholder.svg?height=300&width=300&text=Error"
                            }}
                          />

                          {/* Overlay con efectos */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                          {/* Badge de atajo */}
                          {shortcut && (
                            <Badge className="absolute top-3 left-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold shadow-lg border-0">
                              <Zap className="h-3 w-3 mr-1" />
                              {shortcut.key.toUpperCase()}
                            </Badge>
                          )}

                          {/* Botón de agregar flotante */}
                          <Button
                            size="lg"
                            onClick={() => addToCart(product)}
                            disabled={!cashRegisterOpen}
                            data-product-shortcut={shortcut?.key}
                            className="absolute bottom-4 right-4 h-12 w-12 p-0 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-xl border-0 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110"
                          >
                            <Plus className="h-6 w-6" />
                          </Button>
                        </div>

                        {/* Información del producto */}
                        <div className="p-6">
                          <h3 className="font-bold text-lg mb-2 line-clamp-2 text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
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
                              className="h-10 px-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 border-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Agregar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Carrito completamente rediseñado */}
          <div className="fixed right-6 top-6 bottom-6 w-96 flex flex-col">
            {/* Carrito principal */}
            <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden h-full">
              {/* Header del carrito */}
              <div className="relative p-6 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white overflow-hidden">
                {/* Efectos de fondo */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm border border-white/30">
                      <ShoppingCart className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Carrito de Compras</h2>
                      <p className="text-blue-100 text-sm">Productos seleccionados</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-3 py-1 text-sm font-bold">
                      {cart.reduce((total, item) => total + item.quantity, 0)} items
                    </Badge>
                    <div className="p-2 bg-yellow-400/20 rounded-full">
                      <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Promoción 10+1 mejorada */}
              {promotion.hasPromotion && (
                <div className="relative p-4 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 text-white overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-400/30 to-emerald-400/30"></div>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-10 translate-x-10"></div>

                  <div className="relative">
                    <div className="flex items-center justify-center space-x-3 mb-3">
                      <div className="p-2 bg-white/20 rounded-full animate-bounce">
                        <Gift className="h-6 w-6" />
                      </div>
                      <span className="font-bold text-xl">¡Promoción 10+1!</span>
                      <div className="p-2 bg-white/20 rounded-full animate-pulse">
                        <Heart className="h-5 w-5 text-red-200" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold mb-1">
                        🎉 {promotion.freeItems} ticket{promotion.freeItems > 1 ? "s" : ""} GRATIS
                      </p>
                      <p className="text-sm text-green-100">
                        Total: {promotion.totalTickets} tickets ({promotion.totalItems} pagados + {promotion.freeItems}{" "}
                        gratis)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Contenido del carrito */}
              <ScrollArea className="flex-1 p-4">
                {cart.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl blur opacity-20"></div>
                      <div className="relative p-8 bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900 rounded-3xl border border-slate-200 dark:border-slate-700">
                        <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-2xl mb-4 inline-block">
                          <ShoppingCart className="h-16 w-16 text-blue-500 opacity-50" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Carrito vacío</h3>
                        <p className="text-slate-500 dark:text-slate-400">Agrega productos para comenzar tu venta</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item, index) => (
                      <div key={item.id} className="group relative" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-0 group-hover:opacity-10 transition duration-300"></div>

                        <div className="relative flex items-center space-x-4 p-4 bg-gradient-to-r from-white to-slate-50 dark:from-slate-700 dark:to-slate-600 rounded-2xl border border-slate-200 dark:border-slate-600 shadow-lg hover:shadow-xl transition-all duration-300">
                          {/* Imagen del producto */}
                          <div className="relative">
                            <img
                              src={item.image || "/placeholder.svg?height=60&width=60&text=Sin+Imagen"}
                              alt={item.name}
                              className="w-16 h-16 object-cover rounded-xl shadow-md"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = "/placeholder.svg?height=60&width=60&text=Error"
                              }}
                            />
                            <Badge className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs bg-gradient-to-r from-blue-500 to-purple-600 border-2 border-white">
                              {item.quantity}
                            </Badge>
                          </div>

                          {/* Información del producto */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm truncate text-slate-800 dark:text-white mb-1">
                              {item.name}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                              S/. {item.price.toFixed(2)} c/u
                            </p>
                            <p className="text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                              S/. {(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>

                          {/* Controles de cantidad */}
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="h-8 w-8 p-0 rounded-full border-2 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900 dark:hover:border-red-700"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>

                            <span className="w-8 text-center text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                              {item.quantity}
                            </span>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="h-8 w-8 p-0 rounded-full border-2 hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-900 dark:hover:border-green-700"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>

                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeFromCart(item.id)}
                              className="h-8 w-8 p-0 ml-2 rounded-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 border-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Footer del carrito */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-blue-900">
                <div className="space-y-6">
                  {/* Total */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl blur opacity-20"></div>
                    <div className="relative flex justify-between items-center text-2xl font-bold bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 p-6 rounded-2xl border-2 border-green-200 dark:border-green-700">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                        <span className="text-slate-700 dark:text-slate-300">Total:</span>
                      </div>
                      <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent text-3xl">
                        S/. {getTotalAmount().toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Método de pago */}
                  <div className="space-y-4">
                    <Label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-2">
                      <CreditCard className="h-4 w-4" />
                      <span>Método de Pago</span>
                    </Label>
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl blur opacity-0 group-hover:opacity-10 transition duration-300"></div>
                        <div className="relative flex items-center space-x-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-green-300 dark:hover:border-green-500 transition-all duration-300 bg-white dark:bg-slate-700">
                          <RadioGroupItem value="efectivo" id="efectivo" className="border-2" />
                          <Label htmlFor="efectivo" className="flex items-center cursor-pointer flex-1">
                            <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900 rounded-xl mr-4">
                              <Banknote className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 dark:text-white">Efectivo</span>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Pago en efectivo</p>
                            </div>
                          </Label>
                        </div>
                      </div>

                      <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl blur opacity-0 group-hover:opacity-10 transition duration-300"></div>
                        <div className="relative flex items-center space-x-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-300 bg-white dark:bg-slate-700">
                          <RadioGroupItem value="transferencia" id="transferencia" className="border-2" />
                          <Label htmlFor="transferencia" className="flex items-center cursor-pointer flex-1">
                            <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-xl mr-4">
                              <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 dark:text-white">Transferencia</span>
                              <p className="text-xs text-slate-500 dark:text-slate-400">Pago digital</p>
                            </div>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Botones de acción */}
                  <div className="space-y-3">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                      <Button
                        onClick={() => setShowCheckout(true)}
                        disabled={cart.length === 0 || !cashRegisterOpen}
                        className="relative w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-700 hover:from-blue-700 hover:to-purple-800 shadow-xl hover:shadow-2xl transition-all duration-300 border-0 rounded-2xl"
                        data-shortcut="process-sale"
                      >
                        <div className="flex items-center space-x-3">
                          <ShoppingCart className="h-6 w-6" />
                          <span>Procesar Venta</span>
                          <Badge className="bg-white/20 text-white px-2 py-1 text-xs">Enter</Badge>
                        </div>
                      </Button>
                    </div>

                    <Button
                      onClick={clearCart}
                      variant="outline"
                      disabled={cart.length === 0}
                      className="w-full h-12 border-2 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900 dark:hover:border-red-700 bg-transparent rounded-xl transition-all duration-300"
                      data-shortcut="clear-cart"
                    >
                      <div className="flex items-center space-x-2">
                        <Trash2 className="h-4 w-4" />
                        <span>Limpiar Carrito</span>
                        <Badge variant="outline" className="text-xs">
                          X
                        </Badge>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal de confirmación mejorado */}
          <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
            <DialogContent className="max-w-lg bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-0 rounded-3xl shadow-2xl">
              <DialogHeader className="text-center pb-6">
                <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Confirmar Venta
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Lista de productos */}
                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
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

                <Separator className="bg-gradient-to-r from-transparent via-slate-300 to-transparent" />

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
                  <div className="relative group flex-1">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                    <Button
                      onClick={processSale}
                      disabled={processing}
                      className="relative w-full h-14 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 border-0 rounded-2xl font-bold text-lg shadow-xl"
                    >
                      {processing ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Procesando...</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span>✅ Confirmar Venta</span>
                        </div>
                      )}
                    </Button>
                  </div>

                  <Button
                    onClick={() => setShowCheckout(false)}
                    variant="outline"
                    className="flex-1 h-14 border-2 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700"
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
