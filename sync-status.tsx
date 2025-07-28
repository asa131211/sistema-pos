"use client"

import { useRealtimeSync } from "@/lib/firebase-sync"
import { Badge } from "@/components/ui/badge"
import { Wifi, WifiOff, RefreshCw } from "lucide-react"

export function SyncStatus() {
  const { isOnline, lastSync } = useRealtimeSync()

  return (
    <div className="flex items-center space-x-2 text-sm">
      {isOnline ? (
        <>
          <Badge variant="default" className="bg-green-500">
            <Wifi className="w-3 h-3 mr-1" />
            En línea
          </Badge>
          <span className="text-gray-500">Última sync: {lastSync.toLocaleTimeString()}</span>
        </>
      ) : (
        <>
          <Badge variant="destructive">
            <WifiOff className="w-3 h-3 mr-1" />
            Sin conexión
          </Badge>
          <span className="text-gray-500">Modo offline</span>
        </>
      )}
    </div>
  )
}

// Indicador de sincronización para el dashboard
export function SyncIndicator() {
  const { isOnline } = useRealtimeSync()

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOnline ? (
        <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs flex items-center">
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          Sincronizando...
        </div>
      ) : (
        <div className="bg-red-500 text-white px-3 py-1 rounded-full text-xs flex items-center">
          <WifiOff className="w-3 h-3 mr-1" />
          Sin conexión
        </div>
      )}
    </div>
  )
}
