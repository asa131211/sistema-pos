"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"

interface OfflineData {
  sales: any[]
  timestamp: number
}

export function useOfflineMode() {
  const [isOnline, setIsOnline] = useState(true)
  const [pendingSales, setPendingSales] = useState<any[]>([])

  useEffect(() => {
    // Detectar estado de conexión
    const handleOnline = () => {
      setIsOnline(true)
      toast.success("🟢 Conexión restaurada - Sincronizando datos...")
      syncPendingData()
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.warning("🔴 Sin conexión - Modo offline activado")
    }

    // Verificar estado inicial
    setIsOnline(navigator.onLine)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Cargar datos pendientes al iniciar
    loadPendingData()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Guardar venta en modo offline
  const saveOfflineSale = (saleData: any) => {
    try {
      const offlineData: OfflineData = {
        sales: [...pendingSales, saleData],
        timestamp: Date.now(),
      }

      localStorage.setItem("offline_sales", JSON.stringify(offlineData))
      setPendingSales(offlineData.sales)

      toast.success("💾 Venta guardada offline - Se sincronizará cuando vuelva la conexión")
      return true
    } catch (error) {
      console.error("Error saving offline sale:", error)
      toast.error("Error al guardar venta offline")
      return false
    }
  }

  // Cargar datos pendientes
  const loadPendingData = () => {
    try {
      const stored = localStorage.getItem("offline_sales")
      if (stored) {
        const offlineData: OfflineData = JSON.parse(stored)
        setPendingSales(offlineData.sales || [])
      }
    } catch (error) {
      console.error("Error loading offline data:", error)
    }
  }

  // Sincronizar datos pendientes cuando vuelva la conexión
  const syncPendingData = async () => {
    if (pendingSales.length === 0) return

    try {
      // Aquí implementarías la lógica para enviar las ventas a Firebase
      console.log(`🔄 Sincronizando ${pendingSales.length} ventas pendientes...`)

      // Simular sincronización (reemplazar con lógica real de Firebase)
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Limpiar datos offline después de sincronizar
      localStorage.removeItem("offline_sales")
      setPendingSales([])

      toast.success(`✅ ${pendingSales.length} ventas sincronizadas exitosamente`)
    } catch (error) {
      console.error("Error syncing offline data:", error)
      toast.error("Error al sincronizar datos offline")
    }
  }

  // Limpiar datos offline manualmente
  const clearOfflineData = () => {
    localStorage.removeItem("offline_sales")
    setPendingSales([])
    toast.success("Datos offline limpiados")
  }

  return {
    isOnline,
    pendingSales,
    saveOfflineSale,
    syncPendingData,
    clearOfflineData,
  }
}
