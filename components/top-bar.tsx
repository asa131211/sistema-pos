"use client"

import { useState } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { signOut } from "firebase/auth"
import { doc, setDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Menu, LogOut, Calculator, Unlock, Lock, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { User } from "firebase/auth"
import { SyncStatus } from "@/components/sync-status"

interface TopBarProps {
  onToggleSidebar: () => void
  sidebarCollapsed: boolean
  cashRegisterStatus?: { isOpen: boolean; data: any }
  onCashRegisterChange?: (status: { isOpen: boolean; data: any }) => void
  user: User | null
  userData: any
}

export default function TopBar({
  onToggleSidebar,
  sidebarCollapsed,
  cashRegisterStatus,
  onCashRegisterChange,
  user,
  userData,
}: TopBarProps) {
  const [authUser] = useAuthState(auth)
  const { theme, setTheme } = useTheme()
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      toast.success("Sesión cerrada exitosamente")
    } catch (error) {
      console.error("Error signing out:", error)
      toast.error("Error al cerrar sesión")
    }
  }

  const openCashRegister = async () => {
    if (!authUser) return

    setLoading(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      const initialAmount = 0

      const cashRegData = {
        id: `${authUser.uid}-${today}`,
        isOpen: true,
        openedBy: authUser.uid,
        openedAt: serverTimestamp(),
        closedAt: null,
        initialAmount: initialAmount,
        currentAmount: initialAmount,
        totalSales: 0,
        cashSales: 0,
        transferSales: 0,
        date: today,
      }

      await setDoc(doc(db, "cash-registers", cashRegData.id), cashRegData)

      try {
        await addDoc(collection(db, "cash-movements"), {
          cashRegisterId: cashRegData.id,
          type: "opening",
          amount: initialAmount,
          description: "Apertura de caja",
          userId: authUser.uid,
          timestamp: serverTimestamp(),
        })
      } catch (movementError) {
        console.warn("Error registering movement, but cash register opened:", movementError)
      }

      // Actualizar estado inmediatamente
      if (onCashRegisterChange) {
        onCashRegisterChange({ isOpen: true, data: cashRegData })
      }

      toast.success("Caja abierta exitosamente")
    } catch (error) {
      console.error("Error opening cash register:", error)
      toast.error("Error al abrir la caja")
    } finally {
      setLoading(false)
    }
  }

  const closeCashRegister = async () => {
    if (!authUser || !cashRegisterStatus?.data) return

    setLoading(true)
    try {
      await updateDoc(doc(db, "cash-registers", cashRegisterStatus.data.id), {
        isOpen: false,
        closedAt: serverTimestamp(),
      })

      await addDoc(collection(db, "cash-movements"), {
        cashRegisterId: cashRegisterStatus.data.id,
        type: "closing",
        amount: cashRegisterStatus.data.currentAmount,
        description: "Cierre manual de caja",
        userId: authUser.uid,
        timestamp: serverTimestamp(),
      })

      // Actualizar estado inmediatamente
      if (onCashRegisterChange) {
        onCashRegisterChange({
          isOpen: false,
          data: { ...cashRegisterStatus.data, isOpen: false },
        })
      }

      setShowCloseDialog(false)
      toast.success("Caja cerrada exitosamente")
    } catch (error) {
      console.error("Error closing cash register:", error)
      toast.error("Error al cerrar la caja")
    } finally {
      setLoading(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "administrador":
        return "bg-red-500"
      case "vendedor":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <>
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-800">Panel de Control</h2>
            <SyncStatus />
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{userData?.displayName || authUser?.displayName}</p>
              <div className="flex items-center space-x-2">
                <Badge className={`text-xs ${getRoleBadgeColor(userData?.role)}`}>
                  {userData?.role === "administrador" ? "Administrador" : "Vendedor"}
                </Badge>
              </div>
            </div>
            <Avatar>
              <AvatarFallback>{userData?.displayName?.charAt(0) || authUser?.email?.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <div className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center justify-between shadow-sm">
        {/* Lado izquierdo */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSidebar}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center space-x-3">
            <img src="/tiger-logo.png" alt="Sanchez Park" className="h-8 w-8" />
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">Sanchez Park</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sistema de Ventas</p>
            </div>
          </div>
        </div>

        {/* Centro - Controles de caja */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Calculator className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Caja:</span>
            <Badge variant={cashRegisterStatus?.isOpen ? "default" : "secondary"} className="text-xs">
              {cashRegisterStatus?.isOpen ? (
                <>
                  <Unlock className="mr-1 h-3 w-3" />
                  Abierta
                </>
              ) : (
                <>
                  <Lock className="mr-1 h-3 w-3" />
                  Cerrada
                </>
              )}
            </Badge>
          </div>

          {!cashRegisterStatus?.isOpen ? (
            <Button
              onClick={openCashRegister}
              disabled={loading}
              size="sm"
              className="h-8 bg-green-600 hover:bg-green-700 text-white"
              data-shortcut="cash-register"
            >
              {loading ? "Abriendo..." : "Abrir"}
            </Button>
          ) : (
            <Button
              onClick={() => setShowCloseDialog(true)}
              variant="destructive"
              size="sm"
              className="h-8"
              data-shortcut="cash-register"
            >
              Cerrar
            </Button>
          )}
        </div>

        {/* Lado derecho */}
        <div className="flex items-center space-x-3">
          {/* Toggle de tema */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Menú de usuario */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-purple-600 text-white text-sm">
                    {authUser?.displayName?.charAt(0) || authUser?.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{authUser?.displayName || "Usuario"}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{authUser?.email}</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="flex items-center space-x-2 text-red-600">
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Dialog para cerrar caja */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">¿Cerrar Caja?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-lg font-semibold mb-2">Resumen del Día</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Ventas:</span>
                  <span className="font-semibold">
                    S/. {cashRegisterStatus?.data?.totalSales?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Efectivo:</span>
                  <span className="font-semibold text-green-600">
                    S/. {cashRegisterStatus?.data?.cashSales?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Transferencias:</span>
                  <span className="font-semibold text-blue-600">
                    S/. {cashRegisterStatus?.data?.transferSales?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={closeCashRegister} disabled={loading} variant="destructive" className="flex-1">
                {loading ? "Cerrando..." : "✅ Cerrar Caja"}
              </Button>
              <Button onClick={() => setShowCloseDialog(false)} variant="outline" className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
