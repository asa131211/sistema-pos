"use client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Home, ShoppingCart, Package, Users, BarChart3, Settings, Menu, X, Sparkles } from "lucide-react"

interface SidebarProps {
  currentPage: string
  setCurrentPage: (page: string) => void
  userRole: "admin" | "vendedor" | null
  isCollapsed: boolean
  setIsCollapsed: (collapsed: boolean) => void
}

export default function Sidebar({ currentPage, setCurrentPage, userRole, isCollapsed, setIsCollapsed }: SidebarProps) {
  const adminMenuItems = [
    { id: "inicio", label: "Dashboard", icon: Home, color: "from-blue-500 to-blue-600" },
    { id: "ventas", label: "Punto de Venta", icon: ShoppingCart, color: "from-green-500 to-green-600" },
    { id: "productos", label: "Productos", icon: Package, color: "from-purple-500 to-purple-600" },
    { id: "usuarios", label: "Usuarios", icon: Users, color: "from-orange-500 to-orange-600" },
    { id: "reportes", label: "Reportes", icon: BarChart3, color: "from-pink-500 to-pink-600" },
    { id: "configuracion", label: "Configuración", icon: Settings, color: "from-gray-500 to-gray-600" },
  ]

  const vendedorMenuItems = [
    { id: "ventas", label: "Punto de Venta", icon: ShoppingCart, color: "from-green-500 to-green-600" },
    { id: "configuracion", label: "Configuración", icon: Settings, color: "from-gray-500 to-gray-600" },
  ]

  const menuItems = userRole === "admin" ? adminMenuItems : vendedorMenuItems

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white flex flex-col shadow-2xl transition-all duration-300 z-40 border-r border-blue-800/30",
        isCollapsed ? "w-20" : "w-72",
      )}
    >
      {/* Header mejorado */}
      <div
        className={cn(
          "p-6 border-b border-blue-800/30 flex items-center backdrop-blur-sm bg-gradient-to-r from-blue-900/80 to-purple-900/80",
          isCollapsed ? "justify-center p-4" : "justify-between",
        )}
      >
        {!isCollapsed && (
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-xl transform rotate-3 hover:rotate-0 transition-all duration-300 overflow-hidden">
                <img
                  src="/tiger-logo.png"
                  alt="Sanchez Park"
                  className="w-12 h-12 object-contain filter brightness-110"
                />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                Sanchez Park
              </h1>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-sm text-blue-200 capitalize font-medium">
                  {userRole === "admin" ? "Administrador" : "Vendedor"}
                </p>
              </div>
            </div>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-white hover:bg-blue-700/50 p-3 rounded-xl transition-all duration-200 hover:scale-105 border border-blue-700/30"
        >
          {isCollapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
        </Button>
      </div>

      {/* Navegación mejorada */}
      <nav className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
        {menuItems.map((item, index) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <Button
              key={item.id}
              variant="ghost"
              className={cn(
                "w-full text-white transition-all duration-300 justify-start group relative overflow-hidden rounded-xl",
                isActive
                  ? `bg-gradient-to-r ${item.color} shadow-lg hover:shadow-xl transform scale-105`
                  : "hover:bg-blue-800/30 hover:scale-102",
                isCollapsed ? "px-3 justify-center h-14" : "px-4 h-14",
                "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700",
              )}
              onClick={() => setCurrentPage(item.id)}
              title={isCollapsed ? item.label : undefined}
              style={{
                animationDelay: `${index * 0.1}s`,
              }}
            >
              <div className={cn("flex items-center w-full", !isCollapsed && "space-x-4")}>
                <div
                  className={cn(
                    "p-2 rounded-lg transition-all duration-200",
                    isActive ? "bg-white/20 shadow-lg" : "bg-white/10 group-hover:bg-white/20",
                  )}
                >
                  <Icon className={cn("h-5 w-5 transition-all duration-200", isActive && "scale-110 drop-shadow-lg")} />
                </div>
                {!isCollapsed && (
                  <div className="flex-1 text-left">
                    <span className="font-semibold text-base">{item.label}</span>
                  </div>
                )}
                {isActive && !isCollapsed && (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
                  </div>
                )}
              </div>
            </Button>
          )
        })}
      </nav>

      {/* Footer mejorado */}
      {!isCollapsed && (
        <div className="p-4 border-t border-blue-800/30 bg-gradient-to-r from-slate-900/80 to-blue-900/80 backdrop-blur-sm">
          <div className="text-xs text-blue-200 space-y-4">
            <div className="flex items-center justify-center space-x-2 font-semibold text-blue-100 mb-4">
              <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-blue-400 rounded-full animate-pulse"></div>
              <span>Atajos de Teclado</span>
              <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {[
                { label: "Procesar", key: "Enter", color: "from-green-500 to-green-600" },
                { label: "Limpiar", key: "X", color: "from-red-500 to-red-600" },
                { label: "Caja", key: "P", color: "from-blue-500 to-blue-600" },
              ].map((shortcut, index) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between bg-gradient-to-r from-blue-800/40 to-purple-800/40 rounded-xl p-3 border border-blue-700/30 hover:border-blue-600/50 transition-all duration-200"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <span className="text-blue-200 font-medium">{shortcut.label}:</span>
                  <kbd
                    className={cn(
                      "px-3 py-1.5 bg-gradient-to-r rounded-lg text-xs font-mono text-white shadow-lg border border-white/20",
                      shortcut.color,
                    )}
                  >
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
