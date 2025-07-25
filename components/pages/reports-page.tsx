"use client"

import { useState, useEffect } from "react"
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  getDocs,
  writeBatch,
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { DollarSign, FileText, Download, Trash2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import jsPDF from "jspdf"
import "jspdf-autotable"

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
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    const unsubscribeSales = onSnapshot(query(collection(db, "sales"), orderBy("timestamp", "desc")), (snapshot) => {
      const salesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Sale[]
      setSales(salesData)
    })

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
      .slice(-7)
  }

  const clearSales = async () => {
    setClearing(true)
    try {
      // Obtener todas las ventas actuales
      const salesSnapshot = await getDocs(collection(db, "sales"))
      const batch = writeBatch(db)

      // Mover ventas a archivo histórico
      const archiveData = {
        date: new Date().toISOString(),
        salesCount: salesSnapshot.docs.length,
        totalAmount: sales.reduce((sum, sale) => sum + sale.total, 0),
        sales: salesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        archivedAt: serverTimestamp(),
      }

      await addDoc(collection(db, "sales-archive"), archiveData)

      // Eliminar ventas actuales
      salesSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })

      await batch.commit()

      setShowClearDialog(false)
      toast.success(`${salesSnapshot.docs.length} ventas archivadas y limpiadas exitosamente`)
    } catch (error) {
      console.error("Error clearing sales:", error)
      toast.error("Error al limpiar las ventas")
    } finally {
      setClearing(false)
    }
  }

  const exportToPDF = () => {
    const filteredSales = getFilteredSales()
    const doc = new jsPDF()

    // Título
    doc.setFontSize(20)
    doc.text("Reporte de Ventas - Sanchez Park", 20, 20)

    // Información del reporte
    doc.setFontSize(12)
    doc.text(`Fecha: ${new Date().toLocaleDateString("es-ES")}`, 20, 35)
    doc.text(
      `Filtro: ${dateFilter === "today" ? "Hoy" : dateFilter === "week" ? "Esta Semana" : dateFilter === "month" ? "Este Mes" : "Todo el Tiempo"}`,
      20,
      45,
    )
    doc.text(`Total de ventas: ${filteredSales.length}`, 20, 55)

    // Resumen
    const paymentStats = getPaymentMethodStats()
    const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.total, 0)

    doc.text(`Total vendido: S/. ${totalAmount.toFixed(2)}`, 20, 70)
    doc.text(`Efectivo: S/. ${paymentStats.cash.toFixed(2)}`, 20, 80)
    doc.text(`Transferencias: S/. ${paymentStats.transfer.toFixed(2)}`, 20, 90)

    // Tabla de ventas
    const tableData = filteredSales.map((sale) => [
      new Date(sale.timestamp.toDate()).toLocaleString("es-ES"),
      users.find((u) => u.id === sale.sellerId)?.name || sale.sellerEmail,
      sale.items.map((item) => `${item.name} x${item.quantity}`).join(", "),
      sale.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia",
      `S/. ${sale.total.toFixed(2)}`,
    ])

    doc.autoTable({
      head: [["Fecha", "Vendedor", "Productos", "Pago", "Total"]],
      body: tableData,
      startY: 105,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    })

    doc.save(`reporte-ventas-${new Date().toISOString().split("T")[0]}.pdf`)
    toast.success("Reporte PDF generado exitosamente")
  }

  const exportToExcel = () => {
    const filteredSales = getFilteredSales()

    // Datos para la hoja de resumen
    const paymentStats = getPaymentMethodStats()
    const totalAmount = filteredSales.reduce((sum, sale) => sum + sale.total, 0)

    const summaryData = [
      ["Reporte de Ventas - Sanchez Park"],
      [""],
      ["Fecha del reporte:", new Date().toLocaleDateString("es-ES")],
      [
        "Filtro aplicado:",
        dateFilter === "today"
          ? "Hoy"
          : dateFilter === "week"
            ? "Esta Semana"
            : dateFilter === "month"
              ? "Este Mes"
              : "Todo el Tiempo",
      ],
      [""],
      ["RESUMEN"],
      ["Total de ventas:", filteredSales.length],
      ["Total vendido:", `S/. ${totalAmount.toFixed(2)}`],
      ["Efectivo:", `S/. ${paymentStats.cash.toFixed(2)}`],
      ["Transferencias:", `S/. ${paymentStats.transfer.toFixed(2)}`],
      [""],
    ]

    // Datos detallados de ventas
    const salesData = [
      ["Fecha", "Vendedor", "Productos", "Método de Pago", "Total"],
      ...filteredSales.map((sale) => [
        new Date(sale.timestamp.toDate()).toLocaleString("es-ES"),
        users.find((u) => u.id === sale.sellerId)?.name || sale.sellerEmail,
        sale.items.map((item) => `${item.name} x${item.quantity}`).join(", "),
        sale.paymentMethod === "efectivo" ? "Efectivo" : "Transferencia",
        sale.total,
      ]),
    ]

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new()

    // Hoja de resumen
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, summaryWs, "Resumen")

    // Hoja de ventas detalladas
    const salesWs = XLSX.utils.aoa_to_sheet(salesData)
    XLSX.utils.book_append_sheet(wb, salesWs, "Ventas Detalladas")

    // Guardar archivo
    XLSX.writeFile(wb, `reporte-ventas-${new Date().toISOString().split("T")[0]}.xlsx`)
    toast.success("Reporte Excel generado exitosamente")
  }

  const filteredSales = getFilteredSales()
  const sellerStats = getSellerStats()
  const paymentStats = getPaymentMethodStats()
  const dailySalesData = getDailySalesData()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reportes</h1>
          <p className="text-gray-600 dark:text-gray-400">Análisis de ventas y rendimiento</p>
        </div>

        {/* Botones de acción */}
        <div className="flex space-x-2">
          <Button onClick={exportToPDF} variant="outline" className="flex items-center bg-transparent">
            <FileText className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
          <Button onClick={exportToExcel} variant="outline" className="flex items-center bg-transparent">
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="flex items-center">
                <Trash2 className="mr-2 h-4 w-4" />
                Limpiar Ventas
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <AlertTriangle className="mr-2 h-5 w-5 text-orange-500" />
                  ¿Limpiar todas las ventas?
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Esta acción moverá todas las ventas actuales al archivo histórico y limpiará el sistema para un nuevo
                  día de ventas.
                </p>
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Nota:</strong> Las ventas no se perderán, se archivarán para consulta futura.
                  </p>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={clearSales} disabled={clearing} variant="destructive" className="flex-1">
                    {clearing ? "Limpiando..." : "Confirmar Limpieza"}
                  </Button>
                  <Button onClick={() => setShowClearDialog(false)} variant="outline" className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
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
