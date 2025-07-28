"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import Sidebar from "@/components/sidebar"
import TopBar from "@/components/top-bar"
import HomePage from "@/components/pages/home-page"
import SalesPage from "@/components/pages/sales-page"
import ProductsPage from "@/components/pages/products-page"
import ReportsPage from "@/components/pages/reports-page"
import UsersPage from "@/components/pages/users-page"
import SettingsPage from "@/components/pages/settings-page"
import { SyncIndicator } from "@/components/sync-status"
import { ConnectionMonitor } from "@/components/connection-monitor"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function Dashboard() {
  const [user, loading] = useAuthState(auth)
  const [currentPage, setCurrentPage] = useState("home")
  const [userData, setUserData] = useState(null)
  const [userLoading, setUserLoading] = useState(true)

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            setUserData(userDoc.data())
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
          toast.error("Error al cargar datos del usuario")
        } finally {
          setUserLoading(false)
        }
      }
    }

    fetchUserData()
  }, [user])

  if (loading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage />
      case "sales":
        return <SalesPage />
      case "products":
        return <ProductsPage />
      case "reports":
        return <ReportsPage />
      case "users":
        return <UsersPage />
      case "settings":
        return <SettingsPage />
      default:
        return <HomePage />
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} userRole={userData?.role} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={user} userData={userData} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">{renderPage()}</main>
      </div>
      <SyncIndicator />
      <ConnectionMonitor />
    </div>
  )
}
