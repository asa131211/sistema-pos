"use client"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Plus, Edit, Trash2, Shield, Mail, Calendar, Search, UserCheck, UserX } from "lucide-react"
import { toast } from "sonner"

interface UserInterface {
  id: string
  username: string
  email: string
  displayName: string
  role: string
  isActive: boolean
  createdAt: any
  shortcuts?: any[]
}

export default function UsersPage() {
  const [currentUser] = useAuthState(auth)
  const [users, setUsers] = useState<UserInterface[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<UserInterface | null>(null)
  const [loading, setLoading] = useState(false)

  // Formulario para nuevo usuario
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    displayName: "",
    role: "vendedor",
  })

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, "users")), (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserInterface[]
      setUsers(usersData)
    })

    return () => unsubscribe()
  }, [])

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleAddUser = async () => {
    if (!formData.username || !formData.email || !formData.password || !formData.displayName) {
      toast.error("Todos los campos son obligatorios")
      return
    }

    setLoading(true)
    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user

      // Guardar datos adicionales en Firestore
      await addDoc(collection(db, "users"), {
        username: formData.username,
        email: formData.email,
        displayName: formData.displayName,
        role: formData.role,
        isActive: true,
        createdAt: new Date(),
        shortcuts: [],
      })

      toast.success("Usuario creado exitosamente")
      setShowAddDialog(false)
      setFormData({
        username: "",
        email: "",
        password: "",
        displayName: "",
        role: "vendedor",
      })
    } catch (error: any) {
      console.error("Error creating user:", error)
      let errorMessage = "Error al crear usuario"

      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "El correo ya está en uso"
          break
        case "auth/weak-password":
          errorMessage = "La contraseña debe tener al menos 6 caracteres"
          break
        case "auth/invalid-email":
          errorMessage = "Correo electrónico inválido"
          break
        default:
          errorMessage = "Error al crear usuario"
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    setLoading(true)
    try {
      await updateDoc(doc(db, "users", editingUser.id), {
        username: editingUser.username,
        displayName: editingUser.displayName,
        role: editingUser.role,
        isActive: editingUser.isActive,
      })

      toast.success("Usuario actualizado exitosamente")
      setEditingUser(null)
    } catch (error) {
      console.error("Error updating user:", error)
      toast.error("Error al actualizar usuario")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.uid) {
      toast.error("No puedes eliminar tu propio usuario")
      return
    }

    if (confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      try {
        await deleteDoc(doc(db, "users", userId))
        toast.success("Usuario eliminado exitosamente")
      } catch (error) {
        console.error("Error deleting user:", error)
        toast.error("Error al eliminar usuario")
      }
    }
  }

  const toggleUserStatus = async (user: UserInterface) => {
    if (user.id === currentUser?.uid) {
      toast.error("No puedes desactivar tu propio usuario")
      return
    }

    try {
      await updateDoc(doc(db, "users", user.id), {
        isActive: !user.isActive,
      })

      toast.success(`Usuario ${!user.isActive ? "activado" : "desactivado"} exitosamente`)
    } catch (error) {
      console.error("Error toggling user status:", error)
      toast.error("Error al cambiar estado del usuario")
    }
  }

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return (
        <Badge className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
          <Shield className="h-3 w-3 mr-1" />
          Administrador
        </Badge>
      )
    } else {
      return (
        <Badge className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
          <Users className="h-3 w-3 mr-1" />
          Vendedor
        </Badge>
      )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 ml-16">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h1>
              <p className="text-gray-600 dark:text-gray-400">Administra usuarios y permisos del sistema</p>
            </div>
          </div>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de Usuario</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="admin, vendedor1, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@sanchezpark.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nombre Completo</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Juan Pérez"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button onClick={handleAddUser} disabled={loading} className="flex-1">
                    {loading ? "Creando..." : "Crear Usuario"}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddDialog(false)} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Búsqueda */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Buscar usuarios por nombre, email o usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de usuarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Usuarios del Sistema ({filteredUsers.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{user.displayName}</h3>
                          {getRoleBadge(user.role)}
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? (
                              <>
                                <UserCheck className="h-3 w-3 mr-1" />
                                Activo
                              </>
                            ) : (
                              <>
                                <UserX className="h-3 w-3 mr-1" />
                                Inactivo
                              </>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mt-1">
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4" />
                            <span>@{user.username}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Mail className="h-4 w-4" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4" />
                            <span>{user.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingUser(user)} className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant={user.isActive ? "secondary" : "default"}
                        onClick={() => toggleUserStatus(user)}
                        className="h-8 w-8 p-0"
                        disabled={user.id === currentUser?.uid}
                      >
                        {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteUser(user.id)}
                        className="h-8 w-8 p-0"
                        disabled={user.id === currentUser?.uid}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Dialog para editar usuario */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-username">Nombre de Usuario</Label>
                  <Input
                    id="edit-username"
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-displayName">Nombre Completo</Label>
                  <Input
                    id="edit-displayName"
                    value={editingUser.displayName}
                    onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Rol</Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(value) => setEditingUser({ ...editingUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button onClick={handleUpdateUser} disabled={loading} className="flex-1">
                    {loading ? "Actualizando..." : "Actualizar"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditingUser(null)} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
