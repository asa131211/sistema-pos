// Script para agregar datos de prueba
import { initializeApp } from "firebase/app"
import { getFirestore, collection, addDoc, doc, setDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "demo-app-id",
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

// Ventas de ejemplo
const sampleSales = [
  {
    items: [
      { id: "1", name: "Juego de Mesa Monopoly", price: 45.0, quantity: 2, paymentMethod: "efectivo" },
      { id: "2", name: "Control Xbox", price: 180.0, quantity: 1, paymentMethod: "tarjeta" },
    ],
    total: 270.0,
    timestamp: new Date(Date.now() - 86400000), // Ayer
    userName: "Administrador",
    paymentMethods: { efectivo: 90.0, tarjeta: 180.0 },
  },
  {
    items: [{ id: "3", name: "PlayStation 5", price: 2500.0, quantity: 1, paymentMethod: "tarjeta" }],
    total: 2500.0,
    timestamp: new Date(Date.now() - 43200000), // Hace 12 horas
    userName: "Vendedor",
    paymentMethods: { tarjeta: 2500.0 },
  },
  {
    items: [
      { id: "4", name: "Juego FIFA 24", price: 120.0, quantity: 3, paymentMethod: "efectivo" },
      { id: "5", name: "Auriculares Gaming", price: 85.0, quantity: 2, paymentMethod: "yape" },
    ],
    total: 530.0,
    timestamp: new Date(Date.now() - 21600000), // Hace 6 horas
    userName: "Vendedor",
    paymentMethods: { efectivo: 360.0, yape: 170.0 },
  },
  {
    items: [
      { id: "6", name: "Nintendo Switch", price: 1200.0, quantity: 1, paymentMethod: "tarjeta" },
      { id: "7", name: "Teclado Mecánico", price: 95.0, quantity: 1, paymentMethod: "efectivo" },
    ],
    total: 1295.0,
    timestamp: new Date(Date.now() - 10800000), // Hace 3 horas
    userName: "Administrador",
    paymentMethods: { tarjeta: 1200.0, efectivo: 95.0 },
  },
  {
    items: [{ id: "8", name: "Call of Duty", price: 150.0, quantity: 2, paymentMethod: "yape" }],
    total: 300.0,
    timestamp: new Date(Date.now() - 3600000), // Hace 1 hora
    userName: "Vendedor",
    paymentMethods: { yape: 300.0 },
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

// Agregar datos de muestra
async function addSampleData() {
  console.log("🚀 Agregando datos de muestra...")

  try {
    // Agregar ventas de muestra
    for (const sale of sampleSales) {
      await addDoc(collection(db, "sales"), sale)
      console.log(`✅ Venta agregada: ${sale.total}`)
    }

    // Agregar configuración del sistema
    await setDoc(doc(db, "settings", "system"), {
      storeName: "Sanchez Park",
      storeAddress: "Av. Principal 123, Lima, Perú",
      storePhone: "+51 999 888 777",
      currency: "PEN",
      taxRate: 0.18,
      promotionEnabled: true,
      promotionRule: "10+1",
      ticketFooter: "¡Gracias por su compra! - www.sanchezpark.com",
      updatedAt: new Date(),
    })

    console.log("✅ Configuración del sistema agregada")
    console.log("🎉 ¡Datos de muestra agregados exitosamente!")
  } catch (error) {
    console.error("❌ Error agregando datos:", error)
  }
}

// Ejecutar funciones
addSampleProducts()
addSampleData()
