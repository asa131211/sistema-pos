import { initializeApp } from "firebase/app"
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { getFirestore, doc, setDoc, collection, addDoc } from "firebase/firestore"

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

const testUsers = [
  {
    email: "admin@sanchezpark.com",
    password: "123456",
    username: "admin",
    displayName: "Administrador",
    role: "administrador",
    permissions: ["all"],
  },
  {
    email: "vendedor@sanchezpark.com",
    password: "123456",
    username: "vendedor",
    displayName: "Vendedor",
    role: "vendedor",
    permissions: ["sales", "products_read"],
  },
]

const sampleProducts = [
  {
    name: "Juego de Mesa Monopoly",
    price: 45.0,
    category: "juegos",
    stock: 15,
    isActive: true,
    image: "/placeholder.svg?height=300&width=300&text=Monopoly",
  },
  {
    name: "PlayStation 5",
    price: 2500.0,
    category: "consolas",
    stock: 5,
    isActive: true,
    image: "/placeholder.svg?height=300&width=300&text=PS5",
  },
  {
    name: "Control Xbox",
    price: 180.0,
    category: "accesorios",
    stock: 20,
    isActive: true,
    image: "/placeholder.svg?height=300&width=300&text=Xbox+Controller",
  },
  {
    name: "Juego FIFA 24",
    price: 120.0,
    category: "juegos",
    stock: 30,
    isActive: true,
    image: "/placeholder.svg?height=300&width=300&text=FIFA+24",
  },
  {
    name: "Nintendo Switch",
    price: 1200.0,
    category: "consolas",
    stock: 8,
    isActive: true,
    image: "/placeholder.svg?height=300&width=300&text=Nintendo+Switch",
  },
  {
    name: "Auriculares Gaming",
    price: 85.0,
    category: "accesorios",
    stock: 25,
    isActive: true,
    image: "/placeholder.svg?height=300&width=300&text=Gaming+Headset",
  },
  {
    name: "Call of Duty",
    price: 150.0,
    category: "juegos",
    stock: 12,
    isActive: true,
    image: "/placeholder.svg?height=300&width=300&text=Call+of+Duty",
  },
  {
    name: "Teclado Mecánico",
    price: 95.0,
    category: "accesorios",
    stock: 18,
    isActive: true,
    image: "/placeholder.svg?height=300&width=300&text=Mechanical+Keyboard",
  },
]

async function createTestData() {
  console.log("🚀 Creando usuarios de prueba y productos...")

  try {
    // Crear usuarios
    for (const userData of testUsers) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password)
        const user = userCredential.user

        // Actualizar perfil
        await updateProfile(user, {
          displayName: userData.displayName,
        })

        // Guardar datos adicionales en Firestore
        await setDoc(doc(db, "users", user.uid), {
          email: userData.email,
          username: userData.username,
          displayName: userData.displayName,
          role: userData.role,
          permissions: userData.permissions,
          isActive: true,
          createdAt: new Date(),
          shortcuts: [],
        })

        console.log(`✅ Usuario creado: ${userData.username} (${userData.email})`)
      } catch (error) {
        if (error.code === "auth/email-already-in-use") {
          console.log(`⚠️ Usuario ya existe: ${userData.username}`)
        } else {
          console.error(`❌ Error creando usuario ${userData.username}:`, error)
        }
      }
    }

    // Crear productos de muestra
    for (const product of sampleProducts) {
      try {
        await addDoc(collection(db, "products"), {
          ...product,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        console.log(`✅ Producto creado: ${product.name}`)
      } catch (error) {
        console.error(`❌ Error creando producto ${product.name}:`, error)
      }
    }

    console.log("🎉 ¡Datos de prueba creados exitosamente!")
    console.log("\n📋 Usuarios disponibles:")
    console.log("👤 admin / 123456 (Administrador)")
    console.log("👤 vendedor / 123456 (Vendedor)")
  } catch (error) {
    console.error("❌ Error general:", error)
  }
}

createTestData()
