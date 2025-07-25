"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Keyboard, Moon, Sun, Plus, Edit, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface SettingsPageProps {
  darkMode: boolean
  setDarkMode: (darkMode: boolean) => void
}

interface Shortcut {
  id: string
  key: string
  productId: string
  productName: string
}

export default function SettingsPage({ darkMode, setDarkMode }: SettingsPageProps) {
  const [user] = useAuthState(auth)
  const [userProfile, setUserProfile] = useState({
    name: "",
    email: "",
    role: "",
  })
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([])
  const [products, setProducts] = useState([])
  const [showShortcutDialog, setShowShortcutDialog] = useState(false)
  const [editingShortcut, setEditingShortcut] = useState<Shortcut | null>(null)
  const [shortcutForm, setShortcutForm] = useState({
    key: "",
    productId: "",
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserProfile({
              name: userData.name || "",
              email: userData.email || user.email || "",
              role: userData.role || "",
            })
            setShortcuts(userData.shortcuts || [])
          }
        } catch (error) {
          console.error("Error fetching user profile:", error)
        }
      }
    }

    const fetchProducts = async () => {
      try {
        const productsSnapshot = await getDocs(collection(db, "products"))
        const productsData = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setProducts(productsData)
      } catch (error) {
        console.error("Error fetching products:", error)
      }
    }

    fetchUserProfile()
    fetchProducts()
  }, [user])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    try {
      await updateDoc(doc(db, "users", user.uid), {
        name: userProfile.name,
        email: userProfile.email,
      })
      toast.success("Perfil actualizado exitosamente")
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Error al actualizar el perfil")
    } finally {
      setLoading(false)
    }
  }

  const handleShortcutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !shortcutForm.key || !shortcutForm.productId) {
      toast.error("Por favor completa todos los campos")
      return
    }

    // Verificar que la tecla no esté en uso
    const existingShortcut = shortcuts.find(
      (s) => s.key?.toLowerCase() === shortcutForm.key?.toLowerCase() && s.id !== editingShortcut?.id,
    )
    if (existingShortcut) {
      toast.error("Esta tecla ya está asignada a otro producto")
      return
    }

    const selectedProduct = products.find((p) => p.id === shortcutForm.productId)
    if (!selectedProduct) return

    const newShortcut = {
      id: editingShortcut?.id || Date.now().toString(),
      key: shortcutForm.key.toLowerCase(),
      productId: shortcutForm.productId,
      productName: selectedProduct.name,
    }

    let updatedShortcuts
    if (editingShortcut) {
      updatedShortcuts = shortcuts.map((s) => (s.id === editingShortcut.id ? newShortcut : s))
    } else {
      updatedShortcuts = [...shortcuts, newShortcut]
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        shortcuts: updatedShortcuts,
      })
      setShortcuts(updatedShortcuts)
      setShortcutForm({ key: "", productId: "" })
      setEditingShortcut(null)
      setShowShortcutDialog(false)
      toast.success(editingShortcut ? "Atajo actualizado" : "Atajo creado exitosamente")
    } catch (error) {
      console.error("Error saving shortcut:", error)
      toast.error("Error al guardar el atajo")
    }
  }

  const handleDeleteShortcut = async (shortcutId: string) => {
    if (!user) return

    const updatedShortcuts = shortcuts.filter((s) => s.id !== shortcutId)
    try {
      await updateDoc(doc(db, "users", user.uid), {
        shortcuts: updatedShortcuts,
      })
      setShortcuts(updatedShortcuts)
      toast.success("Atajo eliminado exitosamente")
    } catch (error) {
      console.error("Error deleting shortcut:", error)
      toast.error("Error al eliminar el atajo")
    }
  }

  const startEditShortcut = (shortcut: Shortcut) => {
    setEditingShortcut(shortcut)
    setShortcutForm({
      key: shortcut.key,
      productId: shortcut.productId,
    })
    setShowShortcutDialog(true)
  }

  const resetShortcutForm = () => {
    setShortcutForm({ key: "", productId: "" })
    setEditingShortcut(null)
    setShowShortcutDialog(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configuración</h1>
        <p className="text-gray-600 dark:text-gray-400">Personaliza tu experiencia en el sistema</p>
      </div>

      <div className="grid gap-6">
        {/* Perfil de Usuario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Perfil de Usuario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    value={userProfile.name}
                    onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                    placeholder="Tu nombre completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                    placeholder="tu@email.com"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Label>Rol:</Label>
                <Badge variant={userProfile.role === "admin" ? "default" : "secondary"}>
                  {userProfile.role === "admin" ? "Administrador" : "Vendedor"}
                </Badge>
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Actualizar Perfil"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Configuración de Apariencia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {darkMode ? <Moon className="mr-2 h-5 w-5" /> : <Sun className="mr-2 h-5 w-5" />}
              Apariencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="dark-mode">Modo Oscuro</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">Cambia entre tema claro y oscuro</p>
              </div>
              <Switch id="dark-mode" checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
          </CardContent>
        </Card>

        {/* Atajos de Teclado */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Keyboard className="mr-2 h-5 w-5" />
                Atajos de Teclado Personalizados
              </CardTitle>
              <Dialog open={showShortcutDialog} onOpenChange={setShowShortcutDialog}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEditingShortcut(null)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Atajo
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingShortcut ? "Editar Atajo" : "Agregar Atajo"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleShortcutSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="key">Tecla</Label>
                      <Input
                        id="key"
                        value={shortcutForm.key}
                        onChange={(e) => setShortcutForm({ ...shortcutForm, key: e.target.value })}
                        placeholder="Ej: 1, q, w, etc."
                        maxLength={1}
                        required
                      />
                      <p className="text-xs text-gray-500">Una sola tecla (letra o número)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product">Producto</Label>
                      <Select
                        value={shortcutForm.productId}
                        onValueChange={(value) => setShortcutForm({ ...shortcutForm, productId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - S/. {product.price.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex space-x-2">
                      <Button type="submit" className="flex-1">
                        {editingShortcut ? "Actualizar" : "Crear Atajo"}
                      </Button>
                      <Button type="button" variant="outline" onClick={resetShortcutForm}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Atajos del sistema */}
              <div>
                <h4 className="font-medium mb-2">Atajos del Sistema</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span>Procesar Venta:</span>
                    <Badge variant="outline">Enter</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Limpiar Carrito:</span>
                    <Badge variant="outline">X</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Abrir/Cerrar Caja:</span>
                    <Badge variant="outline">P</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Atajos personalizados */}
              <div>
                <h4 className="font-medium mb-2">Atajos Personalizados ({shortcuts.length})</h4>
                {shortcuts.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No tienes atajos personalizados configurados
                  </p>
                ) : (
                  <div className="space-y-2">
                    {shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.id}
                        className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="font-mono">
                            {shortcut.key?.toUpperCase() || "N/A"}
                          </Badge>
                          <span className="text-sm">{shortcut.productName}</span>
                        </div>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="ghost" onClick={() => startEditShortcut(shortcut)}>
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteShortcut(shortcut.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
