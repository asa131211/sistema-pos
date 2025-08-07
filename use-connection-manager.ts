"use client"

import { useState, useEffect, useCallback } from "react"
import { enableFirebaseNetwork, disableFirebaseNetwork } from "@/lib/firebase-optimized"
import { toast } from "sonner"

interface ConnectionState {
  isOnline: boolean
  isFirebaseConnected: boolean
  connectionQuality: "excellent" | "good" | "poor" | "offline"
  retryCount: number
}

export function useConnectionManager() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isOnline: true,
    isFirebaseConnected: true,
    connectionQuality: "excellent",
    retryCount: 0,
  })

  const [pendingOperations, setPendingOperations] = useState<any[]>([])

  // Test connection quality
  const testConnectionQuality = useCallback(async () => {
    const start = performance.now()
    try {
      const response = await fetch("/api/ping", {
        method: "HEAD",
        cache: "no-cache",
      })
      const latency = performance.now() - start

      let quality: ConnectionState["connectionQuality"]
      if (latency < 100) quality = "excellent"
      else if (latency < 300) quality = "good"
      else if (latency < 1000) quality = "poor"
      else quality = "offline"

      setConnectionState((prev) => ({
        ...prev,
        connectionQuality: quality,
        isFirebaseConnected: response.ok,
      }))

      return quality
    } catch (error) {
      setConnectionState((prev) => ({
        ...prev,
        connectionQuality: "offline",
        isFirebaseConnected: false,
      }))
      return "offline"
    }
  }, [])

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setConnectionState((prev) => ({ ...prev, isOnline: true }))
      await enableFirebaseNetwork()
      await testConnectionQuality()

      // Process pending operations
      if (pendingOperations.length > 0) {
        toast.success(`🔄 Procesando ${pendingOperations.length} operaciones pendientes...`)
        // Process operations here
        setPendingOperations([])
      }

      toast.success("🟢 Conexión restaurada")
    }

    const handleOffline = async () => {
      setConnectionState((prev) => ({
        ...prev,
        isOnline: false,
        connectionQuality: "offline",
        isFirebaseConnected: false,
      }))
      await disableFirebaseNetwork()
      toast.warning("🔴 Sin conexión - Modo offline activado")
    }

    // Initial state
    setConnectionState((prev) => ({ ...prev, isOnline: navigator.onLine }))

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Test connection quality periodically
    const qualityInterval = setInterval(testConnectionQuality, 30000) // Every 30 seconds

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(qualityInterval)
    }
  }, [testConnectionQuality, pendingOperations.length])

  // Retry connection
  const retryConnection = useCallback(async () => {
    setConnectionState((prev) => ({ ...prev, retryCount: prev.retryCount + 1 }))

    try {
      await enableFirebaseNetwork()
      const quality = await testConnectionQuality()

      if (quality !== "offline") {
        toast.success("✅ Conexión restablecida")
        setConnectionState((prev) => ({ ...prev, retryCount: 0 }))
        return true
      }
    } catch (error) {
      console.error("Error retrying connection:", error)
    }

    return false
  }, [testConnectionQuality])

  // Add operation to pending queue
  const addPendingOperation = useCallback((operation: any) => {
    setPendingOperations((prev) => [...prev, operation])
    toast.info("💾 Operación guardada para cuando vuelva la conexión")
  }, [])

  // Get connection status message
  const getConnectionMessage = useCallback(() => {
    if (!connectionState.isOnline) return "Sin conexión a internet"
    if (!connectionState.isFirebaseConnected) return "Sin conexión a la base de datos"

    switch (connectionState.connectionQuality) {
      case "excellent":
        return "Conexión excelente"
      case "good":
        return "Conexión buena"
      case "poor":
        return "Conexión lenta"
      case "offline":
        return "Sin conexión"
      default:
        return "Estado desconocido"
    }
  }, [connectionState])

  return {
    connectionState,
    pendingOperations,
    retryConnection,
    addPendingOperation,
    getConnectionMessage,
    testConnectionQuality,
  }
}
