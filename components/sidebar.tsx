"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Home, ShoppingCart, Package, BarChart3, Users, Settings, Calculator } from "lucide-react"

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
  collapsed: boolean
}

export default function Sidebar({ currentPage, onPageChange, collapsed }: SidebarProps) {
  const menuItems = [
    { id: "home", label: "Inicio", icon: Home },
    { id: "sales", label: "Ventas", icon: ShoppingCart },
    { id: "products", label: "Productos", icon: Package },
    { id: "reports", label: "Reportes", icon: BarChart3 },
    { id: "users", label: "Usuarios", icon: Users },
    { id: "cash-register", label: "Caja", icon: Calculator },
    { id: "settings", label: "Configuración", icon: Settings },
  ]

  return (
    <div
      className={`h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ${
        collapsed ? "w-16" : "w-64"
      } shadow-sm`}
    >
      <div className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id

          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start h-12 ${collapsed ? "px-3" : "px-4"} ${
                isActive
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onClick={() => onPageChange(item.id)}
            >
              <Icon className={`h-5 w-5 ${collapsed ? "" : "mr-3"}`} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
              {!collapsed && item.id === "sales" && (
                <Badge
                  variant="secondary"
                  className="ml-auto bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                >
                  POS
                </Badge>
              )}
            </Button>
          )
        })}
      </div>

      {/* Atajos de teclado en sidebar colapsado */}
      {collapsed && (
        <div className="absolute bottom-4 left-2 right-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
            <div>X - Limpiar</div>
            <div>P - Caja</div>
            <div>↵ - Procesar</div>
          </div>
        </div>
      )}
    </div>
  )
}
