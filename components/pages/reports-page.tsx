"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Users, Gift, Filter } from "lucide-react"

interface Sale {
  id: string
  items: any[]
  total: number
  cashTotal?: number
  transferTotal?: number
  paymentMethod?: string
  sellerId: string
  sellerEmail: string
  timestamp: any
  date: string
  promotion?: {
    hasPromotion: boolean
    freeItems: number
    totalItems: number
    totalTickets: number
  }
}

interface User {
  id: string
  email: string
  displayName?: string
  role: string
}

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedSeller, setSelectedSeller] = useState("all")
  const [selectedDate, setSelectedDate] = useState("today")
  const [customDate, setCustomDate] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Cargar usuarios
    const unsubscribeUsers = onSnapshot(query(collection(db, "users")), (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as User[]
      setUsers(usersData)
    })

    return () => unsubscribeUsers()
  }, [])

  useEffect(() => {
    setLoading(true)

    let salesQuery = query(collection(db, "sales"), orderBy("timestamp", "desc"))

    // Filtrar por fecha
    if (selectedDate !== "all") {
      let startDate: Date
      let endDate: Date

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      switch (selectedDate) {
        case "today":
          startDate = new Date(today)
          endDate = new Date(today)
          endDate.setHours(23, 59, 59, 999)
          break
        case "yesterday":
          startDate = new Date(today)
          startDate.setDate(today.getDate() - 1)
          endDate = new Date(startDate)
          endDate.setHours(23, 59, 59, 999)
          break
        case "week":
          startDate = new Date(today)
          startDate.setDate(today.getDate() - 7)
          endDate = new Date(today)
          endDate.setHours(23, 59, 59, 999)
          break
        case "month":
          startDate = new Date(today.getFullYear(), today.getMonth(), 1)
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          endDate.setHours(23, 59, 59, 999)
          break
        case "custom":
          if (customDate) {
            startDate = new Date(customDate)
            startDate.setHours(0, 0, 0, 0)
            endDate = new Date(customDate)
            endDate.setHours(23, 59, 59, 999)
          } else {
            startDate = today
            endDate = new Date(today)
            endDate.setHours(23, 59, 59, 999)
          }
          break
        default:
          startDate = today
          endDate = new Date(today)
          endDate.setHours(23, 59, 59, 999)
      }

      salesQuery = query(
        collection(db, "sales"),
        where("timestamp", ">=", startDate),
        where("timestamp", "<=", endDate),
        orderBy("timestamp", "desc"),
      )
    }

    const unsubscribe = onSnapshot(salesQuery, (snapshot) => {
      const salesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Sale[]

      // Filtrar por vendedor si no es "all"
      const filteredSales =
        selectedSeller === "all" ? salesData : salesData.filter((sale) => sale.sellerId === selectedSeller)

      setSales(filteredSales)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [selectedDate, customDate, selectedSeller])

  // Calcular estadísticas generales
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0)
  const totalCash = sales.reduce((sum, sale) => {
    if (sale.cashTotal !== undefined) return sum + sale.cashTotal
    return sum + (sale.paymentMethod === "efectivo" ? sale.total : 0)
  }, 0)
  const totalTransfer = sales.reduce((sum, sale) => {
    if (sale.transferTotal !== undefined) return sum + sale.transferTotal
    return sum + (sale.paymentMethod === "transferencia" ? sale.total : 0)
  }, 0)
  const totalPromotions = sales.reduce((sum, sale) => sum + (sale.promotion?.freeItems || 0), 0)
  const totalItems = sales.reduce(
    (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  )

  // Estadísticas por vendedor (solo cuando se selecciona "all")
  const sellerStats =
    selectedSeller === "all"
      ? users
          .map((user) => {
            const userSales = sales.filter((sale) => sale.sellerId === user.id)
            const userTotal = userSales.reduce((sum, sale) => sum + sale.total, 0)
            const userCash = userSales.reduce((sum, sale) => {
              if (sale.cashTotal !== undefined) return sum + sale.cashTotal
              return sum + (sale.paymentMethod === "efectivo" ? sale.total : 0)
            }, 0)
            const userTransfer = userSales.reduce((sum, sale) => {
              if (sale.transferTotal !== undefined) return sum + sale.transferTotal
              return sum + (sale.paymentMethod === "transferencia" ? sale.total : 0)
            }, 0)
            const userPromotions = userSales.reduce((sum, sale) => sum + (sale.promotion?.freeItems || 0), 0)

            return {
              user,
              sales: userSales,
              total: userTotal,
              cash: userCash,
              transfer: userTransfer,
              promotions: userPromotions,
              salesCount: userSales.length,
            }
          })
          .filter((stat) => stat.salesCount > 0)
      : []

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    return user?.displayName || user?.email || "Usuario desconocido"
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 ml-16">
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Reportes de Ventas</h1>
            <p className="text-gray-600 dark:text-gray-400">Análisis detallado de las ventas y rendimiento</p>
          </div>
        </div>

        {/* Filtros */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-purple-600" />
              <span>Filtros</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtro de fecha */}
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={selectedDate} onValueChange={setSelectedDate}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Hoy</SelectItem>
                    <SelectItem value="yesterday">Ayer</SelectItem>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Este mes</SelectItem>
                    <SelectItem value="custom">Fecha específica</SelectItem>
                    <SelectItem value="all">Todas las fechas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha personalizada */}
              {selectedDate === "custom" && (
                <div className="space-y-2">
                  <Label>Fecha específica</Label>
                  <Input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    className="bg-white dark:bg-gray-700"
                  />
                </div>
              )}

              {/* Filtro de vendedor */}
              <div className="space-y-2">
                <Label>Vendedor</Label>
                <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los usuarios</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.displayName || user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Ventas</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">S/. {totalSales.toFixed(2)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Efectivo</p>
                  <p className="text-2xl font-bold text-green-600">S/. {totalCash.toFixed(2)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Transferencias</p>
                  <p className="text-2xl font-bold text-blue-600">S/. {totalTransfer.toFixed(2)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Promociones</p>
                  <p className="text-2xl font-bold text-purple-600">{totalPromotions}</p>
                </div>
                <Gift className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas por vendedor (solo cuando se muestra "todos los usuarios") */}
        {selectedSeller === "all" && sellerStats.length > 0 && (
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-600" />
                <span>Estadísticas por Vendedor</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sellerStats.map((stat) => (
                  <div key={stat.user.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {stat.user.displayName || stat.user.email}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{stat.salesCount} ventas realizadas</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300"
                      >
                        S/. {stat.total.toFixed(2)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400">Efectivo</p>
                        <p className="font-bold text-green-600">S/. {stat.cash.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400">Transferencia</p>
                        <p className="font-bold text-blue-600">S/. {stat.transfer.toFixed(2)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400">Promociones</p>
                        <p className="font-bold text-purple-600">{stat.promotions} tickets</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600 dark:text-gray-400">Ventas</p>
                        <p className="font-bold text-gray-900 dark:text-white">{stat.salesCount}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de ventas */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="h-5 w-5 text-purple-600" />
                <span>Historial de Ventas</span>
              </div>
              <Badge variant="secondary">{sales.length} ventas</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {loading ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                  Cargando ventas...
                </div>
              ) : sales.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p>No hay ventas en el período seleccionado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sales.map((sale) => (
                    <div key={sale.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">Venta #{sale.id.slice(-6)}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {getUserName(sale.sellerId)} •{" "}
                              {new Date(sale.timestamp?.toDate()).toLocaleString("es-ES")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">S/. {sale.total.toFixed(2)}</p>
                          <div className="flex items-center space-x-2">
                            {sale.cashTotal !== undefined ? (
                              <>
                                {sale.cashTotal > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs"
                                  >
                                    💵 S/. {sale.cashTotal.toFixed(2)}
                                  </Badge>
                                )}
                                {sale.transferTotal > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs"
                                  >
                                    💳 S/. {sale.transferTotal.toFixed(2)}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                {sale.paymentMethod === "efectivo" ? "💵 Efectivo" : "💳 Transferencia"}
                              </Badge>
                            )}
                            {sale.promotion?.hasPromotion && (
                              <Badge
                                variant="secondary"
                                className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs"
                              >
                                🎁 +{sale.promotion.freeItems}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="space-y-2">
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 text-sm">Productos:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {sale.items.map((item, index) => (
                            <div key={index} className="flex justify-between items-center text-sm">
                              <span className="text-gray-600 dark:text-gray-400">
                                {item.name} x{item.quantity}
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                S/. {(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {sale.promotion?.hasPromotion && (
                        <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <p className="text-sm text-green-700 dark:text-green-300 text-center">
                            🎁 Promoción 10+1: {sale.promotion.freeItems} tickets gratis
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
