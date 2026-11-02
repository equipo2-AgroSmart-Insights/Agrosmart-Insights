-- Tablas base mínimas con las columnas que hoy escribe WF1 en producción.
-- Solo para pruebas: en producción estas tablas ya existen.
CREATE TABLE IF NOT EXISTS public.precios_diarios (
    id              serial PRIMARY KEY,
    fecha           date NOT NULL,
    producto        varchar(150) NOT NULL,
    producto_id     integer,
    mercado         varchar(150),
    precio          numeric(10,2),
    volumen         numeric(12,2),
    volumen_t       numeric,
    volumen_kg      numeric,
    unidad          varchar(50),
    equivalencia_kg numeric,
    created_at      timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.clima_diario (
    id                 serial PRIMARY KEY,
    fecha              date NOT NULL,
    ubicacion          varchar(150) NOT NULL,
    region_id          integer,
    ciudad_referencia  text,
    latitud            double precision,
    longitud           double precision,
    temperatura        double precision,
    precipitacion      double precision,
    humedad            double precision,
    evapotranspiracion double precision,
    tipo_dato          text
);
