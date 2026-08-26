-- Indices adicionales para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_precios_fecha ON public.precios_diarios (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_precios_producto ON public.precios_diarios (producto);
CREATE INDEX IF NOT EXISTS idx_clima_fecha ON public.clima_diario (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_clima_ubicacion ON public.clima_diario (ubicacion);
