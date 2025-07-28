"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import LoginForm from "@/components/login-form"
import Sidebar from "@/components/sidebar"
import TopBar from "@/components/top-bar"
import HomePage from "@/components/pages/home-page"
import SalesPage from "@/components/pages/sales-page"
import ProductsPage from "@/components/pages/products-page"
import UsersPage from "@/components/pages/users-page"
import ReportsPage from "@/components/pages/reports-page"
import SettingsPage from "@/components/pages/settings-page"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Home() {
  const [user, loading] = useAuthState(auth)
  const [userRole, setUserRole] = useState<"admin" | "vendedor" | null>(null)
  const [currentPage, setCurrentPage] = useState("ventas")
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [userLoading, setUserLoading] = useState(true)

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role || "vendedor")
          } else {
            setUserRole("vendedor")
          }
        } catch (error) {
          console.error("Error fetching user role:", error)
          setUserRole("vendedor")
        }
      }
      setUserLoading(false)
    }

    if (!loading) {
      fetchUserRole()
    }
  }, [user, loading])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  const renderPage = () => {
    switch (currentPage) {
      case "inicio":
        return <HomePage sidebarCollapsed={sidebarCollapsed} />
      case "ventas":
        return <SalesPage sidebarCollapsed={sidebarCollapsed} />
      case "productos":
        return <ProductsPage sidebarCollapsed={sidebarCollapsed} />
      case "usuarios":
        return <UsersPage sidebarCollapsed={sidebarCollapsed} />
      case "reportes":
        return <ReportsPage sidebarCollapsed={sidebarCollapsed} />
      case "configuracion":
        return <SettingsPage sidebarCollapsed={sidebarCollapsed} />
      default:
        return <SalesPage sidebarCollapsed={sidebarCollapsed} />
    }
  }

  return (
    <div className={cn("min-h-screen bg-gray-50", darkMode && "dark")}>
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        userRole={userRole}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
      />

      <div className={cn("transition-all duration-300", sidebarCollapsed ? "ml-16" : "ml-64")}>
        <TopBar darkMode={darkMode} setDarkMode={setDarkMode} />
        <main className="min-h-[calc(100vh-4rem)]">{renderPage()}</main>
      </div>
    </div>
  )
}
