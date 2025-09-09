"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore"
import Sidebar from "@/components/sidebar"
import TopBar from "@/components/top-bar"
import HomePage from "@/components/pages/home-page"
import SalesPage from "@/components/pages/sales-page"
import ProductsPage from "@/components/pages/products-page"
import UsersPage from "@/components/pages/users-page"
import ReportsPage from "@/components/pages/reports-page"
import SettingsPage from "@/components/pages/settings-page"
import { SyncIndicator } from "@/components/sync-status"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { toast } from "react-toastify"

export default function Dashboard() {
  const [user] = useAuthState(auth)
  const [userRole, setUserRole] = useState<"admin" | "vendedor" | null>(null)
  const [currentPage, setCurrentPage] = useState("ventas")
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [cashRegisterStatus, setCashRegisterStatus] = useState<{ isOpen: boolean; data: any }>({
    isOpen: false,
    data: null,
  })

  useKeyboardShortcuts()

  const getBusinessDate = () => {
    const now = new Date()
    const peruTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }))
    return peruTime.toISOString().split("T")[0]
  }

  useEffect(() => {
    const checkMidnightClose = () => {
      const now = new Date()
      const peruTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }))

      // Calcular la próxima medianoche en Perú
      const midnightPeru = new Date(peruTime)
      midnightPeru.setHours(24, 0, 0, 0)

      // Convertir de vuelta a hora local para el timeout
      const timeUntilMidnight = midnightPeru.getTime() - peruTime.getTime()

      const midnightFormatted = midnightPeru.toLocaleString("es-PE", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })

      console.log(`[v0] 🕛 Próximo cierre automático programado para: ${midnightFormatted} (Hora de Perú)`)
      console.log(`[v0] ⏰ Tiempo restante: ${Math.round(timeUntilMidnight / 1000 / 60)} minutos`)

      if (cashRegisterStatus?.isOpen) {
        console.log(`[v0] ✅ Caja está ABIERTA - Timer activado`)
      } else {
        console.log(`[v0] ❌ Caja está CERRADA - Timer en espera`)
      }

      const midnightTimeout = setTimeout(async () => {
        if (cashRegisterStatus?.isOpen && user) {
          console.log("🕛 Auto-cerrando caja a las 12:00 AM (Hora Perú)")

          try {
            // Cerrar caja automáticamente
            await updateDoc(doc(db, "cash-registers", cashRegisterStatus.data.id), {
              isOpen: false,
              closedAt: serverTimestamp(),
            })

            await addDoc(collection(db, "cash-movements"), {
              cashRegisterId: cashRegisterStatus.data.id,
              type: "closing",
              amount: cashRegisterStatus.data.currentAmount || 0,
              description: "Cierre automático a las 12:00 AM",
              userId: user.uid,
              timestamp: serverTimestamp(),
            })

            setCashRegisterStatus({ isOpen: false, data: { ...cashRegisterStatus.data, isOpen: false } })
            toast.success("🕛 Caja cerrada automáticamente a las 12:00 AM")
          } catch (error) {
            console.error("Error en cierre automático:", error)
          }
        }
        // Set up next midnight check
        checkMidnightClose()
      }, timeUntilMidnight)

      return () => clearTimeout(midnightTimeout)
    }

    const cleanup = checkMidnightClose()
    return cleanup
  }, [cashRegisterStatus, user])

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          console.log("🔄 Sincronizando datos de usuario...")
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserRole(userData.role)
            setCurrentPage(userData.role === "admin" ? "inicio" : "ventas")
            console.log("✅ Rol de usuario sincronizado:", userData.role)
          }
        } catch (error) {
          console.error("❌ Error fetching user role:", error)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchUserRole()
  }, [user])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  // Check cash register status
  useEffect(() => {
    const checkCashRegisterStatus = async () => {
      if (!user) return

      try {
        const businessDate = getBusinessDate()
        const cashRegDoc = await getDoc(doc(db, "cash-registers", `${user.uid}-${businessDate}`))

        if (cashRegDoc.exists()) {
          const data = cashRegDoc.data()
          setCashRegisterStatus({ isOpen: data.isOpen, data })
        } else {
          setCashRegisterStatus({ isOpen: false, data: null })
        }
      } catch (error) {
        console.error("Error checking cash register:", error)
        setCashRegisterStatus({ isOpen: false, data: null })
      }
    }

    checkCashRegisterStatus()
    const interval = setInterval(checkCashRegisterStatus, 30000)

    return () => clearInterval(interval)
  }, [user])

  // Auto-reset de ventas a las 12 AM hora de Perú
  useEffect(() => {
    const checkDailyReset = () => {
      const now = new Date()
      const peruTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }))

      // Calcular la próxima medianoche en Perú para el reset
      const resetTime = new Date(peruTime)
      resetTime.setHours(24, 0, 0, 0)

      const timeUntilReset = resetTime.getTime() - peruTime.getTime()

      const resetTimeout = setTimeout(() => {
        console.log("🔄 Reinicio automático del sistema a las 12:00 AM (Hora Perú)")
        checkDailyReset()
      }, timeUntilReset)

      return () => clearTimeout(resetTimeout)
    }

    const cleanup = checkDailyReset()
    return cleanup
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <img src="/loading-wheel.gif" alt="Cargando..." className="w-16 h-16 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">Sincronizando datos...</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">Preparando tu espacio de trabajo</p>
        </div>
      </div>
    )
  }

  const renderPage = () => {
    switch (currentPage) {
      case "inicio":
        return <HomePage userRole={userRole} sidebarCollapsed={sidebarCollapsed} />
      case "ventas":
        return (
          <SalesPage
            sidebarCollapsed={sidebarCollapsed}
            cashRegisterStatus={cashRegisterStatus}
            onCashRegisterChange={setCashRegisterStatus}
          />
        )
      case "productos":
        return <ProductsPage sidebarCollapsed={sidebarCollapsed} />
      case "usuarios":
        return <UsersPage sidebarCollapsed={sidebarCollapsed} />
      case "reportes":
        return <ReportsPage sidebarCollapsed={sidebarCollapsed} />
      case "configuracion":
        return <SettingsPage darkMode={darkMode} setDarkMode={setDarkMode} sidebarCollapsed={sidebarCollapsed} />
      default:
        return (
          <SalesPage
            sidebarCollapsed={sidebarCollapsed}
            cashRegisterStatus={cashRegisterStatus}
            onCashRegisterChange={setCashRegisterStatus}
          />
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <TopBar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        cashRegisterStatus={cashRegisterStatus}
        onCashRegisterChange={setCashRegisterStatus}
      />
      <div className="flex flex-1">
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          userRole={userRole}
          isCollapsed={sidebarCollapsed}
          setIsCollapsed={setSidebarCollapsed}
        />
        <main className="flex-1 overflow-auto">{renderPage()}</main>
      </div>
      <SyncIndicator />
    </div>
  )
}
