"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth } from "@/lib/firebase"
import TopBar from "./top-bar"
import Sidebar from "./sidebar"
import HomePage from "./pages/home-page"
import SalesPage from "./pages/sales-page"
import ProductsPage from "./pages/products-page"
import ReportsPage from "./pages/reports-page"
import UsersPage from "./pages/users-page"
import SettingsPage from "./pages/settings-page"
import CashRegister from "./cash-register"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export default function Dashboard() {
  const [user] = useAuthState(auth)
  const [currentPage, setCurrentPage] = useState("home")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [cashRegisterStatus, setCashRegisterStatus] = useState({ isOpen: false, data: null })

  // Verificar estado de caja al cargar
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
  }, [user])

  // Atajos de teclado globales
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Solo procesar si no estamos en un input o textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case "x":
          // Limpiar carrito - solo en página de ventas
          if (currentPage === "sales") {
            const clearButton = document.querySelector('[data-shortcut="clear-cart"]') as HTMLButtonElement
            if (clearButton && !clearButton.disabled) {
              clearButton.click()
            }
          }
          break
        case "p":
          // Abrir/cerrar caja
          e.preventDefault()
          const cashRegisterButton = document.querySelector('[data-shortcut="cash-register"]') as HTMLButtonElement
          if (cashRegisterButton) {
            cashRegisterButton.click()
          }
          break
        case "enter":
          // Procesar venta - solo en página de ventas
          if (currentPage === "sales") {
            e.preventDefault()
            const processButton = document.querySelector('[data-shortcut="process-sale"]') as HTMLButtonElement
            if (processButton && !processButton.disabled) {
              processButton.click()
            }
          }
          break
      }

      // Atajos de productos personalizados
      const productCard = document.querySelector(`[data-product-shortcut="${e.key}"]`) as HTMLElement
      if (productCard && currentPage === "sales") {
        productCard.click()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [currentPage])

  const handleCashRegisterChange = (status: { isOpen: boolean; data: any }) => {
    setCashRegisterStatus(status)
  }

  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage />
      case "sales":
        return (
          <SalesPage
            sidebarCollapsed={sidebarCollapsed}
            cashRegisterStatus={cashRegisterStatus}
            onCashRegisterChange={handleCashRegisterChange}
          />
        )
      case "products":
        return <ProductsPage />
      case "reports":
        return <ReportsPage />
      case "users":
        return <UsersPage />
      case "settings":
        return <SettingsPage />
      case "cash-register":
        return (
          <CashRegister onStatusChange={(isOpen) => setCashRegisterStatus({ isOpen, data: cashRegisterStatus.data })} />
        )
      default:
        return <HomePage />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* TopBar fijo */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <TopBar
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          sidebarCollapsed={sidebarCollapsed}
          cashRegisterStatus={cashRegisterStatus}
          onCashRegisterChange={handleCashRegisterChange}
        />
      </div>

      {/* Sidebar fijo */}
      <div className="fixed top-16 left-0 bottom-0 z-40">
        <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} collapsed={sidebarCollapsed} />
      </div>

      {/* Contenido principal con margen para topbar y sidebar */}
      <div className="pt-16">{renderPage()}</div>
    </div>
  )
}
