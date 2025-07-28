"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, limit, startAfter, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface Product {
  id: string
  name: string
  price: number
  image: string
  category?: string
}

export function useOptimizedProducts(pageSize = 20) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [lastDoc, setLastDoc] = useState(null)

  // Cargar productos con paginación
  const loadProducts = async (isInitial = false) => {
    try {
      let productsQuery = query(collection(db, "products"), orderBy("name"), limit(pageSize))

      if (!isInitial && lastDoc) {
        productsQuery = query(collection(db, "products"), orderBy("name"), startAfter(lastDoc), limit(pageSize))
      }

      const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
        const newProducts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[]

        if (isInitial) {
          setProducts(newProducts)
        } else {
          setProducts((prev) => [...prev, ...newProducts])
        }

        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null)
        setHasMore(snapshot.docs.length === pageSize)
        setLoading(false)
      })

      return unsubscribe
    } catch (error) {
      console.error("Error loading products:", error)
      setLoading(false)
    }
  }

  useEffect(() => {
    const unsubscribe = loadProducts(true)
    return () => unsubscribe?.()
  }, [])

  const loadMore = () => {
    if (!loading && hasMore) {
      loadProducts(false)
    }
  }

  return { products, loading, hasMore, loadMore }
}
