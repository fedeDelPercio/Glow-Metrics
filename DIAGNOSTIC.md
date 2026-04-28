# Diagnóstico — "Los módulos quedan cargando o muestran cero"

**Estado**: bug recurrente (16+ veces reportado). El Ctrl+Shift+R lo resuelve temporalmente.

---

## Síntomas observados

1. Al abrir /clientas (u otro módulo), la UI alterna entre:
   - **Skeleton eterno** (hook queda con `loading=true` hasta que el timeout de 10s lo fuerza a `false`)
   - **Empty state inmediato** ("Sin clientas aún") aunque existen datos en la DB
2. **Ctrl+Shift+R siempre lo arregla**, por un rato.
3. Volvés a navegar → el problema reaparece.

---

## Arquitectura relevante

- `AuthProvider` (en `src/hooks/useAuth.ts`) monta al root de la app y expone `{ user, profile }` vía Context.
- `proxy.ts` (ex-middleware) corre server-side en cada request y valida la sesión vía `createServerClient().auth.getUser()`.
- Cada hook de datos (`useClients`, `useAppointments`, etc.) lee `userId = user?.id` del contexto y gatea su fetch con `if (!userId) return`.

---

## Root cause (hipótesis principal)

`supabase.auth.getSession()` en el useEffect del AuthProvider **se cuelga** en ciertos estados (navegación soft, HMR, token rotation cruzada entre server y browser). Mientras cuelga:

1. `setUser` nunca es llamado.
2. `user` stays `null`, `userId` stays `undefined`.
3. Todos los data hooks bailan en `if (!userId) return`.
4. `loading=true` persiste hasta el safety-timeout de 10s, que lo fuerza a `false`.
5. La UI muestra empty state porque `clients.length===0 && !loading`.

### ¿Por qué se cuelga getSession?

El patrón más probable es **divergencia entre cookies (server) y localStorage (browser)**:

- `proxy.ts` corre en cada request server-side y llama `auth.getUser()`, que puede **rotar el refresh token** y escribir uno nuevo en cookies.
- El browser client guarda tokens en localStorage, independiente del cookie.
- Cuando browser y server divergen, el browser intenta refrescar con un token rotado → la request pega a Supabase con el token viejo → hangs, retries indefinidos, o ECONNRESET.

Evidencia en logs previos:
- `[TypeError: fetch failed] ... code: 'ECONNRESET'`
- `[loading-timeout] forcing loading=false after 10000ms` repetido

### ¿Por qué Ctrl+Shift+R funciona?

El hard reload:
- Re-ejecuta toda la JS desde cero.
- El browser client se re-instancia y lee el cookie más fresco (SSR ya inyectó uno nuevo en la response).
- localStorage se sincroniza con el cookie vía primera operación exitosa.

Pero cualquier navegación posterior que dispare una rotación server-side vuelve a abrir el drift.

---

## Fix definitivo — arquitectura propuesta

**Dejar de depender de `getSession()` client-side como puerta de entrada.**

1. Convertir el layout del dashboard en **Server Component**.
2. Server-side, obtener el user vía `createServerClient().auth.getUser()`.
3. Pasar el user inicial al `AuthProvider` como prop (`initialUser`).
4. `AuthProvider` usa `initialUser` como estado inicial (no `null`), y **solo** usa `onAuthStateChange` para actualizaciones subsecuentes. **Nunca** llama a `getSession()` en mount.
5. Los data hooks reciben un `userId` definido desde el primer render. Sus useEffect disparan el fetch sin esperar.

Esto elimina el punto de falla:
- El user viene del server, que sí tiene acceso confiable a cookies frescas.
- El browser client puede hacer sus queries REST con el JWT en cookies (SSR-shared) sin necesidad de que el cliente valide/refresque nada por su cuenta.
- Si el proxy rota tokens, la próxima request trae cookies nuevos y el server-rendered HTML trae el user actualizado.

---

## Plan de verificación (instrumentación)

Para confirmar la hipótesis y validar el fix, se agrega:

1. **`src/lib/diag.ts`** — ring buffer de eventos timestampeados (auth, fetch, refresh). Accesible desde `window.__diag.dump()` y desde /debug.
2. **Instrumentación en hooks**:
   - `auth:mount`, `auth:get_session_start`, `auth:get_session_ok`, `auth:get_session_timeout`
   - `hook:<name>:fetch_start`, `hook:<name>:fetch_ok{ms, rows}`, `hook:<name>:fetch_fail{error}`
   - `auth:state_change:<event>`
3. **`/debug` page** — muestra el stream en vivo + botón para limpiar localStorage/cookies y reiniciar sesión.

### Cómo reproducir el bug (para validar el fix)

1. Login normal.
2. Navegar entre Inicio → Clientas → Agenda → Clientas varias veces.
3. Dejar la tab en background 30-60s, volver.
4. Observar `/debug` log: si aparece `auth:get_session_start` sin su correspondiente `auth:get_session_ok` dentro de 2s → cuelgue reproducido.

### Criterio de éxito del fix

- En 20 navegaciones seguidas, ningún hook dispara `loading-timeout`.
- `/debug` nunca muestra eventos `get_session_timeout` en uso normal.
- Crear turno / clienta / costo refleja inmediato en la UI sin refresh.

---

## Qué hacer si vuelve a fallar

1. Abrir `/debug`.
2. Copiar el dump del ring buffer (botón "Copy logs").
3. Adjuntar al reporte con el timestamp exacto del fallo y la acción que lo disparó.
4. Verificar si el último evento antes del fallo es un `auth:*` o un `hook:*` — indica en qué capa se rompió.
