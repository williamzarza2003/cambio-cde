# Cambio CDE · Sistema para casa de cambios

Aplicación web para una casa de cambios de Ciudad del Este (Paraguay): cotizaciones del día, operaciones de compra y venta de divisas, caja con apertura y cierre por arqueo, anulaciones y una pantalla pública de cotizaciones para la TV del local.

**Demo:** https://cambio-cde-delta.vercel.app
Usuario demo (rol cajero): `demo@cambiocde.com` · contraseña `demo1234`
Pantalla TV pública: https://cambio-cde-delta.vercel.app/pantalla
La base de la demo es compartida: lo que cargues lo ven los demás visitantes. El usuario demo no puede anular operaciones, cargar cotizaciones ni cambiar su contraseña.

## Funcionalidades

- **Login con roles** (`admin` y `cajero`) usando Supabase Auth.
- **Cotizaciones**: el admin carga compra y venta por moneda (USD, BRL, ARS, EUR); se guarda el historial y se usa siempre la vigente.
- **Operaciones**: compra o venta de divisa con cliente opcional. El total en guaraníes lo calcula la base de datos con la cotización vigente, no el navegador.
- **Caja**: se abre contando el efectivo de cada moneda (precargado con lo contado en el último cierre) y se cierra con arqueo: saldo esperado, contado y diferencia, con comprobante imprimible.
- **Anulación**: solo el admin; revierte automáticamente los movimientos de caja y no se puede deshacer.
- **Pantalla TV** (`/pantalla`): cotizaciones públicas que se actualizan solas cada 60 segundos.

## Tecnologías

React 19 · TypeScript · Vite · React Router · Supabase (PostgreSQL, Auth, Row Level Security) · Vercel

## Decisiones técnicas

- **La lógica de dinero vive en PostgreSQL.** Triggers toman la cotización vigente, calculan el monto en guaraníes y registran los movimientos de caja; un cliente modificado no puede inventar montos.
- **Row Level Security** en todas las tablas: el cajero opera, solo el admin carga cotizaciones y anula, y la pantalla TV lee cotizaciones sin login.
- **Apertura y cierre solo por funciones** (`abrir_caja`, `cerrar_caja`): no se puede cerrar una caja sin registrar el conteo.
- **Saldos por sesión de caja** con una vista (`saldos_caja`) que suma los movimientos; las anulaciones generan movimientos inversos en lugar de borrar datos.

## Correrlo en tu máquina

Requisitos: Node.js 20+ y un proyecto gratuito en [Supabase](https://supabase.com).

1. En Supabase › SQL Editor ejecutá, en orden, `supabase/schema.sql` y `supabase/02_saldos_caja.sql` (`03_proteger_demo.sql` es opcional: bloquea cambios al usuario demo).
2. En Authentication › Users creá tu usuario y hacelo admin:
   ```sql
   update public.perfiles set rol = 'admin' where id = (select id from auth.users where email = 'TU_EMAIL');
   ```
3. Copiá `.env.example` como `.env.local` y completá la URL y la anon key (Project Settings › API).
4. Instalá y arrancá:
   ```bash
   npm install
   npm run dev
   ```

## Estructura

```
src/
  components/   Layout y Arqueo (formulario de conteo de caja)
  context/      Sesión y perfil del usuario
  lib/          Cliente de Supabase, hooks y formato de montos
  pages/        Login, Nueva operación, Cotizaciones, Pantalla TV
supabase/       Esquema, triggers, políticas RLS y funciones de caja
```

## Autor

William Zarza · Estudiante de Ingeniería en Informática (Universidad Privada del Este)
[GitHub](https://github.com/williamzarza2003) · [LinkedIn](https://www.linkedin.com/in/william-zarza-293792451/)
