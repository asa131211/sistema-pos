"use client"

import { useState, useEffect, useMemo } from "react"

export function useDebouncedSearch<T>(items: T[], searchTerm: string, searchFields: (keyof T)[], delay = 300) {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, delay)

    return () => clearTimeout(timer)
  }, [searchTerm, delay])

  const filteredItems = useMemo(() => {
    if (!debouncedTerm.trim()) return items

    return items.filter((item) =>
      searchFields.some((field) => {
        const value = item[field]
        return typeof value === "string" && value.toLowerCase().includes(debouncedTerm.toLowerCase())
      }),
    )
  }, [items, debouncedTerm, searchFields])

  return { filteredItems, isSearching: searchTerm !== debouncedTerm }
}
