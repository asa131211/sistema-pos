"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { DollarSign } from "lucide-react"

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
      .slice(-7) // Últimos 7 días
  }

  const filteredSales = getFilteredSales()
  const sellerStats = getSellerStats()
  const paymentStats = getPaymentMethodStats()
  const dailySalesData = getDailySalesData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reportes</h1>
        <p className="text-gray-600 dark:text-gray-400">Análisis de ventas y rendimiento</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4">
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
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
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="por-vendedor">Por Vendedor</TabsTrigger>
          <TabsTrigger value="detalle">Detalle de Ventas</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          {/* Tarjetas de resumen */}
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Efectivo</CardTitle>
                {/* Banknote icon removed as per updates */}
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
                {/* CreditCard icon removed as per updates */}
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

        <TabsContent value="por-vendedor" className="space-y-6">
          <div className="grid gap-6">
            {sellerStats.map((seller, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    {/* User icon removed as per updates */}
                    {seller.name}
                  </CardTitle>
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
                          {sale.paymentMethod === "efectivo" ? (
                            <>
                              {/* Banknote icon removed as per updates */}
                              Efectivo
                            </>
                          ) : (
                            <>
                              {/* CreditCard icon removed as per updates */}
                              Transferencia
                            </>
                          )}
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
