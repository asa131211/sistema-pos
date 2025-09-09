"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Lock, Unlock, Calculator } from "lucide-react"
import { toast } from "sonner"

interface CashRegister {
  id: string
  isOpen: boolean
  openedBy: string
  openedAt: any
  closedAt: any
  initialAmount: number
  currentAmount: number
  totalSales: number
  cashSales: number
  transferSales: number
  date: string
}

interface CashRegisterProps {
  onStatusChange: (isOpen: boolean) => void
}

export default function CashRegister({ onStatusChange }: CashRegisterProps) {
  const [user] = useAuthState(auth)
  const [cashRegister, setCashRegister] = useState<CashRegister | null>(null)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  const getBusinessDate = () => {
    const now = new Date()
    const peruTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }))

    return peruTime.toISOString().split("T")[0]
  }

  useEffect(() => {
    if (user) {
      checkCashRegisterStatus()
    }
  }, [user])

  // Auto-close at midnight
  useEffect(() => {
    const checkMidnightClose = () => {
      const now = new Date()
      const peruTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }))

      // Calcular la próxima medianoche en Perú
      const midnightPeru = new Date(peruTime)
      midnightPeru.setHours(24, 0, 0, 0)

      // Convertir de vuelta a hora local para el timeout
      const timeUntilMidnight = midnightPeru.getTime() - peruTime.getTime()

      const midnightFormatted = midnightPeru.toLocaleString("es-PE", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })

      console.log(`[v0] 🕛 Próximo cierre automático programado para: ${midnightFormatted} (Hora de Perú)`)
      console.log(`[v0] ⏰ Tiempo restante: ${Math.round(timeUntilMidnight / 1000 / 60)} minutos`)

      if (cashRegister?.isOpen) {
        console.log(`[v0] ✅ Caja está ABIERTA - Timer activado`)
      } else {
        console.log(`[v0] ❌ Caja está CERRADA - Timer en espera`)
      }

      const midnightTimeout = setTimeout(() => {
        if (cashRegister?.isOpen) {
          console.log("🕛 Auto-cerrando caja a las 12:00 AM (Hora Perú)")
          closeCashRegister(true) // true = auto close
        }
        // Set up next midnight check
        checkMidnightClose()
      }, timeUntilMidnight)

      return () => clearTimeout(midnightTimeout)
    }

    const cleanup = checkMidnightClose()
    return cleanup
  }, [cashRegister])

  const checkCashRegisterStatus = async () => {
    if (!user) return

    try {
      const businessDate = getBusinessDate()
      const cashRegDoc = await getDoc(doc(db, "cash-registers", `${user.uid}-${businessDate}`))

      if (cashRegDoc.exists()) {
        const data = cashRegDoc.data() as CashRegister
        setCashRegister(data)
        onStatusChange(data.isOpen)
      } else {
        setCashRegister(null)
        onStatusChange(false)
      }
    } catch (error) {
      console.error("Error checking cash register:", error)
      setCashRegister(null)
      onStatusChange(false)
    }
  }

  const openCashRegister = async () => {
    if (!user) return

    setLoading(true)
    try {
      const businessDate = getBusinessDate()
      const initialAmount = 0

      const cashRegData: CashRegister = {
        id: `${user.uid}-${businessDate}`,
        isOpen: true,
        openedBy: user.uid,
        openedAt: serverTimestamp(),
        closedAt: null,
        initialAmount: initialAmount,
        currentAmount: initialAmount,
        totalSales: 0,
        cashSales: 0,
        transferSales: 0,
        date: businessDate, // Usando fecha de negocio
      }

      await setDoc(doc(db, "cash-registers", cashRegData.id), cashRegData)

      try {
        await addDoc(collection(db, "cash-movements"), {
          cashRegisterId: cashRegData.id,
          type: "opening",
          amount: initialAmount,
          description: "Apertura de caja automática",
          userId: user.uid,
          timestamp: serverTimestamp(),
        })
      } catch (movementError) {
        console.warn("Error registering movement, but cash register opened:", movementError)
      }

      setCashRegister(cashRegData)
      onStatusChange(true)
      toast.success("Caja abierta exitosamente")
    } catch (error) {
      console.error("Error opening cash register:", error)
      toast.error("Error al abrir la caja. Contacta al administrador.")
    } finally {
      setLoading(false)
    }
  }

  const closeCashRegister = async (autoClose = false) => {
    if (!user || !cashRegister) return

    setLoading(true)
    try {
      await updateDoc(doc(db, "cash-registers", cashRegister.id), {
        isOpen: false,
        closedAt: serverTimestamp(),
      })

      await addDoc(collection(db, "cash-movements"), {
        cashRegisterId: cashRegister.id,
        type: "closing",
        amount: cashRegister.currentAmount,
        description: autoClose ? "Cierre automático a las 12:00 AM" : "Cierre manual de caja",
        userId: user.uid,
        timestamp: serverTimestamp(),
      })

      setCashRegister({ ...cashRegister, isOpen: false })
      onStatusChange(false)
      setShowCloseDialog(false)

      if (autoClose) {
        toast.success("🕛 Caja cerrada automáticamente a las 12:00 AM")
      } else {
        toast.success("Caja cerrada exitosamente")
      }
    } catch (error) {
      console.error("Error closing cash register:", error)
      toast.error("Error al cerrar la caja")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Estado de la caja - Compacto */}
      <Card className="border-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-lg">
            <div className="flex items-center">
              <Calculator className="mr-2 h-5 w-5" />
              Caja Registradora
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={cashRegister?.isOpen ? "default" : "secondary"} className="text-sm">
                {cashRegister?.isOpen ? (
                  <>
                    <Unlock className="mr-1 h-3 w-3" />
                    Abierta
                  </>
                ) : (
                  <>
                    <Lock className="mr-1 h-3 w-3" />
                    Cerrada
                  </>
                )}
              </Badge>
              {!cashRegister?.isOpen ? (
                <Button onClick={openCashRegister} disabled={loading} size="sm" className="h-8">
                  {loading ? "Abriendo..." : "Abrir"}
                </Button>
              ) : (
                <Button onClick={() => setShowCloseDialog(true)} variant="destructive" size="sm" className="h-8">
                  Cerrar
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Dialog para cerrar caja - SIN RESUMEN DE VENTAS */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">¿Cerrar Caja?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-700 text-center">
                ⏰ <strong>Nota:</strong> La caja se cerrará automáticamente a las 12:00 AM
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => closeCashRegister(false)}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                {loading ? "Cerrando..." : "✅ Cerrar Caja"}
              </Button>
              <Button onClick={() => setShowCloseDialog(false)} variant="outline" className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
