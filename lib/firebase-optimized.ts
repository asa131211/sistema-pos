import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore, enableNetwork, disableNetwork } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

if (typeof window !== "undefined") {
  // Configurar cache offline más agresivo
  try {
    // Configuraciones de rendimiento
    console.log("🔧 Configurando Firebase para máximo rendimiento...")

    // Habilitar persistencia offline
    // enableIndexedDbPersistence(db, { forceOwnership: false })
  } catch (error) {
    console.warn("Firebase ya inicializado, usando configuración por defecto")
  }

  setInterval(
    () => {
      cleanupCache()
    },
    3 * 60 * 1000,
  )
}

// Funciones de utilidad para manejo de conexión
export const enableFirebaseNetwork = async () => {
  try {
    await enableNetwork(db)
    console.log("🟢 Red Firebase habilitada")
  } catch (error) {
    console.error("Error habilitando red Firebase:", error)
  }
}

export const disableFirebaseNetwork = async () => {
  try {
    await disableNetwork(db)
    console.log("🔴 Red Firebase deshabilitada")
  } catch (error) {
    console.error("Error deshabilitando red Firebase:", error)
  }
}

// Monitor de conexión
export const monitorFirebaseConnection = () => {
  if (typeof window !== "undefined") {
    window.addEventListener("online", enableFirebaseNetwork)
    window.addEventListener("offline", disableFirebaseNetwork)

    return () => {
      window.removeEventListener("online", enableFirebaseNetwork)
      window.removeEventListener("offline", disableFirebaseNetwork)
    }
  }
}

export const cleanupCache = () => {
  const now = Date.now()
  const maxAge = 5 * 60 * 1000 // 5 minutos para cache general
  const reportsCacheAge = 2 * 60 * 1000 // 2 minutos para cache de reportes

  let cleanedCount = 0

  Object.keys(localStorage).forEach((key) => {
    try {
      if (key.includes("-cache")) {
        const cached = JSON.parse(localStorage.getItem(key) || "{}")
        const cacheAge = key.includes("reports-cache") ? reportsCacheAge : maxAge

        if (cached.timestamp && now - cached.timestamp > cacheAge) {
          localStorage.removeItem(key)
          cleanedCount++
        }
      }
    } catch (error) {
      // Remover cache corrupto
      localStorage.removeItem(key)
      cleanedCount++
    }
  })

  if (cleanedCount > 0) {
    console.log(`🧹 Cache limpiado: ${cleanedCount} entradas eliminadas`)
  }
}

export const preloadCriticalData = async () => {
  try {
    console.log("⚡ Precargando datos críticos...")

    // Precargar usuarios si no están en cache
    const usersCacheKey = "users-cache"
    const cachedUsers = localStorage.getItem(usersCacheKey)

    if (!cachedUsers) {
      // Importar getDocs aquí para evitar dependencias circulares
      const { getDocs, collection } = await import("firebase/firestore")
      const usersSnapshot = await getDocs(collection(db, "users"))
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))

      localStorage.setItem(
        usersCacheKey,
        JSON.stringify({
          users: usersData,
          timestamp: Date.now(),
        }),
      )

      console.log("👥 Usuarios precargados en cache")
    }
  } catch (error) {
    console.warn("Error precargando datos:", error)
  }
}
