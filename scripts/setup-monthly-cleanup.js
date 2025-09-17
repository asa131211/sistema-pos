// Script para configurar la limpieza mensual automática de ventas
// Ejecutar este script una vez para configurar el sistema

import { initializeApp } from "firebase/app"
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore"

const firebaseConfig = {
  // Tu configuración de Firebase aquí
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Función para configurar la limpieza mensual
async function setupMonthlyCleanup() {
  try {
    console.log("🔧 Configurando sistema de limpieza mensual...")

    // Crear documento de configuración
    await addDoc(collection(db, "system-config"), {
      type: "monthly-cleanup",
      enabled: true,
      retentionDays: 30, // Mantener ventas por 30 días
      cleanupTime: "02:00", // 2:00 AM hora de Perú
      cleanupDay: 1, // Primer día del mes
      timezone: "America/Lima",
      lastCleanup: null,
      nextCleanup: null,
      createdAt: serverTimestamp(),
      description: "Limpieza automática mensual de ventas antiguas",
    })

    console.log("✅ Sistema de limpieza mensual configurado exitosamente")
    console.log("📅 Las ventas se mantendrán por 30 días")
    console.log("🕐 Limpieza programada para el día 1 de cada mes a las 2:00 AM (hora de Perú)")
  } catch (error) {
    console.error("❌ Error configurando limpieza mensual:", error)
  }
}

// Función para ejecutar limpieza manual (solo para testing)
async function runManualCleanup() {
  try {
    console.log("🧹 Ejecutando limpieza manual...")

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffDate = thirtyDaysAgo.toISOString().split("T")[0]

    // Buscar ventas antiguas
    const salesQuery = query(collection(db, "sales"), where("date", "<", cutoffDate))

    const salesSnapshot = await getDocs(salesQuery)
    console.log(`📊 Encontradas ${salesSnapshot.docs.length} ventas para limpiar`)

    if (salesSnapshot.docs.length > 0) {
      // Archivar antes de eliminar
      const batch = writeBatch(db)
      let totalAmount = 0

      salesSnapshot.docs.forEach((saleDoc) => {
        const saleData = saleDoc.data()
        totalAmount += saleData.total || 0

        // Archivar en colección de backup
        batch.set(doc(db, "sales-archive", saleDoc.id), {
          ...saleData,
          archivedAt: serverTimestamp(),
          originalId: saleDoc.id,
        })

        // Eliminar de colección principal
        batch.delete(doc(db, "sales", saleDoc.id))
      })

      await batch.commit()

      // Registrar la limpieza
      await addDoc(collection(db, "monthly-cleanups"), {
        cleanupDate: new Date().toISOString().split("T")[0],
        salesDeleted: salesSnapshot.docs.length,
        totalAmountDeleted: totalAmount,
        oldestSaleDate: cutoffDate,
        status: "completed",
        executedAt: serverTimestamp(),
        type: "manual",
      })

      console.log(`✅ Limpieza completada: ${salesSnapshot.docs.length} ventas archivadas`)
      console.log(`💰 Total archivado: S/. ${totalAmount.toFixed(2)}`)
    } else {
      console.log("✨ No hay ventas antiguas para limpiar")
    }
  } catch (error) {
    console.error("❌ Error en limpieza manual:", error)
  }
}

// Ejecutar configuración
setupMonthlyCleanup()

// Para ejecutar limpieza manual, descomenta la siguiente línea:
// runManualCleanup()
