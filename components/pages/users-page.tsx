"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, doc, updateDoc, addDoc, deleteDoc, getDocs, where } from "firebase/firestore"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  UserCheck,
  UserX,
  Shield,
  Mail,
  User,
  Calendar,
  Activity,
} from "lucide-react"
import { toast } from "sonner"

interface UserData {
  id: string
  email: string
  username: string
  displayName: string
  role: "administrador" | "vendedor"
  permissions: string[]
  isActive: boolean
  createdAt: any
  lastLogin?: any
}

export default function UsersPage() {
  const [currentUser] = useAuthState(auth)
  const [users, setUsers] = useState<UserData[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRole, setSelectedRole] = useState("all")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  // Formulario para nuevo usuario
  const [newUser, setNewUser] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
    role: "vendedor" as "administrador" | "vendedor",
    isActive: true,
  })

  // Cargar usuarios
  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, "users")), (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserData[]

      setUsers(usersData.sort((a, b) => a.displayName.localeCompare(b.displayName)))
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Filtrar usuarios
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = selectedRole === "all" || user.role === selectedRole

    return matchesSearch && matchesRole
  })

  // Crear usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      // Verificar si el username ya existe
      const usernameQuery = query(collection(db, "users"), where("username", "==", newUser.username))
      const usernameSnapshot = await getDocs(usernameQuery)

      if (!usernameSnapshot.empty) {
        toast.error("El nombre de usuario ya existe")
        setCreating(false)
        return
      }

      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password)
      const user = userCredential.user

      // Actualizar perfil
      await updateProfile(user, {
        displayName: newUser.displayName,
      })

      // Definir permisos según el rol
      const permissions = newUser.role === "administrador" ? ["all"] : ["sales", "products_read"]

      // Guardar datos adicionales en Firestore
      await addDoc(collection(db, "users"), {
        email: newUser.email,
        username: newUser.username,
        displayName: newUser.displayName,
        role: newUser.role,
        permissions,
        isActive: newUser.isActive,
        createdAt: new Date(),
        shortcuts: [],
      })

      toast.success("Usuario creado exitosamente")
      setShowCreateDialog(false)
      setNewUser({
        email: "",
        username: "",
        displayName: "",
        password: "",
        role: "vendedor",
        isActive: true,
      })
    } catch (error: any) {
      console.error("Error creating user:", error)

      let errorMessage = "Error al crear usuario"
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "El email ya está en uso"
          break
        case "auth/weak-password":
          errorMessage = "La contraseña es muy débil"
          break
        case "auth/invalid-email":
          errorMessage = "Email inválido"
          break
        default:
          errorMessage = error.message || "Error desconocido"
      }

      toast.error(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  // Actualizar usuario
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return

    try {
      const permissions = editingUser.role === "administrador" ? ["all"] : ["sales", "products_read"]

      await updateDoc(doc(db, "users", editingUser.id), {
        displayName: editingUser.displayName,
        username: editingUser.username,
        role: editingUser.role,
        permissions,
        isActive: editingUser.isActive,
        updatedAt: new Date(),
      })

      toast.success("Usuario actualizado exitosamente")
      setShowEditDialog(false)
      setEditingUser(null)
    } catch (error) {
      console.error("Error updating user:", error)
      toast.error("Error al actualizar usuario")
    }
  }

  // Alternar estado activo
  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        isActive: !currentStatus,
        updatedAt: new Date(),
      })

      toast.success(`Usuario ${!currentStatus ? "activado" : "desactivado"} exitosamente`)
    } catch (error) {
      console.error("Error toggling user status:", error)
      toast.error("Error al cambiar estado del usuario")
    }
  }

  // Eliminar usuario
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario "${userName}"?`)) return

    try {
      await deleteDoc(doc(db, "users", userId))
      toast.success("Usuario eliminado exitosamente")
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error("Error al eliminar usuario")
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "administrador":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "vendedor":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "No disponible"
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString("es-PE")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 ml-16 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Cargando usuarios...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 ml-16">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h1>
              <p className="text-gray-600 dark:text-gray-400">Administra usuarios, roles y permisos del sistema</p>
            </div>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
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
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nombre Completo</Label>
                  <Input
                    id="displayName"
                    value={newUser.displayName}
                    onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                    placeholder="Juan Pérez"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de Usuario</Label>
                  <Input
                    id="username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value.toLowerCase() })}
                    placeholder="juan.perez"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="juan@ejemplo.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Rol</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value: "administrador" | "vendedor") => setNewUser({ ...newUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="administrador">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={newUser.isActive}
                    onCheckedChange={(checked) => setNewUser({ ...newUser, isActive: checked })}
                  />
                  <Label htmlFor="isActive">Usuario activo</Label>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button type="submit" disabled={creating} className="flex-1">
                    {creating ? "Creando..." : "Crear Usuario"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Usuarios</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Usuarios Activos</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {users.filter((u) => u.isActive).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Administradores</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {users.filter((u) => u.role === "administrador").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Vendedores</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {users.filter((u) => u.role === "vendedor").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Buscar por nombre, email o usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  <SelectItem value="administrador">Administrador</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Lista de usuarios */}
        <Card>
          <CardHeader>
            <CardTitle>Usuarios del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No se encontraron usuarios</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900 dark:text-white">{user.displayName}</h3>
                            <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                            <Badge variant={user.isActive ? "default" : "destructive"}>
                              {user.isActive ? "Activo" : "Inactivo"}
                            </Badge>
                          </div>

                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3" />
                              <span>{user.username}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3" />
                              <span>{user.email}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>Creado: {formatDate(user.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleUserStatus(user.id, user.isActive)}
                          className="h-8"
                        >
                          {user.isActive ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingUser(user)
                            setShowEditDialog(true)
                          }}
                          className="h-8"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>

                        {user.id !== currentUser?.uid && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(user.id, user.displayName)}
                            className="h-8"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Dialog para editar usuario */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editDisplayName">Nombre Completo</Label>
                  <Input
                    id="editDisplayName"
                    value={editingUser.displayName}
                    onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editUsername">Nombre de Usuario</Label>
                  <Input
                    id="editUsername"
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value.toLowerCase() })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editRole">Rol</Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(value: "administrador" | "vendedor") =>
                      setEditingUser({ ...editingUser, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vendedor">Vendedor</SelectItem>
                      <SelectItem value="administrador">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="editIsActive"
                    checked={editingUser.isActive}
                    onCheckedChange={(checked) => setEditingUser({ ...editingUser, isActive: checked })}
                  />
                  <Label htmlFor="editIsActive">Usuario activo</Label>
                </div>

                <div className="flex space-x-2 pt-4">
                  <Button type="submit" className="flex-1">
                    Actualizar Usuario
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowEditDialog(false)
                      setEditingUser(null)
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
