# Focus

App de productividad personal: hábitos, planificador semanal/mensual, metas con hitos, rueda de la vida, sueños, Pomodoro, soporte y recordatorios push.

Stack: Next.js 16 (App Router, Server Actions), Supabase (Postgres + Auth + Realtime), Web Push con service worker (Serwist), desplegado en Vercel.

## Puesta en marcha

1. Copiá `.env.example` a `.env.local` y completá las variables.
2. Base de datos:
   - **Base nueva:** ejecutá `supabase/schema.sql` y después cada archivo de `supabase/migrations/` en orden.
   - **Base existente:** ejecutá solo las migraciones pendientes.
3. Regenerá los tipos después de cambiar el esquema:
   ```bash
   npx supabase gen types typescript --linked > lib/database.types.ts
   ```
4. `npm run dev`

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm test` | Tests unitarios (Vitest) |

## Arquitectura

- `lib/data.ts`: lecturas del servidor (Server Components). Exigen sesión y lanzan ante errores (lo muestra `app/error.tsx`).
- `app/actions/*`: mutaciones. Cada una valida el input con zod (`lib/validation.ts`), verifica la sesión y devuelve `{ ok, data } | { ok: false, error }`.
- `lib/auth.ts`: sesión del request y rol. **El rol de admin vive solo en `app_metadata`**, que el usuario no puede editar.
- Fechas: se guardan como `YYYY-MM-DD` en la zona local del usuario. El servidor corre en UTC, así que "hoy" se calcula en el cliente (`lib/use-today.ts`). Para los recordatorios se usa `user_settings.timezone`.
- Planificador: `calendar_events` puede ser puntual (`date`) o semanal (`days_of_week`). El completado es por ocurrencia (`event_completions`).

### Notificaciones

Patrón outbox con la tabla `notifications`, que también funciona como bandeja in-app.

1. `/api/cron` encola los recordatorios de los próximos 35 minutos (30, 15 y 5 minutos antes de cada evento con hora). Es idempotente.
2. Reclama las notificaciones vencidas con `claim_due_notifications()` (`FOR UPDATE SKIP LOCKED`), las envía por Web Push con reintentos y borra las suscripciones que responden 404 o 410.
3. La campana in-app escucha la tabla por Supabase Realtime. El estado leído/no leído vive en la base.

### Racha de uso y avisos por inactividad

- Al abrir la app, al volver a la pestaña y cada 10 minutos con la app visible, el cliente llama a `touch_activity()`, que guarda `last_seen_at` y actualiza la racha de días seguidos (con el día local del usuario).
- Desde el dashboard cada usuario elige si quiere un aviso cuando pasan 1, 2, 5, 7 o 12 horas sin usar la app (`user_settings.inactivity_reminder_hours`). El aviso se repite en cada tramo mientras no vuelva.
- A las 20 h se avisa si la racha (de 2 días o más) se corta ese día.
- Nunca se manda nada entre las 22 y las 9 h (hora local). La lógica está en `lib/notifications/inactivity.ts`, con tests.

El build usa webpack (`next build --webpack`) porque Serwist genera el service worker con un plugin de webpack: con Turbopack no se generaba `public/sw.js` y las notificaciones push no funcionaban en producción.

Vercel Hobby solo permite crons diarios. Para recordatorios reales, programá `/api/cron` cada minuto con `pg_cron` + `pg_net` (hay un ejemplo al final de la migración).

### Agregar un administrador

```sql
update auth.users
set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
where email = 'persona@ejemplo.com';
```

El usuario tiene que cerrar sesión y volver a entrar para que su token incluya el rol.
