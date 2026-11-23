-- =====================================================================
-- cambio-cde · 03 · Proteger el usuario demo
-- Nadie puede cambiar la contraseña ni el email de demo@cambiocde.com
-- desde la app (ni desde la consola del navegador). Solo desde el SQL Editor.
-- =====================================================================

create or replace function public.proteger_usuario_demo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.email = 'demo@cambiocde.com'
     and (new.encrypted_password is distinct from old.encrypted_password
          or new.email is distinct from old.email)
     and coalesce(current_setting('app.cambiar_demo', true), '') <> 'si' then
    raise exception 'El usuario demo no se puede modificar';
  end if;
  return new;
end $$;

drop trigger if exists proteger_demo on auth.users;
create trigger proteger_demo before update on auth.users
  for each row execute function public.proteger_usuario_demo();

-- ---------------------------------------------------------------------
-- Para cambiar la contraseña del demo: copiar estas líneas sin los "--",
-- poner la clave nueva y ejecutarlas juntas en el SQL Editor.
-- ---------------------------------------------------------------------
-- begin;
-- set local app.cambiar_demo = 'si';
-- update auth.users
--    set encrypted_password = extensions.crypt('NUEVA_CLAVE', extensions.gen_salt('bf'))
--  where email = 'demo@cambiocde.com';
-- commit;
