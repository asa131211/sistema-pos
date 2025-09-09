// Script para crear usuario administrador de prueba
import { createUserWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "../lib/firebase.js"

async function createAdminUser() {
  try {
    console.log("Creando usuario administrador...")

    // Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, "admin@sistema-pos.local", "admin123")

    const user = userCredential.user
    console.log("Usuario creado en Auth:", user.uid)

    // Crear perfil de usuario en Firestore
    await setDoc(doc(db, "users", user.uid), {
      email: "admin@sistema-pos.local",
      username: "admin",
      role: "admin",
      name: "Administrador",
      createdAt: new Date(),
      isActive: true,
    })

    console.log("✅ Usuario administrador creado exitosamente")
    console.log("📧 Email: admin@sistema-pos.local")
    console.log("🔑 Usuario: admin")
    console.log("🔒 Contraseña: admin123")
  } catch (error) {
    console.error("❌ Error creando usuario:", error.message)
  }
}

createAdminUser()
