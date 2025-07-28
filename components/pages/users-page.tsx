"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Users, Plus, Edit, Trash2, Mail, Shield, User } from "lucide-react"
import { toast } from "sonner"

interface UserData {
  id: string
  email: string
  displayName?: string
  role: string
  createdAt: any
  shortcuts?: any[]
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "employee",
  })

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, "users")), (snapshot) => {
      const usersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserData[]
      setUsers(usersData)
    })

    return () => unsubscribe()
  }, [])

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const user = userCredential.user

      // Crear documento en Firestore
      await addDoc(collection(db, "users"), {
        uid: user.uid,
        email: formData.email,
        displayName: formData.displayName || "",
        role: formData.role,
        createdAt: new Date(),
        shortcuts: [],
      })

      toast.success("Usuario creado exitosamente")
      setShowCreateDialog(false)
      setFormData({ email: "", password: "", displayName: "", role: "employee" })
    } catch (error: any) {
      console.error("Error creating user:", error)

      let errorMessage = "Error al crear usuario"
      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage = "El email ya está en uso"
          break
        case "auth/weak-password":
          errorMessage = "La contraseña debe tener al menos 6 caracteres"
          break
        case "auth/invalid-email":
          errorMessage = "Email inválido"
          break
        default:
          errorMessage = "Error al crear usuario"
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setLoading(true)
    try {
      await updateDoc(doc(db, "users", selectedUser.id), {
        displayName: formData.displayName,
        role: formData.role,
      })

      toast.success("Usuario actualizado exitosamente")
      setShowEditDialog(false)
      setSelectedUser(null)
      setFormData({ email: "", password: "", displayName: "", role: "employee" })
    } catch (error) {
      console.error("Error updating user:", error)
      toast.error("Error al actualizar usuario")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este usuario?")) return

    try {
      await deleteDoc(doc(db, "users", userId))
      toast.success("Usuario eliminado exitosamente")
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error("Error al eliminar usuario")
    }
  }

  const openEditDialog = (user: UserData) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      password: "",
      displayName: user.displayName || "",
      role: user.role,
    })
    setShowEditDialog(true)
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">Administrador</Badge>
      case "manager":
        return <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">Gerente</Badge>
      case "employee":
        return <Badge className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">Empleado</Badge>
      default:
        return <Badge variant="secondary">Usuario</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 ml-16">
      <div className="p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h1>
            <p className="text-gray-600 dark:text-gray-400">Administra los usuarios del sistema</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>

        {/* Lista de usuarios */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-600" />
                <span>Usuarios del Sistema</span>
              </div>
              <Badge variant="secondary">{users.length} usuarios</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              {users.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p>No hay usuarios registrados</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {user.displayName || "Sin nombre"}
                            </h3>
                            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                              <Mail className="h-3 w-3" />
                              <span>{user.email}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <Shield className="h-3 w-3 text-gray-400" />
                              {getRoleBadge(user.role)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(user)} className="h-8">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="h-8"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Dialog para crear usuario */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-md bg-white dark:bg-gray-900">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@email.com"
                  required
                  className="bg-white dark:bg-gray-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="bg-white dark:bg-gray-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Nombre Completo</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Nombre del usuario"
                  className="bg-white dark:bg-gray-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger className="bg-white dark:bg-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Empleado</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  El usuario recibirá un correo para verificar su cuenta.
                </AlertDescription>
              </Alert>

              <div className="flex space-x-2 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {loading ? "Creando..." : "Crear Usuario"}
                </Button>
                <Button type="button" onClick={() => setShowCreateDialog(false)} variant="outline" className="flex-1">
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para editar usuario */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-md bg-white dark:bg-gray-900">
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="space-y-2">
                <Label>Correo Electrónico</Label>
                <Input value={formData.email} disabled className="bg-gray-100 dark:bg-gray-800 text-gray-500" />
                <p className="text-xs text-gray-500 dark:text-gray-400">El email no se puede modificar</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDisplayName">Nombre Completo</Label>
                <Input
                  id="editDisplayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Nombre del usuario"
                  className="bg-white dark:bg-gray-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editRole">Rol</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger className="bg-white dark:bg-gray-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Empleado</SelectItem>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </Button>
                <Button type="button" onClick={() => setShowEditDialog(false)} variant="outline" className="flex-1">
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
