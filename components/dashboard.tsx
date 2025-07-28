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
import { SyncStatus, SyncIndicator } from "@/components/sync-status"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"

export default function Dashboard() {
  const [user] = useAuthState(auth)
  const [userRole, setUserRole] = useState<"admin" | "vendedor" | null>(null)
  const [currentPage, setCurrentPage] = useState("ventas") // Cambiar página por defecto a ventas
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

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
            // Si es admin, mostrar dashboard por defecto, si es vendedor, mostrar ventas
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

  // Auto-reset de ventas a las 7 AM
  useEffect(() => {
    const checkDailyReset = () => {
      const now = new Date()
      const resetTime = new Date()
      resetTime.setHours(7, 0, 0, 0) // 7:00 AM

      // Si ya pasaron las 7 AM de hoy, programar para mañana
      if (now > resetTime) {
        resetTime.setDate(resetTime.getDate() + 1)
      }

      const timeUntilReset = resetTime.getTime() - now.getTime()

      const resetTimeout = setTimeout(() => {
        console.log("🔄 Reinicio automático del sistema a las 7:00 AM")
        // Aquí podrías agregar lógica adicional para el reinicio
        // Por ejemplo, limpiar caché local, mostrar notificación, etc.

        // Programar el siguiente reinicio (24 horas después)
        checkDailyReset()
      }, timeUntilReset)

      return () => clearTimeout(resetTimeout)
    }

    const cleanup = checkDailyReset()
    return cleanup
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
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
        return <HomePage userRole={userRole} />
      case "ventas":
        return <SalesPage sidebarCollapsed={sidebarCollapsed} />
      case "productos":
        return <ProductsPage />
      case "usuarios":
        return <UsersPage />
      case "reportes":
        return <ReportsPage />
      case "configuracion":
        return <SettingsPage darkMode={darkMode} setDarkMode={setDarkMode} />
      default:
        return <SalesPage sidebarCollapsed={sidebarCollapsed} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        userRole={userRole}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />
      <div className="flex-1 flex flex-col">
        <TopBar darkMode={darkMode} setDarkMode={setDarkMode} />
        <div className="px-6 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <SyncStatus />
        </div>
        <main className="flex-1 p-6 overflow-auto">{renderPage()}</main>
      </div>
      <SyncIndicator />
    </div>
  )
}
