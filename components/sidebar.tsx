"use client"
import { useAuthState } from "react-firebase-hooks/auth"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Home, ShoppingCart, Package, Users, BarChart3, Settings, LogOut, X } from "lucide-react"

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
  isOpen: boolean
  onClose: () => void
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "sales", label: "Punto de Venta", icon: ShoppingCart },
  { id: "products", label: "Productos", icon: Package },
  { id: "users", label: "Usuarios", icon: Users },
  { id: "reports", label: "Reportes", icon: BarChart3 },
  { id: "settings", label: "Configuración", icon: Settings },
]

export default function Sidebar({ currentPage, onPageChange, isOpen, onClose }: SidebarProps) {
  const [user] = useAuthState(auth)

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <>
      {/* Overlay para móvil */}
      {isOpen && <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={onClose} />}

      {/* Sidebar fijo */}
      <div
        className={`
        fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-blue-600 to-blue-800 text-white z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        lg:relative lg:transform-none
        flex flex-col
      `}
      >
        {/* Header */}
        <div className="p-6 border-b border-blue-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-blue-600 font-bold text-lg">$</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Sanchez Park</h1>
                <p className="text-blue-200 text-sm">Administrador</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="lg:hidden text-white hover:bg-blue-700">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 py-6">
          <ul className="space-y-2 px-4">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id

              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onPageChange(item.id)
                      onClose() // Cerrar sidebar en móvil después de seleccionar
                    }}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left
                      transition-all duration-200 hover:bg-blue-700/50
                      ${isActive ? "bg-blue-700 shadow-lg border-l-4 border-white" : "hover:translate-x-1"}
                    `}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-blue-200"}`} />
                    <span className={`font-medium ${isActive ? "text-white" : "text-blue-100"}`}>{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-blue-500/30">
          <div className="flex items-center space-x-3 mb-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.photoURL || ""} />
              <AvatarFallback className="bg-blue-500 text-white">
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.displayName || "Usuario"}</p>
              <p className="text-xs text-blue-200 truncate">{user?.email}</p>
            </div>
          </div>

          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full justify-start text-blue-200 hover:text-white hover:bg-blue-700/50"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </>
  )
}
