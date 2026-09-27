package com.ceroa.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.net.http.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.math.BigDecimal;

/** Ephemeral user-bound read contexts. No user credentials or financial data persist in n8n. */
@Service
public class AssistantService {
    public enum Intent { debts, upcoming, payments, strategy, progress, write_request, unknown }
    public record Reply(String answer, String intent) {}
    private static final ZoneId ZONE = ZoneId.of("America/Bogota");
    private static final Set<String> AUDIO = Set.of("audio/webm", "audio/ogg", "audio/wav", "audio/mpeg", "audio/mp4");
    static class Job {
        final UUID user; final Instant expires = Instant.now().plusSeconds(120);
        volatile Reply result;
        Job(UUID user) { this.user = user; }
    }
    private record Context(Reply reply, Instant expires) {}
    private final Map<UUID, Job> jobs = new ConcurrentHashMap<>();
    private final Map<UUID, Context> history = new ConcurrentHashMap<>();
    private final Map<UUID, List<Instant>> requests = new HashMap<>();
    private final CurrentUserService current;
    private final DebtService debts; private final PaymentService payments;
    private final UpcomingDueService dues; private final StrategyService strategies;
    private final MonthlyProgressService monthly; private final DashboardService dashboard;
    private final ObjectMapper json;
    private final String webhook, key;
    private final boolean enabled;
    public AssistantService(CurrentUserService current, DebtService debts, PaymentService payments,
        UpcomingDueService dues, StrategyService strategies, MonthlyProgressService monthly,
        DashboardService dashboard, ObjectMapper json,
        @Value("${ceroa.assistant.enabled:false}") boolean enabled,
        @Value("${ceroa.assistant.webhook-url:}") String webhook,
        @Value("${ceroa.assistant.worker-key:}") String key) {
        this.current=current; this.debts=debts; this.payments=payments; this.dues=dues;
        this.strategies=strategies; this.monthly=monthly; this.dashboard=dashboard;
        this.json=json; this.enabled=enabled; this.webhook=webhook; this.key=key;
    }
    public Reply message(String message, String audio, String mime) {
        if (!enabled || webhook.isBlank() || key.length()<32) throw unavailable();
        var user=current.entity();
        if (!user.isActive()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        UUID userId=user.getId();
        boolean hasText=message!=null && !message.isBlank(), hasAudio=audio!=null && !audio.isBlank();
        if (hasText==hasAudio || (hasText && message.length()>2000)) throw new IllegalArgumentException();
        if (hasAudio) validateAudio(audio,mime);
        UUID id=UUID.randomUUID(); var job=start(userId,id);
        try {
            LocalDate now=LocalDate.now(ZONE);
            Map<String,Object> input=new LinkedHashMap<>();
            input.put("requestId",id.toString()); input.put("message",hasText?message:"");
            input.put("audio",hasAudio?audio:""); input.put("mime",hasAudio?mime:"");
            input.put("year",now.getYear()); input.put("month",now.getMonthValue());
            var context=history.get(userId);
            input.put("previousIntent",context!=null && context.expires.isAfter(Instant.now())?context.reply.intent:"");
            var request=HttpRequest.newBuilder(URI.create(webhook)).timeout(Duration.ofSeconds(90))
                .header("Content-Type","application/json").header("X-Ceroa-Assistant",key)
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input))).build();
            var client=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(5)).build();
            var response=client.send(request,HttpResponse.BodyHandlers.discarding());
            if (response.statusCode()!=200 || job.result==null) throw unavailable();
            history.put(userId,new Context(job.result,Instant.now().plusSeconds(300)));
            return job.result;
        } catch (InterruptedException e) { Thread.currentThread().interrupt(); throw unavailable();
        } catch (ResponseStatusException e) { throw e;
        } catch (Exception e) { throw unavailable();
        } finally { jobs.remove(id); }
    }
    private synchronized void limit(UUID user) {
        Instant now=Instant.now();
        jobs.entrySet().removeIf(e->e.getValue().expires.isBefore(now));
        history.entrySet().removeIf(e->e.getValue().expires.isBefore(now));
        requests.values().forEach(v->v.removeIf(t->t.isBefore(now.minusSeconds(60))));
        requests.entrySet().removeIf(e->e.getValue().isEmpty());
        var times=requests.computeIfAbsent(user,u->new ArrayList<>());
        if (times.size()>=5 || jobs.values().stream().anyMatch(j->j.user.equals(user)) || jobs.size()>=100)
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
        times.add(now);
    }
    private synchronized Job start(UUID user,UUID id) {
        limit(user); var job=new Job(user); jobs.put(id,job); return job;
    }
    private void validateAudio(String audio,String mime) {
        if (!AUDIO.contains(mime) || audio.length()>5_600_000) throw new IllegalArgumentException();
        byte[] b=Base64.getDecoder().decode(audio);
        if (b.length<12 || b.length>4*1024*1024) throw new IllegalArgumentException();
        boolean valid=switch(mime) {
            case "audio/webm" -> b[0]==0x1a && b[1]==0x45 && b[2]==(byte)0xdf && b[3]==(byte)0xa3;
            case "audio/ogg" -> new String(b,0,4,java.nio.charset.StandardCharsets.US_ASCII).equals("OggS");
            case "audio/wav" -> new String(b,0,4,java.nio.charset.StandardCharsets.US_ASCII).equals("RIFF") && new String(b,8,4,java.nio.charset.StandardCharsets.US_ASCII).equals("WAVE");
            case "audio/mp4" -> new String(b,4,4,java.nio.charset.StandardCharsets.US_ASCII).equals("ftyp");
            case "audio/mpeg" -> (b[0]=='I' && b[1]=='D' && b[2]=='3') || (b[0]==(byte)0xff && (b[1]&0xe0)==0xe0);
            default -> false;
        };
        if (!valid) throw new IllegalArgumentException();
    }
    /** Worker cannot supply a user ID, URL or mutation. Only a live context and closed intent. */
    public Reply query(UUID id, Intent intent, Integer year, Integer month) {
        var job=jobs.get(id);
        if (job==null || job.expires.isBefore(Instant.now())) throw new ResponseStatusException(HttpStatus.GONE);
        synchronized(job) {
            if (job.result!=null) return job.result;
            var previous=SecurityContextHolder.getContext();
            var context=SecurityContextHolder.createEmptyContext();
            context.setAuthentication(new UsernamePasswordAuthenticationToken(job.user.toString(),null,List.of()));
            SecurityContextHolder.setContext(context);
            try {
                if (!current.entity().isActive()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
                job.result=new Reply(render(intent,year,month),intent.name());
                return job.result;
            } finally { SecurityContextHolder.setContext(previous); }
        }
    }
    private String money(BigDecimal value) { return value==null?"no disponible":value.toPlainString(); }
    private String render(Intent intent,Integer year,Integer month) {
        return switch(intent) {
            case debts -> {
                var list=debts.findAll();
                if(list.isEmpty()) yield "No tienes deudas registradas.";
                StringBuilder b=new StringBuilder("Tu saldo total registrado es "+money(dashboard.getSummary().totalRegisteredDebt())+".\n");
                list.stream().limit(10).forEach(d->b.append(d.name()).append(": saldo ").append(money(d.currentBalance())).append(".\n"));
                if(list.size()>10)b.append("Mostrando 10 obligaciones; consulta el listado completo en Ceroa.");
                yield b.toString().trim();
            }
            case upcoming -> {
                var list=dues.getUpcomingDues();
                if(list.isEmpty())yield "No hay próximos vencimientos registrados.";
                StringBuilder b=new StringBuilder("Próximos vencimientos:\n");
                list.stream().limit(10).forEach(d->b.append(d.debtName()).append(": ").append(d.dueDate()).append(", monto exigible ").append(money(d.amount())).append(".\n"));
                if(list.size()>10)b.append("Mostrando los primeros 10 vencimientos.");
                yield b.toString().trim();
            }
            case payments -> {
                var list=payments.findAll(null);
                if(list.isEmpty())yield "No tienes pagos registrados.";
                StringBuilder b=new StringBuilder("Pagos registrados:\n");
                list.stream().sorted(Comparator.comparing(com.ceroa.api.dto.PaymentResponse::date).reversed()).limit(10)
                    .forEach(p->b.append(p.debtName()).append(": ").append(money(p.amount())).append(" el ").append(p.date()).append(".\n"));
                if(list.size()>10)b.append("Mostrando los 10 pagos más recientes.");
                yield b.toString().trim();
            }
            case strategy -> {
                var s=strategies.getActiveStrategy();
                yield "Tu estrategia activa es "+(s.activeStrategy()==com.ceroa.domain.StrategyType.SNOWBALL?"Bola de Nieve":"Avalancha")+". "+(s.statusReason()==null?"":s.statusReason());
            }
            case progress -> {
                var now=LocalDate.now(ZONE);
                int y=year==null?now.getYear():year, m=month==null?now.getMonthValue():month;
                if(y<1900 || y>2100 || m<1 || m>12)throw new IllegalArgumentException();
                var p=monthly.get(y,m);
                yield "Progreso de "+y+"-"+String.format("%02d",m)+": deuda inicial "+money(p.openingDebt())+", deuda final "+money(p.closingDebt())+", pagos registrados "+money(p.totalPaid())+". Estado: "+p.status()+".";
            }
            case write_request -> "Las modificaciones necesitan revisión y confirmación explícita. Este asistente solo permite consultas por ahora; registra o modifica la información desde el formulario de Ceroa.";
            case unknown -> "Puedo consultar tus deudas, próximos vencimientos, pagos, estrategia activa o progreso mensual. ¿Qué deseas consultar?";
        };
    }
    private ResponseStatusException unavailable() { return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Asistente no disponible"); }
}
