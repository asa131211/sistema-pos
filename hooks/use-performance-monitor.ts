"use client"

import { useEffect, useState } from "react"

interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  networkLatency: number
  errorCount: number
  activeConnections: number
}

export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    networkLatency: 0,
    errorCount: 0,
    activeConnections: 0,
  })

  const [isHighLoad, setIsHighLoad] = useState(false)

  useEffect(() => {
    let errorCount = 0
    const startTime = performance.now()

    // Monitor render performance
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.entryType === "measure") {
          setMetrics((prev) => ({
            ...prev,
            renderTime: entry.duration,
          }))
        }
      })
    })

    observer.observe({ entryTypes: ["measure"] })

    // Monitor memory usage
    const checkMemory = () => {
      if ("memory" in performance) {
        const memory = (performance as any).memory
        const memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit

        setMetrics((prev) => ({
          ...prev,
          memoryUsage: memoryUsage * 100,
        }))

        // Alert if memory usage is high
        if (memoryUsage > 0.8) {
          setIsHighLoad(true)
          console.warn("🚨 High memory usage detected:", memoryUsage)
        } else {
          setIsHighLoad(false)
        }
      }
    }

    // Monitor network latency
    const checkNetworkLatency = async () => {
      const start = performance.now()
      try {
        await fetch("/api/ping", { method: "HEAD" })
        const latency = performance.now() - start
        setMetrics((prev) => ({
          ...prev,
          networkLatency: latency,
        }))
      } catch (error) {
        errorCount++
        setMetrics((prev) => ({
          ...prev,
          errorCount: errorCount,
        }))
      }
    }

    // Monitor errors
    const handleError = (event: ErrorEvent) => {
      errorCount++
      setMetrics((prev) => ({
        ...prev,
        errorCount: errorCount,
      }))
      console.error("Performance Monitor - Error detected:", event.error)
    }

    window.addEventListener("error", handleError)

    // Set up intervals
    const memoryInterval = setInterval(checkMemory, 5000) // Check every 5 seconds
    const networkInterval = setInterval(checkNetworkLatency, 10000) // Check every 10 seconds

    // Cleanup
    return () => {
      observer.disconnect()
      window.removeEventListener("error", handleError)
      clearInterval(memoryInterval)
      clearInterval(networkInterval)
    }
  }, [])

  const optimizePerformance = () => {
    // Force garbage collection if available
    if ("gc" in window) {
      ;(window as any).gc()
    }

    // Clear caches
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          if (name.includes("old") || name.includes("temp")) {
            caches.delete(name)
          }
        })
      })
    }

    // Clear localStorage of old data
    const now = Date.now()
    Object.keys(localStorage).forEach((key) => {
      if (key.includes("temp_") || key.includes("cache_")) {
        const item = localStorage.getItem(key)
        if (item) {
          try {
            const data = JSON.parse(item)
            if (data.timestamp && now - data.timestamp > 24 * 60 * 60 * 1000) {
              localStorage.removeItem(key)
            }
          } catch (e) {
            localStorage.removeItem(key)
          }
        }
      }
    })

    console.log("🚀 Performance optimization completed")
  }

  return {
    metrics,
    isHighLoad,
    optimizePerformance,
  }
}
