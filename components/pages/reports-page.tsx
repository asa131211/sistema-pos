"use client"

import { useState, useEffect } from "react"
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  getDocs,
  doc,
  writeBatch,
  addDoc,
  serverTimestamp,
} from "firebase/firestore"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  Trash2,
  AlertTriangle,
  RefreshCw,
  Database,
} from "lucide-react"
import { toast } from "sonner"

interface Sale {
  id: string
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
    paymentMethod?: string // Agregando método de pago por producto
  }>
  total: number
  paymentMethod: string
  paymentBreakdown?: {
    cash: number
    transfer: number
  }
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

  // Estados para el reseteo
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [confirmText, setConfirmText] = useState("")
  const [isResetting, setIsResetting] = useState(false)

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
            const weekAgoStr = weekAgo.toISOString().split("T")[0]
            filteredSales = filteredSales.filter((sale) => sale.date >= weekAgoStr)
          } else if (dateFilter === "month") {
            const monthAgo = new Date()
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            const monthAgoStr = monthAgo.toISOString().split("T")[0]
            filteredSales = filteredSales.filter((sale) => sale.date >= monthAgoStr)
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

  // Función para resetear todas las ventas
  const resetAllSalesData = async () => {
    if (confirmText !== "VACIAR VENTAS") {
      toast.error("Debes escribir exactamente 'VACIAR VENTAS' para confirmar")
      return
    }

    setIsResetting(true)

    try {
      console.log("🔄 Iniciando vaciado de datos de ventas...")

      // Obtener todas las ventas para contar
      const allSalesSnapshot = await getDocs(collection(db, "sales"))
      const totalSales = allSalesSnapshot.size
      const totalAmount = allSalesSnapshot.docs.reduce((sum, doc) => {
        const data = doc.data()
        return sum + (data.total || 0)
      }, 0)

      // Crear batch para operaciones múltiples
      const batch = writeBatch(db)
      let operationsCount = 0

      // Eliminar todas las ventas
      console.log("🗑️ Eliminando todas las ventas...")
      allSalesSnapshot.docs.forEach((docSnapshot) => {
        batch.delete(doc(db, "sales", docSnapshot.id))
        operationsCount++
      })

      // Eliminar movimientos de caja relacionados con ventas
      console.log("🗑️ Eliminando movimientos de caja...")
      const cashMovementsSnapshot = await getDocs(collection(db, "cash-movements"))
      cashMovementsSnapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data()
        if (data.type === "sale" || data.description?.includes("Venta")) {
          batch.delete(doc(db, "cash-movements", docSnapshot.id))
          operationsCount++
        }
      })

      // Ejecutar todas las eliminaciones
      if (operationsCount > 0) {
        console.log(`📝 Ejecutando ${operationsCount} operaciones de eliminación...`)
        await batch.commit()
      }

      // Registrar el vaciado en el historial
      await addDoc(collection(db, "system-logs"), {
        action: "SALES_DATA_RESET",
        performedBy: user?.uid,
        performedByEmail: user?.email,
        timestamp: serverTimestamp(),
        details: {
          salesDeleted: totalSales,
          totalAmountReset: totalAmount,
          resetFrom: "reports_page",
        },
        description: `Vaciado de datos de ventas desde reportes - ${totalSales} ventas eliminadas`,
      })

      // Limpiar localStorage relacionado con ventas
      try {
        localStorage.removeItem("offline_sales")
        console.log("🧹 Cache de ventas limpiado")
      } catch (error) {
        console.log("No hay cache de ventas para limpiar")
      }

      // Cerrar dialog y limpiar estado
      setShowResetDialog(false)
      setConfirmText("")

      toast.success("✅ Datos de ventas vaciados exitosamente", {
        description: `Se eliminaron ${totalSales} ventas por un total de S/. ${totalAmount.toFixed(2)}`,
        duration: 5000,
      })

      console.log("✅ Vaciado de ventas completado exitosamente")
    } catch (error) {
      console.error("❌ Error durante el vaciado:", error)
      toast.error("Error al vaciar los datos de ventas: " + error.message)
    } finally {
      setIsResetting(false)
    }
  }

  // Función para exportar datos antes del vaciado
  const exportDataBeforeReset = async () => {
    try {
      console.log("📤 Exportando datos de ventas...")

      const allSalesSnapshot = await getDocs(collection(db, "sales"))
      const salesData = allSalesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate?.()?.toISOString() || doc.data().timestamp,
      }))

      const exportData = {
        exportDate: new Date().toISOString(),
        exportedBy: user?.email,
        exportType: "sales_backup_before_reset",
        sales: salesData,
        summary: {
          totalSales: salesData.length,
          totalAmount: salesData.reduce((sum, sale) => sum + (sale.total || 0), 0),
        },
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json;charset=utf-8;",
      })

      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", `backup-ventas-${new Date().toISOString().split("T")[0]}.json`)
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("📤 Backup de ventas exportado exitosamente")
    } catch (error) {
      console.error("Error exportando datos:", error)
      toast.error("Error al exportar backup de ventas")
    }
  }

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

      if (sale.paymentBreakdown) {
        sellerStats[sellerId].cashSales += sale.paymentBreakdown.cash
        sellerStats[sellerId].transferSales += sale.paymentBreakdown.transfer
      } else {
        // Fallback para ventas antiguas
        if (sale.paymentMethod === "efectivo") {
          sellerStats[sellerId].cashSales += sale.total
        } else {
          sellerStats[sellerId].transferSales += sale.total
        }
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

  const cashSales = sales.reduce((sum, sale) => {
    if (sale.paymentBreakdown) {
      return sum + sale.paymentBreakdown.cash
    }
    // Fallback para ventas antiguas
    return sale.paymentMethod === "efectivo" ? sum + sale.total : sum
  }, 0)

  const transferSales = sales.reduce((sum, sale) => {
    if (sale.paymentBreakdown) {
      return sum + sale.paymentBreakdown.transfer
    }
    // Fallback para ventas antiguas
    return sale.paymentMethod === "transferencia" ? sum + sale.total : sum
  }, 0)

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
    const headers = ["Fecha", "Vendedor", "Total", "Efectivo", "Transferencia", "Productos", "Promoción"]
    const csvData = sales.map((sale) => [
      new Date(sale.timestamp?.toDate?.() || sale.timestamp).toLocaleDateString("es-ES"),
      sale.sellerEmail,
      `S/. ${sale.total.toFixed(2)}`,
      `S/. ${(sale.paymentBreakdown?.cash || (sale.paymentMethod === "efectivo" ? sale.total : 0)).toFixed(2)}`,
      `S/. ${(sale.paymentBreakdown?.transfer || (sale.paymentMethod === "transferencia" ? sale.total : 0)).toFixed(2)}`,
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
            <div className="flex space-x-3">
              <Button onClick={exportToCSV} className="bg-purple-600 hover:bg-purple-700 text-white">
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button
                onClick={() => setShowResetDialog(true)}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={totalTransactions === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Vaciar Ventas
              </Button>
            </div>
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
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">Productos Vendidos</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Estadísticas individuales de cada vendedor
              </CardDescription>
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
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                        <Database className="h-4 w-4 mr-2" />
                        Últimas Ventas
                      </h5>
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
                          <div className="flex flex-wrap gap-1">
                            {sale.paymentBreakdown ? (
                              <>
                                {sale.paymentBreakdown.cash > 0 && (
                                  <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700 text-xs">
                                    💵 S/. {sale.paymentBreakdown.cash.toFixed(2)}
                                  </Badge>
                                )}
                                {sale.paymentBreakdown.transfer > 0 && (
                                  <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700 text-xs">
                                    💳 S/. {sale.paymentBreakdown.transfer.toFixed(2)}
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <Badge
                                className={
                                  sale.paymentMethod === "efectivo"
                                    ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700"
                                    : "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700"
                                }
                              >
                                {sale.paymentMethod === "efectivo" ? "💵 Efectivo" : "💳 Transferencia"}
                              </Badge>
                            )}
                          </div>
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

        {/* Dialog de Confirmación para Vaciar Ventas */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent className="max-w-md bg-white dark:bg-gray-900">
            <DialogHeader>
              <DialogTitle className="text-center text-xl font-bold text-red-700 dark:text-red-300 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 mr-2" />
                ¡VACIAR DATOS DE VENTAS!
              </DialogTitle>
              <DialogDescription className="text-center text-gray-600 dark:text-gray-400">
                Esta acción eliminará permanentemente todas las ventas registradas
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <Alert className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-700 dark:text-red-300">
                  <strong>Se eliminarán:</strong>
                  <ul className="list-disc list-inside mt-1 text-sm">
                    <li>{totalTransactions.toLocaleString()} ventas</li>
                    <li>S/. {totalSales.toFixed(2)} en registros</li>
                    <li>Movimientos de caja relacionados</li>
                    <li>Historial de transacciones</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center">
                  <Database className="h-4 w-4 mr-2" />
                  Recomendación:
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Exporta un backup antes de vaciar los datos para mantener un registro histórico.
                </p>
                <Button
                  onClick={exportDataBeforeReset}
                  variant="outline"
                  size="sm"
                  className="mt-2 border-blue-200 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 bg-transparent"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Exportar Backup
                </Button>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Para confirmar, escribe exactamente: <strong>VACIAR VENTAS</strong>
                </Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Escribe: VACIAR VENTAS"
                  className="border-red-200 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20"
                />
              </div>

              <div className="flex space-x-3">
                <Button
                  onClick={resetAllSalesData}
                  disabled={isResetting || confirmText !== "VACIAR VENTAS"}
                  variant="destructive"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {isResetting ? (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Vaciando...</span>
                    </div>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Vaciar Ventas
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => {
                    setShowResetDialog(false)
                    setConfirmText("")
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={isResetting}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
