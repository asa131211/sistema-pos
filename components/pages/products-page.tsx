"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Edit, Trash2, Upload, Package } from "lucide-react"
import { toast } from "sonner"

interface Product {
  id: string
  name: string
  price: number
  image: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    image: "",
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, "products")), (snapshot) => {
      const productsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Product[]
      setProducts(productsData)
    })

    return () => unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.price) {
      toast.error("Por favor completa todos los campos")
      return
    }

    setUploading(true)
    try {
      const productData = {
        name: formData.name,
        price: Number.parseFloat(formData.price),
        image: formData.image,
      }

      if (editingProduct) {
        await updateDoc(doc(db, "products", editingProduct.id), productData)
        toast.success("Producto actualizado exitosamente")
      } else {
        await addDoc(collection(db, "products"), productData)
        toast.success("Producto agregado exitosamente")
      }

      resetForm()
    } catch (error: any) {
      console.error("Error saving product:", error)
      toast.error(error.message || "Error al guardar el producto")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este producto?")) {
      try {
        await deleteDoc(doc(db, "products", id))
        toast.success("Producto eliminado exitosamente")
      } catch (error) {
        console.error("Error deleting product:", error)
        toast.error("Error al eliminar el producto")
      }
    }
  }

  const resetForm = () => {
    setFormData({ name: "", price: "", image: "" })
    setEditingProduct(null)
    setShowAddDialog(false)
  }

  const startEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      price: product.price.toString(),
      image: product.image,
    })
    setShowAddDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Productos</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestiona el catálogo de productos</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingProduct(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Producto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProduct ? "Editar Producto" : "Agregar Producto"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Juego</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre del producto"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Precio (S/.)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="image">URL de la Imagen</Label>
                <Input
                  id="image"
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
                <p className="text-xs text-gray-500">
                  Pega la URL de una imagen externa o déjalo vacío para usar placeholder
                </p>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={uploading} className="flex-1">
                  {uploading ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : editingProduct ? (
                    "Actualizar"
                  ) : (
                    "Agregar"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="mr-2 h-5 w-5" />
            Lista de Productos ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Imagen</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <img
                      src={product.image || "/placeholder.svg?height=50&width=50"}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>S/. {product.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                    No hay productos registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
