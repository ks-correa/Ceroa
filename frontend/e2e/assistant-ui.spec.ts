import { test, expect } from '@playwright/test';
// Isolated UI harness uses the production component and styles, with API fixtures.
test.beforeEach(async ({ page }) => {
  await page.route('**/assistant-ui-test', route => route.fulfill({contentType:'text/html', body:`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true; import React from '/node_modules/.vite/deps/react.js'; import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js'; const {AssistantFab} = await import('/src/components/assistant/AssistantFab.tsx'); import '/src/index.css'; ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(AssistantFab));</script></body></html>`}));
  await page.goto('/assistant-ui-test');
  await page.getByRole('button',{name:'Abrir asistente financiero'}).click();
});
for (const width of [375,768,1440]) {
 test(`assistant geometry and controls at ${width}`, async ({page}) => {
  await page.setViewportSize({width,height:900});
  const panel=page.getByRole('region',{name:'Asistente financiero'});
  await expect(panel).toBeVisible();
  await page.waitForTimeout(250);
  let rect=(await panel.boundingBox())!;
  expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.y).toBeGreaterThanOrEqual(0);
  expect(rect.x+rect.width).toBeLessThanOrEqual(width+1);expect(rect.y+rect.height).toBeLessThanOrEqual(901);
  await expect(page.getByRole('textbox')).toBeInViewport();
  await expect(page.getByRole('button',{name:'Grabar audio'})).toBeInViewport();
  expect(await panel.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await page.getByRole('textbox').fill('Draft preserved');
  if(width<640){expect(rect.width).toBe(width);expect(rect.height).toBe(900);await expect(page.locator('.assistant-resize')).toHaveCount(0);}
  else {
   const corner=page.locator('.assistant-resize-corner');const box=(await corner.boundingBox())!;
   const before=rect.width;
   await page.mouse.move(box.x+10,box.y+10);await page.mouse.down();await page.mouse.move(box.x-100,box.y-80,{steps:12});await page.mouse.up();
   await page.waitForTimeout(250);rect=(await panel.boundingBox())!;expect(rect.width).toBeGreaterThan(before);
   const resized=rect.width;
   await page.getByRole('button',{name:'Maximizar ventana'}).click();await page.waitForTimeout(250);
   expect((await panel.boundingBox())!.width).toBe(width-32);
   await page.getByRole('button',{name:/Restaurar/}).click();await page.waitForTimeout(250);
   expect((await panel.boundingBox())!.width).toBe(resized);
   const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('ceroa.assistant.size')!));expect(Object.keys(stored).sort()).toEqual(['height','width']);
  }
  await page.getByRole('button',{name:'Cerrar asistente'}).click();await page.waitForTimeout(220);
  await page.getByRole('button',{name:'Abrir asistente financiero'}).click();await expect(page.getByRole('textbox')).toHaveValue('Draft preserved');
  await page.waitForTimeout(250);
  await page.screenshot({path:`test-results/assistant-${width}.png`});
  await page.setViewportSize({width:320,height:568});await page.waitForTimeout(250);
  rect=(await panel.boundingBox())!;expect(rect.width).toBe(320);expect(rect.height).toBe(568);
 });
}
