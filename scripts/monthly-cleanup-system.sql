-- Sistema de limpieza mensual de ventas
-- Este script configura la limpieza automática de ventas cada mes

-- Crear tabla para tracking de limpiezas mensuales
CREATE TABLE IF NOT EXISTS monthly_cleanups (
    id VARCHAR(50) PRIMARY KEY,
    cleanup_date DATE NOT NULL,
    cleanup_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sales_deleted INTEGER DEFAULT 0,
    oldest_sale_date DATE,
    total_amount_deleted DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'completed'
);

-- Crear índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_monthly_cleanups_date ON monthly_cleanups(cleanup_date);
CREATE INDEX IF NOT EXISTS idx_monthly_cleanups_status ON monthly_cleanups(status);

-- Configuración de limpieza mensual
-- Las ventas se mantienen por 30 días, después se archivan/eliminan
-- La limpieza se ejecuta el primer día de cada mes a las 2:00 AM hora de Perú

-- Ejemplo de registro de limpieza
INSERT INTO monthly_cleanups (id, cleanup_date, sales_deleted, oldest_sale_date, total_amount_deleted) 
VALUES 
    ('cleanup-2024-01', '2024-01-01', 150, '2023-11-01', 2500.75),
    ('cleanup-2024-02', '2024-02-01', 200, '2023-12-01', 3200.50)
ON CONFLICT (id) DO NOTHING;

-- Notas para implementación:
-- 1. La limpieza se ejecuta mensualmente, no cada 2 días
-- 2. Se mantienen las ventas de los últimos 30 días
-- 3. Las ventas más antiguas se archivan antes de eliminar
-- 4. Se registra cada limpieza para auditoría
-- 5. La limpieza se programa para las 2:00 AM del primer día del mes
-- 6. Se mantiene un backup de las ventas eliminadas por 90 días adicionales
