"use client"

import { useEffect } from "react"
import { useAuthState } from "react-firebase-hooks/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

export function useKeyboardShortcuts() {
  const [user] = useAuthState(auth)

  useEffect(() => {
    const handleKeyPress = async (event: KeyboardEvent) => {
      // Evitar atajos cuando se está escribiendo en un input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return
      }

      const key = event.key.toLowerCase()

      // Atajos del sistema
      if (key === "enter") {
        event.preventDefault()
        const processButton = document.querySelector('[data-shortcut="process-sale"]') as HTMLButtonElement
        if (processButton && !processButton.disabled) {
          processButton.click()
        }
      } else if (key === "x") {
        event.preventDefault()
        const clearButton = document.querySelector('[data-shortcut="clear-cart"]') as HTMLButtonElement
        if (clearButton) {
          clearButton.click()
        }
      } else if (key === "p") {
        event.preventDefault()
        const cashButton = document.querySelector('[data-shortcut="toggle-cash"]') as HTMLButtonElement
        if (cashButton) {
          cashButton.click()
        }
      } else {
        // Atajos personalizados
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid))
            if (userDoc.exists()) {
              const shortcuts = userDoc.data().shortcuts || []
              const shortcut = shortcuts.find((s: any) => s.key === key)
              if (shortcut) {
                event.preventDefault()
                const productButton = document.querySelector(
                  `[data-product-id="${shortcut.productId}"]`,
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
