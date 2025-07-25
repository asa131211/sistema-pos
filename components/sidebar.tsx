"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Home, ShoppingCart, Package, Users, BarChart3, Settings, DollarSign, Menu, X } from "lucide-react"

interface SidebarProps {
  currentPage: string
  setCurrentPage: (page: string) => void
  userRole: "admin" | "vendedor" | null
}

export default function Sidebar({ currentPage, setCurrentPage, userRole }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

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
    <div
      className={cn(
        "bg-gradient-to-b from-blue-900 to-blue-800 text-white flex flex-col shadow-xl transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header con botón de colapso */}
      <div
        className={cn(
          "p-4 border-b border-blue-700 flex items-center",
          isCollapsed ? "justify-center" : "justify-between",
        )}
      >
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Sanchez Park</h1>
              <p className="text-xs text-blue-200 capitalize">{userRole === "admin" ? "Administrador" : "Vendedor"}</p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white hover:bg-blue-700 p-2"
        >
          {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </Button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-2 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "w-full text-white hover:bg-blue-700 transition-all duration-200 justify-start",
                currentPage === item.id && "bg-blue-600 shadow-lg hover:bg-blue-600",
                isCollapsed ? "px-2 justify-center" : "px-3",
              )}
              onClick={() => setCurrentPage(item.id)}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Button>
          )
        })}
      </nav>

      {/* Footer con atajos - Solo cuando no está colapsado */}
      {!isCollapsed && (
        <div className="p-3 border-t border-blue-700 bg-blue-950">
          <div className="text-xs text-blue-200 space-y-2">
            <div className="font-semibold text-blue-100 mb-2">Atajos:</div>
            <div className="space-y-1">
              <p>
                <kbd className="px-2 py-1 bg-blue-800 rounded text-xs">Enter</kbd> Procesar
              </p>
              <p>
                <kbd className="px-2 py-1 bg-blue-800 rounded text-xs">X</kbd> Limpiar
              </p>
              <p>
                <kbd className="px-2 py-1 bg-blue-800 rounded text-xs">P</kbd> Caja
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
