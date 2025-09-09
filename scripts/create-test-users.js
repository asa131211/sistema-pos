import { initializeApp } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { getFirestore, doc, setDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

async function createTestUsers() {
  try {
    console.log("🚀 Creando usuarios de prueba...")

    // Crear usuario administrador
    const adminCredential = await createUserWithEmailAndPassword(auth, "admin@sistema-pos.local", "admin123")

    await updateProfile(adminCredential.user, {
      displayName: "Administrador",
    })

    await setDoc(doc(db, "users", adminCredential.user.uid), {
      email: "admin@sistema-pos.local",
      username: "admin",
      displayName: "Administrador",
      role: "administrador",
      permissions: ["all"],
      isActive: true,
      createdAt: new Date(),
      shortcuts: [],
    })

    console.log("✅ Usuario administrador creado: admin / admin123")

    // Crear usuario vendedor
    const vendorCredential = await createUserWithEmailAndPassword(auth, "vendedor@sistema-pos.local", "vendedor123")

    await updateProfile(vendorCredential.user, {
      displayName: "Vendedor",
    })

    await setDoc(doc(db, "users", vendorCredential.user.uid), {
      email: "vendedor@sistema-pos.local",
      username: "vendedor",
      displayName: "Vendedor",
      role: "vendedor",
      permissions: ["sales", "products_read"],
      isActive: true,
      createdAt: new Date(),
      shortcuts: [],
    })

    console.log("✅ Usuario vendedor creado: vendedor / vendedor123")
    console.log("🎉 ¡Usuarios de prueba creados exitosamente!")
    console.log("📝 Puedes hacer login con:")
    console.log("   👤 Usuario: admin | Contraseña: admin123")
    console.log("   👤 Usuario: vendedor | Contraseña: vendedor123")
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

createTestUsers()
