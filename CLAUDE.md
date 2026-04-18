@AGENTS.md

---

# GlowMetrics — Guía de proyecto para agentes

## Principios no negociables

Todo lo que se construya en este proyecto debe cumplir estos tres principios **antes de cualquier otra consideración**:

1. **Escalabilidad**: Cada decisión de diseño debe funcionar con 10 usuarias y con 10.000. Nada hardcodeado, sin state global innecesario, queries paginadas por defecto, índices en columnas filtradas, sin lógica de negocio en componentes.
2. **Seguridad**: RLS activo en TODAS las tablas sin excepción. Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` al cliente. Nunca `any` en TypeScript. Validar con Zod en el borde del sistema (formularios, API routes). Soft delete en vez de DELETE real.
3. **Mobile-first + Responsive**: Todo layout se diseña primero para 375px. Bottom nav en mobile, sidebar en desktop (`lg:`). Touch targets mínimo 44px. Sin hover-only interactions. Probar en 375px antes de declarar completo.

---

## Stack exacto (no asumir versiones)

| Paquete | Versión | Notas críticas |
|---|---|---|
| Next.js | 16.2.4 | App Router. Leer `node_modules/next/dist/docs/` antes de escribir código |
| TypeScript | 5.x | `"strict": true`. Nunca `any` |
| Tailwind | v4 | `@theme inline` en globals.css, no `tailwind.config.js` |
| shadcn/ui | Radix | `components.json` ya configurado |
| Supabase JS | 2.103.3 | Requiere `Relationships: []` en cada tabla del tipo Database |
| @supabase/ssr | latest | Para SSR auth con cookies |
| Zod | 4.3.6 | Breaking changes vs v3 — ver sección Zod abajo |
| React Hook Form | 7.x | Resolver con cast explícito — ver sección RHF abajo |
| Recharts | 2.x | Solo escala de grises: `CHART_COLORS` de `constants.ts` |
| class-variance-authority | instalado | Requerido por shadcn. No eliminar |
| tw-animate-css | instalado | Importado en globals.css |

---

## Arquitectura

```
src/
├── app/
│   ├── (auth)/          # login, register — sin header/nav
│   ├── (dashboard)/     # rutas protegidas — con Header + BottomNav
│   ├── auth/callback/   # OAuth redirect handler
│   └── onboarding/      # fuera del grupo dashboard para no mostrar nav
├── components/
│   ├── cards/           # StatCard, ServiceCard, ClientCard, AppointmentCard
│   ├── charts/          # RevenueChart, ServiceMixChart, OccupancyChart, ChannelChart
│   ├── forms/           # Un archivo por entidad. Usan RHF + Zod
│   ├── layout/          # Header, BottomNav, PageContainer
│   └── ui/              # shadcn primitivos + empty-state.tsx
├── hooks/               # Un hook por entidad. CRUD + optimistic updates
├── lib/
│   ├── calculations/    # profitability.ts, occupancy.ts, diagnostics.ts
│   ├── supabase/        # client.ts (browser), server.ts (SSR)
│   └── utils/           # format.ts, constants.ts
└── types/
    ├── database.ts      # Tipos Supabase manuales (con Relationships)
    ├── forms.ts         # Schemas Zod + tipos inferidos
    └── dashboard.ts     # DashboardStats, ServiceProfitability, DiagnosticAction
```

### Supabase clients

- **`lib/supabase/client.ts`**: `createBrowserClient<Database>()` — solo en Client Components (`"use client"`)
- **`lib/supabase/server.ts`**: `createServerClient()` async con cookie store — en Server Components y Route Handlers
- **NUNCA** usar `createClient()` del servidor en el browser ni viceversa

### Data fetching

- Server Components: fetch inicial con `supabase/server.ts`
- Client Components: hooks en `src/hooks/` con optimistic updates
- Todas las queries filtran `deleted_at IS NULL`
- Paginación por defecto: `ITEMS_PER_PAGE = 20` (de `constants.ts`)

---

## Base de datos

### Tablas (en orden de dependencias)

1. `profiles` — extiende `auth.users`, creada automáticamente por trigger `handle_new_user`
2. `service_categories`
3. `services`
4. `service_price_history` — alimentada por trigger `track_price_change`
5. `supply_catalog`
6. `service_supplies` — receta de insumos por servicio (UNIQUE service_id + supply_id)
7. `supply_purchases` — trigger actualiza `supply_catalog.current_stock`
8. `clients`
9. `appointments` — CHECK constraint en `status`
10. `fixed_costs`

### Reglas invariantes de la DB

- **RLS en todas las tablas**. Sin excepción. Política patrón para tablas con `user_id`: `USING (auth.uid() = user_id)`
- **Tablas hijo** (`service_supplies`, `service_price_history`): RLS vía EXISTS sobre la tabla padre
- **Soft delete**: campo `deleted_at TIMESTAMPTZ`. Nunca DELETE directo al usuario
- **`updated_at`**: trigger `update_updated_at()` en todas las tablas que tienen ese campo
- **`appointments.status`**: CHECK constraint `IN ('reserved','confirmed','completed','no_show','cancelled','rescheduled')`
- **`fixed_costs.frequency`**: CHECK constraint `IN ('monthly','bimonthly','quarterly','annual')`

### Migration

SQL completo en `supabase/migrations/001_initial_schema.sql`. Para aplicar cambios futuros, crear `002_...sql`, `003_...sql` — nunca modificar el 001.

### Tipos TypeScript

`src/types/database.ts` es el contrato entre la app y Supabase. Reglas:
- Cada tabla DEBE tener `Relationships: []` (mínimo) o con FKs correctas — sin esto, Insert/Update se tipan como `never` en Supabase JS 2.100+
- `Profile` usa `Omit<DBRow, "working_hours"> & { working_hours: WorkingHours }` porque la DB guarda `Json` pero el dominio usa el tipo estructurado
- Al asignar datos de Supabase a `Profile`, castear: `data as Profile | null`
- Si se regeneran tipos con `npx supabase gen types typescript`, revisar que el output incluya `Relationships` — si no, agregar manualmente

---

## Zod v4 — Cambios críticos vs v3

```typescript
// ❌ NO existe en v4
z.number({ invalid_type_error: "..." })
z.record(z.object(...))           // necesita 2 args

// ✅ Correcto en v4
z.number()
z.record(z.string(), z.object(...))
```

- No usar `.default()` en schemas que se usan con RHF — diverge los tipos input/output
- Poner defaults en `useForm({ defaultValues: {} })`
- Schemas en `src/types/forms.ts`

---

## React Hook Form — Patrón con Zod v4

```typescript
import { zodResolver } from "@hookform/resolvers/zod"
import type { Resolver } from "react-hook-form"

// Cast obligatorio cuando hay campos boolean/enum:
const form = useForm<MyFormValues>({
  resolver: zodResolver(MySchema) as Resolver<MyFormValues>,
  defaultValues: { is_active: true, ... }
})

// En onSubmit, castear values si TypeScript se queja:
const onSubmit = async (values: any) => { ... }
```

---

## Design system

### Paleta (monocromática)

| Token | Valor | Uso |
|---|---|---|
| `--primary` | `#0A0A0A` | Acciones principales, FAB, texto primario |
| `--surface-1` | `#FAFAFA` | Fondo de página |
| `--surface-2` | `#F5F5F5` | Cards, inputs, skeleton |
| `--border` | `#E5E5E5` | Bordes, separadores |
| `--text-secondary` | `#737373` | Labels, placeholders |
| `--text-tertiary` | `#A3A3A3` | Metadatos, timestamps |

### Reglas de UI

- **Sin colores de acento** fuera de los status badges de appointments
- **Números financieros**: siempre `tabular-nums`, formato `AR$ 1.500,00` vía `formatCurrency()` de `lib/utils/format.ts`
- **Touch targets**: mínimo 44×44px en elementos interactivos
- **Empty states**: usar `<EmptyState>` de `components/ui/empty-state.tsx` — icono 48px `#D4D4D4` + texto + CTA opcional
- **Skeleton loaders**: `bg-[#F5F5F5] animate-pulse` mientras carga
- **Toast**: Sonner (`<Toaster>` en root layout). Sin íconos excesivos

### Navegación

Bottom Nav (mobile) con 5 items:
```
Inicio (Home) | Agenda (Calendar) | FAB ➕ 56px negro | Servicios (Scissors) | Reportes (BarChart3)
```
En `lg:` el layout puede expandirse a sidebar (pendiente implementar si se necesita).

### Appointment status badges

```typescript
// En constants.ts — APPOINTMENT_STATUSES
reserved:    "bg-[#F5F5F5] text-[#525252]"
confirmed:   "bg-[#0A0A0A] text-white"
completed:   "bg-[#F0FDF4] text-[#16A34A]"
no_show:     "bg-[#FEF2F2] text-[#DC2626]"
cancelled:   "bg-[#F5F5F5] text-[#A3A3A3] line-through"
rescheduled: "bg-[#FFFBEB] text-[#D97706]"
```

---

## Motor de cálculos

En `src/lib/calculations/`:

- **`profitability.ts`** → `calcServiceProfitability()`: revenue, costo insumos (precio promedio de compras), costo tiempo (hourlyRate × duración), parte proporcional de costos fijos, margen %
- **`occupancy.ts`** → `calcOccupancyRate()`, `calcAbsenceRate()`, `calcTotalSlots()`
- **`diagnostics.ts`** → `generateDiagnostics(stats)`: retorna hasta 3 `DiagnosticAction` ordenadas por impacto. Evalúa: tasa ausencia > 15%, ocupación < 60%, margen < 30% por servicio, caída de ingresos > 10%, cobertura de punto de equilibrio

---

## Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=https://jjsainuhekjlrhhucqzr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key — seguro exponer al browser>
SUPABASE_SERVICE_ROLE_KEY=<solo server — NUNCA al browser>
```

`SUPABASE_SERVICE_ROLE_KEY` solo se usa en Server Components o Route Handlers. Si algún código de cliente intenta leerla, es un bug de seguridad.

---

## Escalabilidad — Decisiones que NO se deben revertir

1. **Paginación obligatoria**: todos los listados usan `.range(from, to)` con `ITEMS_PER_PAGE = 20`. Sin "traer todo".
2. **Índices en columnas filtradas**: `idx_appointments_user_date`, `idx_clients_user`, `idx_services_user`, etc. — ya en la migración. Nuevas tablas deben incluir sus índices.
3. **Soft delete**: campo `deleted_at`. La única razón para un DELETE físico es si se borra la cuenta del usuario (CASCADE automático desde `auth.users`).
4. **Multi-tenant by design**: toda tabla tiene `user_id` y RLS. Nunca hay datos "globales" mezclados con datos de usuario.
5. **Hooks desacoplados**: los hooks de `src/hooks/` no se comunican entre sí directamente — cada uno encapsula su propia tabla. El dashboard agrega en `useDashboardStats`.
6. **Server Components para fetch inicial**: evita waterfalls en mobile. Los hooks son para CRUD interactivo post-carga.
7. **Optimistic updates en CRUD**: insertar el item en el estado local inmediatamente, luego confirmar/revertir con la respuesta de Supabase.

---

## Seguridad — Checklist para cada nueva feature

- [ ] La tabla nueva tiene RLS habilitado
- [ ] Las políticas cubren SELECT, INSERT, UPDATE, DELETE según necesidad
- [ ] No hay `select("*")` sin `.eq("user_id", user.id)` cuando RLS no cubre (raro, pero verificar)
- [ ] Los inputs del usuario pasan por un schema Zod antes de llegar a Supabase
- [ ] Ninguna key secreta (`service_role`) se usa en código client-side
- [ ] No hay `console.log` con datos sensibles del usuario en producción

---

## Próximos pasos / Estado actual

- [x] MVP completo implementado — build exitoso (15 rutas, 0 errores TS)
- [x] Supabase proyecto creado (`jjsainuhekjlrhhucqzr`)
- [x] `.env.local` configurado con URL y keys reales
- [x] Ejecutar `supabase/migrations/001_initial_schema.sql` en SQL Editor — 10 tablas creadas, RLS activo en todas
- [ ] Habilitar Google OAuth en Supabase Auth → Providers → Google
- [ ] Configurar Authorized redirect URIs en Google Cloud Console: `https://jjsainuhekjlrhhucqzr.supabase.co/auth/v1/callback`
- [ ] Test end-to-end: register → onboarding → crear servicio → crear turno → ver dashboard

---

## Convenciones de código

- **Sin `any`** en TypeScript — si TypeScript se queja, buscar el tipo correcto o castear con justificación
- **Sin comentarios** que expliquen QUÉ hace el código — solo los que explican POR QUÉ (invariante no obvia, workaround)
- **Sin features especulativas** — implementar exactamente lo pedido, nada más
- **Sin manejo de errores para casos imposibles** — confiar en TypeScript y en las garantías de Supabase
- **Formateo financiero siempre** vía `formatCurrency()` — nunca `toFixed(2)` directo al usuario
- **Fechas**: `date-fns` para manipulación, `formatDate()`/`formatTime()` de `lib/utils/format.ts` para display
- **Texto al usuario en español argentino** — "clientas", no "clientes"; "turno", no "cita"; "insumos", no "materiales"
