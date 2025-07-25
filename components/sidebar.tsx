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
    <div className="w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white flex flex-col shadow-xl">
      <div className="p-6 border-b border-blue-700">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <DollarSign className="h-7 w-7 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Sanchez Park</h1>
            <p className="text-sm text-blue-200 capitalize">{userRole === "admin" ? "Administrador" : "Vendedor"}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "w-full justify-start text-left h-12 text-white hover:bg-blue-700 transition-all duration-200",
                currentPage === item.id && "bg-blue-600 shadow-lg hover:bg-blue-600",
              )}
              onClick={() => setCurrentPage(item.id)}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.label}
            </Button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-blue-700 bg-blue-950">
        <div className="text-xs text-blue-200 space-y-2">
          <div className="font-semibold text-blue-100 mb-2">Atajos de Teclado:</div>
          <div className="space-y-1">
            <p>
              <kbd className="px-2 py-1 bg-blue-800 rounded text-xs">Enter</kbd> Procesar Venta
            </p>
            <p>
              <kbd className="px-2 py-1 bg-blue-800 rounded text-xs">X</kbd> Limpiar Carrito
            </p>
            <p>
              <kbd className="px-2 py-1 bg-blue-800 rounded text-xs">P</kbd> Abrir/Cerrar Caja
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
