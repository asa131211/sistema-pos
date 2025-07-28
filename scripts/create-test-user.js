// Script para crear usuario de prueba
import { initializeApp } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"
import { getFirestore, doc, setDoc } from "firebase/firestore"

const firebaseConfig = {
  // Tu configuración aquí
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

async function createTestUser() {
  try {
    // Crear usuario en Authentication
    const userCredential = await createUserWithEmailAndPassword(auth, "vendedor@test.com", "vendedor123")

    // Crear documento en Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      name: "Vendedor Test",
      email: "vendedor@test.com",
      role: "vendedor",
      createdAt: new Date(),
      shortcuts: [],
    })

    console.log("Usuario vendedor creado exitosamente")
  } catch (error) {
    console.error("Error:", error)
  }
}

createTestUser()
