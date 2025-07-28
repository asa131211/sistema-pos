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
  Sparkles,
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
    <div className="space-y-6 ml-64">
      {" "}
      {/* Margen izquierdo para el sidebar fijo */}
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
      {/* Indicador de modo offline */}
      {!isOnline && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                🔴 Modo Offline - Las ventas se sincronizarán cuando vuelva la conexión
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex gap-6 h-full">
        {/* Productos */}
        <div className="flex-1 pr-80">
          {" "}
          {/* Padding derecho para el carrito fijo */}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
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

        {/* Carrito - Ahora fijo y mejorado */}
        <div className="fixed right-6 top-20 bottom-6 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-30 flex flex-col overflow-hidden">
          {/* Header del carrito - Mejorado */}
          <div className="p-4 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-purple-400/20"></div>
            <div className="relative flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center">
                <div className="p-2 bg-white/20 rounded-lg mr-3 backdrop-blur-sm">
                  <ShoppingCart className="h-5 w-5" />
                </div>
                Carrito de Compras
              </h2>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30 backdrop-blur-sm">
                  {cart.reduce((total, item) => total + item.quantity, 0)} items
                </Badge>
                <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
              </div>
            </div>
          </div>

          {/* NUEVA SECCIÓN: Promoción 10+1 - Mejorada */}
          {promotion.hasPromotion && (
            <div className="p-4 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-green-400/30 to-emerald-400/30"></div>
              <div className="relative">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="p-1 bg-white/20 rounded-full">
                    <Gift className="h-5 w-5" />
                  </div>
                  <span className="font-bold text-lg">¡Promoción 10+1!</span>
                  <div className="p-1 bg-white/20 rounded-full animate-bounce">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold mb-1">
                    {promotion.freeItems} ticket{promotion.freeItems > 1 ? "s" : ""} GRATIS 🎉
                  </p>
                  <p className="text-xs opacity-90">
                    Total: {promotion.totalTickets} tickets ({promotion.totalItems} pagados + {promotion.freeItems}{" "}
                    gratis)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Contenido del carrito */}
          <ScrollArea className="flex-1 p-4 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl mb-4">
                  <ShoppingCart className="mx-auto h-16 w-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">Carrito vacío</p>
                  <p className="text-sm">Agrega productos para comenzar</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center space-x-3 p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-md transition-all duration-200"
                  >
                    <div className="relative">
                      <img
                        src={item.image || "/placeholder.svg?height=50&width=50&text=Sin+Imagen"}
                        alt={item.name}
                        className="w-14 h-14 object-cover rounded-lg shadow-sm"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = "/placeholder.svg?height=50&width=50&text=Error"
                        }}
                      />
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-blue-600">
                        {item.quantity}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">S/. {item.price.toFixed(2)} c/u</p>
                      <p className="text-sm font-bold text-green-600 dark:text-green-400">
                        S/. {(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-7 w-7 p-0 rounded-full hover:bg-red-50 hover:border-red-200"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-7 w-7 p-0 rounded-full hover:bg-green-50 hover:border-green-200"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeFromCart(item.id)}
                        className="h-7 w-7 p-0 ml-2 rounded-full"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer del carrito - Mejorado */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
            <div className="space-y-4">
              {/* Total */}
              <div className="flex justify-between items-center text-xl font-bold bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 p-4 rounded-xl border-2 border-green-200 dark:border-green-700">
                <span className="text-gray-700 dark:text-gray-300">Total:</span>
                <span className="text-green-600 dark:text-green-400 text-2xl">S/. {getTotalAmount().toFixed(2)}</span>
              </div>

              {/* Método de pago */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Método de Pago</Label>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-green-300 dark:hover:border-green-500 transition-colors">
                    <RadioGroupItem value="efectivo" id="efectivo" />
                    <Label htmlFor="efectivo" className="flex items-center cursor-pointer flex-1">
                      <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg mr-3">
                        <Banknote className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="font-medium">Efectivo</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors">
                    <RadioGroupItem value="transferencia" id="transferencia" />
                    <Label htmlFor="transferencia" className="flex items-center cursor-pointer flex-1">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg mr-3">
                        <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="font-medium">Transferencia</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Botones de acción */}
              <div className="space-y-3">
                <Button
                  onClick={() => setShowCheckout(true)}
                  disabled={cart.length === 0 || !cashRegisterOpen}
                  className="w-full h-12 text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
                  data-shortcut="process-sale"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Procesar Venta (Enter)
                </Button>
                <Button
                  onClick={clearCart}
                  variant="outline"
                  disabled={cart.length === 0}
                  className="w-full h-10 border-2 hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900 dark:hover:border-red-700 bg-transparent"
                  data-shortcut="clear-cart"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpiar Carrito (X)
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de confirmación con promoción */}
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

              {/* Mostrar promoción en el modal */}
              {promotion.hasPromotion && (
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center justify-center space-x-2 text-green-700 dark:text-green-300 mb-2">
                    <Gift className="h-4 w-4" />
                    <span className="font-semibold">¡Promoción 10+1!</span>
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400 text-center">
                    <p>Tickets pagados: {promotion.totalItems}</p>
                    <p>Tickets gratis: {promotion.freeItems}</p>
                    <p className="font-semibold">Total tickets: {promotion.totalTickets}</p>
                  </div>
                </div>
              )}

              <Separator />
              <div className="flex justify-between font-bold text-lg bg-green-50 p-3 rounded">
                <span>TOTAL A PAGAR:</span>
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

        {/* Contenedor oculto para impresión */}
        <div id="print-container" className="print-only"></div>
      </div>
    </div>
  )
}
