"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { DollarSign, Download, TrendingUp, Clock, Award } from "lucide-react"
import { toast } from "sonner"

interface Sale {
  id: string
  items: any[]
  total: number
  paymentMethod: string
  sellerId: string
  sellerEmail: string
  timestamp: any
}

interface Seller {
  id: string
  name: string
  email: string
  role: string
}

export default function ReportsPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [users, setUsers] = useState<Seller[]>([])
  const [selectedSeller, setSelectedSeller] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("today")

  useEffect(() => {
    // Escuchar ventas
    const unsubscribeSales = onSnapshot(query(collection(db, "sales"), orderBy("timestamp", "desc")), (snapshot) => {
      const salesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Sale[]
      setSales(salesData)
    })

    // Escuchar usuarios
    const unsubscribeUsers = onSnapshot(query(collection(db, "users")), (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Seller[]
      setUsers(usersData)
    })

    return () => {
      unsubscribeSales()
      unsubscribeUsers()
    }
  }, [])

  const getFilteredSales = () => {
    let filtered = sales

    // Filtrar por fecha
    const now = new Date()
    if (dateFilter === "today") {
      const today = now.toDateString()
      filtered = filtered.filter((sale) => new Date(sale.timestamp.toDate()).toDateString() === today)
    } else if (dateFilter === "yesterday") {
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const yesterdayStr = yesterday.toDateString()
      filtered = filtered.filter((sale) => new Date(sale.timestamp.toDate()).toDateString() === yesterdayStr)
    } else if (dateFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter((sale) => new Date(sale.timestamp.toDate()) >= weekAgo)
    } else if (dateFilter === "month") {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter((sale) => new Date(sale.timestamp.toDate()) >= monthAgo)
    }

    // Filtrar por vendedor
    if (selectedSeller !== "all") {
      filtered = filtered.filter((sale) => sale.sellerId === selectedSeller)
    }

    return filtered
  }

  // NUEVO: Productos más vendidos
  const getTopProducts = () => {
    const filteredSales = getFilteredSales()
    const productStats = {}

    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        if (!productStats[item.name]) {
          productStats[item.name] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
            sales: 0,
          }
        }
        productStats[item.name].quantity += item.quantity
        productStats[item.name].revenue += item.price * item.quantity
        productStats[item.name].sales += 1
      })
    })

    return Object.values(productStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
  }

  // NUEVO: Horarios pico de ventas
  const getHourlyStats = () => {
    const filteredSales = getFilteredSales()
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, "0")}:00`,
      sales: 0,
      revenue: 0,
    }))

    filteredSales.forEach((sale) => {
      const hour = new Date(sale.timestamp.toDate()).getHours()
      hourlyData[hour].sales += 1
      hourlyData[hour].revenue += sale.total
    })

    return hourlyData.filter((data) => data.sales > 0)
  }

  // NUEVO: Comparación con período anterior
  const getComparison = () => {
    const now = new Date()
    let currentPeriod = []
    let previousPeriod = []

    if (dateFilter === "today") {
      const today = now.toDateString()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString()

      currentPeriod = sales.filter((sale) => new Date(sale.timestamp.toDate()).toDateString() === today)
      previousPeriod = sales.filter((sale) => new Date(sale.timestamp.toDate()).toDateString() === yesterday)
    } else if (dateFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      currentPeriod = sales.filter((sale) => new Date(sale.timestamp.toDate()) >= weekAgo)
      previousPeriod = sales.filter((sale) => {
        const saleDate = new Date(sale.timestamp.toDate())
        return saleDate >= twoWeeksAgo && saleDate < weekAgo
      })
    }

    const currentTotal = currentPeriod.reduce((sum, sale) => sum + sale.total, 0)
    const previousTotal = previousPeriod.reduce((sum, sale) => sum + sale.total, 0)
    const change = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0

    return {
      current: currentTotal,
      previous: previousTotal,
      change: change,
      isPositive: change >= 0,
    }
  }

  // NUEVO: Exportar datos
  const exportToCSV = () => {
    const filteredSales = getFilteredSales()
    const csvData = [
      ["Fecha", "Vendedor", "Productos", "Método de Pago", "Total"],
      ...filteredSales.map((sale) => [
        new Date(sale.timestamp.toDate()).toLocaleString("es-ES"),
        users.find((u) => u.id === sale.sellerId)?.name || sale.sellerEmail,
        sale.items.map((item) => `${item.name} x${item.quantity}`).join("; "),
        sale.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia",
        `S/. ${sale.total.toFixed(2)}`,
      ]),
    ]

    const csvContent = csvData.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `reporte-ventas-${dateFilter}-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success("Reporte exportado exitosamente")
  }

  const getSellerStats = () => {
    const filteredSales = getFilteredSales()
    const sellerStats = {}

    filteredSales.forEach((sale) => {
      const sellerId = sale.sellerId
      if (!sellerStats[sellerId]) {
        const user = users.find((u) => u.id === sellerId)
        sellerStats[sellerId] = {
          name: user?.name || sale.sellerEmail,
          email: sale.sellerEmail,
          totalSales: 0,
          totalAmount: 0,
          cashAmount: 0,
          transferAmount: 0,
          salesCount: 0,
        }
      }

      sellerStats[sellerId].totalAmount += sale.total
      sellerStats[sellerId].salesCount += 1

      if (sale.paymentMethod === "efectivo") {
        sellerStats[sellerId].cashAmount += sale.total
      } else {
        sellerStats[sellerId].transferAmount += sale.total
      }
    })

    return Object.values(sellerStats)
  }

  const getPaymentMethodStats = () => {
    const filteredSales = getFilteredSales()
    const cash = filteredSales
      .filter((sale) => sale.paymentMethod === "efectivo")
      .reduce((sum, sale) => sum + sale.total, 0)

    const transfer = filteredSales
      .filter((sale) => sale.paymentMethod === "transferencia")
      .reduce((sum, sale) => sum + sale.total, 0)

    return { cash, transfer }
  }

  const getDailySalesData = () => {
    const filteredSales = getFilteredSales()
    const dailyData = {}

    filteredSales.forEach((sale) => {
      const date = new Date(sale.timestamp.toDate()).toLocaleDateString("es-ES")
      if (!dailyData[date]) {
        dailyData[date] = 0
      }
      dailyData[date] += sale.total
    })

    return Object.entries(dailyData)
      .map(([date, amount]) => ({
        date,
        amount,
      }))
      .slice(-7)
  }

  const filteredSales = getFilteredSales()
  const sellerStats = getSellerStats()
  const paymentStats = getPaymentMethodStats()
  const dailySalesData = getDailySalesData()
  const topProducts = getTopProducts()
  const hourlyStats = getHourlyStats()
  const comparison = getComparison()

  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reportes</h1>
          <p className="text-gray-600 dark:text-gray-400">Análisis avanzado de ventas y rendimiento</p>
        </div>
        <Button onClick={exportToCSV} className="flex items-center">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="yesterday">Ayer</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mes</SelectItem>
            <SelectItem value="all">Todo el Tiempo</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedSeller} onValueChange={setSelectedSeller}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los vendedores" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los Vendedores</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="productos">Productos</TabsTrigger>
          <TabsTrigger value="horarios">Horarios</TabsTrigger>
          <TabsTrigger value="comparacion">Comparación</TabsTrigger>
          <TabsTrigger value="por-vendedor">Vendedores</TabsTrigger>
          <TabsTrigger value="detalle">Detalle</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Tarjetas de resumen con comparación */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  S/. {filteredSales.reduce((sum, sale) => sum + sale.total, 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">{filteredSales.length} transacciones</p>
                {comparison.change !== 0 && (
                  <div
                    className={`flex items-center text-xs ${comparison.isPositive ? "text-green-600" : "text-red-600"}`}
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {comparison.isPositive ? "+" : ""}
                    {comparison.change.toFixed(1)}% vs período anterior
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Efectivo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">S/. {paymentStats.cash.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {filteredSales.filter((s) => s.paymentMethod === "efectivo").length} ventas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transferencias</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">S/. {paymentStats.transfer.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {filteredSales.filter((s) => s.paymentMethod === "transferencia").length} ventas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de ventas diarias */}
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Día</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`S/. ${value}`, "Ventas"]} />
                  <Bar dataKey="amount" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NUEVA PESTAÑA: Productos más vendidos */}
        <TabsContent value="productos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="mr-2 h-5 w-5" />
                  Top 10 Productos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div
                      key={product.name}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-gray-500">{product.quantity} unidades vendidas</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">S/. {product.revenue.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">{product.sales} ventas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución de Productos</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topProducts.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="quantity"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {topProducts.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* NUEVA PESTAÑA: Horarios pico */}
        <TabsContent value="horarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5" />
                Horarios Pico de Ventas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={hourlyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="sales" fill="#3b82f6" name="Número de Ventas" />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Ingresos (S/.)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {hourlyStats.slice(0, 3).map((hour, index) => (
              <Card key={hour.hour}>
                <CardContent className="p-4">
                  <div className="text-center">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <h3 className="font-semibold">{hour.hour}</h3>
                    <p className="text-2xl font-bold text-green-600">S/. {hour.revenue.toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{hour.sales} ventas</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* NUEVA PESTAÑA: Comparación */}
        <TabsContent value="comparacion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5" />
                Comparación con Período Anterior
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Período Actual</h3>
                  <p className="text-3xl font-bold text-blue-600">S/. {comparison.current.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">
                    {dateFilter === "today" ? "Hoy" : dateFilter === "week" ? "Esta Semana" : "Este Período"}
                  </p>
                </div>

                <div className="text-center p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Período Anterior</h3>
                  <p className="text-3xl font-bold text-gray-600">S/. {comparison.previous.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">
                    {dateFilter === "today" ? "Ayer" : dateFilter === "week" ? "Semana Anterior" : "Período Anterior"}
                  </p>
                </div>

                <div
                  className={`text-center p-6 rounded-lg ${comparison.isPositive ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}
                >
                  <h3 className="text-lg font-semibold mb-2">Cambio</h3>
                  <p className={`text-3xl font-bold ${comparison.isPositive ? "text-green-600" : "text-red-600"}`}>
                    {comparison.isPositive ? "+" : ""}
                    {comparison.change.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-600">{comparison.isPositive ? "Crecimiento" : "Disminución"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="por-vendedor" className="space-y-6">
          <div className="grid gap-6">
            {sellerStats.map((seller, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center">{seller.name}</CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{seller.email}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">S/. {seller.totalAmount.toFixed(2)}</div>
                      <p className="text-sm text-gray-600">Total Vendido</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{seller.salesCount}</div>
                      <p className="text-sm text-gray-600">Ventas</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">S/. {seller.cashAmount.toFixed(2)}</div>
                      <p className="text-sm text-gray-600">Efectivo</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">S/. {seller.transferAmount.toFixed(2)}</div>
                      <p className="text-sm text-gray-600">Transferencias</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="detalle" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Ventas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead>Método de Pago</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{new Date(sale.timestamp.toDate()).toLocaleString("es-ES")}</TableCell>
                      <TableCell>{users.find((u) => u.id === sale.sellerId)?.name || sale.sellerEmail}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {sale.items.map((item, index) => (
                            <div key={index} className="text-sm">
                              {item.name} x{item.quantity}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={sale.paymentMethod === "efectivo" ? "default" : "secondary"}>
                          {sale.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">S/. {sale.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  {filteredSales.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No hay ventas para mostrar
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
