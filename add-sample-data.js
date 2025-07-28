// Script para agregar datos de prueba
import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc } from "firebase/firestore"

const firebaseConfig = {
  // Tu configuración aquí
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Productos de ejemplo
const sampleProducts = [
  {
    name: "FIFA 24",
    price: 15.0,
    image: "https://example.com/fifa24.jpg",
  },
  {
    name: "Call of Duty",
    price: 20.0,
    image: "https://example.com/cod.jpg",
  },
  {
    name: "Fortnite V-Bucks",
    price: 10.0,
    image: "https://example.com/fortnite.jpg",
  },
]

// Agregar productos
async function addSampleProducts() {
  for (const product of sampleProducts) {
    try {
      await addDoc(collection(db, "products"), product)
      console.log("Producto agregado:", product.name)
    } catch (error) {
      console.error("Error:", error)
    }
  }
}

addSampleProducts()
