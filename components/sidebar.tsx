"use client"

import { Home, ShoppingCart, Package, BarChart3, Users, Settings, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { signOut } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { toast } from "sonner"

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
  userRole?: string
}

export default function Sidebar({ currentPage, onPageChange, userRole }: SidebarProps) {
  const handleLogout = async () => {
    try {
      await signOut(auth)
      toast.success("Sesión cerrada correctamente")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      toast.error("Error al cerrar sesión")
    }
  }

  const menuItems = [
    { id: "home", label: "Inicio", icon: Home, roles: ["administrador", "vendedor"] },
    { id: "sales", label: "Ventas", icon: ShoppingCart, roles: ["administrador", "vendedor"] },
    { id: "products", label: "Productos", icon: Package, roles: ["administrador", "vendedor"] },
    { id: "reports", label: "Reportes", icon: BarChart3, roles: ["administrador", "vendedor"] },
    { id: "users", label: "Usuarios", icon: Users, roles: ["administrador"] },
    { id: "settings", label: "Configuración", icon: Settings, roles: ["administrador"] },
  ]

  const filteredMenuItems = menuItems.filter((item) => item.roles.includes(userRole || ""))

  return (
    <div className="bg-white w-64 shadow-lg flex flex-col">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold text-gray-800">Sanchez Park</h1>
        <p className="text-sm text-gray-600">Sistema POS</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <Button
                  variant={currentPage === item.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => onPageChange(item.id)}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t">
        <Button variant="outline" className="w-full justify-start bg-transparent" onClick={handleLogout}>
          <LogOut className="mr-3 h-4 w-4" />
          Cerrar Sesión
        </Button>
      </div>
    </div>
  )
}
