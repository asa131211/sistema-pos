"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PerformanceMonitor, PERFORMANCE_CONFIG } from "@/lib/performance-config"
import { Activity, Cpu, Wifi, Users, Zap, RefreshCw } from "lucide-react"

export function PerformanceDashboard() {
  const [stats, setStats] = useState<any>({})
  const [memoryUsage, setMemoryUsage] = useState(0)
  const [connectionLatency, setConnectionLatency] = useState(0)
  const [activeUsers, setActiveUsers] = useState(1)

  const performanceMonitor = PerformanceMonitor.getInstance()

  useEffect(() => {
    const updateStats = () => {
      setStats(performanceMonitor.getStats())

      // Memoria (si está disponible)
      if ("memory" in performance) {
        const memory = (performance as any).memory
        const usedMB = memory.usedJSHeapSize / 1024 / 1024
        setMemoryUsage(usedMB)
      }

      // Simular latencia de conexión
      const start = Date.now()
      fetch("/api/ping", { method: "HEAD" })
        .then(() => {
          setConnectionLatency(Date.now() - start)
        })
        .catch(() => {
          setConnectionLatency(9999)
        })
    }

    updateStats()
    const interval = setInterval(updateStats, 5000) // Actualizar cada 5 segundos

    return () => clearInterval(interval)
  }, [])

  const getPerformanceStatus = () => {
    if (memoryUsage > PERFORMANCE_CONFIG.MAX_MEMORY_USAGE_MB) return "critical"
    if (connectionLatency > 2000) return "warning"
    return "good"
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-600 bg-green-100 dark:bg-green-900"
      case "warning":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900"
      case "critical":
        return "text-red-600 bg-red-100 dark:bg-red-900"
      default:
        return "text-gray-600 bg-gray-100 dark:bg-gray-900"
    }
  }

  const status = getPerformanceStatus()

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5 text-purple-600" />
            <span>Monitor de Rendimiento</span>
          </div>
          <Badge className={getStatusColor(status)}>
            {status === "good" && "Óptimo"}
            {status === "warning" && "Advertencia"}
            {status === "critical" && "Crítico"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Métricas principales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Cpu className="h-4 w-4 text-blue-600 mr-1" />
              <span className="text-sm font-medium">Memoria</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{memoryUsage.toFixed(1)} MB</div>
            <Progress value={(memoryUsage / PERFORMANCE_CONFIG.MAX_MEMORY_USAGE_MB) * 100} className="mt-2" />
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Wifi className="h-4 w-4 text-green-600 mr-1" />
              <span className="text-sm font-medium">Latencia</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{connectionLatency}ms</div>
            <div className="text-xs text-gray-500 mt-1">
              {connectionLatency < 500 ? "Excelente" : connectionLatency < 1000 ? "Buena" : "Lenta"}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="h-4 w-4 text-purple-600 mr-1" />
              <span className="text-sm font-medium">Usuarios</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{activeUsers}</div>
            <div className="text-xs text-gray-500 mt-1">Activos</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Zap className="h-4 w-4 text-yellow-600 mr-1" />
              <span className="text-sm font-medium">Operaciones</span>
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {Object.keys(stats.operationCounts || {}).length}
            </div>
            <div className="text-xs text-gray-500 mt-1">Por minuto</div>
          </div>
        </div>

        {/* Configuración de límites */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Límites de Rendimiento</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Productos por página:</span>
              <span className="font-medium">{PERFORMANCE_CONFIG.MAX_PRODUCTS_PER_PAGE}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Items en carrito:</span>
              <span className="font-medium">{PERFORMANCE_CONFIG.MAX_CART_ITEMS}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Operaciones/min:</span>
              <span className="font-medium">{PERFORMANCE_CONFIG.MAX_OPERATIONS_PER_MINUTE}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Búsqueda delay:</span>
              <span className="font-medium">{PERFORMANCE_CONFIG.SEARCH_DEBOUNCE_MS}ms</span>
            </div>
          </div>
        </div>

        {/* Recomendaciones */}
        {status !== "good" && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Recomendaciones:</h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              {memoryUsage > PERFORMANCE_CONFIG.MAX_MEMORY_USAGE_MB && (
                <li>• Considera recargar la página para liberar memoria</li>
              )}
              {connectionLatency > 2000 && <li>• Verifica tu conexión a internet</li>}
              {Object.keys(stats.operationCounts || {}).length > 50 && <li>• Reduce la frecuencia de operaciones</li>}
            </ul>
          </div>
        )}

        {/* Botón de limpieza */}
        <div className="text-center">
          <Button
            onClick={() => {
              // Limpiar caché y recargar
              if ("caches" in window) {
                caches.keys().then((names) => {
                  names.forEach((name) => {
                    caches.delete(name)
                  })
                })
              }
              window.location.reload()
            }}
            variant="outline"
            size="sm"
            className="bg-white dark:bg-gray-800"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Optimizar Sistema
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
