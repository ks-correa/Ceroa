import { test, expect } from '@playwright/test';
const api = process.env.E2E_API_URL || 'http://localhost:18080/api/v1';
test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('ceroa_onboarding_seen', 'true')); });
for (const width of [375, 768, 1440]) {
  test(`complete recovery over SMTP, PostgreSQL and logout at ${width}px`, async ({ page, context }) => {
    test.skip(!process.env.EP03_SMTP_INBOX, 'Run npm run test:e2e:recovery for local SMTP infrastructure');
    await page.setViewportSize({ width, height: 900 });
    const email = `ep03-${width}-${Date.now()}@example.com`;
    const csrf = await (await context.request.get(api + '/auth/csrf')).json();
    const headers = { 'X-XSRF-TOKEN': csrf.token };
    expect((await context.request.post(api + '/auth/register', { headers, data: {
      fullName: 'Ana García', email, phone: '+573001234567', birthDate: '1990-01-01', password: 'Original!123', confirmPassword: 'Original!123', acceptTerms: true, acceptPrivacy: true
    } })).ok()).toBe(true);
    await page.goto('/');
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
    await page.getByRole('button', { name: 'Solicitar código', exact: true }).click();
    await expect(page.getByLabel('Correo electrónico')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByLabel('Correo electrónico')).toBeFocused();
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByRole('button', { name: 'Solicitar código', exact: true }).click();
    await expect(page.getByLabel('Código de recuperación')).toBeVisible();
    await page.getByRole('button', { name: 'Verificar código', exact: true }).click();
    await expect(page.getByLabel('Código de recuperación')).toHaveAttribute('aria-invalid', 'true');
    let code = '';
    await expect.poll(async () => {
      const response = await context.request.get(process.env.EP03_SMTP_INBOX + '/?email=' + encodeURIComponent(email));
      code = (await response.json()).code || ''; return code.length;
    }, { timeout: 15000 }).toBe(8);
    await page.getByLabel('Código de recuperación').fill(code);
    await page.getByRole('button', { name: 'Verificar código', exact: true }).click();
    await expect(page.getByLabel('Nueva contraseña')).toBeVisible();
    const grant = (await context.cookies(api + '/auth/recovery/reset')).find(c => c.name === 'ceroa_recovery');
    expect(grant?.httpOnly).toBe(true);
    await page.getByLabel('Nueva contraseña').fill('Replacement!123');
    await page.getByLabel('Confirmar contraseña').fill('Different!123');
    await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
    await expect(page.getByLabel('Confirmar contraseña')).toHaveAttribute('aria-invalid', 'true');
    await page.getByLabel('Confirmar contraseña').fill('Replacement!123');
    await page.getByRole('button', { name: 'Mostrar nueva contraseña' }).click();
    await expect(page.getByLabel('Nueva contraseña')).toHaveAttribute('type', 'text');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Capture layout without credentials present in the screenshot.
    await page.getByRole('button', { name: 'Ocultar nueva contraseña' }).click();
    await page.screenshot({ path: `test-results/recovery-${width}.png`, fullPage: true });
    await page.getByRole('button', { name: 'Actualizar contraseña' }).click();
    await expect(page.getByRole('heading', { name: 'Contraseña actualizada' })).toBeVisible();
    await page.getByRole('button', { name: 'Volver a Inicio de sesión' }).click();
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByLabel('Contraseña', { exact: true }).fill('Replacement!123');
    await page.getByLabel('Recordar correo').check();
    await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Configuración financiera inicial' })).toBeVisible();
    const oldSession = (await context.cookies()).find(c => c.name === 'ceroa_session');
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await expect(page.getByLabel('Correo electrónico')).toHaveValue(email);
    await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('');
    expect((await context.request.get(api + '/debts', { headers: { Cookie: `ceroa_session=${oldSession?.value}` } })).status()).toBe(401);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
    const stored = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
    expect(stored).not.toContain('Replacement!123'); expect(stored).not.toContain(code); expect(stored).not.toContain(grant?.value);
  });
}
test('financial view disappears on logout across tabs and back navigation', async ({ page, context }) => {
  await page.goto('/'); await page.getByLabel('Correo electrónico').fill('demo@ceroa.local');
  await page.getByLabel('Contraseña', { exact: true }).fill('Demo123!');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Hola, Mateo.' })).toBeVisible();
  const second = await context.newPage(); await second.goto('/');
  await expect(second.getByRole('heading', { name: 'Hola, Mateo.' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión' }).first().click();
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(second.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  await page.goto('/?screen=dashboard');
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  expect((await context.request.get(api + '/debts')).status()).toBe(401);
});
