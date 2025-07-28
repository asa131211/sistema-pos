"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

export function ConnectionMonitor() {
  const [isOnline, setIsOnline] = useState(true)
  const [connectionQuality, setConnectionQuality] = useState<"good" | "poor" | "offline">("good")
  const [lastSync, setLastSync] = useState<Date>(new Date())

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setConnectionQuality("good")
      setLastSync(new Date())
      toast.success("🟢 Conexión restaurada")
    }

    const handleOffline = () => {
      setIsOnline(false)
      setConnectionQuality("offline")
      toast.warning("🔴 Sin conexión - Modo offline activado")
    }

    // Monitorear calidad de conexión
    const checkConnectionQuality = async () => {
      if (!navigator.onLine) {
        setConnectionQuality("offline")
        return
      }

      try {
        const start = Date.now()
        await fetch("/api/ping", {
          method: "HEAD",
          cache: "no-cache",
        })
        const latency = Date.now() - start

        if (latency > 2000) {
          setConnectionQuality("poor")
        } else {
          setConnectionQuality("good")
          setLastSync(new Date())
        }
      } catch {
        setConnectionQuality("poor")
      }
    }

    // Listeners de conexión
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Verificar calidad cada 30 segundos
    const qualityInterval = setInterval(checkConnectionQuality, 30000)

    // Verificación inicial
    setIsOnline(navigator.onLine)
    checkConnectionQuality()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(qualityInterval)
    }
  }, [])

  const getStatusIcon = () => {
    switch (connectionQuality) {
      case "good":
        return <Wifi className="w-3 h-3" />
      case "poor":
        return <AlertTriangle className="w-3 h-3" />
      case "offline":
        return <WifiOff className="w-3 h-3" />
    }
  }

  const getStatusColor = () => {
    switch (connectionQuality) {
      case "good":
        return "bg-green-500 text-white"
      case "poor":
        return "bg-yellow-500 text-white"
      case "offline":
        return "bg-red-500 text-white"
    }
  }

  const getStatusText = () => {
    switch (connectionQuality) {
      case "good":
        return "En línea"
      case "poor":
        return "Conexión lenta"
      case "offline":
        return "Sin conexión"
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge className={`${getStatusColor()} flex items-center space-x-1`}>
        {getStatusIcon()}
        <span className="text-xs">{getStatusText()}</span>
      </Badge>
      {connectionQuality === "good" && (
        <div className="text-xs text-gray-500 mt-1 text-center">Sync: {lastSync.toLocaleTimeString()}</div>
      )}
    </div>
  )
}
