"use client"

import { useState, useEffect } from "react"
import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore"
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, Plus, Search, Edit, UserCheck, UserX, Mail, User } from "lucide-react"
import { toast } from "sonner"

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [newUser, setNewUser] = useState({
    email: "",
    username: "",
    displayName: "",
    password: "",
    role: "vendedor",
    isActive: true,
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "users"))
      const usersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setUsers(usersData)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Error al cargar usuarios")
    }
  }

  const createUser = async () => {
    if (!newUser.email || !newUser.username || !newUser.displayName || !newUser.password) {
      toast.error("Todos los campos son obligatorios")
      return
    }

    // Verificar que el username sea único
    const existingUser = users.find((user) => user.username === newUser.username)
    if (existingUser) {
      toast.error("El nombre de usuario ya existe")
      return
    }

    setLoading(true)
    try {
      // Crear usuario en Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, newUser.email, newUser.password)

      // Actualizar perfil
      await updateProfile(userCredential.user, {
        displayName: newUser.displayName,
      })

      // Crear documento en Firestore
      await addDoc(collection(db, "users"), {
        email: newUser.email,
        username: newUser.username,
        displayName: newUser.displayName,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: new Date(),
        permissions: newUser.role === "administrador" ? ["all"] : ["sales", "products_read"],
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
      fetchUsers()
    } catch (error) {
      console.error("Error creating user:", error)
      if (error.code === "auth/email-already-in-use") {
        toast.error("El email ya está en uso")
      } else if (error.code === "auth/weak-password") {
        toast.error("La contraseña debe tener al menos 6 caracteres")
      } else {
        toast.error("Error al crear usuario")
      }
    } finally {
      setLoading(false)
    }
  }

  const updateUser = async (userId, updates) => {
    try {
      await updateDoc(doc(db, "users", userId), {
        ...updates,
        updatedAt: new Date(),
      })
      toast.success("Usuario actualizado")
      fetchUsers()
    } catch (error) {
      console.error("Error updating user:", error)
      toast.error("Error al actualizar usuario")
    }
  }

  const toggleUserStatus = async (userId, currentStatus) => {
    await updateUser(userId, { isActive: !currentStatus })
  }

  const filteredUsers = users.filter(
    (user) =>
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "administrador":
        return "bg-red-500"
      case "vendedor":
        return "bg-blue-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600">Administra los usuarios del sistema</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>Completa la información para crear un nuevo usuario</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Nombre de Usuario</Label>
                  <Input
                    id="username"
                    placeholder="usuario123"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Nombre Completo</Label>
                <Input
                  id="displayName"
                  placeholder="Juan Pérez"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
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

              <Button onClick={createUser} disabled={loading} className="w-full">
                {loading ? "Creando..." : "Crear Usuario"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de búsqueda */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, email o usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuarios */}
      <div className="grid gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold">{user.displayName}</h3>
                      <Badge className={`${getRoleBadgeColor(user.role)} text-white`}>
                        {user.role === "administrador" ? "Administrador" : "Vendedor"}
                      </Badge>
                      {user.isActive ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <UserCheck className="w-3 h-3 mr-1" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          <UserX className="w-3 h-3 mr-1" />
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-1" />
                        {user.email}
                      </div>
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-1" />@{user.username}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => toggleUserStatus(user.id, user.isActive)}>
                    {user.isActive ? (
                      <>
                        <UserX className="w-4 h-4 mr-1" />
                        Desactivar
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4 mr-1" />
                        Activar
                      </>
                    )}
                  </Button>

                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron usuarios</h3>
            <p className="text-gray-600">
              {searchTerm ? "Intenta con otros términos de búsqueda" : "Crea tu primer usuario"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
