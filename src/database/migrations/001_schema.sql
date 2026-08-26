-- 0. Crear base de datos para n8n
CREATE DATABASE n8n_system;

-- 1. Habilitar la extensión de vectores
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- ==========================================
-- 2. TABLA: clima_diario
-- ==========================================
CREATE TABLE public.clima_diario (
    id integer NOT NULL,
    fecha date NOT NULL,
    ubicacion character varying(150) NOT NULL,
    latitud numeric(10,6),
    longitud numeric(10,6),
    temperatura numeric(10,2),
    precipitacion numeric(10,2),
    humedad numeric(10,2),
    evapotranspiracion numeric(10,2)
);

CREATE SEQUENCE public.clima_diario_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.clima_diario_id_seq OWNED BY public.clima_diario.id;
ALTER TABLE ONLY public.clima_diario ALTER COLUMN id SET DEFAULT nextval('public.clima_diario_id_seq'::regclass);
ALTER TABLE ONLY public.clima_diario ADD CONSTRAINT clima_diario_pkey PRIMARY KEY (id);


-- ==========================================
-- 3. TABLA: documentos_rag (Vectores)
-- ==========================================
CREATE TABLE public.documentos_rag (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    text text,
    metadata jsonb,
    embedding public.vector
);

ALTER TABLE ONLY public.documentos_rag ADD CONSTRAINT documentos_rag_pkey PRIMARY KEY (id);


-- ==========================================
-- 4. TABLA: precios_diarios
-- ==========================================
CREATE TABLE public.precios_diarios (
    id integer NOT NULL,
    fecha date NOT NULL,
    producto character varying(150) NOT NULL,
    mercado character varying(150),
    precio numeric(10,2),
    volumen numeric(12,2),
    unidad character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE SEQUENCE public.precios_diarios_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.precios_diarios_id_seq OWNED BY public.precios_diarios.id;
ALTER TABLE ONLY public.precios_diarios ALTER COLUMN id SET DEFAULT nextval('public.precios_diarios_id_seq'::regclass);
ALTER TABLE ONLY public.precios_diarios ADD CONSTRAINT precios_diarios_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.precios_diarios ADD CONSTRAINT unique_fecha_producto UNIQUE (fecha, producto);

CREATE UNIQUE INDEX idx_precio_unico ON public.precios_diarios USING btree (fecha, producto, mercado);