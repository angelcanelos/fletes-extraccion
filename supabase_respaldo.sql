-- Respaldo de formatos y fletes (Extraccion de Troceria - Forestal Tezains)
-- Correr UNA sola vez en el SQL Editor del proyecto de Supabase.
--
-- "uuid" es la identidad que une cada fila local con su copia en la nube
-- (no el id autoincremental de SQLite, que solo tiene sentido en la
-- computadora local). "local_id" se guarda nada mas de referencia.

create table if not exists public.formatos (
  uuid text primary key,
  local_id bigint,
  folio text,
  productor text,
  grua text,
  fecha text,
  fecha_texto text,
  producto_fsc text,
  destino text,
  generos_json text,
  ajustes_json text,
  iva_rate numeric,
  isr_rate numeric,
  observaciones text,
  estado text,
  created_at timestamptz,
  updated_at timestamptz,
  synced_at timestamptz default now()
);

create table if not exists public.fletes (
  uuid text primary key,
  local_id bigint,
  folio text,
  fletero text,
  fecha text,
  fecha_texto text,
  lineas_json text,
  precio_flete numeric,
  ajustes_json text,
  iva_rate numeric,
  retencion_rate numeric,
  isr_rate numeric,
  observaciones text,
  estado text,
  created_at timestamptz,
  updated_at timestamptz,
  synced_at timestamptz default now()
);

-- RLS activado (buena práctica), pero SIN políticas de acceso: la app usa
-- la clave "service_role", que siempre pasa por encima de RLS. Esa clave
-- vive solo en la tabla "settings" de la base local (nunca en el código ni
-- en un navegador), así que no hace falta pelear con políticas para este
-- caso de un solo escritor de confianza.
alter table public.formatos enable row level security;
alter table public.fletes enable row level security;
