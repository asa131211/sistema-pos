// Script para crear usuarios de prueba con nombres de usuario
import { initializeApp } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth"
import { getFirestore, doc, setDoc } from "firebase/firestore"

const firebaseConfig = {
  // Tu configuración de Firebase aquí
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

async function createTestUsers() {
  const users = [
    {
      username: "admin",
      email: "admin@sanchezpark.com",
      password: "123456",
      role: "admin",
      displayName: "Administrador",
    },
    {
      username: "vendedor",
      email: "vendedor@sanchezpark.com",
      password: "123456",
      role: "vendedor",
      displayName: "Vendedor",
    },
  ]

  for (const userData of users) {
    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password)

      const user = userCredential.user

      // Guardar datos adicionales en Firestore
      await setDoc(doc(db, "users", user.uid), {
        username: userData.username,
        email: userData.email,
        role: userData.role,
        displayName: userData.displayName,
        createdAt: new Date(),
        isActive: true,
        shortcuts: [],
      })

      console.log(`✅ Usuario creado: ${userData.username} (${userData.email})`)
    } catch (error) {
      console.error(`❌ Error creando usuario ${userData.username}:`, error.message)
    }
  }

  console.log("🎉 Proceso de creación de usuarios completado")
}

// Ejecutar el script
createTestUsers().catch(console.error)
