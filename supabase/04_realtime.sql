-- =====================================================================
-- cambio-cde · 04 · Realtime para la pizarra de cotizaciones
-- Ejecutar en: Supabase > SQL Editor > New query > Run  (una sola vez)
--
-- La pantalla TV, el ingreso, /acerca y el panel de cotizaciones se suscriben a los
-- INSERT de public.cotizaciones con Supabase Realtime. Para que la base mande esos
-- eventos, la tabla tiene que estar en la publicación "supabase_realtime".
--
-- Seguridad: NO cambia RLS. Realtime respeta las políticas de cada tabla, y
-- cotizaciones ya tiene lectura pública de solo lectura:
--   create policy "todos ven cotizaciones" on public.cotizaciones
--     for select to anon, authenticated using (true);
-- Así que el visitante anónimo recibe solo lo que ya podía leer, y no puede escribir
-- (el insert sigue siendo solo para admin).
--
-- Mientras esto no se ejecute, la app sigue funcionando igual que antes: sondea cada 60 s.
-- =====================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cotizaciones'
  ) then
    alter publication supabase_realtime add table public.cotizaciones;
  end if;
end $$;

-- Comprobación: tiene que devolver una fila.
select pubname, schemaname, tablename
  from pg_publication_tables
 where pubname = 'supabase_realtime' and tablename = 'cotizaciones';

-- Para deshacerlo:
-- alter publication supabase_realtime drop table public.cotizaciones;
