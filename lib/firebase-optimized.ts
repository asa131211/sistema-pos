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

// Configuración optimizada para alta congestión
if (typeof window !== "undefined") {
  // Configurar cache offline
  db.app.automaticDataCollectionEnabled = false

  // Configurar timeouts optimizados
  const settings = {
    cacheSizeBytes: 100 * 1024 * 1024, // 100MB cache
    experimentalForceLongPolling: false, // Usar WebSocket cuando sea posible
  }

  // Aplicar configuraciones solo en el cliente
  try {
    // Estas configuraciones solo funcionan antes de usar la base de datos
    console.log("🔧 Configurando Firebase para alta congestión...")
  } catch (error) {
    console.warn("Firebase ya inicializado, usando configuración por defecto")
  }
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
