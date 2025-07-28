"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"

export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingSales, setPendingSales] = useState<any[]>([])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success("🟢 Conexión restaurada")
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.warning("🔴 Sin conexión - Modo offline activado")
    }

    setIsOnline(navigator.onLine)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const saveOfflineSale = (saleData: any) => {
    try {
      const offlineData = {
        sales: [...pendingSales, saleData],
        timestamp: Date.now(),
      }

      localStorage.setItem("offline_sales", JSON.stringify(offlineData))
      setPendingSales(offlineData.sales)

      toast.success("💾 Venta guardada offline")
      return true
    } catch (error) {
      console.error("Error saving offline sale:", error)
      toast.error("Error al guardar venta offline")
      return false
    }
  }

  const clearOfflineData = () => {
    localStorage.removeItem("offline_sales")
    setPendingSales([])
    toast.success("Datos offline limpiados")
  }

  return {
    isOnline,
    pendingSales,
    saveOfflineSale,
    clearOfflineData,
  }
}
