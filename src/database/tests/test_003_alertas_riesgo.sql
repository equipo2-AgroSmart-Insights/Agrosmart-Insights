-- Pruebas de 003_alertas_riesgo.sql. Cada bloque dice qué debe pasar.
-- Se corre con: psql -v ON_ERROR_STOP=1 -f test_003_alertas_riesgo.sql
-- Fecha de evaluación fija: lunes 2026-11-02.
--   Ventana actual:      2026-10-27 .. 2026-11-02 (7 días)
--   Ventana comparación: 2026-09-29 .. 2026-10-26 (28 días)
\set ON_ERROR_STOP on

-- Datos de prueba ---------------------------------------------------------
-- GMML 1 Papa amarilla: 100 t/día -> 40 t/día   (-60 %  => crítica)
-- GMML 2 Cebolla roja:   80 t/día estable        (0 %   => sin alerta)
-- GMML 3 Ajo:             2 t/día -> 0.5         (filtrada: < 5 t/día)
-- GMML 4 Zanahoria:      50 t/día -> 37 t/día    (-26 % => informativa)
-- MMF2 10 Mandarina: solo 5 días recientes       (regla insuficiente)
INSERT INTO public.precios_diarios (fecha, producto, producto_id, mercado, volumen_t)
SELECT d::date, p.nombre, p.id, 'GMML',
       CASE WHEN d >= '2026-10-27' THEN p.actual ELSE p.comparacion END
FROM generate_series('2026-09-29'::date, '2026-11-02'::date, interval '1 day') d
CROSS JOIN (VALUES (1, 'Papa amarilla', 100, 40),
                   (2, 'Cebolla roja',   80, 80),
                   (3, 'Ajo',             2, 0.5),
                   (4, 'Zanahoria',      50, 37)) AS p(id, nombre, comparacion, actual);

INSERT INTO public.precios_diarios (fecha, producto, producto_id, mercado, volumen_t)
SELECT d::date, 'Mandarina', 10, 'MMF2', 30
FROM generate_series('2026-10-29'::date, '2026-11-02'::date, interval '1 day') d;

-- Fila sin mapeo de producto: debe ignorarse.
INSERT INTO public.precios_diarios (fecha, producto, producto_id, mercado, volumen_t)
VALUES ('2026-11-02', 'Producto sin mapeo', NULL, 'GMML', 999);

DO $$
DECLARE
    res jsonb; lst jsonb; det jsonb; upd jsonb;
    v_papa bigint; v_zana bigint;
    s1 text := '3f2a9c1e-1111-4a2b-9c3d-000000000001';
BEGIN
    -- 1. Reglas sembradas: 2 activas (volumen) y la de lluvia inactiva.
    ASSERT (SELECT COUNT(*) FROM alertas_riesgo_reglas) = 3, 'deben existir 3 reglas';
    ASSERT (SELECT COUNT(*) FROM alertas_riesgo_reglas WHERE activa) = 2, 'deben estar activas 2 reglas';

    -- 2. Simulación: calcula pero no escribe.
    res := alertas_riesgo_evaluar('2026-11-02', true);
    ASSERT (res->>'simulacion')::boolean, 'debe marcar simulacion';
    ASSERT (res->'detalle'->0->>'alertas')::int = 2, 'GMML debe proponer 2 alertas: ' || res::text;
    ASSERT (SELECT COUNT(*) FROM alertas_riesgo) = 0, 'la simulación no debe escribir alertas';
    ASSERT (SELECT COUNT(*) FROM alertas_riesgo_ejecuciones) = 0, 'la simulación no debe registrar ejecución';

    -- 3. Evaluación real.
    res := alertas_riesgo_evaluar('2026-11-02');
    ASSERT (res->>'alertas_nuevas')::int = 2, 'deben crearse 2 alertas: ' || res::text;
    ASSERT (res->>'reglas_insuficientes')::int = 1, 'MMF2 debe quedar insuficiente: ' || res::text;
    ASSERT (res->>'reglas_desactualizadas')::int = 0, 'ninguna regla desactualizada: ' || res::text;

    SELECT id INTO v_papa FROM alertas_riesgo WHERE producto = 'Papa amarilla';
    SELECT id INTO v_zana FROM alertas_riesgo WHERE producto = 'Zanahoria';
    ASSERT (SELECT severidad FROM alertas_riesgo WHERE id = v_papa) = 'critical', 'papa debe ser crítica';
    ASSERT (SELECT severidad FROM alertas_riesgo WHERE id = v_zana) = 'informative', 'zanahoria debe ser informativa';
    ASSERT NOT EXISTS (SELECT 1 FROM alertas_riesgo WHERE producto IN ('Ajo', 'Cebolla roja', 'Producto sin mapeo')),
        'ajo, cebolla y la fila sin mapeo no deben generar alertas';

    -- 4. Repetir el cálculo no duplica: actualiza las abiertas.
    res := alertas_riesgo_evaluar('2026-11-02');
    ASSERT (res->>'alertas_nuevas')::int = 0 AND (res->>'alertas_actualizadas')::int = 2,
        'segunda corrida debe actualizar 2 y crear 0: ' || res::text;
    ASSERT (SELECT COUNT(*) FROM alertas_riesgo) = 2, 'no debe haber duplicados';

    -- 5. list: contrato del microfrontend.
    lst := alertas_riesgo_listar();
    ASSERT jsonb_array_length(lst->'alerts') = 2, 'list debe devolver 2 alertas';
    ASSERT lst->'alerts'->0->>'severity' = 'critical', 'la crítica va primero';
    ASSERT lst->'alerts'->0->>'product' = 'Papa amarilla', 'product';
    ASSERT lst->'alerts'->0->>'market' = 'Gran Mercado Mayorista de Lima', 'market con nombre legible';
    ASSERT lst->'alerts'->0->>'status' = 'pending', 'estado inicial pending';
    ASSERT lst->'alerts'->0->>'observed_end_date' = '2026-11-02', 'observed_end_date';
    ASSERT lst->'alerts'->0->>'explanation' LIKE '%60.0 % menos%', 'explicación con la caída: ' || (lst->'alerts'->0->>'explanation');
    ASSERT (lst->>'configuredRules')::int = 2 AND (lst->>'insufficientRules')::int = 1
       AND (lst->>'staleRules')::int = 0, 'contadores de reglas: ' || lst::text;
    ASSERT NOT (lst->'alerts'->0 ? 'evidence'), 'list no debe incluir la evidencia completa';

    -- 6. details: evidencia completa.
    det := alertas_riesgo_detalle(v_papa)->'alert';
    ASSERT (det->'evidence'->'currentPeriod'->>'average')::numeric = 40, 'promedio actual 40';
    ASSERT (det->'evidence'->'currentPeriod'->>'observations')::int = 7, '7 registros actuales';
    ASSERT (det->'evidence'->'comparisonPeriod'->>'average')::numeric = 100, 'promedio comparación 100';
    ASSERT (det->'evidence'->'comparisonPeriod'->>'observations')::int = 28, '28 registros de comparación';
    ASSERT (det->'evidence'->>'variationPercent')::numeric = -60.0, 'variación -60';
    ASSERT (det->'evidence'->'thresholds'->>'critical')::numeric = -50, 'umbral crítico -50';
    ASSERT det->'evidence'->>'unit' = 't', 'unidad t';
    ASSERT jsonb_array_length(det->'evidence'->'history') = 35, 'history con 35 registros';
    ASSERT jsonb_array_length(det->'status_history') = 0, 'sin historial de estados aún';
    ASSERT alertas_riesgo_detalle(999999)->'alert' = 'null'::jsonb, 'id inexistente devuelve alert null';

    -- 7. update: pending -> read -> attended, con trazabilidad.
    upd := alertas_riesgo_actualizar(v_papa, 'read', s1);
    ASSERT upd->'alert'->>'status' = 'read', 'pasa a read: ' || upd::text;
    ASSERT upd->'alert'->>'actor_session_id' = '3f2a9c1e', 'muestra solo el prefijo de sesión';
    ASSERT upd->'alert' ? 'evidence', 'update devuelve el detalle completo';
    upd := alertas_riesgo_actualizar(v_papa, 'read', s1);
    ASSERT upd->'alert'->>'status' = 'read', 'repetir read es idempotente';
    ASSERT (SELECT COUNT(*) FROM alertas_riesgo_historial WHERE alerta_id = v_papa) = 1, 'idempotente no duplica historial';
    upd := alertas_riesgo_actualizar(v_papa, 'attended', s1);
    ASSERT upd->'alert'->>'status' = 'attended', 'pasa a attended';
    ASSERT jsonb_array_length(upd->'alert'->'status_history') = 2, 'historial con read y attended';

    -- 8. update: entradas inválidas.
    ASSERT alertas_riesgo_actualizar(v_papa, 'read', s1)->>'error' IS NOT NULL, 'no se vuelve de attended a read';
    ASSERT alertas_riesgo_actualizar(v_zana, 'pending', s1)->>'error' IS NOT NULL, 'pending no es un destino válido';
    ASSERT alertas_riesgo_actualizar(v_zana, 'read', 'no-es-uuid')->>'error' IS NOT NULL, 'session_id inválido';
    ASSERT alertas_riesgo_actualizar(999999, 'read', s1)->>'error' IS NOT NULL, 'alerta inexistente';
    ASSERT (SELECT estado FROM alertas_riesgo WHERE id = v_zana) = 'pending', 'los errores no cambian nada';

    -- 9. Una alerta atendida no se reabre en la misma ventana.
    res := alertas_riesgo_evaluar('2026-11-02');
    ASSERT (res->>'alertas_nuevas')::int = 0, 'no reabre la atendida: ' || res::text;
    ASSERT (SELECT COUNT(*) FROM alertas_riesgo) = 2, 'siguen siendo 2 alertas';
    lst := alertas_riesgo_listar();
    ASSERT jsonb_array_length(lst->'alerts') = 2, 'list incluye abierta + atendida';

    -- 10. Datos viejos: con fecha muy posterior, ambas reglas quedan desactualizadas.
    res := alertas_riesgo_evaluar('2026-12-31', true);
    ASSERT (res->>'reglas_desactualizadas')::int = 2, 'reglas desactualizadas: ' || res::text;

    RAISE NOTICE 'OK: todas las pruebas de 003_alertas_riesgo pasaron';
END;
$$;
