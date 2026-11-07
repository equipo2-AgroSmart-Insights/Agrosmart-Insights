-- ============================================================================
-- 003 — Alertas de riesgo agrícola (backend de alertas-microfrontend)
-- ============================================================================
-- Qué hace:
--   * Reglas configurables (alertas_riesgo_reglas): comparan el promedio de un
--     período reciente contra un período anterior y clasifican la caída según
--     tres umbrales (informativo / moderado / crítico).
--   * alertas_riesgo_evaluar() calcula las alertas con los datos que ya carga
--     WF1 (precios_diarios.volumen_t y clima_diario.precipitacion).
--   * alertas_riesgo_listar / _detalle / _actualizar devuelven exactamente el
--     JSON que espera src/frontend/alertas-microfrontend (alertasService.js).
--
-- Es idempotente: se puede ejecutar más de una vez sin duplicar nada.
-- Depende de: public.precios_diarios (fecha, producto, producto_id, mercado,
-- volumen_t) y public.clima_diario (fecha, ubicacion, region_id,
-- precipitacion, tipo_dato), tal como los escribe WF1.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tablas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alertas_riesgo_reglas (
    id                        serial PRIMARY KEY,
    codigo                    text NOT NULL UNIQUE,
    nombre                    text NOT NULL,
    tipo                      text NOT NULL CHECK (tipo IN ('volumen', 'precipitacion')),
    mercado                   text,      -- volumen: 'GMML' o 'MMF2'
    producto_id               integer,   -- volumen: NULL = todos los productos del mercado
    region_id                 integer,   -- precipitación: NULL = todas las regiones
    dias_actual               integer NOT NULL DEFAULT 7  CHECK (dias_actual > 0),
    dias_comparacion          integer NOT NULL DEFAULT 28 CHECK (dias_comparacion > 0),
    umbral_informativo        numeric NOT NULL,  -- % de caída
    umbral_moderado           numeric NOT NULL,
    umbral_critico            numeric NOT NULL,
    min_obs_actual            integer NOT NULL DEFAULT 3,
    min_obs_comparacion       integer NOT NULL DEFAULT 12,
    min_promedio_comparacion  numeric NOT NULL DEFAULT 0,  -- descarta series muy pequeñas
    max_dias_antiguedad       integer NOT NULL DEFAULT 5,  -- más viejo que esto = desactualizado
    activa                    boolean NOT NULL DEFAULT true,
    descripcion               text,
    creado_en                 timestamptz NOT NULL DEFAULT now(),
    actualizado_en            timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT alertas_riesgo_reglas_umbrales_ck
        CHECK (umbral_informativo > 0
           AND umbral_informativo < umbral_moderado
           AND umbral_moderado < umbral_critico),
    CONSTRAINT alertas_riesgo_reglas_alcance_ck
        CHECK ((tipo = 'volumen' AND mercado IS NOT NULL) OR tipo = 'precipitacion')
);

CREATE TABLE IF NOT EXISTS public.alertas_riesgo (
    id                bigserial PRIMARY KEY,
    regla_id          integer NOT NULL REFERENCES public.alertas_riesgo_reglas (id),
    clave_serie       text NOT NULL,   -- 'vol|GMML|<producto_id>' o 'pp|<region_id>'
    producto          text,
    mercado           text,
    ubicacion         text,
    severidad         text NOT NULL CHECK (severidad IN ('informative', 'moderate', 'critical')),
    estado            text NOT NULL DEFAULT 'pending' CHECK (estado IN ('pending', 'read', 'attended')),
    explicacion       text NOT NULL,
    periodo_inicio    date NOT NULL,
    periodo_fin       date NOT NULL,
    evidencia         jsonb NOT NULL,
    actor_session_id  text,
    actuado_en        timestamptz,
    atendido_en       timestamptz,
    creado_en         timestamptz NOT NULL DEFAULT now(),
    actualizado_en    timestamptz NOT NULL DEFAULT now()
);

-- Una sola alerta abierta (pendiente o leída) por regla y serie: si la caída
-- sigue, el cálculo diario actualiza esa alerta en vez de crear otra.
CREATE UNIQUE INDEX IF NOT EXISTS alertas_riesgo_abierta_uq
    ON public.alertas_riesgo (regla_id, clave_serie)
    WHERE estado <> 'attended';

CREATE INDEX IF NOT EXISTS alertas_riesgo_estado_idx
    ON public.alertas_riesgo (estado, periodo_fin DESC);

CREATE TABLE IF NOT EXISTS public.alertas_riesgo_historial (
    id                bigserial PRIMARY KEY,
    alerta_id         bigint NOT NULL REFERENCES public.alertas_riesgo (id) ON DELETE CASCADE,
    estado            text NOT NULL CHECK (estado IN ('pending', 'read', 'attended')),
    actor_session_id  text NOT NULL,
    cambiado_en       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alertas_riesgo_historial_alerta_idx
    ON public.alertas_riesgo_historial (alerta_id, cambiado_en);

CREATE TABLE IF NOT EXISTS public.alertas_riesgo_ejecuciones (
    id                      bigserial PRIMARY KEY,
    ejecutado_en            timestamptz NOT NULL DEFAULT now(),
    fecha_evaluada          date NOT NULL,
    reglas_activas          integer NOT NULL,
    reglas_desactualizadas  integer NOT NULL,
    reglas_insuficientes    integer NOT NULL,
    alertas_nuevas          integer NOT NULL,
    alertas_actualizadas    integer NOT NULL,
    detalle                 jsonb NOT NULL
);

-- Para que el cálculo por mercado/fecha no recorra toda la tabla.
CREATE INDEX IF NOT EXISTS idx_precios_mercado_fecha
    ON public.precios_diarios (mercado, fecha DESC);

-- ----------------------------------------------------------------------------
-- 2. Reglas iniciales
-- ----------------------------------------------------------------------------
-- Umbrales definidos por el equipo (2026-11-02) para la primera versión.
-- Se ajustan con UPDATE sobre esta tabla, sin tocar código; antes de cambiar
-- umbrales se puede simular con: SELECT public.alertas_riesgo_evaluar(NULL, true);
INSERT INTO public.alertas_riesgo_reglas (
    codigo, nombre, tipo, mercado, region_id,
    dias_actual, dias_comparacion,
    umbral_informativo, umbral_moderado, umbral_critico,
    min_obs_actual, min_obs_comparacion, min_promedio_comparacion,
    max_dias_antiguedad, activa, descripcion
) VALUES
    ('VOL-GMML-7V28', 'Caída de volumen ingresado · Gran Mercado Mayorista de Lima',
     'volumen', 'GMML', NULL, 7, 28, 20, 35, 50, 3, 12, 5, 5, true,
     'Promedio diario de toneladas ingresadas en los últimos 7 días frente a los 28 días previos. '
     'Solo productos con al menos 5 t/día en el período de comparación.'),
    ('VOL-MMF2-7V28', 'Caída de volumen ingresado · Mercado Mayorista de Frutas N.° 2',
     'volumen', 'MMF2', NULL, 7, 28, 20, 35, 50, 3, 12, 5, 5, true,
     'Promedio diario de toneladas ingresadas en los últimos 7 días frente a los 28 días previos. '
     'Solo productos con al menos 5 t/día en el período de comparación.'),
    ('PP-PRONOSTICO-7V28', 'Déficit de lluvia pronosticada · regiones productoras',
     'precipitacion', NULL, NULL, 7, 28, 40, 60, 80, 5, 14, 1, 2, false,
     'Lluvia pronosticada (Open-Meteo) para los próximos 7 días frente a la registrada en los 28 días previos. '
     'Inactiva: clima_diario solo guarda pronósticos (tipo_dato = PRONOSTICO), no lluvia observada. '
     'Activarla cuando exista una serie observada.')
ON CONFLICT (codigo) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Funciones de apoyo
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.alertas_riesgo_nombre_mercado(p_mercado text)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE p_mercado
        WHEN 'GMML' THEN 'Gran Mercado Mayorista de Lima'
        WHEN 'MMF2' THEN 'Mercado Mayorista de Frutas N.° 2'
        ELSE p_mercado
    END;
$$;

-- Convierte una fila de alertas_riesgo al formato del microfrontend.
CREATE OR REPLACE FUNCTION public.alertas_riesgo_json(a public.alertas_riesgo, p_detalle boolean DEFAULT false)
RETURNS jsonb
LANGUAGE sql STABLE AS $$
    SELECT jsonb_build_object(
        'id',                  a.id,
        'rule_id',             a.regla_id,
        'product',             a.producto,
        'market',              public.alertas_riesgo_nombre_mercado(a.mercado),
        'location',            a.ubicacion,
        'severity',            a.severidad,
        'status',              a.estado,
        'explanation',         a.explicacion,
        'observed_start_date', a.periodo_inicio,
        'observed_end_date',   a.periodo_fin,
        'acted_at',            a.actuado_en,
        -- Solo un prefijo: basta para distinguir sesiones en pantalla.
        'actor_session_id',    left(a.actor_session_id, 8),
        'created_at',          a.creado_en
    )
    || CASE WHEN p_detalle THEN jsonb_build_object(
        'evidence', a.evidencia,
        'status_history', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                       'id',               h.id,
                       'status',           h.estado,
                       'actor_session_id', left(h.actor_session_id, 8),
                       'changed_at',       h.cambiado_en)
                   ORDER BY h.cambiado_en, h.id)
            FROM public.alertas_riesgo_historial h
            WHERE h.alerta_id = a.id), '[]'::jsonb)
    ) ELSE '{}'::jsonb END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Cálculo de alertas
-- ----------------------------------------------------------------------------
-- p_hoy:     fecha de evaluación (por defecto, hoy en America/Lima).
-- p_simular: true = solo devuelve lo que generaría, sin escribir nada.
CREATE OR REPLACE FUNCTION public.alertas_riesgo_evaluar(p_hoy date DEFAULT NULL, p_simular boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
    v_hoy          date := COALESCE(p_hoy, (now() AT TIME ZONE 'America/Lima')::date);
    r              public.alertas_riesgo_reglas%ROWTYPE;
    v_ref          date;
    v_ini_act      date;
    v_fin_act      date;
    v_ini_comp     date;
    v_series       integer;
    v_validas      integer;
    v_candidatas   integer;
    v_nuevas       integer;
    v_actualizadas integer;
    v_activas      integer := 0;
    v_stale        integer := 0;
    v_insuf        integer := 0;
    v_tot_nuevas   integer := 0;
    v_tot_act      integer := 0;
    v_detalle      jsonb := '[]'::jsonb;
    v_severidades  jsonb;
    v_resultado    jsonb;
BEGIN
    FOR r IN SELECT * FROM public.alertas_riesgo_reglas WHERE activa ORDER BY id LOOP
        v_activas := v_activas + 1;

        -- Ventanas: volumen mira hacia atrás desde el último dato cargado;
        -- precipitación compara el pronóstico desde hoy con los días previos.
        IF r.tipo = 'volumen' THEN
            SELECT MAX(pd.fecha)::date INTO v_ref
            FROM public.precios_diarios pd
            WHERE pd.mercado = r.mercado
              AND pd.volumen_t IS NOT NULL
              AND pd.fecha <= v_hoy
              AND (r.producto_id IS NULL OR pd.producto_id = r.producto_id);

            IF v_ref IS NULL OR v_hoy - v_ref > r.max_dias_antiguedad THEN
                v_stale := v_stale + 1;
                v_detalle := v_detalle || jsonb_build_object(
                    'regla', r.codigo, 'resultado', 'desactualizada', 'ultimo_dato', v_ref);
                CONTINUE;
            END IF;
            v_fin_act := v_ref;
        ELSE
            SELECT MAX(cd.fecha)::date INTO v_ref
            FROM public.clima_diario cd
            WHERE cd.precipitacion IS NOT NULL
              AND (r.region_id IS NULL OR cd.region_id = r.region_id);

            -- Sin pronóstico que llegue a hoy, la regla está desactualizada.
            IF v_ref IS NULL OR v_ref < v_hoy THEN
                v_stale := v_stale + 1;
                v_detalle := v_detalle || jsonb_build_object(
                    'regla', r.codigo, 'resultado', 'desactualizada', 'ultimo_dato', v_ref);
                CONTINUE;
            END IF;
            v_fin_act := v_hoy + r.dias_actual - 1;
        END IF;

        v_ini_act  := v_fin_act - r.dias_actual + 1;
        v_ini_comp := v_ini_act - r.dias_comparacion;

        DROP TABLE IF EXISTS pg_temp.alertas_eval;
        CREATE TEMP TABLE alertas_eval ON COMMIT DROP AS
        WITH diario AS (
            SELECT 'vol|' || r.mercado || '|' || pd.producto_id AS clave,
                   MAX(pd.producto)        AS producto,
                   r.mercado               AS mercado,
                   NULL::text              AS ubicacion,
                   pd.fecha::date          AS fecha,
                   SUM(pd.volumen_t)::numeric AS valor
            FROM public.precios_diarios pd
            WHERE r.tipo = 'volumen'
              AND pd.mercado = r.mercado
              AND pd.producto_id IS NOT NULL
              AND pd.volumen_t IS NOT NULL
              AND (r.producto_id IS NULL OR pd.producto_id = r.producto_id)
              AND pd.fecha BETWEEN v_ini_comp AND v_fin_act
            GROUP BY pd.producto_id, pd.fecha
            UNION ALL
            SELECT 'pp|' || cd.region_id,
                   NULL,
                   NULL,
                   MAX(cd.ubicacion),
                   cd.fecha::date,
                   AVG(cd.precipitacion)::numeric
            FROM public.clima_diario cd
            WHERE r.tipo = 'precipitacion'
              AND cd.region_id IS NOT NULL
              AND cd.precipitacion IS NOT NULL
              AND (r.region_id IS NULL OR cd.region_id = r.region_id)
              AND cd.fecha BETWEEN v_ini_comp AND v_fin_act
            GROUP BY cd.region_id, cd.fecha
        ),
        series AS (
            SELECT clave,
                   MAX(producto)  AS producto,
                   MAX(mercado)   AS mercado,
                   MAX(ubicacion) AS ubicacion,
                   AVG(valor)  FILTER (WHERE fecha >= v_ini_act) AS prom_act,
                   COUNT(*)    FILTER (WHERE fecha >= v_ini_act) AS obs_act,
                   AVG(valor)  FILTER (WHERE fecha <  v_ini_act) AS prom_comp,
                   COUNT(*)    FILTER (WHERE fecha <  v_ini_act) AS obs_comp,
                   jsonb_agg(jsonb_build_object(
                       'date',   fecha,
                       'period', CASE WHEN fecha >= v_ini_act THEN 'current' ELSE 'comparison' END,
                       'value',  round(valor, 2))
                   ORDER BY fecha DESC) AS historia
            FROM diario
            GROUP BY clave
        )
        SELECT s.*, x.valida, x.variacion,
               CASE
                   WHEN NOT x.valida                         THEN NULL
                   WHEN -x.variacion >= r.umbral_critico     THEN 'critical'
                   WHEN -x.variacion >= r.umbral_moderado    THEN 'moderate'
                   WHEN -x.variacion >= r.umbral_informativo THEN 'informative'
               END AS severidad
        FROM series s
        CROSS JOIN LATERAL (
            SELECT (s.obs_act >= r.min_obs_actual
                    AND s.obs_comp >= r.min_obs_comparacion
                    AND s.prom_comp >= r.min_promedio_comparacion
                    AND s.prom_comp > 0) AS valida,
                   round((s.prom_act - s.prom_comp) / NULLIF(s.prom_comp, 0) * 100, 1) AS variacion
        ) x;

        SELECT COUNT(*), COUNT(*) FILTER (WHERE valida) INTO v_series, v_validas FROM alertas_eval;

        IF v_validas = 0 THEN
            v_insuf := v_insuf + 1;
            v_detalle := v_detalle || jsonb_build_object(
                'regla', r.codigo, 'resultado', 'insuficiente',
                'series', v_series, 'periodo', jsonb_build_array(v_ini_comp, v_fin_act));
            CONTINUE;
        END IF;

        -- Quedan solo las series que superan un umbral. Si alguien ya atendió
        -- una alerta de esa serie para esta misma ventana, no se vuelve a abrir.
        DELETE FROM alertas_eval e
        WHERE e.severidad IS NULL
           OR EXISTS (
                SELECT 1 FROM public.alertas_riesgo a
                WHERE a.regla_id = r.id
                  AND a.clave_serie = e.clave
                  AND a.estado = 'attended'
                  AND a.periodo_fin >= v_ini_act);

        SELECT COALESCE(SUM(n), 0), COALESCE(jsonb_object_agg(sev, n), '{}'::jsonb)
        INTO v_candidatas, v_severidades
        FROM (SELECT severidad AS sev, COUNT(*) AS n FROM alertas_eval GROUP BY severidad) x;

        v_nuevas := 0;
        v_actualizadas := 0;

        IF NOT p_simular AND v_candidatas > 0 THEN
            WITH up AS (
                INSERT INTO public.alertas_riesgo AS a (
                    regla_id, clave_serie, producto, mercado, ubicacion, severidad,
                    explicacion, periodo_inicio, periodo_fin, evidencia)
                SELECT r.id, e.clave, e.producto, e.mercado, e.ubicacion, e.severidad,
                       CASE WHEN r.tipo = 'volumen' THEN format(
                           'El volumen de %s que ingresó al %s promedió %s t/día entre el %s y el %s, '
                           '%s %% menos que en los %s días anteriores (%s t/día). '
                           'Es una señal de riesgo; no confirma desabastecimiento.',
                           e.producto, public.alertas_riesgo_nombre_mercado(e.mercado),
                           round(e.prom_act, 1), to_char(v_ini_act, 'DD/MM'), to_char(v_fin_act, 'DD/MM/YYYY'),
                           abs(e.variacion), r.dias_comparacion, round(e.prom_comp, 1))
                       ELSE format(
                           'La lluvia pronosticada en %s para el %s al %s promedia %s mm/día, '
                           '%s %% menos que en los %s días anteriores (%s mm/día). '
                           'Es una señal basada en pronóstico; no confirma una sequía.',
                           e.ubicacion, to_char(v_ini_act, 'DD/MM'), to_char(v_fin_act, 'DD/MM/YYYY'),
                           round(e.prom_act, 1), abs(e.variacion), r.dias_comparacion, round(e.prom_comp, 1))
                       END,
                       v_ini_act, v_fin_act,
                       jsonb_build_object(
                           'metricLabel', CASE WHEN r.tipo = 'volumen'
                                               THEN 'Volumen diario ingresado (MIDAGRI)'
                                               ELSE 'Precipitación diaria (Open-Meteo, pronóstico)' END,
                           'unit', CASE WHEN r.tipo = 'volumen' THEN 't' ELSE 'mm' END,
                           'currentPeriod', jsonb_build_object(
                               'start', v_ini_act, 'end', v_fin_act,
                               'average', round(e.prom_act, 2), 'observations', e.obs_act),
                           'comparisonPeriod', jsonb_build_object(
                               'start', v_ini_comp, 'end', v_ini_act - 1,
                               'average', round(e.prom_comp, 2), 'observations', e.obs_comp),
                           'variationPercent', e.variacion,
                           'thresholds', jsonb_build_object(
                               'informative', -r.umbral_informativo,
                               'moderate',    -r.umbral_moderado,
                               'critical',    -r.umbral_critico),
                           'rule', jsonb_build_object('code', r.codigo, 'name', r.nombre),
                           'crossSourceNote', CASE WHEN r.tipo = 'precipitacion' THEN
                               'Se usa el pronóstico de Open-Meteo. No se cruza con los volúmenes de los '
                               'mercados porque no comparten una clave geográfica.' END,
                           'history', e.historia)
                FROM alertas_eval e
                ON CONFLICT (regla_id, clave_serie) WHERE estado <> 'attended'
                DO UPDATE SET
                    severidad      = EXCLUDED.severidad,
                    explicacion    = EXCLUDED.explicacion,
                    periodo_inicio = EXCLUDED.periodo_inicio,
                    periodo_fin    = EXCLUDED.periodo_fin,
                    evidencia      = EXCLUDED.evidencia,
                    producto       = EXCLUDED.producto,
                    ubicacion      = EXCLUDED.ubicacion,
                    actualizado_en = now()
                RETURNING (xmax = 0) AS es_nueva
            )
            SELECT COUNT(*) FILTER (WHERE es_nueva), COUNT(*) FILTER (WHERE NOT es_nueva)
            INTO v_nuevas, v_actualizadas
            FROM up;
        END IF;

        v_tot_nuevas := v_tot_nuevas + v_nuevas;
        v_tot_act    := v_tot_act + v_actualizadas;
        v_detalle := v_detalle || jsonb_build_object(
            'regla', r.codigo, 'resultado', 'evaluada',
            'series', v_series, 'series_validas', v_validas,
            'alertas', v_candidatas, 'por_severidad', v_severidades,
            'nuevas', v_nuevas, 'actualizadas', v_actualizadas,
            'periodo_actual', jsonb_build_array(v_ini_act, v_fin_act),
            'periodo_comparacion', jsonb_build_array(v_ini_comp, v_ini_act - 1));
    END LOOP;

    v_resultado := jsonb_build_object(
        'fecha_evaluada',         v_hoy,
        'simulacion',             p_simular,
        'reglas_activas',         v_activas,
        'reglas_desactualizadas', v_stale,
        'reglas_insuficientes',   v_insuf,
        'alertas_nuevas',         v_tot_nuevas,
        'alertas_actualizadas',   v_tot_act,
        'detalle',                v_detalle);

    IF NOT p_simular THEN
        INSERT INTO public.alertas_riesgo_ejecuciones (
            fecha_evaluada, reglas_activas, reglas_desactualizadas, reglas_insuficientes,
            alertas_nuevas, alertas_actualizadas, detalle)
        VALUES (v_hoy, v_activas, v_stale, v_insuf, v_tot_nuevas, v_tot_act, v_detalle);
    END IF;

    RETURN v_resultado;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. API para el webhook POST /v1/alertas (WF5)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.alertas_riesgo_listar()
RETURNS jsonb
LANGUAGE sql STABLE AS $$
    WITH ultima AS (
        SELECT * FROM public.alertas_riesgo_ejecuciones ORDER BY id DESC LIMIT 1
    ),
    visibles AS (
        SELECT id FROM public.alertas_riesgo WHERE estado <> 'attended'
        UNION ALL
        (SELECT id FROM public.alertas_riesgo WHERE estado = 'attended'
         ORDER BY atendido_en DESC NULLS LAST LIMIT 100)
    )
    SELECT jsonb_build_object(
        'alerts', COALESCE((
            SELECT jsonb_agg(public.alertas_riesgo_json(a, false)
                   ORDER BY CASE a.severidad WHEN 'critical' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END,
                            a.periodo_fin DESC, a.id DESC)
            FROM public.alertas_riesgo a
            WHERE a.id IN (SELECT id FROM visibles)), '[]'::jsonb),
        'configuredRules',   (SELECT COUNT(*) FROM public.alertas_riesgo_reglas WHERE activa),
        'staleRules',        COALESCE((SELECT reglas_desactualizadas FROM ultima), 0),
        'insufficientRules', COALESCE((SELECT reglas_insuficientes FROM ultima), 0),
        'lastEvaluation',    (SELECT ejecutado_en FROM ultima)
    );
$$;

CREATE OR REPLACE FUNCTION public.alertas_riesgo_detalle(p_id bigint)
RETURNS jsonb
LANGUAGE sql STABLE AS $$
    SELECT jsonb_build_object('alert', (
        SELECT public.alertas_riesgo_json(a, true)
        FROM public.alertas_riesgo a
        WHERE a.id = p_id));
$$;

-- Estados solo avanzan: pending -> read -> attended (o pending -> attended).
-- Repetir el estado actual no es error (doble clic, reintento de red).
CREATE OR REPLACE FUNCTION public.alertas_riesgo_actualizar(p_id bigint, p_estado text, p_session text)
RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
    a public.alertas_riesgo%ROWTYPE;
BEGIN
    IF p_estado IS NULL OR p_estado NOT IN ('read', 'attended') THEN
        RETURN jsonb_build_object('alert', NULL, 'error', 'Estado no permitido. Usa read o attended.');
    END IF;
    IF p_session IS NULL OR p_session !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RETURN jsonb_build_object('alert', NULL, 'error', 'session_id inválido.');
    END IF;

    SELECT * INTO a FROM public.alertas_riesgo WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('alert', NULL, 'error', 'La alerta no existe.');
    END IF;

    IF a.estado = p_estado THEN
        RETURN jsonb_build_object('alert', public.alertas_riesgo_json(a, true));
    END IF;
    IF a.estado = 'attended' OR (a.estado = 'read' AND p_estado = 'read') THEN
        RETURN jsonb_build_object('alert', NULL,
            'error', format('No se puede pasar de %s a %s.', a.estado, p_estado));
    END IF;

    UPDATE public.alertas_riesgo
    SET estado           = p_estado,
        actor_session_id = p_session,
        actuado_en       = now(),
        atendido_en      = CASE WHEN p_estado = 'attended' THEN now() ELSE atendido_en END,
        actualizado_en   = now()
    WHERE id = p_id
    RETURNING * INTO a;

    INSERT INTO public.alertas_riesgo_historial (alerta_id, estado, actor_session_id)
    VALUES (p_id, p_estado, p_session);

    RETURN jsonb_build_object('alert', public.alertas_riesgo_json(a, true));
END;
$$;
