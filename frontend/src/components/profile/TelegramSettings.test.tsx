// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiRequest } from '../../services/api';
import { TelegramSettings } from './TelegramSettings';
vi.mock('../../services/api',()=>({apiRequest:vi.fn()}));
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();});
afterEach(cleanup);
it('requires consent and only displays the private invitation returned by the server',async()=>{
  vi.mocked(apiRequest).mockResolvedValueOnce({enabled:true,linked:false,botUsername:'Ceroa_bot',linkedAt:null})
    .mockResolvedValueOnce({url:'https://t.me/Ceroa_bot?start=one-use-code',expiresAt:'2099-01-01'});
  render(<TelegramSettings/>);expect(apiRequest).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Configurar Telegram'}));
  const create=await screen.findByRole('button',{name:'Crear enlace de vinculación'});
  expect(create.hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(create);
  const link=await screen.findByRole('link',{name:'Abrir Telegram y vincular mi cuenta'});
  expect(link.getAttribute('href')).toBe('https://t.me/Ceroa_bot?start=one-use-code');
  expect(apiRequest).toHaveBeenLastCalledWith('/integrations/telegram',{method:'POST',body:JSON.stringify({consent:true})});
  expect(localStorage.length).toBe(0);
});
it('revokes a binding through the authenticated API and refreshes its state',async()=>{
  vi.mocked(apiRequest).mockResolvedValueOnce({enabled:true,linked:true,botUsername:'Ceroa_bot',linkedAt:'2026-09-27'})
    .mockResolvedValueOnce(undefined).mockResolvedValueOnce({enabled:true,linked:false,botUsername:'Ceroa_bot',linkedAt:null});
  render(<TelegramSettings/>);fireEvent.click(screen.getByRole('button',{name:'Configurar Telegram'}));
  fireEvent.click(await screen.findByRole('button',{name:'Desvincular Telegram'}));
  await waitFor(()=>expect(apiRequest).toHaveBeenCalledWith('/integrations/telegram',{method:'DELETE'}));
  await screen.findByRole('button',{name:'Crear enlace de vinculación'});
  expect(screen.queryByRole('link')).toBeNull();
});
