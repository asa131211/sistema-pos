"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { collection, query, onSnapshot, addDoc, updateDoc, doc, increment } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
  X,
  Filter,
  Clock,
  Package,
  Wifi,
  WifiOff,
} from "lucide-react"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  price: number
  category: string
  image?: string
  stock: number
  isActive: boolean
}

interface CartItem extends Product {
  quantity: number
  paymentMethod: "efectivo" | "tarjeta" | "yape"
}

interface Sale {
  id: string
  items: CartItem[]
  total: number
  timestamp: any
  userId: string
  userName: string
  paymentMethods: { [key: string]: number }
}

export default function SalesPage() {
  const [user] = useAuthState(auth)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showCart, setShowCart] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isOnline, setIsOnline] = useState(true)
  const [cashRegisterOpen, setCashRegisterOpen] = useState(true)

  // Cargar productos
  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, "products")), (snapshot) => {
      const productsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[]
      setProducts(productsData.filter((p) => p.isActive))
    })

    return () => unsubscribe()
  }, [])

  // Monitor de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
      return matchesSearch && matchesCategory && product.stock > 0
    })
  }, [products, searchTerm, selectedCategory])

  // Obtener categorías únicas
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.map((p) => p.category))]
    return uniqueCategories.sort()
  }, [products])

  // Agregar al carrito
  const addToCart = useCallback((product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id)
      if (existingItem) {
        return prevCart.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
      } else {
        return [...prevCart, { ...product, quantity: 1, paymentMethod: "efectivo" }]
      }
    })
    toast.success(`${product.name} agregado al carrito`)
  }, [])

  // Actualizar cantidad
  const updateQuantity = useCallback((productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
      return
    }

    setCart((prevCart) => prevCart.map((item) => (item.id === productId ? { ...item, quantity: newQuantity } : item)))
  }, [])

  // Remover del carrito
  const removeFromCart = useCallback((productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId))
  }, [])

  // Actualizar método de pago
  const updatePaymentMethod = useCallback((productId: string, paymentMethod: "efectivo" | "tarjeta" | "yape") => {
    setCart((prevCart) => prevCart.map((item) => (item.id === productId ? { ...item, paymentMethod } : item)))
  }, [])

  // Limpiar carrito
  const clearCart = useCallback(() => {
    setCart([])
    toast.success("Carrito limpiado")
  }, [])

  // Aplicar promoción 10+1
  const applyPromotion = useCallback((items: CartItem[]) => {
    return items.map((item) => {
      if (item.quantity >= 10) {
        const freeItems = Math.floor(item.quantity / 10)
        return { ...item, quantity: item.quantity + freeItems }
      }
      return item
    })
  }, [])

  // Calcular total
  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => {
      const originalQuantity = item.quantity >= 10 ? item.quantity - Math.floor(item.quantity / 11) : item.quantity
      return total + item.price * originalQuantity
    }, 0)
  }, [cart])

  // Procesar venta
  const processSale = async () => {
    if (cart.length === 0) {
      toast.error("El carrito está vacío")
      return
    }

    if (!cashRegisterOpen) {
      toast.error("La caja registradora está cerrada")
      return
    }

    setIsProcessing(true)

    try {
      const itemsWithPromotion = applyPromotion(cart)

      // Calcular métodos de pago
      const paymentMethods = cart.reduce(
        (acc, item) => {
          const originalQuantity = item.quantity >= 10 ? item.quantity - Math.floor(item.quantity / 11) : item.quantity
          const itemTotal = item.price * originalQuantity
          acc[item.paymentMethod] = (acc[item.paymentMethod] || 0) + itemTotal
          return acc
        },
        {} as { [key: string]: number },
      )

      // Crear venta
      const saleData = {
        items: itemsWithPromotion.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          paymentMethod: item.paymentMethod,
          category: item.category,
        })),
        total: cartTotal,
        timestamp: new Date(),
        userId: user?.uid || "",
        userName: user?.displayName || user?.email || "Usuario",
        paymentMethods,
        cashRegisterOpen: true,
      }

      // Guardar venta
      await addDoc(collection(db, "sales"), saleData)

      // Actualizar stock
      for (const item of cart) {
        const originalQuantity = item.quantity >= 10 ? item.quantity - Math.floor(item.quantity / 11) : item.quantity
        await updateDoc(doc(db, "products", item.id), {
          stock: increment(-originalQuantity),
        })
      }

      // Imprimir ticket
      printTicket(itemsWithPromotion, cartTotal, paymentMethods)

      // Limpiar carrito
      clearCart()
      setShowCart(false)

      toast.success("¡Venta procesada exitosamente!")
    } catch (error) {
      console.error("Error processing sale:", error)
      toast.error("Error al procesar la venta")
    } finally {
      setIsProcessing(false)
    }
  }

  // Imprimir ticket
  const printTicket = (items: CartItem[], total: number, paymentMethods: { [key: string]: number }) => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const ticketHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket de Venta</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              font-size: 12px; 
              margin: 0; 
              padding: 20px;
              line-height: 1.4;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .logo { 
              font-size: 18px; 
              font-weight: bold; 
              margin-bottom: 5px;
            }
            .info { 
              margin-bottom: 15px; 
              font-size: 11px;
            }
            .items { 
              margin-bottom: 15px; 
            }
            .item { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 8px;
              padding: 5px 0;
              border-bottom: 1px dotted #ccc;
            }
            .item-name { 
              flex: 1; 
              font-weight: bold;
            }
            .item-details {
              font-size: 10px;
              color: #666;
              margin-top: 2px;
            }
            .item-price { 
              font-weight: bold; 
            }
            .total { 
              border-top: 2px solid #000; 
              padding-top: 10px; 
              font-size: 14px; 
              font-weight: bold;
              text-align: right;
            }
            .payment-methods {
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px solid #ccc;
            }
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              font-size: 10px;
              border-top: 1px solid #ccc;
              padding-top: 10px;
            }
            .promotion {
              color: #e74c3c;
              font-weight: bold;
              font-size: 10px;
            }
            @media print {
              body { margin: 0; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🎠 SANCHEZ PARK 🎠</div>
            <div>Sistema de Ventas en Línea</div>
          </div>
          
          <div class="info">
            <div><strong>Fecha:</strong> ${new Date().toLocaleString("es-PE")}</div>
            <div><strong>Vendedor:</strong> ${user?.displayName || user?.email || "Usuario"}</div>
            <div><strong>Ticket:</strong> #${Date.now().toString().slice(-6)}</div>
          </div>
          
          <div class="items">
            <div style="border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px;">
              <strong>PRODUCTOS</strong>
            </div>
            ${items
              .map((item) => {
                const originalQuantity =
                  item.quantity >= 10 ? item.quantity - Math.floor(item.quantity / 11) : item.quantity
                const freeItems = item.quantity >= 10 ? Math.floor(item.quantity / 11) : 0
                const subtotal = item.price * originalQuantity

                return `
                  <div class="item">
                    <div>
                      <div class="item-name">${item.name}</div>
                      <div class="item-details">
                        ${originalQuantity} x S/. ${item.price.toFixed(2)}
                        ${freeItems > 0 ? `<span class="promotion"> + ${freeItems} GRATIS</span>` : ""}
                      </div>
                      <div class="item-details">
                        Pago: ${item.paymentMethod.toUpperCase()}
                      </div>
                    </div>
                    <div class="item-price">S/. ${subtotal.toFixed(2)}</div>
                  </div>
                `
              })
              .join("")}
          </div>
          
          <div class="payment-methods">
            <div style="font-weight: bold; margin-bottom: 5px;">MÉTODOS DE PAGO:</div>
            ${Object.entries(paymentMethods)
              .map(([method, amount]) => `<div>${method.toUpperCase()}: S/. ${amount.toFixed(2)}</div>`)
              .join("")}
          </div>
          
          <div class="total">
            TOTAL: S/. ${total.toFixed(2)}
          </div>
          
          <div class="footer">
            <div>¡Gracias por su compra!</div>
            <div>Promoción: Por cada 10 productos, 1 GRATIS</div>
            <div>www.sanchezpark.com</div>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(ticketHTML)
    printWindow.document.close()
    printWindow.print()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex">
        {/* Contenido principal */}
        <div className="flex-1 ml-16">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="h-6 w-6 text-purple-600" />
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Caja Registradora</h1>
                </div>
                <Badge variant={cashRegisterOpen ? "default" : "destructive"}>
                  {cashRegisterOpen ? "Caja Abierta" : "Caja Cerrada"}
                </Badge>
                <Badge variant={isOnline ? "default" : "destructive"}>
                  {isOnline ? (
                    <>
                      <Wifi className="h-3 w-3 mr-1" />
                      En línea
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3 w-3 mr-1" />
                      Sin conexión
                    </>
                  )}
                </Badge>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date().toLocaleDateString("es-PE")} - {new Date().toLocaleTimeString("es-PE")}
                </div>
                <Button
                  onClick={() => setShowCart(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white relative"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Carrito ({cart.length})
                  {cart.length > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2" />
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

          {/* Grid de productos */}
          <div className="p-4">
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow bg-white dark:bg-gray-800"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-4">
                      <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 overflow-hidden">
                        {product.image ? (
                          <img
                            src={product.image || "/placeholder.svg"}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">{product.name}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-purple-600">S/. {product.price.toFixed(2)}</span>
                        <Badge variant="secondary" className="text-xs">
                          Stock: {product.stock}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="mt-2 text-xs">
                        {product.category}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredProducts.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">No se encontraron productos</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Carrito lateral en desktop */}
        <div className="hidden lg:block w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 h-screen sticky top-0">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Carrito de Compras</h2>
              <Badge variant="secondary">{cart.length} productos</Badge>
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-300px)] p-4">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Carrito vacío</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Agrega productos y procesa ventas rápidamente
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => {
                  const originalQuantity =
                    item.quantity >= 10 ? item.quantity - Math.floor(item.quantity / 11) : item.quantity
                  const freeItems = item.quantity >= 10 ? Math.floor(item.quantity / 11) : 0

                  return (
                    <Card key={item.id} className="p-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          {item.image ? (
                            <img
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
                            {item.name}
                          </h4>
                          <p className="text-sm text-purple-600 font-semibold">S/. {item.price.toFixed(2)}</p>
                          {freeItems > 0 && <p className="text-xs text-green-600 font-medium">¡{freeItems} GRATIS!</p>}

                          <div className="flex items-center space-x-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
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

                          <Select
                            value={item.paymentMethod}
                            onValueChange={(value: "efectivo" | "tarjeta" | "yape") =>
                              updatePaymentMethod(item.id, value)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="efectivo">
                                <div className="flex items-center space-x-2">
                                  <Banknote className="h-3 w-3" />
                                  <span>Efectivo</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="tarjeta">
                                <div className="flex items-center space-x-2">
                                  <CreditCard className="h-3 w-3" />
                                  <span>Tarjeta</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="yape">
                                <div className="flex items-center space-x-2">
                                  <Smartphone className="h-3 w-3" />
                                  <span>Yape</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {cart.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 dark:text-white">Total:</span>
                  <span className="text-xl font-bold text-purple-600">S/. {cartTotal.toFixed(2)}</span>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={clearCart} variant="outline" className="flex-1 bg-transparent" size="sm">
                    <X className="h-4 w-4 mr-1" />
                    Limpiar
                  </Button>
                  <Button
                    onClick={processSale}
                    disabled={isProcessing || !cashRegisterOpen}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    {isProcessing ? (
                      <>
                        <Clock className="h-4 w-4 mr-1 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Receipt className="h-4 w-4 mr-1" />
                        Procesar Venta
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal del carrito para móvil */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-md max-h-[90vh] lg:hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Carrito de Compras</span>
              <Badge variant="secondary">{cart.length} productos</Badge>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-96">
            {cart.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Carrito vacío</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => {
                  const originalQuantity =
                    item.quantity >= 10 ? item.quantity - Math.floor(item.quantity / 11) : item.quantity
                  const freeItems = item.quantity >= 10 ? Math.floor(item.quantity / 11) : 0

                  return (
                    <Card key={item.id} className="p-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          {item.image ? (
                            <img
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">{item.name}</h4>
                          <p className="text-sm text-purple-600 font-semibold">S/. {item.price.toFixed(2)}</p>
                          {freeItems > 0 && <p className="text-xs text-green-600 font-medium">¡{freeItems} GRATIS!</p>}

                          <div className="flex items-center space-x-2 mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="h-6 w-6 p-0"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="h-6 w-6 p-0"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => removeFromCart(item.id)}
                              className="h-6 w-6 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          <Select
                            value={item.paymentMethod}
                            onValueChange={(value: "efectivo" | "tarjeta" | "yape") =>
                              updatePaymentMethod(item.id, value)
                            }
                          >
                            <SelectTrigger className="h-7 text-xs mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="efectivo">Efectivo</SelectItem>
                              <SelectItem value="tarjeta">Tarjeta</SelectItem>
                              <SelectItem value="yape">Yape</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </ScrollArea>

          {cart.length > 0 && (
            <div className="pt-4 border-t">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total:</span>
                  <span className="text-xl font-bold text-purple-600">S/. {cartTotal.toFixed(2)}</span>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={clearCart} variant="outline" className="flex-1 bg-transparent" size="sm">
                    <X className="h-4 w-4 mr-1" />
                    Limpiar
                  </Button>
                  <Button
                    onClick={processSale}
                    disabled={isProcessing || !cashRegisterOpen}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    {isProcessing ? (
                      <>
                        <Clock className="h-4 w-4 mr-1 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Receipt className="h-4 w-4 mr-1" />
                        Procesar Venta
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
