"use client"

import { memo, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tag } from "lucide-react"
import { usePerformanceMonitor } from "@/hooks/use-performance-monitor"

interface Product {
  id: string
  name: string
  price: number
  image: string
  category?: string
}

interface ProductCardProps {
  product: Product
  shortcut?: { key: string }
  onAddToCart: (product: Product) => void
}

// Memoizar cada producto individual
const ProductCard = memo(({ product, shortcut, onAddToCart }: ProductCardProps) => {
  usePerformanceMonitor(`ProductCard-${product.id}`)

  const handleClick = useCallback(() => {
    onAddToCart(product)
  }, [product, onAddToCart])

  return (
    <Card
      className="cursor-pointer transition-all duration-200 hover:shadow-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover-lift"
      onClick={handleClick}
      data-product-shortcut={shortcut?.key}
    >
      <CardContent className="p-0">
        <div className="relative aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <img
            src={product.image || "/placeholder.svg?height=300&width=300&text=Sin+Imagen"}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy" // Lazy loading nativo
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = "/placeholder.svg?height=300&width=300&text=Error"
            }}
          />
          {shortcut && (
            <Badge className="absolute top-3 left-3 bg-blue-600 text-white">{shortcut.key.toUpperCase()}</Badge>
          )}
        </div>

        <div className="p-3 md:p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 text-sm md:text-base">
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Tag className="h-4 w-4 text-gray-400" />
              <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                {product.category || "juegos"}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm md:text-lg font-bold text-green-600">S/. {product.price.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

ProductCard.displayName = "ProductCard"

interface OptimizedProductGridProps {
  products: Product[]
  shortcuts: any[]
  onAddToCart: (product: Product) => void
}

export const OptimizedProductGrid = memo(({ products, shortcuts, onAddToCart }: OptimizedProductGridProps) => {
  usePerformanceMonitor("OptimizedProductGrid")

  const getShortcut = useCallback(
    (productId: string) => {
      return shortcuts.find((s) => s.productId === productId)
    },
    [shortcuts],
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} shortcut={getShortcut(product.id)} onAddToCart={onAddToCart} />
      ))}
    </div>
  )
})

OptimizedProductGrid.displayName = "OptimizedProductGrid"
