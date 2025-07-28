"use client"

import { usePerformanceMonitor } from "@/hooks/use-performance-monitor"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Activity, Zap, Wifi, AlertTriangle, Gauge } from "lucide-react"

export function PerformanceMonitor() {
  const { metrics, isHighLoad, optimizePerformance } = usePerformanceMonitor()

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-sm">
          <Gauge className="h-4 w-4" />
          <span>Monitor de Rendimiento</span>
          {isHighLoad && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Alta Carga
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Render Time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <Activity className="h-3 w-3" />
              <span>Tiempo de Render</span>
            </div>
            <span className="font-mono">{metrics.renderTime.toFixed(1)}ms</span>
          </div>
          <Progress value={Math.min(metrics.renderTime / 10, 100)} className="h-1" />
        </div>

        {/* Memory Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <Zap className="h-3 w-3" />
              <span>Uso de Memoria</span>
            </div>
            <span className="font-mono">{metrics.memoryUsage.toFixed(1)}%</span>
          </div>
          <Progress value={metrics.memoryUsage} className="h-1" />
        </div>

        {/* Network Latency */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <Wifi className="h-3 w-3" />
              <span>Latencia de Red</span>
            </div>
            <span className="font-mono">{metrics.networkLatency.toFixed(0)}ms</span>
          </div>
          <Progress value={Math.min(metrics.networkLatency / 10, 100)} className="h-1" />
        </div>

        {/* Error Count */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3" />
            <span>Errores</span>
          </div>
          <Badge variant={metrics.errorCount > 0 ? "destructive" : "secondary"} className="text-xs">
            {metrics.errorCount}
          </Badge>
        </div>

        {/* Optimize Button */}
        {isHighLoad && (
          <Button onClick={optimizePerformance} size="sm" className="w-full text-xs bg-transparent" variant="outline">
            <Zap className="h-3 w-3 mr-1" />
            Optimizar Rendimiento
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
