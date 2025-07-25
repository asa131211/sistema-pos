#!/bin/bash

# Script para configurar el despliegue completo

echo "🚀 Configurando Sistema POS para producción..."

# 1. Instalar dependencias adicionales para producción
npm install @vercel/analytics @vercel/speed-insights

# 2. Crear build optimizado
npm run build

# 3. Verificar que todo funciona
npm run start

echo "✅ Listo para desplegar!"
echo "📝 Siguiente paso: Configurar dominio personalizado"
