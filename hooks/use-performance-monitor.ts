"use client"

import { useEffect, useRef } from "react"

export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0)
  const startTime = useRef(Date.now())

  useEffect(() => {
    renderCount.current += 1
    const renderTime = Date.now() - startTime.current

    // Log solo si el render toma más de 100ms
    if (renderTime > 100) {
      console.warn(`🐌 Slow render in ${componentName}: ${renderTime}ms (render #${renderCount.current})`)
    }

    // Reset timer para próximo render
    startTime.current = Date.now()
  })

  useEffect(() => {
    // Log estadísticas cada 50 renders
    if (renderCount.current % 50 === 0) {
      console.log(`📊 ${componentName} stats: ${renderCount.current} renders`)
    }
  })

  return { renderCount: renderCount.current }
}
