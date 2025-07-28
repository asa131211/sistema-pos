"use client"

import { useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

export function useKeyboardShortcuts() {
  const [user] = useAuthState(auth)

  useEffect(() => {
    const handleKeyPress = async (event: KeyboardEvent) => {
      // Evitar atajos cuando se está escribiendo en un input o textarea
      const target = event.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true" ||
        target.closest('[contenteditable="true"]')
      ) {
        return
      }

      const key = event.key.toLowerCase()

      // Atajos del sistema
      if (key === "enter") {
        event.preventDefault()
        // Primer Enter: Procesar venta
        const processButton = document.querySelector('[data-shortcut="process-sale"]') as HTMLButtonElement
        if (processButton && !processButton.disabled) {
          processButton.click()

          // Segundo Enter: Imprimir (después de un pequeño delay)
          setTimeout(() => {
            const confirmButton = document.querySelector('button:contains("✅ Confirmar Venta")') as HTMLButtonElement
            if (confirmButton && !confirmButton.disabled) {
              confirmButton.click()
            }
          }, 100)
        }
      } else if (key === "x") {
        event.preventDefault()
        const clearButton = document.querySelector('[data-shortcut="clear-cart"]') as HTMLButtonElement
        if (clearButton && !clearButton.disabled) {
          clearButton.click()
        }
      } else if (key === "p") {
        event.preventDefault()
        const cashButton = document.querySelector('[data-shortcut="toggle-cash"]') as HTMLButtonElement
        if (cashButton) {
          cashButton.click()
        }
      } else {
        // Atajos personalizados para productos
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid))
            if (userDoc.exists()) {
              const shortcuts = userDoc.data().shortcuts || []
              const shortcut = shortcuts.find((s: any) => s.key === key)
              if (shortcut) {
                event.preventDefault()
                const productButton = document.querySelector(
                  `[data-product-shortcut="${shortcut.key}"]`,
                ) as HTMLButtonElement
                if (productButton) {
                  productButton.click()
                }
              }
            }
          } catch (error) {
            console.error("Error fetching shortcuts:", error)
          }
        }
      }
    }

    document.addEventListener("keydown", handleKeyPress)
    return () => document.removeEventListener("keydown", handleKeyPress)
  }, [user])
}
