"use client"

import { useEffect, useState } from "react"
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"

// Hook para sincronización en tiempo real
export function useRealtimeSync() {
  const [isOnline, setIsOnline] = useState(true)
  const [lastSync, setLastSync] = useState<Date>(new Date())

  useEffect(() => {
    // Detectar estado de conexión
    const handleOnline = () => {
      setIsOnline(true)
      setLastSync(new Date())
      console.log("🟢 Conectado a Firebase - Sincronización activa")
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log("🔴 Sin conexión - Modo offline activado")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return { isOnline, lastSync }
}

// Sincronización de ventas en tiempo real
export function useSalesSync() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log("🔄 Iniciando sincronización de ventas...")

    const unsubscribe = onSnapshot(
      query(collection(db, "sales"), orderBy("timestamp", "desc")),
      (snapshot) => {
        const salesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setSales(salesData)
        setLoading(false)

        console.log(`✅ ${salesData.length} ventas sincronizadas`)
      },
      (error) => {
        console.error("❌ Error en sincronización:", error)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  return { sales, loading }
}

// Sincronización de productos
export function useProductsSync() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log("🔄 Iniciando sincronización de productos...")

    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const productsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setProducts(productsData)
        setLoading(false)

        console.log(`✅ ${productsData.length} productos sincronizados`)
      },
      (error) => {
        console.error("❌ Error en sincronización de productos:", error)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  return { products, loading }
}
