# Cambio CDE · Sistema para casa de cambios

Aplicación web para una casa de cambios de Ciudad del Este (Paraguay): cotizaciones del día, operaciones de compra y venta de divisas, caja con apertura y cierre por arqueo, anulaciones y una pantalla pública de cotizaciones para la TV del local.

**Demo:** https://cambio-cde-delta.vercel.app
Usuario demo (rol cajero): `demo@cambiocde.com` · contraseña `demo1234`
Pantalla TV pública: https://cambio-cde-delta.vercel.app/pantalla
La base de la demo es compartida: lo que cargues lo ven los demás visitantes. El usuario demo no puede anular operaciones, cargar cotizaciones ni cambiar su contraseña.
Presentación del proyecto: https://cambio-cde-delta.vercel.app/acerca

![Pizarra de cotizaciones para la TV del local, con fichas split-flap](public/capturas/pantalla.webp)

| Panel del cajero | Cierre de caja con ticket de arqueo |
| --- | --- |
| ![Panel del cajero con una venta de dólares cargada](public/capturas/operacion.webp) | ![Arqueo de cierre con ticket de 80 mm](public/capturas/arqueo.webp) |

## Funcionalidades

- **Login con roles** (`admin` y `cajero`) usando Supabase Auth.
- **Cotizaciones**: el admin carga compra y venta por moneda (USD, BRL, ARS, EUR); se guarda el historial y se usa siempre la vigente.
- **Operaciones**: compra o venta de divisa con cliente opcional. El total en guaraníes lo calcula la base de datos con la cotización vigente, no el navegador.
- **Caja**: se abre contando el efectivo de cada moneda (precargado con lo contado en el último cierre) y se cierra con arqueo: saldo esperado, contado y diferencia, con comprobante imprimible.
- **Anulación**: solo el admin; revierte automáticamente los movimientos de caja y no se puede deshacer.
- **Pantalla TV** (`/pantalla`): pizarra 16:9 inspirada en las de las casas de cambio del centro de Ciudad del Este. Fichas split-flap que giran solo cuando cambia una cotización, banderas en SVG, reloj en vivo, modo pantalla completa y cursor que se oculta solo. Se actualiza cada 60 segundos.
- **Panel del cajero**: atajos de teclado (`Alt+V` venta, `Alt+C` compra, `Alt+1…4` moneda, `Alt+M` monto), total en guaraníes destacado, compra y venta diferenciadas con texto e ícono (no solo color), avisos al registrar, estados de carga y error, y tablas que se apilan en el celular.
- **Comprobantes con formato de ticket térmico de 80 mm**, listos para imprimir.
- **Presentación pública** (`/acerca`): qué es el sistema, capturas y decisiones técnicas. La raíz sin sesión lleva ahí; el login tiene un botón para entrar con la cuenta demo.

## Tecnologías

React 19 · TypeScript · Vite · React Router · Supabase (PostgreSQL, Auth, Row Level Security) · Vercel

## Diseño

La idea central es la pizarra luminosa de cotizaciones que tienen en la vereda las casas de cambio de Ciudad del Este: ámbar LED sobre negro y fichas split-flap. Esa identidad aparece en la pantalla TV, el login y la presentación. El panel del cajero es deliberadamente sobrio, de herramienta de trabajo: IBM Plex Sans con cifras tabulares (IBM Plex Mono para montos) y Barlow Condensed para la marca y la pizarra.

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
  components/   Layout, Arqueo, Ticket, Pizarra (fichas split-flap), Bandera y Logo
  context/      Sesión, perfil del usuario y avisos (toast)
  lib/          Cliente de Supabase, hooks y formato de montos
  pages/        Login, Nueva operación, Cotizaciones, Pantalla TV y Acerca
supabase/       Esquema, triggers, políticas RLS y funciones de caja
```

## Autor

William Zarza · Estudiante de Ingeniería en Informática (Universidad Privada del Este)
[GitHub](https://github.com/williamzarza2003) · [LinkedIn](https://www.linkedin.com/in/william-zarza-293792451/)
