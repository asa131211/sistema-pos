"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, orderBy, getDocs } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Calendar,
  Download,
  Filter,
  Users,
  Package,
  Gift,
} from "lucide-react"
import { toast } from "sonner"

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
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState("today")
  const [paymentFilter, setPaymentFilter] = useState("all")
  const [sellerFilter, setSellerFilter] = useState("all")
  const [specificDate, setSpecificDate] = useState("")

  useEffect(() => {
    console.log("🔍 Iniciando carga de reportes...")
    setLoading(true)

    try {
      // Cargar usuarios para el filtro
      const loadUsers = async () => {
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setUsers(usersData)
      }
      loadUsers()

      // Crear consulta base sin filtros complejos primero
      const salesQuery = query(collection(db, "sales"), orderBy("timestamp", "desc"))

      console.log("📊 Configurando listener de ventas...")

      const unsubscribe = onSnapshot(
        salesQuery,
        (snapshot) => {
          console.log(`📄 Documentos recibidos: ${snapshot.docs.length}`)

          const salesData = snapshot.docs.map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              ...data,
            }
          }) as Sale[]

          // Aplicar filtros en el cliente
          let filteredSales = salesData

          // Filtro de fecha
          if (dateFilter === "today") {
            const today = new Date().toISOString().split("T")[0]
            filteredSales = filteredSales.filter((sale) => sale.date === today)
          } else if (dateFilter === "yesterday") {
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            const yesterdayStr = yesterday.toISOString().split("T")[0]
            filteredSales = filteredSales.filter((sale) => sale.date === yesterdayStr)
          } else if (dateFilter === "week") {
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            filteredSales = filteredSales.filter((sale) => {
              const saleDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.timestamp)
              return saleDate >= weekAgo
            })
          } else if (dateFilter === "month") {
            const monthAgo = new Date()
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            filteredSales = filteredSales.filter((sale) => {
              const saleDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.timestamp)
              return saleDate >= monthAgo
            })
          } else if (dateFilter === "specific" && specificDate) {
            filteredSales = filteredSales.filter((sale) => sale.date === specificDate)
          }

          // Filtro de método de pago
          if (paymentFilter !== "all") {
            filteredSales = filteredSales.filter((sale) => sale.paymentMethod === paymentFilter)
          }

          // Filtro de vendedor
          if (sellerFilter !== "all") {
            filteredSales = filteredSales.filter((sale) => sale.sellerId === sellerFilter)
          }

          console.log(`✅ Total ventas filtradas: ${filteredSales.length}`)
          setSales(filteredSales)
          setLoading(false)
        },
        (error) => {
          console.error("❌ Error cargando ventas:", error)
          toast.error("Error al cargar los reportes: " + error.message)
          setLoading(false)
        },
      )

      return () => unsubscribe()
    } catch (error) {
      console.error("❌ Error configurando consulta:", error)
      toast.error("Error al configurar los reportes")
      setLoading(false)
    }
  }, [dateFilter, paymentFilter, sellerFilter, specificDate])

  // Calcular estadísticas por vendedor
  const getSellerStats = () => {
    const sellerStats = {}

    sales.forEach((sale) => {
      const sellerId = sale.sellerId
      const sellerName = users.find((u) => u.id === sellerId)?.name || sale.sellerEmail

      if (!sellerStats[sellerId]) {
        sellerStats[sellerId] = {
          name: sellerName,
          email: sale.sellerEmail,
          totalSales: 0,
          cashSales: 0,
          transferSales: 0,
          totalTransactions: 0,
          promotions: 0,
          sales: [],
        }
      }

      sellerStats[sellerId].totalSales += sale.total
      sellerStats[sellerId].totalTransactions += 1
      sellerStats[sellerId].sales.push(sale)

      if (sale.paymentMethod === "efectivo") {
        sellerStats[sellerId].cashSales += sale.total
      } else {
        sellerStats[sellerId].transferSales += sale.total
      }

      if (sale.promotion?.hasPromotion) {
        sellerStats[sellerId].promotions += 1
      }
    })

    return Object.values(sellerStats)
  }

  // Calcular estadísticas generales
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0)
  const totalTransactions = sales.length
  const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0
  const cashSales = sales.filter((sale) => sale.paymentMethod === "efectivo").reduce((sum, sale) => sum + sale.total, 0)
  const transferSales = sales
    .filter((sale) => sale.paymentMethod === "transferencia")
    .reduce((sum, sale) => sum + sale.total, 0)

  // Productos más vendidos
  const productStats = sales.reduce(
    (acc, sale) => {
      sale.items.forEach((item) => {
        if (!acc[item.name]) {
          acc[item.name] = { quantity: 0, revenue: 0 }
        }
        acc[item.name].quantity += item.quantity
        acc[item.name].revenue += item.price * item.quantity
      })
      return acc
    },
    {} as Record<string, { quantity: number; revenue: number }>,
  )

  const topProducts = Object.entries(productStats)
    .sort(([, a], [, b]) => b.quantity - a.quantity)
    .slice(0, 5)

  const exportToCSV = () => {
    const headers = ["Fecha", "Vendedor", "Total", "Método de Pago", "Productos", "Promoción"]
    const csvData = sales.map((sale) => [
      new Date(sale.timestamp?.toDate?.() || sale.timestamp).toLocaleDateString("es-ES"),
      sale.sellerEmail,
      `S/. ${sale.total.toFixed(2)}`,
      sale.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia",
      sale.items.map((item) => `${item.name} (${item.quantity})`).join("; "),
      sale.promotion?.hasPromotion ? `Sí - ${sale.promotion.freeItems} gratis` : "No",
    ])

    const csvContent = [headers, ...csvData].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `reporte-ventas-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success("Reporte exportado exitosamente")
  }

  const sellerStats = getSellerStats()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 ml-16">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reportes</h1>
              <p className="text-gray-600 dark:text-gray-400">Análisis avanzado de ventas y rendimiento</p>
            </div>
            <Button onClick={exportToCSV} className="bg-purple-600 hover:bg-purple-700 text-white">
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900 dark:text-white">Filtros</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Período</Label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="border-gray-200 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="yesterday">Ayer</SelectItem>
                  <SelectItem value="week">Última semana</SelectItem>
                  <SelectItem value="month">Último mes</SelectItem>
                  <SelectItem value="specific">Fecha específica</SelectItem>
                  <SelectItem value="all">Todos los tiempos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateFilter === "specific" && (
              <div>
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Fecha Específica
                </Label>
                <Input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="border-gray-200 dark:border-gray-600"
                />
              </div>
            )}

            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Método de Pago</Label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="border-gray-200 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Vendedor</Label>
              <Select value={sellerFilter} onValueChange={setSellerFilter}>
                <SelectTrigger className="border-gray-200 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los vendedores</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Total Vendido</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800 dark:text-green-200">S/. {totalSales.toFixed(2)}</div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                Total de ingresos
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900 dark:to-cyan-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Transacciones</CardTitle>
              <ShoppingCart className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">{totalTransactions}</div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                <BarChart3 className="h-3 w-3 inline mr-1" />
                Ventas realizadas
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900 dark:to-pink-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Ticket Promedio
              </CardTitle>
              <Calendar className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                S/. {averageTicket.toFixed(2)}
              </div>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                <TrendingUp className="h-3 w-3 inline mr-1" />
                Por transacción
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900 dark:to-red-900">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Productos Vendidos
              </CardTitle>
              <Package className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                {sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)}
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                <Package className="h-3 w-3 inline mr-1" />
                Unidades totales
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas por Vendedor */}
        {sellerFilter === "all" && sellerStats.length > 0 && (
          <Card className="border-0 shadow-sm bg-white dark:bg-gray-800 mb-8">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Rendimiento por Vendedor
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Estadísticas individuales de cada vendedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sellerStats.map((seller: any) => (
                  <div key={seller.email} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <Users className="h-5 w-5 text-purple-600" />
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{seller.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{seller.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {seller.promotions > 0 && (
                          <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                            <Gift className="h-3 w-3 mr-1" />
                            {seller.promotions} promociones
                          </Badge>
                        )}
                        <Badge variant="outline">{seller.totalTransactions} ventas</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Total Vendido</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          S/. {seller.totalSales.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                        <p className="text-sm text-green-600 dark:text-green-400">Efectivo</p>
                        <p className="text-lg font-bold text-green-700 dark:text-green-300">
                          S/. {seller.cashSales.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                        <p className="text-sm text-blue-600 dark:text-blue-400">Transferencia</p>
                        <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                          S/. {seller.transferSales.toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                        <p className="text-sm text-purple-600 dark:text-purple-400">Promedio</p>
                        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                          S/. {(seller.totalSales / seller.totalTransactions).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Detalle de ventas del vendedor */}
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">Últimas Ventas</h5>
                      <div className="max-h-40 overflow-y-auto">
                        <div className="space-y-2">
                          {seller.sales.slice(0, 5).map((sale: Sale) => (
                            <div
                              key={sale.id}
                              className="flex justify-between items-center text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="text-gray-600 dark:text-gray-400">
                                  {new Date(sale.timestamp?.toDate?.() || sale.timestamp).toLocaleDateString("es-ES")}
                                </span>
                                {sale.promotion?.hasPromotion && (
                                  <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs">
                                    <Gift className="h-2 w-2 mr-1" />
                                    Promoción
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge
                                  className={
                                    sale.paymentMethod === "efectivo"
                                      ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                                      : "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                                  }
                                >
                                  {sale.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia"}
                                </Badge>
                                <span className="font-bold text-green-600">S/. {sale.total.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Payment Methods */}
          <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Métodos de Pago</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Distribución de ventas por método de pago
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-gray-900 dark:text-white">Efectivo</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">S/. {cashSales.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {totalSales > 0 ? ((cashSales / totalSales) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-medium text-gray-900 dark:text-white">Transferencia</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">S/. {transferSales.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {totalSales > 0 ? ((transferSales / totalSales) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                Productos Más Vendidos
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Top 5 productos por cantidad vendida
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topProducts.map(([productName, stats], index) => (
                  <div
                    key={productName}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl"
                  >
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700">
                        #{index + 1}
                      </Badge>
                      <span className="font-medium text-gray-900 dark:text-white truncate">{productName}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900 dark:text-white">{stats.quantity} unidades</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">S/. {stats.revenue.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
                {topProducts.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                    <p>No hay datos de productos</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Table */}
        <Card className="border-0 shadow-sm bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Historial de Ventas</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Detalle completo de todas las transacciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
                <p className="text-gray-500 dark:text-gray-400">Cargando reportes...</p>
              </div>
            ) : sales.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p>No hay ventas para mostrar</p>
                <p className="text-sm">Ajusta los filtros o realiza algunas ventas</p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-900 dark:text-white">Fecha</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">Vendedor</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">Productos</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">Método</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">Promoción</TableHead>
                      <TableHead className="text-right text-gray-900 dark:text-white">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          {new Date(sale.timestamp?.toDate?.() || sale.timestamp).toLocaleDateString("es-ES")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span className="truncate text-gray-900 dark:text-white">{sale.sellerEmail}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {sale.items.map((item, index) => (
                              <div key={index} className="text-sm text-gray-900 dark:text-white">
                                {item.name} x{item.quantity}
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              sale.paymentMethod === "efectivo"
                                ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700"
                                : "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700"
                            }
                          >
                            {sale.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sale.promotion?.hasPromotion ? (
                            <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700">
                              <Gift className="h-3 w-3 mr-1" />
                              {sale.promotion.freeItems} gratis
                            </Badge>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          S/. {sale.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
