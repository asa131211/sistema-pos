"use client"

import { useState, useEffect } from "react"
import { collection, query, orderBy, limit, onSnapshot, getDocs } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  Clock,
  Activity,
  Banknote,
  CreditCard,
  Smartphone,
} from "lucide-react"
import { toast } from "sonner"

interface Sale {
  id: string
  items: any[]
  total: number
  timestamp: any
  userName: string
  paymentMethods: { [key: string]: number }
}

interface DashboardStats {
  totalSales: number
  todaySales: number
  totalProducts: number
  activeUsers: number
  recentSales: Sale[]
  topProducts: any[]
  paymentMethodStats: { [key: string]: number }
}

export default function HomePage() {
  const [user] = useAuthState(auth)
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    todaySales: 0,
    totalProducts: 0,
    activeUsers: 0,
    recentSales: [],
    topProducts: [],
    paymentMethodStats: {},
  })
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState("today")

  useEffect(() => {
    if (!user) return

    const loadDashboardData = async () => {
      try {
        setLoading(true)

        // Obtener ventas recientes
        const salesQuery = query(collection(db, "sales"), orderBy("timestamp", "desc"), limit(10))

        const unsubscribeSales = onSnapshot(salesQuery, (snapshot) => {
          const salesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Sale[]

          // Calcular estadísticas
          const today = new Date()
          today.setHours(0, 0, 0, 0)

          const todaySales = salesData.filter((sale) => {
            const saleDate = sale.timestamp?.toDate() || new Date()
            return saleDate >= today
          })

          const totalSalesAmount = salesData.reduce((sum, sale) => sum + (sale.total || 0), 0)
          const todaySalesAmount = todaySales.reduce((sum, sale) => sum + (sale.total || 0), 0)

          // Estadísticas de métodos de pago
          const paymentStats = salesData.reduce(
            (acc, sale) => {
              if (sale.paymentMethods) {
                Object.entries(sale.paymentMethods).forEach(([method, amount]) => {
                  acc[method] = (acc[method] || 0) + (amount as number)
                })
              }
              return acc
            },
            {} as { [key: string]: number },
          )

          // Productos más vendidos
          const productStats = salesData.reduce(
            (acc, sale) => {
              sale.items?.forEach((item) => {
                const key = item.name || item.id
                acc[key] = (acc[key] || 0) + (item.quantity || 1)
              })
              return acc
            },
            {} as { [key: string]: number },
          )

          const topProducts = Object.entries(productStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, quantity]) => ({ name, quantity }))

          setStats((prev) => ({
            ...prev,
            totalSales: totalSalesAmount,
            todaySales: todaySalesAmount,
            recentSales: salesData,
            topProducts,
            paymentMethodStats: paymentStats,
          }))
        })

        // Obtener productos
        const productsSnapshot = await getDocs(collection(db, "products"))
        const activeProducts = productsSnapshot.docs.filter((doc) => doc.data().isActive !== false)

        // Obtener usuarios activos
        const usersSnapshot = await getDocs(collection(db, "users"))
        const activeUsers = usersSnapshot.docs.filter((doc) => doc.data().isActive !== false)

        setStats((prev) => ({
          ...prev,
          totalProducts: activeProducts.length,
          activeUsers: activeUsers.length,
        }))

        setLoading(false)

        return () => {
          unsubscribeSales()
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error)
        toast.error("Error al cargar datos del dashboard")
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [user])

  const formatCurrency = (amount: number) => {
    return `S/. ${amount.toFixed(2)}`
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Fecha no disponible"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString("es-PE")
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case "efectivo":
        return <Banknote className="h-4 w-4" />
      case "tarjeta":
        return <CreditCard className="h-4 w-4" />
      case "yape":
        return <Smartphone className="h-4 w-4" />
      default:
        return <DollarSign className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 ml-16 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 ml-16">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Bienvenido, {user?.displayName || user?.email}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{new Date().toLocaleDateString("es-PE")}</span>
            </Badge>
            <Badge variant="default" className="bg-green-600">
              <Activity className="h-3 w-3 mr-1" />
              Sistema Activo
            </Badge>
          </div>
        </div>

        {/* Estadísticas principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ventas de Hoy</CardTitle>
              <TrendingUp className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.todaySales)}</div>
              <p className="text-xs text-blue-100 mt-1">
                {
                  stats.recentSales.filter((sale) => {
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const saleDate = sale.timestamp?.toDate() || new Date()
                    return saleDate >= today
                  }).length
                }{" "}
                ventas realizadas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
              <DollarSign className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</div>
              <p className="text-xs text-green-100 mt-1">{stats.recentSales.length} ventas registradas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productos</CardTitle>
              <Package className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-purple-100 mt-1">productos activos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
              <p className="text-xs text-orange-100 mt-1">usuarios activos</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Ventas recientes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5 text-purple-600" />
                <span>Ventas Recientes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                {stats.recentSales.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No hay ventas registradas</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.recentSales.map((sale) => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              #{sale.id.slice(-6)}
                            </Badge>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{sale.userName}</span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {sale.items?.length || 0} productos • {formatDate(sale.timestamp)}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            {Object.entries(sale.paymentMethods || {}).map(([method, amount]) => (
                              <Badge key={method} variant="secondary" className="text-xs flex items-center space-x-1">
                                {getPaymentMethodIcon(method)}
                                <span>{formatCurrency(amount as number)}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">{formatCurrency(sale.total)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Productos más vendidos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Productos Más Vendidos</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                {stats.topProducts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No hay datos de productos</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.topProducts.map((product, index) => (
                      <div
                        key={product.name}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full">
                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{index + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white text-sm">{product.name}</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {product.quantity} unidades vendidas
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">{product.quantity}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Métodos de pago */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <span>Métodos de Pago</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats.paymentMethodStats).map(([method, amount]) => (
                <div
                  key={method}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {getPaymentMethodIcon(method)}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white capitalize">{method}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Método de pago</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">{formatCurrency(amount)}</div>
                  </div>
                </div>
              ))}
            </div>

            {Object.keys(stats.paymentMethodStats).length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay datos de métodos de pago</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones rápidas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <span>Acciones Rápidas</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2 bg-transparent"
                onClick={() => (window.location.href = "#sales")}
              >
                <ShoppingCart className="h-6 w-6 text-purple-600" />
                <span className="text-sm">Nueva Venta</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2 bg-transparent"
                onClick={() => (window.location.href = "#products")}
              >
                <Package className="h-6 w-6 text-blue-600" />
                <span className="text-sm">Productos</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2 bg-transparent"
                onClick={() => (window.location.href = "#reports")}
              >
                <TrendingUp className="h-6 w-6 text-green-600" />
                <span className="text-sm">Reportes</span>
              </Button>

              <Button
                variant="outline"
                className="h-20 flex flex-col items-center justify-center space-y-2 bg-transparent"
                onClick={() => (window.location.href = "#users")}
              >
                <Users className="h-6 w-6 text-orange-600" />
                <span className="text-sm">Usuarios</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
