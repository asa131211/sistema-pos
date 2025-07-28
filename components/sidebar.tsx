"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Home, ShoppingCart, Package, Users, BarChart3, Settings, Menu, X } from "lucide-react"

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
    <div
      className={cn(
        "fixed left-0 top-0 h-screen bg-gradient-to-b from-purple-600 via-purple-700 to-blue-800 text-white flex flex-col shadow-xl transition-all duration-300 z-40",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      {/* Toggle button */}
      <div className="p-4 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white hover:bg-white/10 p-2 rounded-lg"
        >
          {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "w-full text-white transition-all duration-200 justify-start group",
                isActive ? "bg-white/20 shadow-lg" : "hover:bg-white/10",
                isCollapsed ? "px-3 justify-center" : "px-4",
              )}
              onClick={() => setCurrentPage(item.id)}
              title={isCollapsed ? item.label : undefined}
            >
              <div className={cn("flex items-center", !isCollapsed && "space-x-3")}>
                <Icon className="h-5 w-5" />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
              </div>
            </Button>
          )
        })}
      </nav>
    </div>
  )
}
