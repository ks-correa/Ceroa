import { test, expect } from '@playwright/test';
const api = process.env.E2E_API_URL || 'http://localhost:18080/api/v1';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ceroa_onboarding_seen', 'true'));
});
test('local registration, backend confirmation, reload, login and remembered email', async ({ page, context }) => {
  const email = `ep02-${Date.now()}@example.com`;
  await page.goto('/');
  await page.getByRole('button', { name: '¿Aún no tienes una cuenta? Crear cuenta' }).click();
  await page.getByLabel('Nombre completo').fill('Ana García');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Celular').fill('+573001234567');
  await page.getByLabel('Fecha de nacimiento').fill('1990-01-20');
  await page.getByLabel('Contraseña', { exact: true }).fill('Integration!23');
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('Integration!23');
  await page.getByLabel('Acepto los términos').check();
  await page.getByLabel('Acepto la política').check();
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Configuración financiera inicial' })).toBeVisible();
  const cookie = (await context.cookies()).find(cookie => cookie.name === 'ceroa_session');
  expect(cookie?.httpOnly).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Configuración financiera inicial' })).toBeVisible();
  // Exercise the pre-existing logout endpoint solely to verify HU-009 across sessions.
  const csrf = await (await context.request.get(api + '/auth/csrf')).json();
  await context.request.post(api + '/auth/logout', { headers: { 'X-XSRF-TOKEN': csrf.token } });
  await page.reload();
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill('Integration!23');
  await page.getByLabel('Recordar correo').check();
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Configuración financiera inicial' })).toBeVisible();
  const stored = await page.evaluate(() => ({ ...localStorage }));
  expect(stored.ceroa_remembered_email).toBe(email);
  expect(JSON.stringify(stored)).not.toContain('Integration!23');
  await context.request.post(api + '/auth/logout', { headers: { 'X-XSRF-TOKEN': csrf.token } });
  await page.reload();
  await expect(page.getByLabel('Correo electrónico')).toHaveValue(email);
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('');
  await page.getByLabel('Recordar correo').uncheck();
  await page.reload();
  await expect(page.getByLabel('Correo electrónico')).toHaveValue('');
});
test('rejects invalid credentials and unavailable provider without opening protected UI', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Correo electrónico').fill('missing@example.com');
  await page.getByLabel('Contraseña', { exact: true }).fill('Incorrect!23');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos');
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'Continuar con Google' }).click();
  await expect(page.getByText('El acceso con este proveedor no está disponible', { exact: false })).toBeVisible();
});
test('existing configured account reaches Inicio after backend confirmation', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Correo electrónico').fill('demo@ceroa.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('Demo123!');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hola, Mateo.' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Hola, Mateo.' })).toBeVisible();
});
for (const width of [375, 768, 1440]) {
  test(`registration layout and field errors at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: '¿Aún no tienes una cuenta? Crear cuenta' }).click();
    await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
    await expect(page.getByLabel('Nombre completo')).toBeFocused();
    await expect(page.getByLabel('Nombre completo')).toHaveAttribute('aria-invalid', 'true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/register-${width}.png`, fullPage: true });
  });
}
