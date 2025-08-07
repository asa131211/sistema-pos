// Rate Limiter para operaciones críticas
export class RateLimiter {
  private static instance: RateLimiter
  private operations: Map<string, number[]> = new Map()

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter()
    }
    return RateLimiter.instance
  }

  canPerformOperation(operationType: string, maxOperations: number, windowMs: number): boolean {
    const now = Date.now()
    const key = operationType

    // Obtener operaciones previas
    const operations = this.operations.get(key) || []

    // Filtrar operaciones dentro de la ventana de tiempo
    const recentOperations = operations.filter((timestamp) => now - timestamp < windowMs)

    // Verificar si se puede realizar la operación
    if (recentOperations.length >= maxOperations) {
      return false
    }

    // Agregar la nueva operación
    recentOperations.push(now)
    this.operations.set(key, recentOperations)

    return true
  }

  getRemainingOperations(operationType: string, maxOperations: number, windowMs: number): number {
    const now = Date.now()
    const operations = this.operations.get(operationType) || []
    const recentOperations = operations.filter((timestamp) => now - timestamp < windowMs)

    return Math.max(0, maxOperations - recentOperations.length)
  }

  getResetTime(operationType: string, windowMs: number): number {
    const operations = this.operations.get(operationType) || []
    if (operations.length === 0) return 0

    const oldestOperation = Math.min(...operations)
    return oldestOperation + windowMs
  }

  clearOperations(operationType?: string) {
    if (operationType) {
      this.operations.delete(operationType)
    } else {
      this.operations.clear()
    }
  }
}

// Hook para usar rate limiting
export function useRateLimit(operationType: string, maxOperations: number, windowMs: number) {
  const rateLimiter = RateLimiter.getInstance()

  const canPerform = () => rateLimiter.canPerformOperation(operationType, maxOperations, windowMs)
  const remaining = () => rateLimiter.getRemainingOperations(operationType, maxOperations, windowMs)
  const resetTime = () => rateLimiter.getResetTime(operationType, windowMs)

  return { canPerform, remaining, resetTime }
}
