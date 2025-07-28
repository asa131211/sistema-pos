"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { signOut } from "firebase/auth"
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Moon, Sun, LogOut, User, Clock, Calendar, ShoppingCart, Lock, Unlock } from "lucide-react"
import { toast } from "sonner"

interface TopBarProps {
  darkMode: boolean
  setDarkMode: (darkMode: boolean) => void
  cashRegisterStatus?: { isOpen: boolean; data: any }
  onCashRegisterChange?: (status: { isOpen: boolean; data: any }) => void
}

export default function TopBar({ darkMode, setDarkMode, cashRegisterStatus, onCashRegisterChange }: TopBarProps) {
  const [user] = useAuthState(auth)
  const [userProfile, setUserProfile] = useState({
    name: "",
    avatar: "",
    role: "",
  })
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserProfile({
              name: userData.name || "",
              avatar: userData.avatar || "",
              role: userData.role || "",
            })
          }
        } catch (error) {
          console.error("Error fetching user profile:", error)
        }
      }
    }

    fetchUserProfile()
  }, [user])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const openCashRegister = async () => {
    if (!user) return

    setLoading(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      const initialAmount = 0

      const cashRegData = {
        id: `${user.uid}-${today}`,
        isOpen: true,
        openedBy: user.uid,
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
          description: "Apertura de caja desde top bar",
          userId: user.uid,
          timestamp: serverTimestamp(),
        })
      } catch (movementError) {
        console.warn("Error registering movement:", movementError)
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
    if (!user || !cashRegisterStatus?.data) return

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
        description: "Cierre de caja desde top bar",
        userId: user.uid,
        timestamp: serverTimestamp(),
      })

      // Actualizar estado inmediatamente
      if (onCashRegisterChange) {
        onCashRegisterChange({ isOpen: false, data: { ...cashRegisterStatus.data, isOpen: false } })
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

  return (
    <>
      <header className="sticky top-0 z-50 h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 md:px-6">
        {/* Logo y título */}
        <div className="flex items-center space-x-3 md:space-x-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
            <ShoppingCart className="h-4 w-4 md:h-6 md:w-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">Caja y Ventas</h1>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Sistema de punto de venta</p>
          </div>
        </div>

        {/* Centro - Tiempo, fecha y caja */}
        <div className="flex items-center space-x-3 md:space-x-6">
          <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="h-4 w-4" />
            <span className="font-mono">{currentTime.toLocaleTimeString("es-ES")}</span>
          </div>
          <div className="hidden lg:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar className="h-4 w-4" />
            <span>{currentTime.toLocaleDateString("es-ES")}</span>
          </div>

          {/* Cash Register Controls */}
          <div className="flex items-center space-x-2">
            {!cashRegisterStatus?.isOpen ? (
              <Button
                onClick={openCashRegister}
                disabled={loading}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 text-xs"
                data-shortcut="toggle-cash"
              >
                <Unlock className="h-3 w-3 mr-1" />
                {loading ? "Abriendo..." : "Abrir Caja"}
              </Button>
            ) : (
              <Button
                onClick={() => setShowCloseDialog(true)}
                variant="destructive"
                size="sm"
                className="h-8 px-3 text-xs"
                data-shortcut="toggle-cash"
              >
                <Lock className="h-3 w-3 mr-1" />
                Cerrar Caja
              </Button>
            )}
          </div>
        </div>

        {/* Derecha - Controles de usuario */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {/* Controles de tema */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDarkMode(!darkMode)}
            className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Usuario */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-auto px-2 md:px-3 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <div className="flex items-center space-x-2 md:space-x-3">
                  <Avatar className="h-6 w-6 md:h-8 md:w-8">
                    <AvatarImage src={userProfile.avatar || "/placeholder.svg"} alt={userProfile.name} />
                    <AvatarFallback className="bg-purple-600 text-white text-xs">
                      {userProfile.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{userProfile.name || "Usuario"}</p>
                    <Badge variant={userProfile.role === "admin" ? "default" : "secondary"} className="text-xs">
                      {userProfile.role === "admin" ? "Admin" : "Vendedor"}
                    </Badge>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex items-center justify-start gap-2 p-2">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={userProfile.avatar || "/placeholder.svg"} alt={userProfile.name} />
                  <AvatarFallback className="bg-purple-600 text-white">
                    {userProfile.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{userProfile.name || "Usuario"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Mi Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDarkMode(!darkMode)}>
                {darkMode ? (
                  <>
                    <Sun className="mr-2 h-4 w-4" />
                    Modo Claro
                  </>
                ) : (
                  <>
                    <Moon className="mr-2 h-4 w-4" />
                    Modo Oscuro
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600 dark:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Dialog para cerrar caja */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-center text-xl text-gray-900 dark:text-white">¿Cerrar Caja?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Resumen del Día</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total Ventas:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    S/. {cashRegisterStatus?.data?.totalSales?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Efectivo:</span>
                  <span className="font-semibold text-green-600">
                    S/. {cashRegisterStatus?.data?.cashSales?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Transferencias:</span>
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
