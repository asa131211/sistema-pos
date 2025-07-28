"use client"

import type React from "react"

import { useState } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { collection, query, where, getDocs } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, User, Lock } from "lucide-react"
import { toast } from "sonner"

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      let email = identifier

      // Si no es un email, buscar por username
      if (!identifier.includes("@")) {
        const usersRef = collection(db, "users")
        const q = query(usersRef, where("username", "==", identifier))
        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
          throw new Error("Usuario no encontrado")
        }

        const userData = querySnapshot.docs[0].data()
        email = userData.email
      }

      await signInWithEmailAndPassword(auth, email, password)
      toast.success("¡Bienvenido al sistema!")
    } catch (error: any) {
      console.error("Error de login:", error)
      let errorMessage = "Error de conexión. Verifica tu internet."

      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        errorMessage = "Usuario o contraseña incorrectos"
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email inválido"
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Demasiados intentos. Intenta más tarde"
      } else if (error.message === "Usuario no encontrado") {
        errorMessage = "Usuario no encontrado"
      }

      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Sanchez Park</CardTitle>
          <CardDescription>Sistema de Punto de Venta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Usuario o Email</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="identifier"
                  type="text"
                  placeholder="admin o admin@ejemplo.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p className="font-medium mb-2">Usuarios de prueba:</p>
            <div className="space-y-1">
              <p>
                👤 <strong>admin</strong> / 123456
              </p>
              <p>
                👤 <strong>vendedor</strong> / 123456
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
