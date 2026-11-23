-- =====================================================================
-- cambio-cde · Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar completo en: Supabase > SQL Editor > New query > Run
-- Moneda base: PYG (guaraníes). Cotizaciones expresadas en PYG por 1 unidad.
-- =====================================================================

-- ---------- Tablas ----------

create table public.perfiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null default '',
  rol         text not null default 'cajero' check (rol in ('admin','cajero')),
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.monedas (
  codigo     char(3) primary key,
  nombre     text not null,
  simbolo    text not null,
  decimales  smallint not null default 2,
  activa     boolean not null default true
);

create table public.cotizaciones (
  id          bigint generated always as identity primary key,
  moneda      char(3) not null references public.monedas(codigo),
  compra      numeric(14,2) not null check (compra > 0),
  venta       numeric(14,2) not null check (venta > 0),
  created_by  uuid references public.perfiles(id) default auth.uid(),
  created_at  timestamptz not null default now(),
  check (venta >= compra),
  check (moneda <> 'PYG')
);
create index on public.cotizaciones (moneda, created_at desc);

create table public.clientes (
  id          bigint generated always as identity primary key,
  nombre      text not null,
  documento   text unique,
  telefono    text,
  created_at  timestamptz not null default now()
);

create table public.caja_sesiones (
  id           bigint generated always as identity primary key,
  abierta_por  uuid not null references public.perfiles(id) default auth.uid(),
  abierta_en   timestamptz not null default now(),
  cerrada_por  uuid references public.perfiles(id),
  cerrada_en   timestamptz,
  estado       text not null default 'abierta' check (estado in ('abierta','cerrada'))
);
-- Solo una caja abierta a la vez
create unique index una_caja_abierta on public.caja_sesiones (estado) where estado = 'abierta';

-- tipo: 'compra' = la casa COMPRA divisa al cliente (entra divisa, sale PYG)
--       'venta'  = la casa VENDE divisa al cliente (sale divisa, entra PYG)
create table public.operaciones (
  id            bigint generated always as identity primary key,
  tipo          text not null check (tipo in ('compra','venta')),
  moneda        char(3) not null references public.monedas(codigo) check (moneda <> 'PYG'),
  monto_divisa  numeric(14,2) not null check (monto_divisa > 0),
  cotizacion    numeric(14,2) not null default 0,   -- la completa el trigger
  monto_pyg     numeric(16,0) not null default 0,   -- la completa el trigger
  cliente_id    bigint references public.clientes(id),
  cajero_id     uuid not null references public.perfiles(id) default auth.uid(),
  sesion_id     bigint not null references public.caja_sesiones(id),
  anulada       boolean not null default false,
  created_at    timestamptz not null default now()
);
create index on public.operaciones (created_at desc);

-- monto con signo: positivo entra a caja, negativo sale
create table public.movimientos_caja (
  id            bigint generated always as identity primary key,
  sesion_id     bigint references public.caja_sesiones(id),
  moneda        char(3) not null references public.monedas(codigo),
  monto         numeric(16,2) not null,
  tipo          text not null check (tipo in ('operacion','anulacion','ajuste')),
  operacion_id  bigint references public.operaciones(id),
  nota          text,
  created_by    uuid references public.perfiles(id) default auth.uid(),
  created_at    timestamptz not null default now()
);

-- ---------- Vistas ----------

create view public.cotizaciones_actuales with (security_invoker = on) as
select distinct on (c.moneda)
  c.moneda, m.nombre, m.simbolo, c.compra, c.venta, c.created_at
from public.cotizaciones c
join public.monedas m on m.codigo = c.moneda and m.activa
order by c.moneda, c.created_at desc;

create view public.saldos_caja with (security_invoker = on) as
select moneda, sum(monto) as saldo
from public.movimientos_caja
group by moneda;

-- ---------- Funciones y triggers ----------

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfiles where id = auth.uid() and rol = 'admin' and activo);
$$;

-- Crea el perfil (rol cajero) cuando se registra un usuario
create or replace function public.crear_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, nombre) values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.email));
  return new;
end $$;
create trigger al_crear_usuario after insert on auth.users
  for each row execute function public.crear_perfil();

-- Antes de guardar una operación: toma la cotización vigente y calcula PYG
create or replace function public.preparar_operacion()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_compra numeric; v_venta numeric;
begin
  if not exists (select 1 from caja_sesiones where id = new.sesion_id and estado = 'abierta') then
    raise exception 'La caja no está abierta';
  end if;
  select compra, venta into v_compra, v_venta
    from cotizaciones where moneda = new.moneda order by created_at desc limit 1;
  if v_compra is null then
    raise exception 'No hay cotización cargada para %', new.moneda;
  end if;
  new.cotizacion := case when new.tipo = 'compra' then v_compra else v_venta end;
  new.monto_pyg  := round(new.monto_divisa * new.cotizacion);
  new.cajero_id  := auth.uid();
  new.anulada    := false;
  return new;
end $$;
create trigger antes_de_operacion before insert on public.operaciones
  for each row execute function public.preparar_operacion();

-- Después de guardar: registra los dos movimientos de caja
create or replace function public.registrar_movimientos()
returns trigger language plpgsql security definer set search_path = public as $$
declare signo int := case when new.tipo = 'compra' then 1 else -1 end;
begin
  insert into movimientos_caja (sesion_id, moneda, monto, tipo, operacion_id, created_by) values
    (new.sesion_id, new.moneda,  signo * new.monto_divisa, 'operacion', new.id, new.cajero_id),
    (new.sesion_id, 'PYG',      -signo * new.monto_pyg,    'operacion', new.id, new.cajero_id);
  return new;
end $$;
create trigger despues_de_operacion after insert on public.operaciones
  for each row execute function public.registrar_movimientos();

-- Al anular: revierte los movimientos (solo admin, y no se puede des-anular)
create or replace function public.anular_operacion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.anulada and not new.anulada then
    raise exception 'Una operación anulada no se puede reactivar';
  end if;
  if new.anulada and not old.anulada then
    insert into movimientos_caja (sesion_id, moneda, monto, tipo, operacion_id, nota)
    select sesion_id, moneda, -monto, 'anulacion', operacion_id, 'Anulación'
      from movimientos_caja where operacion_id = new.id and tipo = 'operacion';
  end if;
  return new;
end $$;
create trigger al_anular before update on public.operaciones
  for each row execute function public.anular_operacion();

-- ---------- Seguridad (RLS) ----------

alter table public.perfiles         enable row level security;
alter table public.monedas          enable row level security;
alter table public.cotizaciones     enable row level security;
alter table public.clientes         enable row level security;
alter table public.caja_sesiones    enable row level security;
alter table public.operaciones      enable row level security;
alter table public.movimientos_caja enable row level security;

-- perfiles
create policy "ver mi perfil o admin ve todos" on public.perfiles for select to authenticated
  using (id = auth.uid() or public.es_admin());
create policy "admin edita perfiles" on public.perfiles for update to authenticated
  using (public.es_admin());

-- monedas y cotizaciones: lectura pública (pantalla de TV), escritura solo admin
create policy "todos ven monedas" on public.monedas for select to anon, authenticated using (true);
create policy "admin gestiona monedas" on public.monedas for all to authenticated
  using (public.es_admin()) with check (public.es_admin());
create policy "todos ven cotizaciones" on public.cotizaciones for select to anon, authenticated using (true);
create policy "admin carga cotizaciones" on public.cotizaciones for insert to authenticated
  with check (public.es_admin());

-- clientes
create policy "empleados ven clientes" on public.clientes for select to authenticated using (true);
create policy "empleados cargan clientes" on public.clientes for insert to authenticated with check (true);
create policy "empleados editan clientes" on public.clientes for update to authenticated using (true);

-- caja
create policy "empleados ven caja" on public.caja_sesiones for select to authenticated using (true);
create policy "empleados abren caja" on public.caja_sesiones for insert to authenticated with check (true);
create policy "empleados cierran caja" on public.caja_sesiones for update to authenticated using (true);

-- operaciones
create policy "empleados ven operaciones" on public.operaciones for select to authenticated using (true);
create policy "empleados registran operaciones" on public.operaciones for insert to authenticated with check (true);
create policy "admin anula operaciones" on public.operaciones for update to authenticated using (public.es_admin());

-- movimientos: se leen; solo el admin carga ajustes manuales (los demás los crean los triggers)
create policy "empleados ven movimientos" on public.movimientos_caja for select to authenticated using (true);
create policy "admin carga ajustes" on public.movimientos_caja for insert to authenticated
  with check (public.es_admin() and tipo = 'ajuste');

grant select on public.cotizaciones_actuales, public.saldos_caja to anon, authenticated;

-- ---------- Datos iniciales ----------

insert into public.monedas (codigo, nombre, simbolo, decimales) values
  ('PYG', 'Guaraní',           '₲',  0),
  ('USD', 'Dólar',             'US$', 2),
  ('BRL', 'Real',              'R$', 2),
  ('ARS', 'Peso argentino',    'AR$', 2),
  ('EUR', 'Euro',              '€',  2);

-- Después de crear tu usuario en Authentication, hacelo admin con:
-- update public.perfiles set rol = 'admin' where id = (select id from auth.users where email = 'TU_EMAIL');
