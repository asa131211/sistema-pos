-- Sistema de reinicio automático diario
-- Cambiado de 7:00 AM a 12:00 AM (medianoche) hora de Perú
-- Este script configura el reinicio automático de ventas a las 12:00 AM

-- Crear tabla para tracking de reinicios diarios
CREATE TABLE IF NOT EXISTS daily_resets (
    id VARCHAR(50) PRIMARY KEY,
    reset_date DATE NOT NULL,
    reset_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_sales_before_reset DECIMAL(10,2) DEFAULT 0,
    cash_registers_closed INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed'
);

-- Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_daily_resets_date ON daily_resets(reset_date);
CREATE INDEX IF NOT EXISTS idx_daily_resets_status ON daily_resets(status);

-- Función para verificar si ya se hizo el reinicio del día
-- (Esta lógica se implementa en el frontend con JavaScript)

-- Ejemplo de datos de reinicio
INSERT INTO daily_resets (id, reset_date, total_sales_before_reset, cash_registers_closed) 
VALUES 
    ('reset-2024-01-01', '2024-01-01', 1250.50, 3),
    ('reset-2024-01-02', '2024-01-02', 980.75, 2)
ON CONFLICT (id) DO NOTHING;

-- Configuración de horarios actualizada a medianoche hora de Perú
-- 12:00 AM = Reinicio automático del día de ventas (NO del sistema completo)
-- 11:55 PM = Notificación de advertencia (5 minutos antes)
-- 12:05 AM = Verificación de reinicio completado

-- Notas para implementación:
-- 1. El reinicio se maneja en el frontend con setTimeout usando zona horaria de Perú
-- 2. Las cajas registradoras se cierran automáticamente a las 12:00 AM
-- 3. Solo se reinicia el día de ventas, NO todo el sistema
-- 4. Los reportes del día anterior se archivan
-- 5. Se limpia solo el caché de ventas del día, no todo el caché
-- 6. Se envían notificaciones a los usuarios activos
-- 7. Zona horaria: America/Lima (UTC-5)
</sql>
