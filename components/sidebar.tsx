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
        "fixed left-0 top-0 h-screen bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 text-white flex flex-col shadow-2xl transition-all duration-300 z-40",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header con botón de colapso - Mejorado */}
      <div
        className={cn(
          "p-4 border-b border-blue-700/50 flex items-center backdrop-blur-sm bg-blue-900/80",
          isCollapsed ? "justify-center" : "justify-between",
        )}
      >
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-white to-blue-100 rounded-xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <DollarSign className="h-7 w-7 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Sanchez Park
              </h1>
              <p className="text-xs text-blue-200 capitalize font-medium">
                {userRole === "admin" ? "Administrador" : "Vendedor"}
              </p>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white hover:bg-blue-700/50 p-2 rounded-lg transition-all duration-200 hover:scale-105"
        >
          {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </Button>
      </div>

      {/* Navegación - Mejorada */}
      <nav className="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "w-full text-white hover:bg-blue-700/50 transition-all duration-200 justify-start group relative overflow-hidden",
                isActive &&
                  "bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg hover:from-blue-500 hover:to-blue-400",
                isCollapsed ? "px-2 justify-center h-12" : "px-4 h-12",
                "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
              )}
              onClick={() => setCurrentPage(item.id)}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={cn("h-5 w-5 transition-all duration-200", !isCollapsed && "mr-3", isActive && "scale-110")}
              />
              {!isCollapsed && <span className="truncate font-medium">{item.label}</span>}
              {isActive && !isCollapsed && (
                <div className="absolute right-2 w-2 h-2 bg-white rounded-full animate-pulse" />
              )}
            </Button>
          )
        })}
      </nav>

      {/* Footer con atajos - Mejorado */}
      {!isCollapsed && (
        <div className="p-4 border-t border-blue-700/50 bg-gradient-to-r from-blue-950 to-blue-900 backdrop-blur-sm">
          <div className="text-xs text-blue-200 space-y-3">
            <div className="font-semibold text-blue-100 mb-3 flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
              Atajos de Teclado:
            </div>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between bg-blue-800/30 rounded-lg p-2">
                <span className="text-blue-200">Procesar:</span>
                <kbd className="px-2 py-1 bg-blue-700 rounded text-xs font-mono text-white shadow-inner">Enter</kbd>
              </div>
              <div className="flex items-center justify-between bg-blue-800/30 rounded-lg p-2">
                <span className="text-blue-200">Limpiar:</span>
                <kbd className="px-2 py-1 bg-blue-700 rounded text-xs font-mono text-white shadow-inner">X</kbd>
              </div>
              <div className="flex items-center justify-between bg-blue-800/30 rounded-lg p-2">
                <span className="text-blue-200">Caja:</span>
                <kbd className="px-2 py-1 bg-blue-700 rounded text-xs font-mono text-white shadow-inner">P</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
