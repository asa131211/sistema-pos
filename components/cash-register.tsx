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

  useEffect(() => {
    if (user) {
      checkCashRegisterStatus()
    }
  }, [user])

  const checkCashRegisterStatus = async () => {
    if (!user) return

    try {
      const today = new Date().toISOString().split("T")[0]
      const cashRegDoc = await getDoc(doc(db, "cash-registers", `${user.uid}-${today}`))

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
      // No mostrar toast de error, solo log
      setCashRegister(null)
      onStatusChange(false)
    }
  }

  const openCashRegister = async () => {
    if (!user) return

    setLoading(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      const initialAmount = 0

      const cashRegData: CashRegister = {
        id: `${user.uid}-${today}`,
        isOpen: true,
        openedBy: user.uid,
        openedAt: serverTimestamp(),
        closedAt: null,
        initialAmount: initialAmount,
        currentAmount: initialAmount,
        totalSales: 0,
        cashSales: 0,
        transferSales: 0,
        date: today,
      }

      await setDoc(doc(db, "cash-registers", cashRegData.id), cashRegData)

      // Registrar movimiento solo si la caja se creó exitosamente
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

  const closeCashRegister = async () => {
    if (!user || !cashRegister) return

    setLoading(true)
    try {
      await updateDoc(doc(db, "cash-registers", cashRegister.id), {
        isOpen: false,
        closedAt: serverTimestamp(),
      })

      // Registrar movimiento
      await addDoc(collection(db, "cash-movements"), {
        cashRegisterId: cashRegister.id,
        type: "closing",
        amount: cashRegister.currentAmount,
        description: "Cierre de caja automático",
        userId: user.uid,
        timestamp: serverTimestamp(),
      })

      setCashRegister({ ...cashRegister, isOpen: false })
      onStatusChange(false)
      setShowCloseDialog(false)
      toast.success("Caja cerrada exitosamente")
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

      {/* Dialog para cerrar caja - Sin confirmación de monto */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">¿Cerrar Caja?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <p className="text-lg font-semibold mb-2">Resumen del Día</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Ventas:</span>
                  <span className="font-semibold">S/. {cashRegister?.totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Efectivo:</span>
                  <span className="font-semibold text-green-600">S/. {cashRegister?.cashSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transferencias:</span>
                  <span className="font-semibold text-blue-600">S/. {cashRegister?.transferSales.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={closeCashRegister} disabled={loading} variant="destructive" className="flex-1">
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
