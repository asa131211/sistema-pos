"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { DollarSign, Users, Package, Calendar } from "lucide-react"

interface HomePageProps {
  userRole: "admin" | "vendedor" | null
  sidebarCollapsed?: boolean
}

export default function HomePage({ userRole, sidebarCollapsed = false }: HomePageProps) {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProducts: 0,
    totalUsers: 0,
    todaySales: 0,
    cashSales: 0,
    transferSales: 0,
  })
  const [salesData, setSalesData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userRole !== "admin") return

    const unsubscribes = []

    // Escuchar ventas
    const salesQuery = query(collection(db, "sales"), orderBy("timestamp", "desc"))
    const unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
      const sales = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))

      const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0)
      const today = new Date().toDateString()
      const todaySales = sales
        .filter((sale) => new Date(sale.timestamp.toDate()).toDateString() === today)
        .reduce((sum, sale) => sum + sale.total, 0)

      const cashSales = sales
        .filter((sale) => sale.paymentMethod === "efectivo")
        .reduce((sum, sale) => sum + sale.total, 0)

      const transferSales = sales
        .filter((sale) => sale.paymentMethod === "transferencia")
        .reduce((sum, sale) => sum + sale.total, 0)

      // Datos para gráficos
      const last7Days = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = date.toDateString()
        const daySales = sales
          .filter((sale) => new Date(sale.timestamp.toDate()).toDateString() === dateStr)
          .reduce((sum, sale) => sum + sale.total, 0)

        last7Days.push({
          date: date.toLocaleDateString("es-ES", { weekday: "short" }),
          ventas: daySales,
        })
      }
      setSalesData(last7Days)

      setStats((prev) => ({
        ...prev,
        totalSales,
        todaySales,
        cashSales,
        transferSales,
      }))
    })
    unsubscribes.push(unsubscribeSales)

    // Escuchar productos
    const productsQuery = query(collection(db, "products"))
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      setStats((prev) => ({ ...prev, totalProducts: snapshot.size }))
    })
    unsubscribes.push(unsubscribeProducts)

    // Escuchar usuarios
    const usersQuery = query(collection(db, "users"))
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      setStats((prev) => ({ ...prev, totalUsers: snapshot.size }))
      setLoading(false)
    })
    unsubscribes.push(unsubscribeUsers)

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe())
  }, [userRole])

  if (userRole !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Bienvenido a Sanchez Park</h2>
          <p className="text-gray-600 dark:text-gray-400">Dirígete a la sección de Ventas para comenzar a trabajar.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Resumen general del sistema</p>
        </div>

        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Ventas Totales</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                S/. {stats.totalSales.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Todas las ventas</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Ventas Hoy</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                S/. {stats.todaySales.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">Ventas del día</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Productos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">Productos registrados</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Usuarios</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Usuarios activos</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Ventas por Día</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">Últimos 7 días</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`S/. ${value}`, "Ventas"]} />
                  <Bar dataKey="ventas" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-900 dark:text-white">Métodos de Pago</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">Distribución de ventas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-900 dark:text-white">Efectivo</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">S/. {stats.cashSales.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-900 dark:text-white">Transferencia</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    S/. {stats.transferSales.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
