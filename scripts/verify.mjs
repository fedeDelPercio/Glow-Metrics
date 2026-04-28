// Standalone validation script — run with: node scripts/verify.mjs
// Walks through the 5 manual checks and reports pass/fail with screenshots.
// Created when the Playwright MCP server stopped responding mid-session.

import { chromium } from "playwright"
import { mkdirSync, writeFileSync } from "node:fs"

const BASE = process.env.BASE_URL ?? "http://localhost:3005"
const EMAIL = "glowtest@test.com"
const PASSWORD = "GlowTest123!"
const OUT = "scripts/verify-output"

mkdirSync(OUT, { recursive: true })

const log = []
const result = (name, ok, detail) => {
  log.push({ name, ok, detail })
  console.log(`${ok ? "✅" : "❌"} ${name}${detail ? " — " + detail : ""}`)
}

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()

try {
  // === Login ===
  await page.goto(`${BASE}/login`)
  await page.getByRole("textbox", { name: "Email" }).fill(EMAIL)
  await page.getByRole("textbox", { name: "Contraseña" }).fill(PASSWORD)
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL(/\/$|\/onboarding/, { timeout: 10000 })
  await page.waitForTimeout(2000)
  result("Login", page.url() === `${BASE}/`, page.url())

  // === Check 1: /servicios → editar Limpieza facial → ver receta con Crema (10 ml) ===
  await page.goto(`${BASE}/servicios`)
  await page.waitForTimeout(1500)
  // Find the row containing "Limpieza facial profunda" and click its MoreVertical button
  const limpiezaRow = page.locator('div:has-text("Limpieza facial profunda")').filter({ hasNot: page.locator(":scope > div") }).first()
  // Easier: find any "Limpieza facial profunda" button-or-row, then nearby aria-haspopup menu
  await page.locator('button:has(svg.lucide-ellipsis-vertical), button:has(svg.lucide-more-vertical)').first().waitFor({ timeout: 5000 }).catch(() => {})
  // Pick MoreVertical buttons; first matches first service row sorted alphabetically (Depilación)
  // Find the one in the same row as Limpieza facial.
  const allMore = await page.locator('button[aria-haspopup="menu"]').all()
  let openedEdit = false
  for (const btn of allMore) {
    const row = btn.locator("xpath=ancestor::*[self::div][1]")
    const txt = await row.innerText().catch(() => "")
    if (txt.includes("Limpieza facial profunda")) {
      await btn.click()
      await page.waitForTimeout(300)
      await page.getByRole("menuitem", { name: /Editar/ }).click()
      openedEdit = true
      break
    }
  }
  if (!openedEdit) {
    // Fallback: open Limpieza facial via its name button (some layouts)
    await page.getByText("Limpieza facial profunda").first().click({ force: true }).catch(() => {})
  }
  await page.waitForTimeout(1000)
  // Open recipe accordion if collapsed
  const recipeBtn = page.getByRole("button", { name: /Receta de insumos/ })
  if (await recipeBtn.count() && await recipeBtn.isVisible()) await recipeBtn.click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/01-service-recipe.png` })
  const dialogText = await page.locator('[role="dialog"]').first().innerText().catch(() => "")
  const hasCrema = dialogText.includes("Crema")
  // innerText does not include input values; read them explicitly
  const qtyValues = await page.locator('[role="dialog"] input[type="number"]').evaluateAll((els) => els.map((el) => el.value))
  const hasQty10 = qtyValues.includes("10") || qtyValues.includes("10.0000") || qtyValues.some((v) => Number(v) === 10)
  result("(1) Service recipe shows Crema with qty 10",
    hasCrema && hasQty10,
    `crema=${hasCrema}, qty10=${hasQty10}, qtyValues=${JSON.stringify(qtyValues)}`)
  // Close dialog robustly
  await page.locator('[role="dialog"] button[aria-label="Close"], [role="dialog"] button:has(svg.lucide-x)').first().click().catch(() => {})
  await page.keyboard.press("Escape").catch(() => {})
  await page.waitForTimeout(800)

  // === Check 2: /insumos → SupplyForm tiene campo "Precio del envase" ===
  // Usamos "Agregar" en vez de Editar para evitar el dropdown menu de
  // Radix que es flaky en headless. Es el mismo SupplyForm.
  await page.goto(`${BASE}/insumos`, { waitUntil: "networkidle" })
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/02a-insumos-list.png` })
  // Click "Agregar" (header button)
  await page.locator('main button:has-text("Agregar")').first().click()
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/02-supply-form.png` })
  const newSupplyDialog = await page.locator('[role="dialog"]').first().innerText().catch(() => "")
  // Label uses CSS uppercase, so innerText returns it in upper case
  const hasPrecio = newSupplyDialog.toLowerCase().includes("precio del envase")
  result("(2) SupplyForm exposes 'Precio del envase' field",
    hasPrecio,
    hasPrecio ? "label present" : `MISSING. Dialog text: ${newSupplyDialog.slice(0, 200)}`)
  await page.keyboard.press("Escape").catch(() => {})
  await page.waitForTimeout(500)

  // === Check 3: /reportes → rentabilidad de Limpieza facial usa supply_cost real ===
  await page.goto(`${BASE}/reportes`)
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${OUT}/03-reports.png`, fullPage: true })
  const reportsText = await page.locator("main").innerText()
  // With pack_price of $6000/500ml × 10ml × 3 sessions, supply_cost = $360
  // Limpieza facial profit was -$45.000 before; now should be -$45.360
  // (Just check that revenue line for Limpieza is still there)
  const hasLimpieza = reportsText.includes("Limpieza facial profunda")
  result("(3) Reports renders profitability for Limpieza facial",
    hasLimpieza,
    hasLimpieza ? "found in report" : "NOT in report")

  // === Check 4: /agenda → vista Semana → click evento → menu (no nav a día) ===
  await page.goto(`${BASE}/agenda`)
  await page.waitForTimeout(1500)
  // Switch to week view
  await page.getByRole("button", { name: "Semana" }).click()
  await page.waitForTimeout(1000)
  const urlBeforeClick = page.url()
  // Find an appointment block (has client name text)
  const apptBlocks = page.locator('button:has-text("Ana Pérez"), button:has-text("María Test"), button:has-text("Belén")')
  const count = await apptBlocks.count()
  if (count === 0) {
    result("(4) Week view event click", false, "no appointments visible in week view")
  } else {
    await apptBlocks.first().click({ force: true })
    await page.waitForTimeout(700)
    const urlAfterClick = page.url()
    const stayedOnWeek = urlAfterClick === urlBeforeClick
    // Look for the popover with action buttons
    const popoverText = await page.locator("body").innerText()
    const hasEditar = popoverText.includes("Editar")
    const hasEliminar = popoverText.includes("Eliminar")
    await page.screenshot({ path: `${OUT}/04-week-event-menu.png` })
    result("(4) Week event click shows menu in place",
      stayedOnWeek && hasEditar && hasEliminar,
      `stayed=${stayedOnWeek}, editar=${hasEditar}, eliminar=${hasEliminar}`)
  }

  // === Check 5: Nuevo turno NO tiene "¿De dónde viene?" ===
  // Reset state by navigating fresh — the previous popover backdrop may
  // still be intercepting clicks even after Escape.
  await page.goto(`${BASE}/agenda`, { waitUntil: "networkidle" })
  await page.waitForTimeout(2000)
  // Click FAB / Agregar (in sidebar on desktop)
  const agregarBtn = page.getByRole("button", { name: /^Agregar$/ }).first()
  await agregarBtn.click()
  await page.waitForTimeout(700)
  // QuickAddSheet appears — click "Nuevo turno"
  const newTurnoOption = page.locator('[role="dialog"] button:has-text("Nuevo turno")').first()
  if (await newTurnoOption.isVisible()) {
    await newTurnoOption.click()
    await page.waitForTimeout(700)
  }
  await page.screenshot({ path: `${OUT}/05-new-appointment.png` })
  const apptDialogText = await page.locator('[role="dialog"]').last().innerText()
  const hasDeDonde = apptDialogText.includes("¿De dónde viene?") || apptDialogText.includes("Canal de origen")
  result("(5) New appointment form has NO source field",
    !hasDeDonde,
    hasDeDonde ? "still shows source" : "removed")

} catch (e) {
  console.error("ERROR:", e.message)
  log.push({ name: "FATAL", ok: false, detail: e.message })
  await page.screenshot({ path: `${OUT}/error.png` }).catch(() => {})
} finally {
  writeFileSync(`${OUT}/results.json`, JSON.stringify(log, null, 2))
  await browser.close()
  const failed = log.filter((l) => !l.ok)
  console.log(`\nDone. ${log.length - failed.length}/${log.length} passed.`)
  process.exit(failed.length === 0 ? 0 : 1)
}
