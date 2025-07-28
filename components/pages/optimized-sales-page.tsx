"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { collection, addDoc, doc, updateDoc, getDoc } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  Gift,
  Package,
  Calculator,
  Unlock,
  Lock,
  X,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { OptimizedProductGrid } from "@/components/optimized-product-grid"
import { ConnectionMonitor } from "@/components/connection-monitor"
import { useDebouncedSearch } from "@/hooks/use-debounced-search"
import { useOptimizedProducts } from "@/hooks/use-optimized-products"
import { usePerformanceMonitor } from "@/hooks/use-performance-monitor"
import { PerformanceMonitor, PERFORMANCE_CONFIG } from "@/lib/performance-config"

interface Product {
  id: string
  name: string
  price: number
  image: string
  category?: string
}

interface CartItem extends Product {
  quantity: number
  paymentMethod: string
}

interface OptimizedSalesPageProps {
  sidebarCollapsed?: boolean
  cashRegisterStatus?: { isOpen: boolean; data: any }
  onCashRegisterChange?: (status: { isOpen: boolean; data: any }) => void
}

export default function OptimizedSalesPage({
  sidebarCollapsed = false,
  cashRegisterStatus,
  onCashRegisterChange,
}: OptimizedSalesPageProps) {
  const [user] = useAuthState(auth)
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showCheckout, setShowCheckout] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [shortcuts, setShortcuts] = useState<any[]>([])
  const [isOnline, setIsOnline] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileCart, setShowMobileCart] = useState(false)

  // Performance monitoring
  usePerformanceMonitor("OptimizedSalesPage")
  const performanceMonitor = PerformanceMonitor.getInstance()

  // Optimized products loading with pagination
  const {
    products,
    loading: productsLoading,
    hasMore,
    loadMore,
  } = useOptimizedProducts(PERFORMANCE_CONFIG.MAX_PRODUCTS_PER_PAGE)

  // Optimized search with debouncing
  const { filteredProducts, isSearching } = useDebouncedSearch(
    products,
    searchTerm,
    ["name", "category"],
    PERFORMANCE_CONFIG.SEARCH_DEBOUNCE_MS,
  )

  // Filter by category (memoized)
  const finalFilteredProducts = useMemo(() => {
    if (selectedCategory === "all") return filteredProducts
    return filteredProducts.filter((product) => product.category === selectedCategory)
  }, [filteredProducts, selectedCategory])

  // Detectar tamaño de pantalla
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkScreenSize()
    window.addEventListener("resize", checkScreenSize)
    return () => window.removeEventListener("resize", checkScreenSize)
  }, [])

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

  // Load shortcuts (optimized)
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

  // Calcular promoción 10+1 (memoized)
  const promotion = useMemo(() => {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0)
    const freeItems = Math.floor(totalItems / 10)
    const totalTickets = totalItems + freeItems

    return {
      totalItems,
      freeItems,
      totalTickets,
      hasPromotion: freeItems > 0,
    }
  }, [cart])

  // Optimized add to cart with rate limiting
  const addToCart = useCallback(
    (product: Product) => {
      if (!performanceMonitor.trackOperation("addToCart")) {
        toast.error("Demasiadas operaciones. Espera un momento.")
        return
      }

      if (!cashRegisterStatus?.isOpen) {
        toast.error("Debes abrir la caja antes de realizar ventas")
        return
      }

      if (cart.length >= PERFORMANCE_CONFIG.MAX_CART_ITEMS) {
        toast.error(`Máximo ${PERFORMANCE_CONFIG.MAX_CART_ITEMS} productos en el carrito`)
        return
      }

      setCart((prev) => {
        const existingItem = prev.find((item) => item.id === product.id)
        if (existingItem) {
          return prev.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
        }
        return [...prev, { ...product, quantity: 1, paymentMethod: "efectivo" }]
      })
    },
    [cart.length, cashRegisterStatus?.isOpen, performanceMonitor],
  )

  const updateQuantity = useCallback((id: string, change: number) => {
    if (!performanceMonitor.trackOperation("updateQuantity")) return

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
  }, [])

  const updatePaymentMethod = useCallback((id: string, paymentMethod: string) => {
    setCart((prev) => {
      return prev.map((item) => (item.id === id ? { ...item, paymentMethod } : item))
    })
  }, [])

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
  }, [])

  // Memoized total calculation
  const totalAmount = useMemo(() => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }, [cart])

  const saveOfflineSale = useCallback((saleData: any) => {
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
  }, [])

  const generateAndPrintTickets = useCallback(() => {
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
          paymentMethod: item.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia",
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
      <div class="print-ticket">
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

    // Limpiar contenedor previo
    const existingContainer = document.getElementById("print-container")
    if (existingContainer) {
      existingContainer.remove()
    }

    // Crear nuevo contenedor de impresión
    const printContainer = document.createElement("div")
    printContainer.id = "print-container"
    printContainer.className = "print-only"
    printContainer.innerHTML = allTicketsHTML
    document.body.appendChild(printContainer)

    console.log(`✅ ${allTickets.length} tickets listos para impresión`)

    setTimeout(() => {
      window.print()
    }, 100)
  }, [cart, promotion, user])

  const processSale = useCallback(async () => {
    if (!performanceMonitor.trackOperation("processSale")) {
      toast.error("Demasiadas operaciones. Espera un momento.")
      return
    }

    if (cart.length === 0) {
      toast.error("El carrito está vacío")
      return
    }

    if (!cashRegisterStatus?.isOpen) {
      toast.error("Debes abrir la caja antes de procesar ventas")
      return
    }

    setProcessing(true)
    try {
      // Calcular totales por método de pago
      const cashTotal = cart
        .filter((item) => item.paymentMethod === "efectivo")
        .reduce((total, item) => total + item.price * item.quantity, 0)

      const transferTotal = cart
        .filter((item) => item.paymentMethod === "transferencia")
        .reduce((total, item) => total + item.price * item.quantity, 0)

      const saleData = {
        items: cart,
        total: totalAmount,
        cashTotal,
        transferTotal,
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

          const updatedData = {
            totalSales: currentData.totalSales + totalAmount,
            cashSales: currentData.cashSales + cashTotal,
            transferSales: currentData.transferSales + transferTotal,
            currentAmount: currentData.currentAmount + cashTotal,
          }

          await updateDoc(cashRegRef, updatedData)

          // Actualizar estado local inmediatamente
          if (onCashRegisterChange) {
            onCashRegisterChange({
              isOpen: true,
              data: { ...currentData, ...updatedData },
            })
          }
        }
      } else {
        // Modo offline
        saveOfflineSale(saleData)
      }

      // Generar e imprimir tickets
      generateAndPrintTickets()

      setCart([])
      setShowCheckout(false)
      setShowMobileCart(false)

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
  }, [
    cart,
    totalAmount,
    promotion,
    user,
    isOnline,
    cashRegisterStatus,
    onCashRegisterChange,
    saveOfflineSale,
    generateAndPrintTickets,
  ])

  // Componente del carrito optimizado
  const CartContent = useCallback(
    ({ isMobileView = false }) => (
      <Card
        className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm ${isMobileView ? "h-full" : ""}`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-purple-600" />
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Carrito de Compras</h2>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                {cart.reduce((total, item) => total + item.quantity, 0)}
              </Badge>
              {isMobileView && (
                <Button variant="ghost" size="sm" onClick={() => setShowMobileCart(false)} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Agrega productos y procesa ventas rápidamente
          </p>
        </div>

        {/* Promoción en el carrito */}
        {promotion.hasPromotion && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
            <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-300 mb-2">
              <Gift className="h-4 w-4" />
              <span className="font-bold text-sm">¡Promoción 10+1!</span>
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 text-center space-y-1">
              <p>
                Tickets gratis: <span className="font-bold">{promotion.freeItems}</span>
              </p>
              <p className="font-bold">Total tickets: {promotion.totalTickets}</p>
            </div>
          </div>
        )}

        <ScrollArea className={`${isMobileView ? "h-64" : "h-48 md:h-64"} p-4`}>
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p>Carrito vacío</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl space-y-3">
                  {/* Información del producto */}
                  <div className="flex items-center space-x-3">
                    <img
                      src={item.image || "/placeholder.svg?height=40&width=40&text=Sin+Imagen"}
                      alt={item.name}
                      className="w-8 h-8 md:w-10 md:h-10 object-cover rounded-lg"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-xs md:text-sm truncate text-gray-900 dark:text-white">
                        {item.name}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400">S/. {item.price.toFixed(2)} c/u</p>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeFromCart(item.id)}
                      className="h-6 w-6 p-0 rounded-full"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Controles de cantidad y método de pago */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-6 w-6 p-0 rounded-full"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-xs md:text-sm font-medium w-6 text-center text-gray-900 dark:text-white">
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-6 w-6 p-0 rounded-full"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Método de pago individual */}
                    <Select value={item.paymentMethod} onValueChange={(value) => updatePaymentMethod(item.id, value)}>
                      <SelectTrigger className="w-24 h-6 text-xs bg-white dark:bg-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">💵</SelectItem>
                        <SelectItem value="transferencia">💳</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subtotal del item */}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="font-bold text-green-600">S/. {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
          {/* Total */}
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Total:</span>
              <span className="text-lg md:text-xl font-bold text-green-600">S/. {totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Botones */}
          <div className="space-y-2">
            <Button
              onClick={() => setShowCheckout(true)}
              disabled={cart.length === 0 || !cashRegisterStatus?.isOpen}
              className="w-full bg-green-600 hover:bg-green-700 text-white h-10 md:h-12 rounded-xl font-medium text-sm md:text-base"
              data-shortcut="process-sale"
            >
              <Package className="h-4 w-4 mr-2" />
              Procesar
            </Button>
            <Button
              onClick={clearCart}
              variant="outline"
              disabled={cart.length === 0}
              className="w-full h-8 md:h-10 rounded-xl bg-transparent text-sm"
              data-shortcut="clear-cart"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </div>
      </Card>
    ),
    [cart, promotion, totalAmount, cashRegisterStatus, updateQuantity, updatePaymentMethod, removeFromCart, clearCart],
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 ml-16">
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Estado de caja - Compacto */}
        <Card className="border-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <div className="p-3 md:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 md:space-x-3">
                <Calculator className="h-4 w-4 md:h-5 md:w-5 text-purple-600" />
                <span className="font-semibold text-sm md:text-base text-gray-900 dark:text-white">
                  Caja Registradora
                </span>
              </div>
              <Badge variant={cashRegisterStatus?.isOpen ? "default" : "secondary"} className="text-xs">
                {cashRegisterStatus?.isOpen ? (
                  <>
                    <Unlock className="mr-1 h-3 w-3" />
                    Abierta
                  </>
                ) : (
                  <>
                    <Lock className="mr-1 h-3 w-3" />
                    Cerrada
                  </>
                )}
              </Badge>
            </div>
          </div>
        </Card>

        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* Área de productos */}
          <div className="flex-1">
            {/* Barra de búsqueda optimizada */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 md:h-12 border-gray-200 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    </div>
                  )}
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-64 h-10 md:h-12 border-gray-200 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl bg-white dark:bg-gray-700">
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

            {/* Grid de productos optimizado */}
            {productsLoading && finalFilteredProducts.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-2xl aspect-square animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                <OptimizedProductGrid products={finalFilteredProducts} shortcuts={shortcuts} onAddToCart={addToCart} />

                {/* Botón cargar más */}
                {hasMore && !isSearching && selectedCategory === "all" && (
                  <div className="text-center mt-6">
                    <Button
                      onClick={loadMore}
                      disabled={productsLoading}
                      variant="outline"
                      className="bg-white dark:bg-gray-800"
                    >
                      {productsLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Cargando...
                        </>
                      ) : (
                        "Cargar más productos"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Estado vacío */}
            {!productsLoading && finalFilteredProducts.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No hay productos</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchTerm || selectedCategory !== "all"
                    ? "No se encontraron productos con los filtros aplicados"
                    : "No hay productos disponibles"}
                </p>
              </div>
            )}
          </div>

          {/* Carrito de compras - Desktop */}
          {!isMobile && (
            <div className="w-full lg:w-80">
              <CartContent />
            </div>
          )}
        </div>

        {/* Carrito flotante móvil */}
        {isMobile && (
          <>
            {/* Botón flotante */}
            <Button
              onClick={() => setShowMobileCart(true)}
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg z-40"
            >
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                {cart.length > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center p-0">
                    {cart.reduce((total, item) => total + item.quantity, 0)}
                  </Badge>
                )}
              </div>
            </Button>

            {/* Modal del carrito móvil */}
            <Dialog open={showMobileCart} onOpenChange={setShowMobileCart}>
              <DialogContent className="max-w-sm w-full h-[80vh] bg-white dark:bg-gray-900 rounded-3xl p-0">
                <CartContent isMobileView={true} />
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* Modal de confirmación optimizado */}
        <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
          <DialogContent className="max-w-lg bg-white dark:bg-gray-900 rounded-3xl">
            <DialogHeader className="text-center pb-6">
              <DialogTitle className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Confirmar Venta
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Lista de productos */}
              <div className="space-y-3 max-h-60 overflow-y-auto">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                  <Package className="h-4 w-4" />
                  <span>Productos:</span>
                </h4>
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center text-sm p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                  >
                    <div className="flex-1">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {item.name} x{item.quantity}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {item.paymentMethod === "efectivo" ? "💵 Efectivo" : "💳 Transferencia"}
                      </div>
                    </div>
                    <span className="font-bold text-green-600">S/. {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Promoción en el modal */}
              {promotion.hasPromotion && (
                <div className="bg-green-50 dark:bg-green-900 p-4 rounded-2xl border border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-300 mb-3">
                    <Gift className="h-5 w-5" />
                    <span className="font-bold text-lg">¡Promoción 10+1!</span>
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400 text-center space-y-1">
                    <p>
                      Tickets pagados: <span className="font-bold">{promotion.totalItems}</span>
                    </p>
                    <p>
                      Tickets gratis:{" "}
                      <span className="font-bold text-green-700 dark:text-green-300">{promotion.freeItems}</span>
                    </p>
                    <p className="font-bold text-lg">Total tickets: {promotion.totalTickets}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Total y resumen de pagos */}
              <div className="space-y-4">
                <div className="flex justify-between font-bold text-lg md:text-xl bg-green-50 dark:bg-green-900 p-4 rounded-2xl border border-green-200 dark:border-green-700">
                  <span className="text-gray-700 dark:text-gray-300">TOTAL A PAGAR:</span>
                  <span className="text-green-600">S/. {totalAmount.toFixed(2)}</span>
                </div>

                {/* Desglose por método de pago */}
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">💵 Efectivo:</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      S/.{" "}
                      {cart
                        .filter((item) => item.paymentMethod === "efectivo")
                        .reduce((total, item) => total + item.price * item.quantity, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">💳 Transferencia:</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      S/.{" "}
                      {cart
                        .filter((item) => item.paymentMethod === "transferencia")
                        .reduce((total, item) => total + item.price * item.quantity, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={processSale}
                  disabled={processing}
                  className="flex-1 h-12 md:h-14 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-bold text-sm md:text-lg"
                >
                  {processing ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Procesando...</span>
                    </div>
                  ) : (
                    "✅ Confirmar Venta"
                  )}
                </Button>

                <Button
                  onClick={() => setShowCheckout(false)}
                  variant="outline"
                  className="flex-1 h-12 md:h-14 border-2 rounded-2xl font-bold"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Monitor de conexión */}
        <ConnectionMonitor />
      </div>
    </div>
  )
}
