-- Base de origen sintética para probar el respaldo en cada PR, sin tocar
-- producción. Se carga después de src/database/tests/fixtures_base.sql y de
-- 003_alertas_riesgo.sql. Reproduce lo que tiene producción: tablas creadas
-- a mano, una función que usan los workflows, una vista, un trigger, y
-- tablas internas de n8n que NO deben entrar al respaldo.
\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS vector;
-- Producción también usa unaccent (en resolver_producto_mmf2): la
-- restauración tiene que recrear todas las extensiones, no solo pgvector.
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE public.documentos_rag (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    text text,
    metadata jsonb,
    embedding public.vector
);
CREATE TABLE public.productos_maestro (id serial PRIMARY KEY, nombre text NOT NULL, unidad text);
CREATE TABLE public.producto_maestro (id serial PRIMARY KEY, nombre text NOT NULL);
CREATE TABLE public.producto_alias (id serial PRIMARY KEY, alias text NOT NULL, producto_id integer REFERENCES public.productos_maestro (id));
CREATE TABLE public.regiones_productoras (id serial PRIMARY KEY, region text NOT NULL, latitud double precision, longitud double precision);
CREATE TABLE public.eventos_calendario (id serial PRIMARY KEY, fecha date NOT NULL, titulo text NOT NULL, detalle jsonb);
CREATE TABLE public.logs_ingesta (id serial PRIMARY KEY, ejecutado_en timestamptz DEFAULT now(), workflow text, filas integer);
-- Tablas que aparecieron en producción después del 02/11.
CREATE TABLE public.productos_alias_mmf2 (id serial PRIMARY KEY, alias text NOT NULL, producto_id integer);
CREATE TABLE public.alert_rules (id serial PRIMARY KEY, codigo text NOT NULL);
CREATE TABLE public.risk_alerts (id serial PRIMARY KEY, regla_id integer REFERENCES public.alert_rules (id), estado text);
CREATE TABLE public.alert_status_history (id serial PRIMARY KEY, alerta_id integer REFERENCES public.risk_alerts (id), estado text);
INSERT INTO public.productos_alias_mmf2 (alias, producto_id) VALUES ('Mandarina Satsuma', 1);
INSERT INTO public.alert_rules (codigo) VALUES ('VOL-GMML');
INSERT INTO public.risk_alerts (regla_id, estado) VALUES (1, 'open');
INSERT INTO public.alert_status_history (alerta_id, estado) VALUES (1, 'open');

INSERT INTO public.productos_maestro (nombre, unidad)
VALUES ('Papa amarilla', 'Kilogramo'), ('Cebolla roja', 'Kilogramo'), ('Ajo', 'Kilogramo'), ('Zanahoria', 'Kilogramo');
INSERT INTO public.producto_maestro (nombre) SELECT nombre FROM public.productos_maestro;
INSERT INTO public.producto_alias (alias, producto_id) VALUES ('Papa Amarilla Tumbay', 1), ('Cebolla Roja Arequipeña', 2);
INSERT INTO public.regiones_productoras (region, latitud, longitud) VALUES ('Junín', -11.16, -75.99), ('Arequipa', -16.40, -71.54);
INSERT INTO public.eventos_calendario (fecha, titulo, detalle) VALUES ('2026-11-15', 'Feria agropecuaria', '{"region": "Junín"}');
INSERT INTO public.logs_ingesta (workflow, filas) VALUES ('WF1', 120), ('WF0-GMML', 5400);
INSERT INTO public.documentos_rag (text, metadata, embedding)
VALUES ('Precio de referencia de la papa', '{"fuente": "MIDAGRI"}', '[0.1, 0.2, 0.3]');

-- Mismo patrón que src/database/tests/test_003_alertas_riesgo.sql: una caída
-- de volumen en GMML para que el cálculo de alertas genere filas reales.
INSERT INTO public.precios_diarios (fecha, producto, producto_id, mercado, precio, volumen_t, unidad)
SELECT d::date, p.nombre, p.id, 'GMML', 1.50,
       CASE WHEN d >= '2026-10-27' THEN p.actual ELSE p.comparacion END, 'Kilogramo'
FROM generate_series('2026-09-29'::date, '2026-11-02'::date, interval '1 day') d
CROSS JOIN (VALUES (1, 'Papa amarilla', 100, 40),
                   (2, 'Cebolla roja',   80, 80),
                   (4, 'Zanahoria',      50, 37)) AS p(id, nombre, comparacion, actual);

INSERT INTO public.clima_diario (fecha, ubicacion, region_id, precipitacion, temperatura, tipo_dato)
SELECT d::date, 'Junín', 1, 2.5, 14.0, 'pronostico'
FROM generate_series('2026-10-20'::date, '2026-11-02'::date, interval '1 day') d;

SELECT alertas_riesgo_evaluar('2026-11-02');

-- Función creada a mano, como resolver_producto_mmf2 en producción. Es SQL:
-- Postgres la valida al crearla, así que en la restauración necesita que
-- las tablas ya existan.
CREATE FUNCTION public.resolver_producto_mmf2(p_producto text)
RETURNS TABLE (producto_original text, producto_id integer, nombre_canonico text, estado_mapeo text)
LANGUAGE sql STABLE AS $$
    SELECT p_producto, pm.id, pm.nombre,
           CASE WHEN pm.id IS NULL THEN 'sin_mapeo' ELSE 'mapeado' END
    FROM (SELECT 1) AS x
    LEFT JOIN public.producto_alias pa ON lower(unaccent(pa.alias)) = lower(unaccent(p_producto))
    LEFT JOIN public.productos_maestro pm ON pm.id = pa.producto_id
$$;

CREATE VIEW public.v_ultimo_precio AS
SELECT DISTINCT ON (producto, mercado) producto, mercado, fecha, precio
FROM public.precios_diarios
ORDER BY producto, mercado, fecha DESC;

-- Trigger: necesita su función antes de crearse.
CREATE FUNCTION public.logs_ingesta_normalizar() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.workflow := upper(NEW.workflow);
    RETURN NEW;
END
$$;
CREATE TRIGGER logs_ingesta_normalizar BEFORE INSERT ON public.logs_ingesta
FOR EACH ROW EXECUTE FUNCTION public.logs_ingesta_normalizar();

-- Tablas que NO deben entrar al respaldo: internas de n8n y de prueba.
CREATE TABLE public."user" (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, password text);
INSERT INTO public."user" (email, password) VALUES ('owner@ejemplo.test', 'hash-de-ejemplo');
CREATE TABLE public.credentials_entity (id text PRIMARY KEY, name text, data text);
INSERT INTO public.credentials_entity VALUES ('c1', 'Postgres account', 'cifrado-de-ejemplo');
CREATE TABLE public.prueba_vectores (id serial PRIMARY KEY, v public.vector);
