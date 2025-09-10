// Script para actualizar las ventas existentes al nuevo horario (12 AM en lugar de 7 PM)
import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore"

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

async function fixSalesSchedule() {
  try {
    console.log("🔄 Iniciando corrección de horarios de ventas...")

    // Obtener todas las ventas
    const salesRef = collection(db, "sales")
    const salesSnapshot = await getDocs(salesRef)

    let updatedCount = 0
    const batch = []

    for (const saleDoc of salesSnapshot.docs) {
      const saleData = saleDoc.data()
      const saleTimestamp = new Date(saleData.timestamp)

      // Convertir a hora de Perú
      const peruTime = new Date(saleTimestamp.toLocaleString("en-US", { timeZone: "America/Lima" }))

      // Calcular la fecha de negocio correcta (desde medianoche hasta 11:59 PM del mismo día)
      const businessDate = peruTime.toISOString().split("T")[0]

      // Solo actualizar si la fecha de negocio es diferente
      if (saleData.date !== businessDate) {
        batch.push({
          docRef: doc(db, "sales", saleDoc.id),
          newDate: businessDate,
          originalDate: saleData.date,
          timestamp: saleData.timestamp,
        })
        updatedCount++
      }
    }

    console.log(`📊 Encontradas ${updatedCount} ventas para actualizar`)

    // Actualizar en lotes de 10
    for (let i = 0; i < batch.length; i += 10) {
      const batchSlice = batch.slice(i, i + 10)

      for (const update of batchSlice) {
        await updateDoc(update.docRef, {
          date: update.newDate,
        })

        console.log(`✅ Actualizada venta: ${update.originalDate} → ${update.newDate}`)
      }

      // Pausa entre lotes para no sobrecargar Firebase
      if (i + 10 < batch.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    console.log(`🎉 Corrección completada: ${updatedCount} ventas actualizadas`)
    console.log("📅 Ahora todas las ventas usan el horario correcto (12 AM - 11:59 PM hora de Perú)")
  } catch (error) {
    console.error("❌ Error al corregir horarios:", error)
  }
}

// Ejecutar el script
fixSalesSchedule()
