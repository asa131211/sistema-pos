"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { signInWithEmailAndPassword } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Moon, Sun } from "lucide-react"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    // Detectar preferencia del sistema
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    setDarkMode(prefersDark)
  }, [])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Convertir usuario a formato email para Firebase Auth
      const emailFormat = email.includes("@") ? email : `${email}@sistema-pos.local`
      await signInWithEmailAndPassword(auth, emailFormat, password)
    } catch (error: any) {
      setError("Credenciales incorrectas")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 flex items-center justify-center p-4">
      {/* Toggle de modo oscuro */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setDarkMode(!darkMode)}
        className="absolute top-4 right-4 h-10 w-10 p-0 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
      >
        {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <img
              src="/tiger-logo-bw.png"
              alt="Sanchez Park"
              className="w-12 h-12 object-contain filter brightness-0 invert"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Sanchez Park</CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            Ingresa tus credenciales para acceder al sistema
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Usuario
              </Label>
              <Input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre_usuario"
                required
                className="h-12 border-gray-200 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-12 border-gray-200 dark:border-gray-600 focus:border-purple-500 focus:ring-purple-500/20 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {error && (
              <Alert variant="destructive" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <AlertDescription className="text-red-700 dark:text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg transition-all duration-200"
              disabled={loading}
            >
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
        </CardContent>
      </Card>
    </div>
  )
}
