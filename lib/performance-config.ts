// Configuración de rendimiento y límites
export const PERFORMANCE_CONFIG = {
  // Límites de datos
  MAX_PRODUCTS_PER_PAGE: 20,
  MAX_SALES_HISTORY: 100,
  MAX_CART_ITEMS: 50,

  // Timeouts y delays
  SEARCH_DEBOUNCE_MS: 300,
  SYNC_RETRY_DELAY_MS: 1000,
  CONNECTION_CHECK_INTERVAL_MS: 30000,

  // Cache settings
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutos
  MAX_CACHE_SIZE: 100,

  // Rate limiting
  MAX_OPERATIONS_PER_MINUTE: 60,
  MAX_CONCURRENT_OPERATIONS: 5,

  // Memory management
  CLEANUP_INTERVAL_MS: 10 * 60 * 1000, // 10 minutos
  MAX_MEMORY_USAGE_MB: 100,
}

// Monitor de rendimiento
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private operationCounts: Map<string, number> = new Map()
  private lastCleanup: number = Date.now()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  trackOperation(operation: string): boolean {
    const now = Date.now()
    const key = `${operation}-${Math.floor(now / 60000)}` // Por minuto

    const count = this.operationCounts.get(key) || 0

    if (count >= PERFORMANCE_CONFIG.MAX_OPERATIONS_PER_MINUTE) {
      console.warn(`🚫 Rate limit exceeded for ${operation}`)
      return false
    }

    this.operationCounts.set(key, count + 1)

    // Cleanup periódico
    if (now - this.lastCleanup > PERFORMANCE_CONFIG.CLEANUP_INTERVAL_MS) {
      this.cleanup()
    }

    return true
  }

  private cleanup() {
    const now = Date.now()
    const currentMinute = Math.floor(now / 60000)

    // Remover contadores antiguos
    for (const [key] of this.operationCounts) {
      const keyMinute = Number.parseInt(key.split("-").pop() || "0")
      if (currentMinute - keyMinute > 5) {
        // Mantener últimos 5 minutos
        this.operationCounts.delete(key)
      }
    }

    this.lastCleanup = now

    // Log de memoria si está disponible
    if ("memory" in performance) {
      const memory = (performance as any).memory
      const usedMB = memory.usedJSHeapSize / 1024 / 1024

      if (usedMB > PERFORMANCE_CONFIG.MAX_MEMORY_USAGE_MB) {
        console.warn(`🧠 High memory usage: ${usedMB.toFixed(2)}MB`)
      }
    }
  }

  getStats() {
    return {
      operationCounts: Object.fromEntries(this.operationCounts),
      lastCleanup: new Date(this.lastCleanup).toISOString(),
    }
  }
}
