"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { collection, query, onSnapshot, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore"
import { createUserWithEmailAndPassword } from "firebase/auth"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Users, Shield, User } from "lucide-react"
import { toast } from "sonner"

interface UserData {
  id: string
  name: string
  email: string
  role: "admin" | "vendedor"
  createdAt: any
}

interface UsersPageProps {
  sidebarCollapsed?: boolean
}

export default function UsersPage({ sidebarCollapsed = false }: UsersPageProps) {
  const [users, setUsers] = useState<UserData[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    role: "vendedor" as "admin" | "vendedor",
  })
  const [loading, setLoading] = useState(false)

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

  const validateUsername = (username: string) => {
    // Solo letras, números y guiones bajos
    const validPattern = /^[a-zA-Z0-9_]+$/
    return validPattern.test(username) && username.length >= 3
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.username || (!editingUser && !formData.password)) {
      toast.error("Por favor completa todos los campos")
      return
    }

    setLoading(true)
    try {
      if (editingUser) {
        // Actualizar usuario existente
        await updateDoc(doc(db, "users", editingUser.id), {
          name: formData.name,
          username: formData.username,
          role: formData.role,
        })
        toast.success("Usuario actualizado exitosamente")
      } else {
        // Crear nuevo usuario - convertir username a email para Firebase Auth
        const emailFormat = `${formData.username}@sistema-pos.local`

        try {
          const userCredential = await createUserWithEmailAndPassword(auth, emailFormat, formData.password)

          // CORREGIDO: Usar setDoc en lugar de addDoc para usar el UID como ID del documento
          await setDoc(doc(db, "users", userCredential.user.uid), {
            uid: userCredential.user.uid,
            name: formData.name,
            username: formData.username,
            email: emailFormat,
            role: formData.role,
            createdAt: new Date(),
            shortcuts: [], // Inicializar array de shortcuts vacío
            avatar: "", // Inicializar avatar vacío
          })

          toast.success("Usuario creado exitosamente")
        } catch (authError: any) {
          if (authError.code === "auth/email-already-in-use") {
            toast.error(`El usuario "${formData.username}" ya existe. Elige otro nombre de usuario.`)
          } else if (authError.code === "auth/weak-password") {
            toast.error("La contraseña debe tener al menos 6 caracteres")
          } else if (authError.code === "auth/invalid-email") {
            toast.error("Nombre de usuario inválido")
          } else {
            toast.error("Error al crear el usuario: " + authError.message)
          }
          return
        }
      }

      resetForm()
    } catch (error: any) {
      console.error("Error saving user:", error)
      toast.error("Error inesperado al guardar el usuario")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      try {
        await deleteDoc(doc(db, "users", id))
        toast.success("Usuario eliminado exitosamente")
      } catch (error) {
        console.error("Error deleting user:", error)
        toast.error("Error al eliminar el usuario")
      }
    }
  }

  const resetForm = () => {
    setFormData({ name: "", username: "", password: "", role: "vendedor" })
    setEditingUser(null)
    setShowAddDialog(false)
  }

  const startEdit = (user: UserData) => {
    setEditingUser(user)
    setFormData({
      name: user.name,
      username: user.email,
      password: "",
      role: user.role,
    })
    setShowAddDialog(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Usuarios</h1>
          <p className="text-gray-600 dark:text-gray-400">Gestiona los usuarios del sistema</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingUser(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Editar Usuario" : "Agregar Usuario"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Nombre de Usuario</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_]/g, "")
                    setFormData({ ...formData, username: value })
                  }}
                  placeholder="nombre_usuario"
                  required
                  minLength={3}
                  maxLength={20}
                />
                <p className="text-xs text-gray-500 mt-1">Solo letras, números y guiones bajos. Mínimo 3 caracteres.</p>
              </div>
              {!editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: "admin" | "vendedor") => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? "Guardando..." : editingUser ? "Actualizar" : "Crear Usuario"}
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
            <Users className="mr-2 h-5 w-5" />
            Lista de Usuarios ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Fecha de Creación</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role === "admin" ? (
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
                  </TableCell>
                  <TableCell>
                    {user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString("es-ES") : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button size="sm" variant="outline" onClick={() => startEdit(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No hay usuarios registrados
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
