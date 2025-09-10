"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, limit } from "firebase/firestore"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package, Plus, Search, Edit, Trash2, Tag, Save, X, Upload, Camera } from "lucide-react"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  price: number
  image: string
  category: string
  description?: string
  stock?: number
  active: boolean
}

interface ProductsPageProps {
  sidebarCollapsed?: boolean
}

export default function ProductsPage({ sidebarCollapsed = false }: ProductsPageProps) {
  const [user] = useAuthState(auth)
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    image: "",
  })

  const getCacheKey = () => "products-cache"

  const getCachedProducts = () => {
    try {
      const cached = localStorage.getItem(getCacheKey())
      if (cached) {
        const data = JSON.parse(cached)
        const now = Date.now()
        // Cache válido por 3 minutos para productos
        if (data.timestamp && now - data.timestamp < 3 * 60 * 1000) {
          console.log("📦 Cargando productos desde cache local")
          return data.products
        }
      }
    } catch (error) {
      console.warn("Error leyendo cache de productos:", error)
    }
    return null
  }

  const setCachedProducts = (productsData: Product[]) => {
    try {
      const cacheData = {
        products: productsData,
        timestamp: Date.now(),
      }
      localStorage.setItem(getCacheKey(), JSON.stringify(cacheData))
      console.log("💾 Productos guardados en cache local")
    } catch (error) {
      console.warn("Error guardando cache de productos:", error)
    }
  }

  useEffect(() => {
    console.log("🔍 Iniciando carga optimizada de productos...")

    const cachedProducts = getCachedProducts()
    if (cachedProducts) {
      setProducts(cachedProducts)
    }

    const productsQuery = query(
      collection(db, "products"),
      limit(200), // Limitar a 200 productos más recientes
    )

    const unsubscribe = onSnapshot(
      productsQuery,
      (snapshot) => {
        console.log(`📄 Productos recibidos: ${snapshot.docs.length}`)

        const productsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[]

        setProducts(productsData)
        setCachedProducts(productsData)
        console.log(`✅ Total productos cargados: ${productsData.length}`)
      },
      (error) => {
        console.error("❌ Error cargando productos:", error)
        toast.error("Error al cargar productos: " + error.message)
      },
    )

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    return () => {
      // Limpiar cache antiguo de productos
      const now = Date.now()
      const maxAge = 3 * 60 * 1000 // 3 minutos

      try {
        const cached = localStorage.getItem(getCacheKey())
        if (cached) {
          const data = JSON.parse(cached)
          if (data.timestamp && now - data.timestamp > maxAge) {
            localStorage.removeItem(getCacheKey())
            console.log("🧹 Cache de productos limpiado")
          }
        }
      } catch (error) {
        console.warn("Error limpiando cache de productos:", error)
      }
    }
  }, [])

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      image: "",
    })
    setImagePreview("")
    setEditingProduct(null)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen debe ser menor a 5MB")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setImagePreview(result)
        setFormData({ ...formData, image: result })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.price) {
      toast.error("Nombre y precio son obligatorios")
      return
    }

    setLoading(true)
    try {
      const productData = {
        name: formData.name,
        price: Number.parseFloat(formData.price),
        image: formData.image,
        category: "juegos", // Categoría por defecto
        active: true,
        updatedAt: new Date(),
      }

      if (editingProduct) {
        await updateDoc(doc(db, "products", editingProduct.id), productData)
        toast.success("Producto actualizado exitosamente")
      } else {
        await addDoc(collection(db, "products"), {
          ...productData,
          createdAt: new Date(),
        })
        toast.success("Producto agregado exitosamente")
      }

      localStorage.removeItem(getCacheKey())

      resetForm()
      setShowAddDialog(false)
    } catch (error) {
      console.error("Error saving product:", error)
      toast.error("Error al guardar producto")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      price: product.price.toString(),
      image: product.image,
    })
    setImagePreview(product.image)
    setShowAddDialog(true)
  }

  const handleDelete = async (productId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este producto?")) return

    try {
      await deleteDoc(doc(db, "products", productId))
      toast.success("Producto eliminado exitosamente")

      localStorage.removeItem(getCacheKey())
    } catch (error) {
      console.error("Error deleting product:", error)
      toast.error("Error al eliminar producto")
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 ml-16">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Productos</h1>
                <p className="text-gray-600">Administra tu inventario y catálogo</p>
              </div>
            </div>

            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="bg-green-600 hover:bg-green-700 text-white h-12 px-6 rounded-xl font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Producto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-gray-900 text-center">
                    {editingProduct ? "Editar Producto" : "Nuevo Producto"}
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                      Nombre del Producto *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej: FIFA 24"
                      required
                      className="h-10 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-lg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price" className="text-sm font-medium text-gray-700">
                      Precio (S/.) *
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                        S/.
                      </span>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0.00"
                        required
                        className="pl-10 h-10 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">Imagen del Producto</Label>
                    <div className="space-y-3">
                      {imagePreview ? (
                        <div className="relative">
                          <img
                            src={imagePreview || "/placeholder.svg"}
                            alt="Preview"
                            className="w-full h-32 object-cover rounded-lg border border-gray-200"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 h-6 w-6 p-0 rounded-full"
                            onClick={() => {
                              setImagePreview("")
                              setFormData({ ...formData, image: "" })
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Package className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm text-gray-600 mb-3">Selecciona una imagen</p>
                          <div className="flex justify-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById("file-upload")?.click()}
                              className="bg-transparent"
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              Archivo
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => document.getElementById("camera-upload")?.click()}
                              className="bg-transparent"
                            >
                              <Camera className="h-3 w-3 mr-1" />
                              Cámara
                            </Button>
                          </div>
                        </div>
                      )}

                      <input
                        id="file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <input
                        id="camera-upload"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetForm()
                        setShowAddDialog(false)
                      }}
                      className="flex-1 h-10 border-2 rounded-lg font-medium"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1 h-10 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium"
                    >
                      {loading ? (
                        <img src="/loading-wheel.gif" alt="Guardando..." className="w-4 h-4 mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      {editingProduct ? "Actualizar" : "Guardar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-64 h-12 border-gray-200 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                <SelectItem value="juegos">Juegos</SelectItem>
                <SelectItem value="consolas">Consolas</SelectItem>
                <SelectItem value="accesorios">Accesorios</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de productos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {/* Imagen del producto */}
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={product.image || "/placeholder.svg?height=300&width=300&text=Sin+Imagen"}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = "/placeholder.svg?height=300&width=300&text=Error"
                    }}
                  />
                  <div className="absolute top-3 left-3">
                    <Badge variant={product.active ? "default" : "secondary"} className="text-xs">
                      {product.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <div className="absolute top-3 right-3 flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(product)}
                      className="h-8 w-8 p-0 bg-white/90 hover:bg-white border-white/50 rounded-lg"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(product.id)}
                      className="h-8 w-8 p-0 bg-red-500/90 hover:bg-red-600 border-red-500/50 rounded-lg"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Información del producto */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{product.name}</h3>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 capitalize">{product.category}</span>
                    </div>
                    <div className="text-lg font-bold text-green-600">S/. {product.price.toFixed(2)}</div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>ID: {product.id.slice(-6)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay productos</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedCategory !== "all"
                ? "No se encontraron productos con los filtros aplicados"
                : "Comienza agregando tu primer producto"}
            </p>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white h-12 px-6 rounded-xl font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Producto
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
