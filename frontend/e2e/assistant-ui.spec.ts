import { test, expect } from '@playwright/test';
// Isolated UI harness uses the production component and styles, with API fixtures.
test.beforeEach(async ({ page }) => {
  await page.route('**/assistant-ui-test', route => route.fulfill({contentType:'text/html', body:`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => (type) => type; window.__vite_plugin_react_preamble_installed__ = true; import React from '/node_modules/.vite/deps/react.js'; import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js'; const {AssistantFab} = await import('/src/components/assistant/AssistantFab.tsx'); import '/src/index.css'; ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(AssistantFab));</script></body></html>`}));
  await page.goto('/assistant-ui-test');
  await page.getByRole('button',{name:'Abrir asistente financiero'}).click();
});
test('selects a distinct statement and resumes its question by full ID on mobile', async ({page}) => {
 await page.setViewportSize({width:375,height:900});
 const question='¿Qué tasa de interés aparece en el extracto que adjunté?';
 const documents=[
  {id:'f4901971-1111-4111-8111-111111111111',periodStart:'2026-10-01',periodEnd:'2026-11-01'},
  {id:'3235294b-2222-4222-8222-222222222222',periodStart:'2026-09-01',periodEnd:'2026-10-01'},
 ].map(doc=>({...doc,status:'INDEXED',documentType:'BANK_STATEMENT',financialEntity:'Entidad Académica Horizonte',version:1,uploadedAt:'2026-11-24T15:00:00Z'}));
 const requests: Record<string,string>[]=[];
 await page.route('**/api/v1/auth/csrf',route=>route.fulfill({json:{token:'ui-fixture-token'}}));
 await page.route('**/api/v1/assistant/messages',async route=>{
  const body=route.request().postDataJSON();requests.push(body);
  await route.fulfill({json:body.documentId?{answer:'La tasa del extracto seleccionado es 18%.',functionalStatus:'COMPLETE'}:{answer:'Selecciona el extracto que quieres consultar.',functionalStatus:'PARTIAL',documents}});
 });
 await page.getByRole('textbox').fill(question);await page.getByRole('button',{name:'Enviar pregunta'}).click();
 const card=page.getByTestId(`document-card-${documents[1].id}`);
 await expect(card.getByText('septiembre de 2026',{exact:true})).toBeVisible();
 await expect(card.getByText('01/09/2026 al 30/09/2026')).toBeVisible();
 await card.scrollIntoViewIfNeeded();
 expect(await card.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.screenshot({path:'test-results/document-selection-mobile.png'});
 await card.getByRole('button',{name:'Consultar este archivo'}).click();
 await expect(page.getByText('La tasa del extracto seleccionado es 18%.')).toBeVisible();
 expect(requests).toEqual([{message:question},{message:question,documentId:documents[1].id}]);
 await expect(page.getByRole('region',{name:'Archivo seleccionado'})).toHaveAttribute('data-document-id',documents[1].id);
 await page.getByRole('textbox').fill('¿Y la fecha de corte?');await page.getByRole('button',{name:'Enviar pregunta'}).click();
 await expect.poll(()=>requests.length).toBe(3);expect(requests[2].documentId).toBe(documents[1].id);
});
test('lists saved reservations and requests cancellation of the chosen code on mobile',async({page})=>{
 await page.setViewportSize({width:375,height:900});
 const code='RTDKTFGYTSPJSXGLZIFS';const requests:Record<string,string>[]=[];
 await page.route('**/api/v1/auth/csrf',route=>route.fulfill({json:{token:'ui-fixture-token'}}));
 await page.route('**/api/v1/assistant/messages',async route=>{
  const body=route.request().postDataJSON();requests.push(body);
  await route.fulfill({json:body.message==='Cancelar asesoria '+code?{answer:'La cancelación está pendiente de tu confirmación.',functionalStatus:'COMPLETE'}:{answer:'Tus asesorías registradas.\n\nListado para canales de texto.',functionalStatus:'COMPLETE',bookingList:{items:[{code,status:'CONFIRMED',start:'2026-11-25T14:00:00Z',end:'2026-11-25T14:30:00Z',canCancel:true},{code:'ABCDEFGHIJKLMNOPQRST',status:'CANCELLED',start:'2026-11-24T15:00:00Z',end:'2026-11-24T15:30:00Z',canCancel:false}],total:2,nextPage:null}}});
 });
 await page.getByRole('textbox').fill('quiero cancelar una asesoria');await page.getByRole('button',{name:'Enviar pregunta'}).click();
 const list=page.getByRole('region',{name:'Mis asesorías'});
 await expect(list.getByText('Confirmada',{exact:true})).toBeVisible();
 await expect(list.getByRole('button',{name:'Solicitar cancelación'})).toHaveCount(1);
 expect(await list.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 await page.screenshot({path:'test-results/booking-list-mobile.png'});
 await list.getByRole('button',{name:'Solicitar cancelación'}).click();
 await expect(page.getByText('La cancelación está pendiente de tu confirmación.')).toBeVisible();
 expect(requests).toEqual([{message:'quiero cancelar una asesoria'},{message:'Cancelar asesoria '+code}]);
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
