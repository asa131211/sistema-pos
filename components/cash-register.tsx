"use client"

import { useState, useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  const [showOpenDialog, setShowOpenDialog] = useState(false)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [initialAmount, setInitialAmount] = useState("")
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
    }
  }

  const openCashRegister = async () => {
    if (!user || !initialAmount) {
      toast.error("Por favor ingresa el monto inicial")
      return
    }

    setLoading(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      const cashRegData: CashRegister = {
        id: `${user.uid}-${today}`,
        isOpen: true,
        openedBy: user.uid,
        openedAt: serverTimestamp(),
        closedAt: null,
        initialAmount: Number.parseFloat(initialAmount),
        currentAmount: Number.parseFloat(initialAmount),
        totalSales: 0,
        cashSales: 0,
        transferSales: 0,
        date: today,
      }

      await setDoc(doc(db, "cash-registers", cashRegData.id), cashRegData)

      // Registrar movimiento
      await addDoc(collection(db, "cash-movements"), {
        cashRegisterId: cashRegData.id,
        type: "opening",
        amount: Number.parseFloat(initialAmount),
        description: "Apertura de caja",
        userId: user.uid,
        timestamp: serverTimestamp(),
      })

      setCashRegister(cashRegData)
      onStatusChange(true)
      setShowOpenDialog(false)
      setInitialAmount("")
      toast.success("Caja abierta exitosamente")
    } catch (error) {
      console.error("Error opening cash register:", error)
      toast.error("Error al abrir la caja")
    } finally {
      setLoading(false)
    }
  }

  const closeCashRegister = async () => {
    if (!user || !cashRegister) return

    setLoading(true)
    try {
      const updatedCashReg = {
        ...cashRegister,
        isOpen: false,
        closedAt: serverTimestamp(),
      }

      await updateDoc(doc(db, "cash-registers", cashRegister.id), {
        isOpen: false,
        closedAt: serverTimestamp(),
      })

      // Registrar movimiento
      await addDoc(collection(db, "cash-movements"), {
        cashRegisterId: cashRegister.id,
        type: "closing",
        amount: cashRegister.currentAmount,
        description: "Cierre de caja",
        userId: user.uid,
        timestamp: serverTimestamp(),
      })

      setCashRegister(updatedCashReg)
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
      {/* Estado de la caja */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Calculator className="mr-2 h-5 w-5" />
              Estado de Caja
            </div>
            <Badge variant={cashRegister?.isOpen ? "default" : "secondary"}>
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
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cashRegister?.isOpen ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Monto Inicial</p>
                  <p className="text-lg font-bold">S/. {cashRegister.initialAmount.toFixed(2)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Monto Actual</p>
                  <p className="text-lg font-bold text-green-600">S/. {cashRegister.currentAmount.toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Total Ventas</p>
                  <p className="font-semibold">S/. {cashRegister.totalSales.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Efectivo</p>
                  <p className="font-semibold text-green-600">S/. {cashRegister.cashSales.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Transferencias</p>
                  <p className="font-semibold text-blue-600">S/. {cashRegister.transferSales.toFixed(2)}</p>
                </div>
              </div>
              <Button onClick={() => setShowCloseDialog(true)} variant="destructive" className="w-full">
                <Lock className="mr-2 h-4 w-4" />
                Cerrar Caja
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-gray-600">La caja está cerrada</p>
              <Button onClick={() => setShowOpenDialog(true)} className="w-full">
                <Unlock className="mr-2 h-4 w-4" />
                Abrir Caja
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para abrir caja */}
      <Dialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="initialAmount">Monto Inicial (S/.)</Label>
              <Input
                id="initialAmount"
                type="number"
                step="0.01"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="flex space-x-2">
              <Button onClick={openCashRegister} disabled={loading} className="flex-1">
                {loading ? "Abriendo..." : "Abrir Caja"}
              </Button>
              <Button onClick={() => setShowOpenDialog(false)} variant="outline" className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para cerrar caja */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Caja</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-semibold">Resumen del Día</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Monto Inicial:</span>
                  <span>S/. {cashRegister?.initialAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Ventas:</span>
                  <span>S/. {cashRegister?.totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Monto Final:</span>
                  <span>S/. {cashRegister?.currentAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={closeCashRegister} disabled={loading} variant="destructive" className="flex-1">
                {loading ? "Cerrando..." : "Cerrar Caja"}
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
