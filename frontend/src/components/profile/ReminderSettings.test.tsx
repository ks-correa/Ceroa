// @vitest-environment jsdom
import {render,screen,fireEvent,waitFor,cleanup} from '@testing-library/react';
import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
import {ReminderSettings} from './ReminderSettings';
import {apiRequest} from '../../services/api';
vi.mock('../../services/api',()=>({apiRequest:vi.fn()}));
const settings={enabled:true,linked:true,plus:true,reminders:false,briefing:false,cadence:'WEEKLY',hour:8,timezone:'America/Bogota'};
describe('ReminderSettings',()=>{
  afterEach(cleanup);
  beforeEach(()=>vi.resetAllMocks());
  it('requires separate explicit consent and saves the chosen schedule',async()=>{
    vi.mocked(apiRequest).mockResolvedValueOnce(settings).mockResolvedValueOnce([]).mockResolvedValueOnce({...settings,reminders:true,briefing:true,hour:9});
    render(<ReminderSettings/>);expect(apiRequest).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Configurar avisos'}));
    const reminder=await screen.findByRole('checkbox',{name:/Autorizo recordatorios/});expect((reminder as HTMLInputElement).checked).toBe(false);fireEvent.click(reminder);fireEvent.click(screen.getByRole('checkbox',{name:/Autorizo recibir/}));
    fireEvent.change(screen.getByLabelText('Hora de Colombia'),{target:{value:'9'}});fireEvent.click(screen.getByRole('button',{name:'Guardar preferencias'}));
    await screen.findByText('Preferencias guardadas.');expect(apiRequest).toHaveBeenLastCalledWith('/integrations/telegram/reminders',{method:'PUT',body:JSON.stringify({reminders:true,briefing:true,cadence:'WEEKLY',hour:9})});
  });
  it('blocks Plus features and distinguishes confirmed from ambiguous delivery',async()=>{
    vi.mocked(apiRequest).mockResolvedValueOnce({...settings,plus:false}).mockResolvedValueOnce([{id:'one',kind:'REMINDER',status:'AMBIGUOUS',attempts:1,sentAt:null},{id:'two',kind:'BRIEFING',status:'SENT',attempts:1,sentAt:'2026-09-27T08:00:00-05:00'}]);
    render(<ReminderSettings/>);fireEvent.click(screen.getByRole('button',{name:'Configurar avisos'}));
    expect((await screen.findByRole('checkbox',{name:/Autorizo recordatorios/}) as HTMLInputElement).disabled).toBe(true);expect(screen.getByText('Entrega sin confirmar')).toBeTruthy();expect(screen.getByText(/Enviado/)).toBeTruthy();
  });
  it('does not claim success when saving fails',async()=>{
    vi.mocked(apiRequest).mockResolvedValueOnce(settings).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('Servicio no disponible'));
    render(<ReminderSettings/>);fireEvent.click(screen.getByRole('button',{name:'Configurar avisos'}));fireEvent.click(await screen.findByRole('button',{name:'Guardar preferencias'}));
    await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Servicio no disponible'));expect(screen.queryByText('Preferencias guardadas.')).toBeNull();
  });
});
