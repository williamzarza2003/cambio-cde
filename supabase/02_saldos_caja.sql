-- =====================================================================
-- cambio-cde · 02 · Saldos de apertura y cierre de caja (arqueo)
-- Ejecutar DESPUÉS de schema.sql en: Supabase > SQL Editor > New query > Run
-- =====================================================================

-- 1) Nuevo tipo de movimiento: 'apertura'
alter table public.movimientos_caja drop constraint if exists movimientos_caja_tipo_check;
alter table public.movimientos_caja add constraint movimientos_caja_tipo_check
  check (tipo in ('apertura','operacion','anulacion','ajuste'));

-- 2) Conteos de apertura y cierre por moneda
create table public.caja_conteos (
  id          bigint generated always as identity primary key,
  sesion_id   bigint not null references public.caja_sesiones(id) on delete cascade,
  momento     text not null check (momento in ('apertura','cierre')),
  moneda      char(3) not null references public.monedas(codigo),
  esperado    numeric(16,2) not null default 0,
  contado     numeric(16,2) not null check (contado >= 0),
  diferencia  numeric(16,2) generated always as (contado - esperado) stored,
  created_by  uuid references public.perfiles(id) default auth.uid(),
  created_at  timestamptz not null default now(),
  unique (sesion_id, momento, moneda)
);
alter table public.caja_conteos enable row level security;
create policy "empleados ven conteos" on public.caja_conteos for select to authenticated using (true);
-- Sin política de insert: solo se cargan con abrir_caja() / cerrar_caja()

-- 3) Saldo esperado por sesión de caja (antes era un total histórico)
drop view if exists public.saldos_caja;
create view public.saldos_caja with (security_invoker = on) as
select sesion_id, moneda, sum(monto) as saldo
from public.movimientos_caja
where sesion_id is not null
group by sesion_id, moneda;
grant select on public.saldos_caja to authenticated;

-- 4) Abrir caja con saldo inicial contado. p_saldos = {"PYG": 5000000, "USD": 300, ...}
--    'esperado' de la apertura = lo contado en el último cierre (detecta faltantes entre turnos)
create or replace function public.abrir_caja(p_saldos jsonb)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_sesion bigint; v_anterior bigint; r record;
begin
  if not exists (select 1 from perfiles where id = auth.uid() and activo) then
    raise exception 'Usuario no autorizado';
  end if;
  if exists (select 1 from caja_sesiones where estado = 'abierta') then
    raise exception 'Ya hay una caja abierta';
  end if;

  select id into v_anterior from caja_sesiones
   where estado = 'cerrada' order by cerrada_en desc nulls last limit 1;

  insert into caja_sesiones (abierta_por) values (auth.uid()) returning id into v_sesion;

  for r in
    select m.codigo,
           coalesce((p_saldos->>m.codigo)::numeric, 0) as monto,
           coalesce((select contado from caja_conteos
                      where sesion_id = v_anterior and momento = 'cierre' and moneda = m.codigo), 0) as esperado
      from monedas m where m.activa
  loop
    if r.monto < 0 then raise exception 'El saldo de % no puede ser negativo', r.codigo; end if;
    insert into caja_conteos (sesion_id, momento, moneda, esperado, contado)
      values (v_sesion, 'apertura', r.codigo, r.esperado, r.monto);
    if r.monto <> 0 then
      insert into movimientos_caja (sesion_id, moneda, monto, tipo, nota)
        values (v_sesion, r.codigo, r.monto, 'apertura', 'Saldo de apertura');
    end if;
  end loop;
  return v_sesion;
end $$;

-- 5) Cerrar caja con arqueo. p_contado = {"PYG": 4800000, "USD": 350, ...}
create or replace function public.cerrar_caja(p_sesion bigint, p_contado jsonb)
returns setof public.caja_conteos language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not exists (select 1 from perfiles where id = auth.uid() and activo) then
    raise exception 'Usuario no autorizado';
  end if;
  if not exists (select 1 from caja_sesiones where id = p_sesion and estado = 'abierta') then
    raise exception 'La caja no está abierta';
  end if;

  for r in
    select m.codigo, coalesce(s.saldo, 0) as esperado, (p_contado->>m.codigo)::numeric as contado
      from monedas m
      left join saldos_caja s on s.moneda = m.codigo and s.sesion_id = p_sesion
     where m.activa
  loop
    if r.contado is null then raise exception 'Falta el conteo de %', r.codigo; end if;
    if r.contado < 0 then raise exception 'El conteo de % no puede ser negativo', r.codigo; end if;
    insert into caja_conteos (sesion_id, momento, moneda, esperado, contado)
      values (p_sesion, 'cierre', r.codigo, r.esperado, r.contado);
  end loop;

  update caja_sesiones set estado = 'cerrada', cerrada_en = now(), cerrada_por = auth.uid()
   where id = p_sesion;

  return query select * from caja_conteos
    where sesion_id = p_sesion and momento = 'cierre' order by moneda;
end $$;

revoke execute on function public.abrir_caja(jsonb), public.cerrar_caja(bigint, jsonb) from public, anon;
grant execute on function public.abrir_caja(jsonb), public.cerrar_caja(bigint, jsonb) to authenticated;

-- 6) La caja ya no se abre/cierra con insert/update directo: solo con las funciones
drop policy if exists "empleados abren caja" on public.caja_sesiones;
drop policy if exists "empleados cierran caja" on public.caja_sesiones;
