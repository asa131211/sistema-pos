"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
} from "lucide-react"
import { useSalesSync } from "@/lib/firebase-sync"

export default function HomePage() {
  const { sales, loading } = useSalesSync()
  const [todayStats, setTodayStats] = useState({
    totalSales: 0,
    salesCount: 0,
    totalProducts: 0,
    totalUsers: 0,
  })
  const [paymentMethods, setPaymentMethods] = useState({
    efectivo: 0,
    tarjeta: 0,
    yape: 0,
  })
  const [topProducts, setTopProducts] = useState([])

  useEffect(() => {
    const calculateStats = () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todaySales = sales.filter((sale) => {
        const saleDate = sale.timestamp?.toDate ? sale.timestamp.toDate() : new Date(sale.timestamp)
        return saleDate >= today
      })

      const totalSales = todaySales.reduce((sum, sale) => sum + (sale.total || 0), 0)
      const salesCount = todaySales.length

      // Calcular métodos de pago
      const methods = { efectivo: 0, tarjeta: 0, yape: 0 }
      todaySales.forEach((sale) => {
        if (sale.paymentMethods) {
          methods.efectivo += sale.paymentMethods.efectivo || 0
          methods.tarjeta += sale.paymentMethods.tarjeta || 0
          methods.yape += sale.paymentMethods.yape || 0
        }
      })

      // Calcular productos más vendidos
      const productCount = {}
      todaySales.forEach((sale) => {
        sale.items?.forEach((item) => {
          productCount[item.name] = (productCount[item.name] || 0) + item.quantity
        })
      })

      const topProductsList = Object.entries(productCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, quantity]) => ({ name, quantity }))

      setTodayStats({
        totalSales,
        salesCount,
        totalProducts: Object.keys(productCount).length,
        totalUsers: 2, // Hardcoded for demo
      })
      setPaymentMethods(methods)
      setTopProducts(topProductsList)
    }

    if (sales.length > 0) {
      calculateStats()
    }
  }, [sales])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "PEN",
    }).format(amount)
  }

  const getPaymentIcon = (method) => {
    switch (method) {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>
            {new Date().toLocaleDateString("es-PE", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(todayStats.totalSales)}</div>
            <p className="text-xs text-muted-foreground">{todayStats.salesCount} transacciones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transacciones</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.salesCount}</div>
            <p className="text-xs text-muted-foreground">Ventas completadas hoy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Vendidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">Diferentes productos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">En el sistema</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Métodos de pago */}
        <Card>
          <CardHeader>
            <CardTitle>Métodos de Pago Hoy</CardTitle>
            <CardDescription>Distribución de pagos por método</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(paymentMethods).map(([method, amount]) => (
              <div key={method} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getPaymentIcon(method)}
                  <span className="capitalize">{method}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(amount)}</div>
                  <div className="text-xs text-gray-500">
                    {todayStats.totalSales > 0 ? `${((amount / todayStats.totalSales) * 100).toFixed(1)}%` : "0%"}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Productos más vendidos */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
            <CardDescription>Top 5 productos del día</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="w-6 h-6 rounded-full p-0 flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{product.name}</span>
                    </div>
                    <Badge variant="secondary">{product.quantity} vendidos</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No hay ventas registradas hoy</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ventas recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas Recientes</CardTitle>
          <CardDescription>Últimas 10 transacciones</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Cargando ventas...</p>
          ) : sales.length > 0 ? (
            <div className="space-y-3">
              {sales.slice(0, 10).map((sale, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{formatCurrency(sale.total)}</div>
                    <div className="text-sm text-gray-600">
                      {sale.items?.length || 0} productos • {sale.userName || "Usuario"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {sale.timestamp?.toDate
                        ? sale.timestamp.toDate().toLocaleTimeString("es-PE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : new Date(sale.timestamp).toLocaleTimeString("es-PE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                    </div>
                    <div className="flex space-x-1 mt-1">
                      {sale.paymentMethods &&
                        Object.entries(sale.paymentMethods).map(
                          ([method, amount]) =>
                            amount > 0 && (
                              <Badge key={method} variant="outline" className="text-xs">
                                {method}
                              </Badge>
                            ),
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No hay ventas registradas</p>
          )}
        </CardContent>
      </Card>

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>Accesos directos a funciones principales</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex flex-col space-y-2 bg-transparent">
              <ShoppingCart className="h-6 w-6" />
              <span>Nueva Venta</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col space-y-2 bg-transparent">
              <Package className="h-6 w-6" />
              <span>Productos</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col space-y-2 bg-transparent">
              <TrendingUp className="h-6 w-6" />
              <span>Reportes</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col space-y-2 bg-transparent">
              <Users className="h-6 w-6" />
              <span>Usuarios</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
