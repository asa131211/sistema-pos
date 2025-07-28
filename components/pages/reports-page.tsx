"use client"

import { useState, useEffect } from "react"
import { collection, query, where, orderBy, getDocs } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  CalendarIcon,
  Download,
  Package,
  Clock,
  Gift,
} from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Sale {
  id: string
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
  }>
  total: number
  paymentMethod: string
  sellerId: string
  sellerEmail: string
  timestamp: any
  date: string
  promotion?: {
    totalItems: number
    freeItems: number
    totalTickets: number
    hasPromotion: boolean
  }
}

interface ReportsPageProps {
  sidebarCollapsed?: boolean
}

export default function ReportsPage({ sidebarCollapsed = false }: ReportsPageProps) {
  const [user] = useAuthState(auth)
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("today")
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showCalendar, setShowCalendar] = useState(false)

  useEffect(() => {
    const loadSales = async () => {
      if (!user) return

      setLoading(true)
      try {
        let salesQuery

        const today = new Date().toISOString().split("T")[0]
        const startOfWeek = new Date()
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
        const weekStart = startOfWeek.toISOString().split("T")[0]

        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        const monthStart = startOfMonth.toISOString().split("T")[0]

        switch (selectedPeriod) {
          case "today":
            salesQuery = query(collection(db, "sales"), where("date", "==", today), orderBy("timestamp", "desc"))
            break
          case "week":
            salesQuery = query(
              collection(db, "sales"),
              where("date", ">=", weekStart),
              orderBy("date", "desc"),
              orderBy("timestamp", "desc"),
            )
            break
          case "month":
            salesQuery = query(
              collection(db, "sales"),
              where("date", ">=", monthStart),
              orderBy("date", "desc"),
              orderBy("timestamp", "desc"),
            )
            break
          case "custom":
            const customDate = selectedDate.toISOString().split("T")[0]
            salesQuery = query(collection(db, "sales"), where("date", "==", customDate), orderBy("timestamp", "desc"))
            break
          default:
            salesQuery = query(collection(db, "sales"), orderBy("timestamp", "desc"))
        }

        console.log("🔄 Cargando ventas para período:", selectedPeriod)
        const salesSnapshot = await getDocs(salesQuery)
        const salesData = salesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Sale[]

        console.log("✅ Ventas cargadas:", salesData.length)
        setSales(salesData)
      } catch (error) {
        console.error("❌ Error loading sales:", error)
      } finally {
        setLoading(false)
      }
    }

    loadSales()
  }, [user, selectedPeriod, selectedDate])

  // Calcular estadísticas
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0)
  const totalTransactions = sales.length
  const totalItems = sales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  )
  const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0

  const cashSales = sales.filter((sale) => sale.paymentMethod === "efectivo").reduce((sum, sale) => sum + sale.total, 0)
  const transferSales = sales
    .filter((sale) => sale.paymentMethod === "transferencia")
    .reduce((sum, sale) => sum + sale.total, 0)

  const topProducts = sales
    .flatMap((sale) => sale.items)
    .reduce((acc: any, item) => {
      const existing = acc.find((p: any) => p.id === item.id)
      if (existing) {
        existing.quantity += item.quantity
        existing.total += item.price * item.quantity
      } else {
        acc.push({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          total: item.price * item.quantity,
        })
      }
      return acc
    }, [])
    .sort((a: any, b: any) => b.quantity - a.quantity)
    .slice(0, 5)

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 ml-16">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Reportes de Ventas</h1>
                <p className="text-gray-600">Análisis avanzado de ventas y rendimiento</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-48 h-10 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mes</SelectItem>
                  <SelectItem value="custom">Fecha Personalizada</SelectItem>
                  <SelectItem value="all">Todos los Datos</SelectItem>
                </SelectContent>
              </Select>

              {selectedPeriod === "custom" && (
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-10 px-3 border-gray-200 hover:bg-gray-50 rounded-xl bg-transparent"
                    >
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(selectedDate, "PPP", { locale: es })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date)
                          setShowCalendar(false)
                        }
                      }}
                      disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}

              <Button
                variant="outline"
                className="h-10 px-4 border-gray-200 hover:bg-gray-50 rounded-xl bg-transparent"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Vendido</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">S/. {totalSales.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">{totalTransactions} transacciones</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Ticket Promedio</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">S/. {averageTicket.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">Por transacción</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Items Vendidos</CardTitle>
              <Package className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{totalItems}</div>
              <p className="text-xs text-gray-500 mt-1">Productos totales</p>
            </CardContent>
          </Card>

          <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Transacciones</CardTitle>
              <ShoppingCart className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{totalTransactions}</div>
              <p className="text-xs text-gray-500 mt-1">Ventas procesadas</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Métodos de pago */}
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Métodos de Pago</CardTitle>
              <CardDescription className="text-gray-600">Distribución por tipo de pago</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-gray-900">Efectivo</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">S/. {cashSales.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">
                    {totalSales > 0 ? ((cashSales / totalSales) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium text-gray-900">Transferencia</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600">S/. {transferSales.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">
                    {totalSales > 0 ? ((transferSales / totalSales) * 100).toFixed(1) : 0}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Productos más vendidos */}
          <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">Productos Más Vendidos</CardTitle>
              <CardDescription className="text-gray-600">Top 5 productos por cantidad</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center space-x-3">
                        <Badge
                          variant="secondary"
                          className="w-6 h-6 rounded-full p-0 flex items-center justify-center text-xs"
                        >
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.quantity} unidades</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600 text-sm">S/. {product.total.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                  {topProducts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No hay datos de productos</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Lista de ventas recientes */}
        <Card className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Ventas Recientes</CardTitle>
            <CardDescription className="text-gray-600">Historial detallado de transacciones</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <img src="/loading-wheel.gif" alt="Cargando..." className="w-8 h-8 mx-auto mb-3" />
                <p className="text-gray-500">Cargando ventas...</p>
              </div>
            ) : sales.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay ventas para el período seleccionado</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {sales.map((sale) => (
                    <div key={sale.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="text-xs">
                            #{sale.id.slice(-6)}
                          </Badge>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Clock className="h-3 w-3" />
                            <span>
                              {sale.timestamp?.toDate
                                ? sale.timestamp.toDate().toLocaleString("es-ES")
                                : new Date(sale.timestamp).toLocaleString("es-ES")}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">S/. {sale.total.toFixed(2)}</div>
                          <Badge
                            variant={sale.paymentMethod === "efectivo" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {sale.paymentMethod === "efectivo" ? "💵 Efectivo" : "💳 Transferencia"}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {sale.items.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">
                              {item.name} x{item.quantity}
                            </span>
                            <span className="font-medium text-gray-900">
                              S/. {(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {sale.promotion?.hasPromotion && (
                        <div className="mt-3 p-2 bg-green-100 rounded-lg border border-green-200">
                          <div className="flex items-center space-x-2 text-sm text-green-700">
                            <Gift className="h-3 w-3" />
                            <span className="font-medium">
                              Promoción 10+1: {sale.promotion.freeItems} tickets gratis
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
                        <span>Vendedor: {sale.sellerEmail}</span>
                        <span>Items: {sale.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
