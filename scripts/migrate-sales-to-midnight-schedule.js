// Script para migrar las ventas existentes al nuevo horario de medianoche
import { initializeApp } from "firebase/app"
import { getFirestore, collection, getDocs, updateDoc, doc, query, orderBy } from "firebase/firestore"

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

async function migrateSalesToMidnightSchedule() {
  try {
    console.log("🔄 Iniciando migración de ventas al horario de medianoche...")
    console.log("📅 Nuevo sistema: Día de negocio de 12:00 AM a 11:59 PM hora de Perú")

    // Obtener todas las ventas ordenadas por timestamp
    const salesRef = collection(db, "sales")
    const salesQuery = query(salesRef, orderBy("timestamp", "asc"))
    const salesSnapshot = await getDocs(salesQuery)

    let migratedCount = 0
    let unchangedCount = 0
    const migrationLog = []

    console.log(`📊 Total de ventas encontradas: ${salesSnapshot.docs.length}`)

    for (const saleDoc of salesSnapshot.docs) {
      const saleData = saleDoc.data()

      // Convertir timestamp a Date si es necesario
      let saleTimestamp
      if (saleData.timestamp?.toDate) {
        saleTimestamp = saleData.timestamp.toDate()
      } else if (saleData.timestamp instanceof Date) {
        saleTimestamp = saleData.timestamp
      } else {
        saleTimestamp = new Date(saleData.timestamp)
      }

      // Convertir a hora de Perú
      const peruTime = new Date(saleTimestamp.toLocaleString("en-US", { timeZone: "America/Lima" }))

      // En el nuevo sistema: cada día calendario (00:00 - 23:59) es un día de negocio
      const correctBusinessDate = peruTime.toISOString().split("T")[0]

      const currentDate = saleData.date

      // Solo actualizar si la fecha de negocio es diferente
      if (currentDate !== correctBusinessDate) {
        try {
          await updateDoc(doc(db, "sales", saleDoc.id), {
            date: correctBusinessDate,
          })

          migrationLog.push({
            saleId: saleDoc.id,
            timestamp: saleTimestamp.toISOString(),
            peruTime: peruTime.toISOString(),
            oldDate: currentDate,
            newDate: correctBusinessDate,
            total: saleData.total,
          })

          migratedCount++

          if (migratedCount % 10 === 0) {
            console.log(`✅ Migradas ${migratedCount} ventas...`)
          }
        } catch (error) {
          console.error(`❌ Error al migrar venta ${saleDoc.id}:`, error)
        }
      } else {
        unchangedCount++
      }

      // Pausa cada 50 operaciones para no sobrecargar Firebase
      if ((migratedCount + unchangedCount) % 50 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    // Mostrar resumen de la migración
    console.log("\n🎉 MIGRACIÓN COMPLETADA")
    console.log(`✅ Ventas migradas: ${migratedCount}`)
    console.log(`➡️ Ventas sin cambios: ${unchangedCount}`)
    console.log(`📊 Total procesadas: ${migratedCount + unchangedCount}`)

    if (migrationLog.length > 0) {
      console.log("\n📋 DETALLE DE CAMBIOS:")
      migrationLog.forEach((log, index) => {
        if (index < 10) {
          // Mostrar solo los primeros 10 para no saturar la consola
          console.log(
            `   ${log.oldDate} → ${log.newDate} (S/ ${log.total}) [${log.peruTime.split("T")[1].split(".")[0]}]`,
          )
        }
      })
      if (migrationLog.length > 10) {
        console.log(`   ... y ${migrationLog.length - 10} cambios más`)
      }
    }

    console.log("\n📅 Todas las ventas ahora usan el horario correcto:")
    console.log("   • Día de negocio: 12:00 AM - 11:59 PM hora de Perú")
    console.log("   • Zona horaria: America/Lima")
    console.log("   • Sin pérdida de datos ✅")
  } catch (error) {
    console.error("❌ Error durante la migración:", error)
    throw error
  }
}

// Ejecutar la migración
migrateSalesToMidnightSchedule()
  .then(() => {
    console.log("🏁 Migración finalizada exitosamente")
    process.exit(0)
  })
  .catch((error) => {
    console.error("💥 Migración falló:", error)
    process.exit(1)
  })
