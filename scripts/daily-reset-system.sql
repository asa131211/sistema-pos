-- Actualizado sistema de reinicio automático para medianoche hora de Perú
-- Sistema de transición diaria automática
-- Este script configura la transición automática de día de ventas a las 12:00 AM (medianoche) hora de Perú

-- Crear tabla para tracking de transiciones diarias
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

-- Nueva función para verificar transición de día de negocio
-- (Esta lógica se implementa en el frontend con JavaScript usando zona horaria America/Lima)

-- Ejemplo de datos de transición
INSERT INTO daily_resets (id, reset_date, total_sales_before_reset, cash_registers_closed) 
VALUES 
    ('reset-2024-01-01', '2024-01-01', 1250.50, 3),
    ('reset-2024-01-02', '2024-01-02', 980.75, 2)
ON CONFLICT (id) DO NOTHING;

-- Configuración de horarios de transición actualizada
-- 12:00 AM (medianoche) = Transición automática de día de ventas (zona horaria America/Lima)
-- 11:55 PM = Notificación de advertencia (5 minutos antes)
-- 12:05 AM = Verificación de transición completada

-- Notas para implementación actualizada:
-- 1. La transición se maneja en el frontend con zona horaria America/Lima
-- 2. Solo se archivan las ventas del día anterior, NO se reinicia todo el sistema
-- 3. Las cajas registradoras se cierran automáticamente solo a medianoche
-- 4. Los reportes del día anterior se archivan pero permanecen accesibles
-- 5. Se limpia solo el caché de ventas del día, no todo el caché
-- 6. Las ventas antes de 12 AM pertenecen al día anterior
-- 7. Las ventas después de 12 AM pertenecen al nuevo día
-- 8. El sistema continúa funcionando normalmente durante la transición
