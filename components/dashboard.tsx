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
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { Loader2 } from "lucide-react"

export default function Dashboard() {
  const [user] = useAuthState(auth)
  const [userRole, setUserRole] = useState<"admin" | "vendedor" | null>(null)
  const [currentPage, setCurrentPage] = useState("inicio")
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)

  useKeyboardShortcuts()

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role)
          }
        } catch (error) {
          console.error("Error fetching user role:", error)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const renderPage = () => {
    switch (currentPage) {
      case "inicio":
        return <HomePage userRole={userRole} />
      case "ventas":
        return <SalesPage />
      case "productos":
        return <ProductsPage />
      case "usuarios":
        return <UsersPage />
      case "reportes":
        return <ReportsPage />
      case "configuracion":
        return <SettingsPage darkMode={darkMode} setDarkMode={setDarkMode} />
      default:
        return <HomePage userRole={userRole} />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} userRole={userRole} />
      <div className="flex-1 flex flex-col">
        <TopBar darkMode={darkMode} setDarkMode={setDarkMode} />
        <main className="flex-1 p-6 overflow-auto">{renderPage()}</main>
      </div>
    </div>
  )
}
