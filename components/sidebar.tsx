"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Home, ShoppingCart, Package, Users, BarChart3, Settings } from "lucide-react"

interface SidebarProps {
  currentPage: string
  setCurrentPage: (page: string) => void
  userRole: "admin" | "vendedor" | null
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

export default function Sidebar({ currentPage, setCurrentPage, userRole, isCollapsed, setIsCollapsed }: SidebarProps) {
  const adminMenuItems = [
    { id: "inicio", label: "Dashboard", icon: Home },
    { id: "ventas", label: "Punto de Venta", icon: ShoppingCart },
    { id: "productos", label: "Productos", icon: Package },
    { id: "usuarios", label: "Usuarios", icon: Users },
    { id: "reportes", label: "Reportes", icon: BarChart3 },
    { id: "configuracion", label: "Configuración", icon: Settings },
  ]

  const vendedorMenuItems = [
    { id: "ventas", label: "Punto de Venta", icon: ShoppingCart },
    { id: "configuracion", label: "Configuración", icon: Settings },
  ]

  const menuItems = userRole === "admin" ? adminMenuItems : vendedorMenuItems

  return (
    <div className="fixed left-0 top-16 h-[calc(100vh-64px)] w-16 bg-white border-r border-gray-200 flex flex-col z-40">
      {/* Navegación */}
      <nav className="flex-1 p-2 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "w-12 h-12 p-0 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-purple-600 text-white shadow-lg hover:bg-purple-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
              )}
              onClick={() => setCurrentPage(item.id)}
              title={item.label}
            >
              <Icon className="h-5 w-5" />
            </Button>
          )
        })}
      </nav>
    </div>
  )
}
