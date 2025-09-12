"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc } from "firebase/firestore"
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
        const today = new Date().toISOString().split("T")[0]
        const cashRegDoc = await getDoc(doc(db, "cash-registers", `${user.uid}-${today}`))

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

  // Auto-reset de ventas a las 12 AM (medianoche) en la zona horaria de Perú
  useEffect(() => {
    const checkDailyReset = () => {
      // Usar zona horaria de Perú (America/Lima)
      const now = new Date()
      const peruTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }))

      const resetTime = new Date(peruTime)
      resetTime.setHours(0, 0, 0, 0) // Medianoche (12:00 AM)

      // Si ya pasó la medianoche de hoy, programar para mañana
      if (peruTime >= resetTime) {
        resetTime.setDate(resetTime.getDate() + 1)
      }

      const timeUntilReset = resetTime.getTime() - peruTime.getTime()

      console.log(
        `⏰ Próximo reinicio de día programado para: ${resetTime.toLocaleString("es-PE", { timeZone: "America/Lima" })}`,
      )
      console.log(
        `⏱️ Tiempo restante: ${Math.floor(timeUntilReset / (1000 * 60 * 60))}h ${Math.floor((timeUntilReset % (1000 * 60 * 60)) / (1000 * 60))}m`,
      )

      const resetTimeout = setTimeout(() => {
        console.log("🌅 Iniciando nuevo día de ventas a las 12:00 AM (Perú)")

        // Limpiar solo caché de ventas del día anterior
        const salesCacheKeys = Object.keys(localStorage).filter(
          (key) => key.includes("sales-") || key.includes("daily-"),
        )
        salesCacheKeys.forEach((key) => localStorage.removeItem(key))

        // Mostrar notificación de nuevo día
        console.log("✅ Nuevo día de ventas iniciado - Sistema continúa funcionando")

        // Programar próximo reinicio
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
