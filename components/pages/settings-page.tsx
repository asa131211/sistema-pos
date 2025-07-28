"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc, updateDoc, setDoc, collection, getDocs } from "firebase/firestore"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Keyboard, Moon, Sun, Plus, Edit, Trash2, Camera, Shield } from "lucide-react"
import { toast } from "sonner"
import ImageUpload from "@/components/image-upload"

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

interface UserProfile {
  name: string
  email: string
  role: string
  avatar?: string
}

export default function SettingsPage({ darkMode, setDarkMode }: SettingsPageProps) {
  const [user] = useAuthState(auth)
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "",
    email: "",
    role: "",
    avatar: "",
  })
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([])
  const [products, setProducts] = useState([])
  const [showShortcutDialog, setShowShortcutDialog] = useState(false)
  const [showAvatarDialog, setShowAvatarDialog] = useState(false)
  const [editingShortcut, setEditingShortcut] = useState<Shortcut | null>(null)
  const [shortcutForm, setShortcutForm] = useState({
    key: "",
    productId: "",
  })
  const [loading, setLoading] = useState(false)

  // Función para crear documento de usuario si no existe
  const ensureUserDocument = async () => {
    if (!user) return false

    try {
      const userDocRef = doc(db, "users", user.uid)
      const userDoc = await getDoc(userDocRef)

      if (!userDoc.exists()) {
        console.log("📝 Creando documento de usuario faltante...")
        // Crear documento básico del usuario
        const userData = {
          uid: user.uid,
          name: user.displayName || "Usuario",
          email: user.email || "",
          role: "vendedor", // Rol por defecto
          createdAt: new Date(),
          shortcuts: [],
          avatar: "",
        }

        await setDoc(userDocRef, userData)
        console.log("✅ Documento de usuario creado exitosamente")

        // Actualizar estado local
        setUserProfile({
          name: userData.name,
          email: userData.email,
          role: userData.role,
          avatar: userData.avatar,
        })
        setShortcuts([])

        toast.success("Perfil de usuario inicializado correctamente")
        return true
      }
      return true
    } catch (error) {
      console.error("❌ Error creando documento de usuario:", error)
      toast.error("Error al inicializar el perfil de usuario")
      return false
    }
  }

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          // Primero asegurar que el documento existe
          const documentExists = await ensureUserDocument()
          if (!documentExists) return

          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserProfile({
              name: userData.name || "",
              email: userData.email || user.email || "",
              role: userData.role || "",
              avatar: userData.avatar || "",
            })
            setShortcuts(userData.shortcuts || [])
          }
        } catch (error) {
          console.error("Error fetching user profile:", error)
          toast.error("Error al cargar el perfil de usuario")
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
        toast.error("Error al cargar productos")
      }
    }

    fetchUserProfile()
    fetchProducts()
  }, [user])

  const handleAvatarUpdate = async (avatarUrl: string) => {
    if (!user) return

    setLoading(true)
    try {
      // Asegurar que el documento existe antes de actualizar
      await ensureUserDocument()

      await updateDoc(doc(db, "users", user.uid), {
        avatar: avatarUrl,
      })
      setUserProfile((prev) => ({ ...prev, avatar: avatarUrl }))
      setShowAvatarDialog(false)
      toast.success("Foto de perfil actualizada exitosamente")
    } catch (error) {
      console.error("Error updating avatar:", error)
      toast.error("Error al actualizar la foto de perfil")
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
    if (!selectedProduct) {
      toast.error("Producto no encontrado")
      return
    }

    setLoading(true)
    try {
      // CRÍTICO: Asegurar que el documento existe antes de actualizar
      const documentExists = await ensureUserDocument()
      if (!documentExists) {
        toast.error("Error al inicializar el perfil de usuario")
        return
      }

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

      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        shortcuts: updatedShortcuts,
      })

      setShortcuts(updatedShortcuts)
      setShortcutForm({ key: "", productId: "" })
      setEditingShortcut(null)
      setShowShortcutDialog(false)
      toast.success(editingShortcut ? "Atajo actualizado exitosamente" : "Atajo creado exitosamente")
    } catch (error: any) {
      console.error("Error saving shortcut:", error)

      // Mensajes de error más específicos
      if (error.code === "permission-denied") {
        toast.error("No tienes permisos para actualizar los atajos. Contacta al administrador.")
      } else if (error.code === "not-found") {
        toast.error("Usuario no encontrado en la base de datos. Reinicia la sesión.")
      } else if (error.message?.includes("No document to update")) {
        toast.error("Error de sincronización. Recarga la página e intenta nuevamente.")
      } else {
        toast.error("Error al guardar el atajo: " + (error.message || "Error desconocido"))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteShortcut = async (shortcutId: string) => {
    if (!user) return

    setLoading(true)
    try {
      // Asegurar que el documento existe
      await ensureUserDocument()

      const updatedShortcuts = shortcuts.filter((s) => s.id !== shortcutId)

      const userDocRef = doc(db, "users", user.uid)
      await updateDoc(userDocRef, {
        shortcuts: updatedShortcuts,
      })

      setShortcuts(updatedShortcuts)
      toast.success("Atajo eliminado exitosamente")
    } catch (error: any) {
      console.error("Error deleting shortcut:", error)

      if (error.code === "permission-denied") {
        toast.error("No tienes permisos para eliminar atajos")
      } else {
        toast.error("Error al eliminar el atajo")
      }
    } finally {
      setLoading(false)
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
        <Card className="border-2 border-blue-100 dark:border-blue-900">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5" />
              Perfil de Usuario
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center space-x-6 mb-6">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={userProfile.avatar || "/placeholder.svg"} alt={userProfile.name} />
                  <AvatarFallback className="text-lg">
                    {userProfile.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0">
                      <Camera className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cambiar Foto de Perfil</DialogTitle>
                    </DialogHeader>
                    <ImageUpload
                      onImageSelect={handleAvatarUpdate}
                      currentImage={userProfile.avatar}
                      className="space-y-2"
                    />
                  </DialogContent>
                </Dialog>
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{userProfile.name || "Usuario"}</h3>
                <p className="text-gray-600 dark:text-gray-400">{userProfile.email}</p>
                <div className="mt-2">
                  <Badge variant={userProfile.role === "admin" ? "default" : "secondary"} className="text-sm">
                    {userProfile.role === "admin" ? (
                      <>
                        <Shield className="mr-1 h-3 w-3" />
                        Administrador
                      </>
                    ) : (
                      <>
                        <User className="mr-1 h-3 w-3" />
                        Vendedor
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </div>

            {userProfile.role === "admin" && (
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Privilegios de Administrador</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Gestión completa de productos</li>
                  <li>• Administración de usuarios</li>
                  <li>• Acceso a reportes y estadísticas</li>
                  <li>• Configuración del sistema</li>
                </ul>
              </div>
            )}

            {userProfile.role === "vendedor" && (
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">Perfil de Vendedor</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Como vendedor, puedes procesar ventas, gestionar el carrito y personalizar tus atajos de teclado. Para
                  cambios en tu información personal, contacta al administrador.
                </p>
              </div>
            )}
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
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <Label htmlFor="dark-mode" className="font-medium">
                  Modo Oscuro
                </Label>
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
                Atajos de Teclado
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
                      <Button type="submit" disabled={loading} className="flex-1">
                        {loading ? "Guardando..." : editingShortcut ? "Actualizar" : "Crear Atajo"}
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
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-medium mb-3 text-blue-900 dark:text-blue-100">Atajos del Sistema</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between items-center p-2 bg-white dark:bg-blue-900 rounded">
                    <span>Procesar Venta:</span>
                    <Badge variant="outline" className="font-mono">
                      Enter
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white dark:bg-blue-900 rounded">
                    <span>Limpiar Carrito:</span>
                    <Badge variant="outline" className="font-mono">
                      X
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white dark:bg-blue-900 rounded">
                    <span>Abrir/Cerrar Caja:</span>
                    <Badge variant="outline" className="font-mono">
                      P
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Atajos personalizados */}
              <div>
                <h4 className="font-medium mb-3">Atajos Personalizados ({shortcuts.length})</h4>
                {shortcuts.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Keyboard className="mx-auto h-12 w-12 mb-2 opacity-50" />
                    <p>No tienes atajos personalizados configurados</p>
                    <p className="text-sm">Crea atajos para acceder rápidamente a tus productos favoritos</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {shortcuts.map((shortcut) => (
                      <div
                        key={shortcut.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border"
                      >
                        <div className="flex items-center space-x-3">
                          <Badge variant="outline" className="font-mono text-lg px-3 py-1">
                            {shortcut.key?.toUpperCase() || "N/A"}
                          </Badge>
                          <div>
                            <span className="font-medium">{shortcut.productName}</span>
                            <p className="text-xs text-gray-500">Presiona la tecla para agregar al carrito</p>
                          </div>
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
