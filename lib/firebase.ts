import { initializeApp } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore"
import { getStorage, connectStorageEmulator } from "firebase/storage"

const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "demo-app-id",
}

// Inicializar Firebase
const app = initializeApp(firebaseConfig)

// Inicializar servicios
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Conectar a emuladores en desarrollo
if (typeof window !== "undefined" && window.location.hostname === "localhost") {
  try {
    // Solo conectar si no están ya conectados
    if (!auth.config.emulator) {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true })
    }

    // @ts-ignore
    if (!db._delegate._databaseId.projectId.includes("localhost")) {
      connectFirestoreEmulator(db, "localhost", 8080)
    }

    // @ts-ignore
    if (!storage._delegate._host.includes("localhost")) {
      connectStorageEmulator(storage, "localhost", 9199)
    }
  } catch (error) {
    console.log("Emulators already connected or not available")
  }
}

export default app
