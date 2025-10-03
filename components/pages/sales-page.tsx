"use client"

import { useState, useEffect, useMemo, useCallback, memo } from "react"
import { collection, query, onSnapshot, addDoc, doc, updateDoc, getDoc, limit, orderBy } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent } from "@/components/ui/card"
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
  Tag,
  Calculator,
  Unlock,
  Lock,
  Loader2,
} from "lucide-react"
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
  paymentMethod: string // Agregando método de pago individual por producto
}

interface SalesPageProps {
  sidebarCollapsed?: boolean
  cashRegisterStatus?: { isOpen: boolean; data: any }
  onCashRegisterChange?: (status: { isOpen: boolean; data: any }) => void
}

// Debounce hook para optimizar búsquedas
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Componente optimizado para productos individuales
const ProductCard = memo(
  ({
    product,
    onAddToCart,
    shortcut,
  }: {
    product: Product
    onAddToCart: (product: Product) => void
    shortcut?: any
  }) => {
    const handleClick = useCallback(() => {
      onAddToCart(product)
    }, [product, onAddToCart])

    return (
      <Card
        className="cursor-pointer transition-all duration-200 hover:shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden"
        onClick={handleClick}
        data-product-shortcut={shortcut?.key}
      >
        <CardContent className="p-0">
          <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <img
              src={product.image || "/placeholder.svg?height=300&width=300&text=Sin+Imagen"}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.svg?height=300&width=300&text=Error"
              }}
            />
            {shortcut && (
              <Badge className="absolute top-3 left-3 bg-blue-600 text-white">{shortcut.key.toUpperCase()}</Badge>
            )}
          </div>

          <div className="p-3 md:p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 text-sm md:text-base">
              {product.name}
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-gray-400" />
                <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  {product.category || "juegos"}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm md:text-lg font-bold text-green-600">S/. {product.price.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  },
)

ProductCard.displayName = "ProductCard"

// Componente optimizado para items del carrito
const CartItem = memo(
  ({
    item,
    onUpdateQuantity,
    onRemove,
    updatePaymentMethod,
  }: {
    item: CartItem
    onUpdateQuantity: (id: string, change: number) => void
    onRemove: (id: string) => void
    updatePaymentMethod: (id: string, paymentMethod: string) => void
  }) => {
    const handleIncrease = useCallback(() => onUpdateQuantity(item.id, 1), [item.id, onUpdateQuantity])
    const handleDecrease = useCallback(() => onUpdateQuantity(item.id, -1), [item.id, onUpdateQuantity])
    const handleRemove = useCallback(() => onRemove(item.id), [item.id, onRemove])

    return (
      <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-2">
        <div className="flex items-center space-x-2">
          <img
            src={item.image || "/placeholder.svg?height=32&width=32&text=Sin+Imagen"}
            alt={item.name}
            className="w-10 h-10 object-cover rounded-md flex-shrink-0"
            loading="lazy"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-xs truncate text-gray-900 dark:text-white">{item.name}</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">S/. {item.price.toFixed(2)}</p>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDecrease}
              className="h-5 w-5 p-0 rounded-full bg-transparent"
            >
              <Minus className="h-2.5 w-2.5" />
            </Button>
            <span className="text-xs font-medium w-4 text-center text-gray-900 dark:text-white">{item.quantity}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleIncrease}
              className="h-5 w-5 p-0 rounded-full bg-transparent"
            >
              <Plus className="h-2.5 w-2.5" />
            </Button>
            <Button size="sm" variant="destructive" onClick={handleRemove} className="h-5 w-5 p-0 ml-1 rounded-full">
              <Trash2 className="h-2.5 w-2.5" />
            </Button>
          </div>
        </div>

        <div className="pl-8">
          <Select value={item.paymentMethod} onValueChange={(value) => updatePaymentMethod(item.id, value)}>
            <SelectTrigger className="w-full h-6 text-xs bg-white dark:bg-gray-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="efectivo">💵 Efectivo</SelectItem>
              <SelectItem value="transferencia">💳 Transferencia</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    )
  },
)

CartItem.displayName = "CartItem"

export default function SalesPage({
  sidebarCollapsed = false,
  cashRegisterStatus,
  onCashRegisterChange,
}: SalesPageProps) {
  const [user] = useAuthState(auth)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showCheckout, setShowCheckout] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [shortcuts, setShortcuts] = useState<any[]>([])
  const [isOnline, setIsOnline] = useState(true)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [showMobileCart, setShowMobileCart] = useState(false)

  // Debounced search term para optimizar búsquedas
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

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

  // Optimized Firebase listener con límite
  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const setupListener = async () => {
      try {
        setLoading(true)

        // Usar query con límite para mejor rendimiento
        const productsQuery = query(
          collection(db, "products"),
          orderBy("name"),
          limit(50), // Limitar productos iniciales
        )

        unsubscribe = onSnapshot(
          productsQuery,
          (snapshot) => {
            const productsData = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Product[]

            setProducts(productsData)
            setLoading(false)
          },
          (error) => {
            console.error("Error loading products:", error)
            toast.error("Error al cargar productos")
            setLoading(false)
          },
        )
      } catch (error) {
        console.error("Error setting up listener:", error)
        setLoading(false)
      }
    }

    setupListener()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [])

  // Cargar shortcuts de forma optimizada
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

  // Memoized filtered products para evitar recálculos innecesarios
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, debouncedSearchTerm, selectedCategory])

  // Memoized categories para evitar recálculos
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.map((p) => p.category).filter(Boolean))]
    return uniqueCategories
  }, [products])

  // Calcular promoción optimizado
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

  // Optimized add to cart function
  const addToCart = useCallback(
    (product: Product) => {
      if (!cashRegisterStatus?.isOpen) {
        toast.error("Debes abrir la caja antes de realizar ventas")
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
    [cashRegisterStatus?.isOpen],
  )

  const updatePaymentMethod = useCallback((id: string, paymentMethod: string) => {
    setCart((prev) => prev.map((item) => (item.id === id ? { ...item, paymentMethod } : item)))
  }, [])

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
  }, [])

  const updateQuantity = useCallback((id: string, change: number) => {
    setCart((prev) => {
      return prev.map((item) => {
        if (item.id === id) {
          return { ...item, quantity: item.quantity + change }
        }
        return item
      })
    })
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

    // Limpiar cualquier contenedor de impresión existente
    const existingContainer = document.getElementById("print-container")
    if (existingContainer) {
      existingContainer.remove()
    }

    // Crear nuevo contenedor
    const printContainer = document.createElement("div")
    printContainer.id = "print-container"
    printContainer.style.display = "none"

    // CSS extremadamente compacto para tickets de 13cm exactos
    const printStyles = `
<style>
  @media screen {
    #print-container {
      display: none !important;
    }
  }
  
  @media print {
    * {
      margin: 0 !important;
      padding: 0 !important;
      box-sizing: border-box !important;
    }
    
    html, body {
      width: 8cm !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: 'Courier New', monospace !important;
      font-size: 14px !important;
      line-height: 1 !important;
      color: #000 !important;
      background: white !important;
      font-weight: bold !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    @page {
      size: 8cm auto !important;
      margin: 0 !important;
    }
    
    body > *:not(#print-container) {
      display: none !important;
    }
    
    #print-container {
      display: block !important;
      width: 8cm !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    
    .ticket {
      width: 8cm !important;
      min-height: 5cm !important;
      margin: 0 auto !important;
      padding: 6px !important;
      background: white !important;
      page-break-after: always !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
    }
    
    .ticket:last-child {
      page-break-after: auto !important;
    }
    
    /* Header súper compacto */
    .header {
      text-align: center !important;
      margin-bottom: 4px !important;
    }
    
    .logo {
      font-size: 18px !important;
      font-weight: 900 !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      margin-top: 8px !important;
      margin-bottom: 0px !important;
    }
    
    .title {
      font-size: 16px !important;
      font-weight: 900 !important;
      letter-spacing: 0.2px !important;
    }
    
    .subtitle {
      font-size: 13px !important;
      font-weight: bold !important;
    }
    
    .number {
      font-size: 15px !important;
      font-weight: 900 !important;
    }
    
    .promo-badge {
      background: #000 !important;
      color: white !important;
      padding: 2px 3px !important;
      font-size: 12px !important;
      font-weight: 900 !important;
      display: inline-block !important;
    }
    
    .content {
      flex-grow: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      padding: 3px !important;
    }
    
    .row {
      display: flex !important;
      justify-content: space-between !important;
      font-size: 13px !important;
      font-weight: bold !important;
    }
    
    .label {
      font-weight: 900 !important;
      flex: 1 !important;
    }
    
    .value {
      text-align: right !important;
      flex: 1 !important;
    }
    
    .total-section {
      margin-top: 3px !important;
    }
    
    .total {
      text-align: center !important;
      font-size: 14px !important;
      font-weight: 900 !important;
      background: #f0f0f0 !important;
      letter-spacing: 0.2px !important;
    }
    
    .footer {
      text-align: center !important;
      margin-top: 4px !important;
    }
    
    .info {
      font-size: 11px !important;
      font-weight: bold !important;
    }
    
    .thanks {
      font-size: 13px !important;
      font-weight: 900 !important;
    }
    
    .brand {
      font-size: 12px !important;
      font-weight: 900 !important;
    }
    
    .note {
      font-size: 10px !important;
      font-style: italic !important;
      font-weight: bold !important;
    }
    
    .promo-note {
      font-size: 10px !important;
      font-weight: 900 !important;
      background: #f0f0f0 !important;
    }
  }
</style>
`

    // Generar HTML de tickets con formato extremadamente compacto
    const ticketsHTML = allTickets
      .map(
        (ticket, index) => `
<div class="ticket">
  <div class="header">
    <div class="logo"><img src="/tiger-logo-new.png" alt="Logo" style="width: 90px; height: 90px; object-fit: contain; display: block; margin: 8px auto 4px auto;" /></div>
    <div class="title">SANCHEZ PARK</div>
    <div class="subtitle">${ticket.type}</div>
    <div class="number">#${ticket.ticketNumber}</div>
    ${ticket.isFree ? '<div class="promo-badge">🎁 10+1</div>' : ""}
  </div>
  
  <div class="content">
    <div class="row">
      <span class="label">Producto:</span>
      <span class="value">${ticket.productName.length > 20 ? ticket.productName.substring(0, 20) + "..." : ticket.productName}</span>
    </div>
    <div class="row">
      <span class="label">Cant:</span>
      <span class="value">1 ud</span>
    </div>
    <div class="row">
      <span class="label">Precio:</span>
      <span class="value">${ticket.isFree ? "GRATIS" : `S/. ${ticket.productPrice.toFixed(2)}`}</span>
    </div>
    <div class="total-section">
      <div class="total">${ticket.isFree ? "🎁 GRATIS" : `TOTAL: S/. ${ticket.productPrice.toFixed(2)}`}</div>
    </div>
  </div>
  
  <div class="footer">
    <div class="info">${ticket.saleDate.substring(0, 16)}</div>
    <div class="info">${ticket.seller.length > 15 ? ticket.seller.substring(0, 15) + "..." : ticket.seller}</div>
    <div class="info">${ticket.paymentMethod.substring(0, 12)}</div>
    <div class="info">${index + 1}/${allTickets.length}</div>
    ${ticket.isFree ? '<div class="promo-note">Promo 10+1</div>' : ""}
    <div class="thanks">¡Gracias!</div>
    <div class="brand">Sanchez Park</div>
    <div class="note">Conserve ticket</div>
  </div>
</div>
`,
      )
      .join("")

    // Agregar contenido al contenedor
    printContainer.innerHTML = printStyles + ticketsHTML

    // Agregar al DOM
    document.body.appendChild(printContainer)

    console.log(`✅ ${allTickets.length} tickets ultra compactos (100% ancho x 13cm) preparados para impresión`)
    console.log("Contenido del contenedor:", printContainer.innerHTML.length, "caracteres")

    // Imprimir después de un breve delay
    setTimeout(() => {
      console.log("Iniciando impresión de tickets ultra compactos...")

      // Configurar título temporal
      const originalTitle = document.title
      document.title = `Tickets-Compactos-${Date.now()}`

      // Función de limpieza
      const cleanup = () => {
        document.title = originalTitle
        const container = document.getElementById("print-container")
        if (container) {
          container.remove()
          console.log("Contenedor de impresión limpiado")
        }
      }

      // Event listener para después de imprimir
      const handleAfterPrint = () => {
        cleanup()
        window.removeEventListener("afterprint", handleAfterPrint)
      }

      window.addEventListener("afterprint", handleAfterPrint)

      // Iniciar impresión
      try {
        window.print()
      } catch (error) {
        console.error("Error al imprimir:", error)
        cleanup()
      }

      // Limpieza de respaldo después de 10 segundos
      setTimeout(cleanup, 10000)
    }, 300)
  }, [cart, promotion, user])

  const getBusinessDate = () => {
    // Obtener la hora actual en zona horaria de Perú
    const now = new Date()
    const peruTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }))

    // La fecha de negocio es siempre el día actual en Perú
    // Las ventas del mismo día calendario (00:00 - 23:59) pertenecen al mismo día de negocio
    return peruTime.toISOString().split("T")[0]
  }

  const processSale = useCallback(async () => {
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
      const cashItems = cart.filter((item) => item.paymentMethod === "efectivo")
      const transferItems = cart.filter((item) => item.paymentMethod === "transferencia")

      const cashTotal = cashItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
      const transferTotal = transferItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

      const businessDate = getBusinessDate()

      const saleData = {
        items: cart,
        total: totalAmount,
        paymentBreakdown: {
          cash: cashTotal,
          transfer: transferTotal,
        },
        paymentMethod: cashTotal > 0 && transferTotal > 0 ? "mixto" : cashTotal > 0 ? "efectivo" : "transferencia", // Para compatibilidad
        sellerId: user?.uid,
        sellerEmail: user?.email,
        timestamp: new Date(),
        date: businessDate, // Usando fecha de negocio
        promotion: {
          totalItems: promotion.totalItems,
          freeItems: promotion.freeItems,
          totalTickets: promotion.totalTickets,
          hasPromotion: promotion.hasPromotion,
        },
      }

      if (isOnline) {
        // Usar batch para operaciones atómicas
        const batch = db.batch ? db.batch() : null

        // Modo online
        await addDoc(collection(db, "sales"), saleData)

        // Actualizar caja registradora
        const cashRegId = `${user?.uid}-${businessDate}`
        const cashRegRef = doc(db, "cash-registers", cashRegId)
        const cashRegDoc = await getDoc(cashRegRef)

        if (cashRegDoc.exists()) {
          const currentData = cashRegDoc.data()

          const updatedData = {
            totalSales: currentData.totalSales + totalAmount,
            cashSales: currentData.cashSales + cashTotal,
            transferSales: currentData.transferSales + transferTotal,
            currentAmount: currentData.currentAmount + cashTotal, // Solo efectivo afecta el monto físico
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
    user,
    promotion,
    isOnline,
    cashRegisterStatus,
    onCashRegisterChange,
    generateAndPrintTickets,
    saveOfflineSale,
  ])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 ml-16 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600 dark:text-gray-400">Cargando productos...</p>
        </div>
      </div>
    )
  }

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

        {/* Barra de búsqueda y filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 md:h-12 border-gray-200 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-64 h-10 md:h-12 border-gray-200 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl bg-white dark:bg-gray-700">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* Área de productos */}
          <div className="flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {filteredProducts.map((product) => {
                const shortcut = shortcuts.find((s) => s.productId === product.id)
                return <ProductCard key={product.id} product={product} onAddToCart={addToCart} shortcut={shortcut} />
              })}
            </div>
          </div>

          {/* Carrito de compras - Sticky */}
          <div className="w-full lg:w-80">
            <div className="sticky top-20">
              <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ShoppingCart className="h-4 w-4 text-purple-600" />
                      <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Carrito</h2>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-xs"
                    >
                      {cart.reduce((total, item) => total + item.quantity, 0)}
                    </Badge>
                  </div>
                </div>

                {/* Promoción en el carrito */}
                {promotion.hasPromotion && (
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-300 mb-1">
                      <Gift className="h-3 w-3" />
                      <span className="font-bold text-xs">¡Promoción 10+1!</span>
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400 text-center">
                      <p>
                        Gratis: <span className="font-bold">{promotion.freeItems}</span> | Total:{" "}
                        {promotion.totalTickets}
                      </p>
                    </div>
                  </div>
                )}

                <ScrollArea className="h-56 p-3">
                  {cart.length === 0 ? (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                      <p className="text-xs">Carrito vacío</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <CartItem
                          key={item.id}
                          item={item}
                          onUpdateQuantity={(id, change) => updateQuantity(id, change)}
                          onRemove={(id) => removeFromCart(id)}
                          updatePaymentMethod={(id, paymentMethod) => updatePaymentMethod(id, paymentMethod)}
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>

                <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
                  {/* Total */}
                  <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">Total:</span>
                      <span className="text-lg font-bold text-green-600">S/. {totalAmount.toFixed(2)}</span>
                    </div>

                    <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-600 space-y-0.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">💵 Efectivo:</span>
                        <span className="text-green-600 font-medium">
                          S/.{" "}
                          {cart
                            .filter((item) => item.paymentMethod === "efectivo")
                            .reduce((sum, item) => sum + item.price * item.quantity, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">💳 Transferencia:</span>
                        <span className="text-blue-600 font-medium">
                          S/.{" "}
                          {cart
                            .filter((item) => item.paymentMethod === "transferencia")
                            .reduce((sum, item) => sum + item.price * item.quantity, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botones */}
                  <div className="space-y-2">
                    <Button
                      onClick={() => setShowCheckout(true)}
                      disabled={cart.length === 0 || !cashRegisterStatus?.isOpen}
                      className="w-full bg-green-600 hover:bg-green-700 text-white h-9 rounded-lg font-medium text-sm"
                      data-shortcut="process-sale"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Procesar
                    </Button>
                    <Button
                      onClick={clearCart}
                      variant="outline"
                      disabled={cart.length === 0}
                      className="w-full h-8 rounded-lg bg-transparent text-xs"
                      data-shortcut="clear-cart"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Limpiar
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Modal de confirmación */}
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
                    <span className="font-medium text-gray-900 dark:text-white">
                      {item.name} x{item.quantity}
                    </span>
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

              {/* Total y método de pago */}
              <div className="space-y-4">
                <div className="flex justify-between font-bold text-lg md:text-xl bg-green-50 dark:bg-green-900 p-4 rounded-2xl border border-green-200 dark:border-green-700">
                  <span className="text-gray-700 dark:text-gray-300">TOTAL A PAGAR:</span>
                  <span className="text-green-600">S/. {totalAmount.toFixed(2)}</span>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl space-y-2">
                  <h4 className="font-medium text-gray-700 dark:text-gray-300 text-sm">Desglose por Método de Pago:</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">💵 Efectivo:</span>
                    <span className="font-bold text-green-600">
                      S/.{" "}
                      {cart
                        .filter((item) => item.paymentMethod === "efectivo")
                        .reduce((sum, item) => sum + item.price * item.quantity, 0)
                        .toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">💳 Transferencia:</span>
                    <span className="font-bold text-blue-600">
                      S/.{" "}
                      {cart
                        .filter((item) => item.paymentMethod === "transferencia")
                        .reduce((sum, item) => sum + item.price * item.quantity, 0)
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

        {/* Contenedor oculto para impresión */}
        <div id="print-container" className="print-only"></div>

        <div className="lg:hidden fixed bottom-4 right-4 z-50">
          <Button
            onClick={() => setShowMobileCart(true)}
            disabled={cart.length === 0 || !cashRegisterStatus?.isOpen}
            className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center relative opacity-95"
          >
            <ShoppingCart className="h-6 w-6" />
            {cart.length > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[20px] h-5 rounded-full flex items-center justify-center p-0">
                {cart.reduce((total, item) => total + item.quantity, 0)}
              </Badge>
            )}
          </Button>
        </div>

        <Dialog open={showMobileCart} onOpenChange={setShowMobileCart}>
          <DialogContent className="max-w-sm bg-white dark:bg-gray-900 rounded-3xl h-[80vh] flex flex-col">
            <DialogHeader className="text-center pb-4">
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center justify-center space-x-2">
                <ShoppingCart className="h-5 w-5 text-purple-600" />
                <span>Carrito de Compras</span>
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 flex flex-col space-y-4">
              {/* Promoción en el carrito móvil */}
              {promotion.hasPromotion && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                  <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-300 mb-2">
                    <Gift className="h-4 w-4" />
                    <span className="font-bold text-sm">¡Promoción 10+1!</span>
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 text-center">
                    <p>
                      Gratis: <span className="font-bold">{promotion.freeItems}</span> | Total: {promotion.totalTickets}
                    </p>
                  </div>
                </div>
              )}

              {/* Lista de productos en el carrito */}
              <ScrollArea className="flex-1">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm">Carrito vacío</p>
                  </div>
                ) : (
                  <div className="space-y-3 p-1">
                    {cart.map((item) => (
                      <CartItem
                        key={item.id}
                        item={item}
                        onUpdateQuantity={(id, change) => updateQuantity(id, change)}
                        onRemove={(id) => removeFromCart(id)}
                        updatePaymentMethod={(id, paymentMethod) => updatePaymentMethod(id, paymentMethod)}
                      />
                    ))}
                  </div>
                )}
              </ScrollArea>

              {/* Total y desglose */}
              {cart.length > 0 && (
                <div className="space-y-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                      <span className="text-xl font-bold text-green-600">S/. {totalAmount.toFixed(2)}</span>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">💵 Efectivo:</span>
                        <span className="text-green-600 font-medium">
                          S/.{" "}
                          {cart
                            .filter((item) => item.paymentMethod === "efectivo")
                            .reduce((sum, item) => sum + item.price * item.quantity, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">💳 Transferencia:</span>
                        <span className="text-blue-600 font-medium">
                          S/.{" "}
                          {cart
                            .filter((item) => item.paymentMethod === "transferencia")
                            .reduce((sum, item) => sum + item.price * item.quantity, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        setShowMobileCart(false)
                        setShowCheckout(true)
                      }}
                      disabled={cart.length === 0 || !cashRegisterStatus?.isOpen}
                      className="w-full bg-green-600 hover:bg-green-700 text-white h-12 rounded-xl font-medium"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Procesar Venta
                    </Button>
                    <Button
                      onClick={clearCart}
                      variant="outline"
                      disabled={cart.length === 0}
                      className="w-full h-10 rounded-xl bg-transparent"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpiar Carrito
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
