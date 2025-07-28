import { initializeApp } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { getFirestore, doc, setDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "demo-app-id",
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

async function createTestUser() {
  try {
    console.log("🚀 Creando usuario de prueba...")

    // Crear usuario administrador
    const adminCredential = await createUserWithEmailAndPassword(auth, "admin@sanchezpark.com", "123456")

    await updateProfile(adminCredential.user, {
      displayName: "Administrador",
    })

    await setDoc(doc(db, "users", adminCredential.user.uid), {
      email: "admin@sanchezpark.com",
      username: "admin",
      displayName: "Administrador",
      role: "administrador",
      permissions: ["all"],
      isActive: true,
      createdAt: new Date(),
      shortcuts: [],
    })

    console.log("✅ Usuario administrador creado: admin / 123456")

    // Crear usuario vendedor
    const vendorCredential = await createUserWithEmailAndPassword(auth, "vendedor@sanchezpark.com", "123456")

    await updateProfile(vendorCredential.user, {
      displayName: "Vendedor",
    })

    await setDoc(doc(db, "users", vendorCredential.user.uid), {
      email: "vendedor@sanchezpark.com",
      username: "vendedor",
      displayName: "Vendedor",
      role: "vendedor",
      permissions: ["sales", "products_read"],
      isActive: true,
      createdAt: new Date(),
      shortcuts: [],
    })

    console.log("✅ Usuario vendedor creado: vendedor / 123456")
    console.log("🎉 ¡Usuarios de prueba creados exitosamente!")
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

createTestUser()
