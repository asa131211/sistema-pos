import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const sampleProducts = [
  {
    name: "Coca Cola 500ml",
    price: 3.5,
    category: "Bebidas",
    stock: 50,
    isActive: true,
  },
  {
    name: "Sandwich Mixto",
    price: 8.0,
    category: "Comida",
    stock: 20,
    isActive: true,
  },
  {
    name: "Agua Mineral 600ml",
    price: 2.0,
    category: "Bebidas",
    stock: 100,
    isActive: true,
  },
  {
    name: "Hamburguesa Clásica",
    price: 15.0,
    category: "Comida",
    stock: 15,
    isActive: true,
  },
  {
    name: "Papas Fritas",
    price: 5.0,
    category: "Snacks",
    stock: 30,
    isActive: true,
  },
  {
    name: "Inca Kola 500ml",
    price: 3.5,
    category: "Bebidas",
    stock: 40,
    isActive: true,
  },
  {
    name: "Hot Dog Especial",
    price: 6.0,
    category: "Comida",
    stock: 25,
    isActive: true,
  },
  {
    name: "Galletas Oreo",
    price: 4.0,
    category: "Snacks",
    stock: 60,
    isActive: true,
  },
]

async function addSampleProducts() {
  try {
    console.log("🚀 Agregando productos de muestra...")

    for (const product of sampleProducts) {
      await addDoc(collection(db, "products"), {
        ...product,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      console.log(`✅ Producto agregado: ${product.name}`)
    }

    console.log("🎉 ¡Productos de muestra agregados exitosamente!")
  } catch (error) {
    console.error("❌ Error:", error)
  }
}

addSampleProducts()
