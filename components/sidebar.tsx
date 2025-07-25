"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Home, ShoppingCart, Package, Users, BarChart3, Settings, DollarSign } from "lucide-react"

interface SidebarProps {
  currentPage: string
  setCurrentPage: (page: string) => void
  userRole: "admin" | "vendedor" | null
}

export default function Sidebar({ currentPage, setCurrentPage, userRole }: SidebarProps) {
  const adminMenuItems = [
    { id: "inicio", label: "Inicio", icon: Home },
    { id: "ventas", label: "Ventas", icon: ShoppingCart },
    { id: "productos", label: "Productos", icon: Package },
    { id: "usuarios", label: "Usuarios", icon: Users },
    { id: "reportes", label: "Reportes", icon: BarChart3 },
    { id: "configuracion", label: "Configuración", icon: Settings },
  ]

  const vendedorMenuItems = [
    { id: "ventas", label: "Ventas", icon: ShoppingCart },
    { id: "configuracion", label: "Configuración", icon: Settings },
  ]

  const menuItems = userRole === "admin" ? adminMenuItems : vendedorMenuItems

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">POS System</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{userRole}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.id}
              variant={currentPage === item.id ? "default" : "ghost"}
              className={cn(
                "w-full justify-start",
                currentPage === item.id && "bg-blue-600 text-white hover:bg-blue-700",
              )}
              onClick={() => setCurrentPage(item.id)}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.label}
            </Button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> Procesar Venta
          </p>
          <p>
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">X</kbd> Limpiar Carrito
          </p>
          <p>
            <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">P</kbd> Abrir/Cerrar Caja
          </p>
        </div>
      </div>
    </div>
  )
}
