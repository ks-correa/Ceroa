package com.ceroa.service;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import com.fasterxml.jackson.databind.*;
import java.time.*;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
@Service
public class DocumentIngestionService {
    public record Reply(String format,List<String> sheets,boolean requiresSheetSelection,JsonNode draft,List<DocumentDraftValidator.Evidence> evidence,List<String> warnings) {}
    private static class Job {
        final UUID user;final String operation;final UUID debt;final DocumentTextExtractor.Source source;final Instant expires=Instant.now().plusSeconds(150);
        volatile DocumentDraftValidator.Result result;
        Job(UUID user,String operation,UUID debt,DocumentTextExtractor.Source source){this.user=user;this.operation=operation;this.debt=debt;this.source=source;}
    }
    private final CurrentUserService current;private final DebtService debts;private final DocumentTextExtractor extractor;private final DocumentDraftValidator validator;private final ObjectMapper json;
    private final boolean enabled;private final String webhook,key;
    private final Map<UUID,Job> jobs=new ConcurrentHashMap<>();private final Map<UUID,List<Instant>> requests=new HashMap<>();private final Set<UUID> processing=new HashSet<>();
    public DocumentIngestionService(CurrentUserService current,DebtService debts,DocumentTextExtractor extractor,DocumentDraftValidator validator,ObjectMapper json,
        @Value("${ceroa.documents.enabled:false}") boolean enabled,@Value("${ceroa.documents.webhook-url:}") String webhook,@Value("${ceroa.documents.worker-key:}") String key){
        this.current=current;this.debts=debts;this.extractor=extractor;this.validator=validator;this.json=json;this.enabled=enabled;this.webhook=webhook;this.key=key;
    }
    public Reply extract(MultipartFile file,String operation,UUID debtId,String sheet,boolean consent) {
        if(!enabled||webhook.isBlank()||key.length()<32)throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"La lectura de documentos todavía no está disponible.");
        if(!consent)throw new IllegalArgumentException("Autoriza el análisis con Gemini antes de enviar el documento.");
        if(!Set.of("create","update").contains(operation)||operation.equals("create")&&debtId!=null||operation.equals("update")&&debtId==null)throw new IllegalArgumentException("Selecciona una operación válida.");
        var user=current.entity();if(!user.isActive())throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if(debtId!=null)debts.findById(debtId); // Owner validated before touching the uploaded document.
        UUID owner=user.getId();begin(owner);UUID id=UUID.randomUUID();
        try {
            var source=extractor.extract(file,sheet);
            if(source.segments().isEmpty())return new Reply(source.format(),source.sheets(),true,null,List.of(),source.warnings());
            var job=new Job(owner,operation,debtId,source);jobs.put(id,job);
            var body=Map.of("requestId",id.toString(),"schemaVersion","debt-draft-v1","segments",source.segments());
            var request=HttpRequest.newBuilder(URI.create(webhook)).timeout(Duration.ofSeconds(110)).header("Content-Type","application/json").header("X-Ceroa-Documents",key).POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build();
            var response=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(5)).build().send(request,HttpResponse.BodyHandlers.discarding());
            if(response.statusCode()!=200||job.result==null)throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"No pude extraer los datos. Reintenta o completa el registro manualmente.");
            if(!current.entity().isActive())throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            if(debtId!=null)debts.findById(debtId);
            return new Reply(source.format(),source.sheets(),false,job.result.draft(),job.result.evidence(),job.result.warnings());
        } catch(InterruptedException e){Thread.currentThread().interrupt();throw unavailable();}
        catch(ResponseStatusException|IllegalArgumentException e){throw e;}
        catch(Exception e){throw unavailable();}
        finally{jobs.remove(id);synchronized(this){processing.remove(owner);}}
    }
    public void complete(UUID id,JsonNode output) {
        var job=jobs.get(id);if(job==null)throw new ResponseStatusException(HttpStatus.GONE);
        synchronized(job){if(job.result!=null||job.expires.isBefore(Instant.now()))throw new ResponseStatusException(HttpStatus.GONE);
            var previous=org.springframework.security.core.context.SecurityContextHolder.getContext();var context=org.springframework.security.core.context.SecurityContextHolder.createEmptyContext();
            context.setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(job.user.toString(),null,List.of()));
            org.springframework.security.core.context.SecurityContextHolder.setContext(context);
            try{if(!current.entity().isActive())throw new ResponseStatusException(HttpStatus.FORBIDDEN);if(job.debt!=null)debts.findById(job.debt);job.result=validator.validate(output,job.source);}
            finally{org.springframework.security.core.context.SecurityContextHolder.setContext(previous);}
        }
    }
    private synchronized void begin(UUID user){Instant now=Instant.now();requests.values().forEach(v->v.removeIf(t->t.isBefore(now.minusSeconds(60))));requests.entrySet().removeIf(e->e.getValue().isEmpty());
        var times=requests.computeIfAbsent(user,k->new ArrayList<>());if(times.size()>=4||processing.contains(user)||processing.size()>=10)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Espera un minuto antes de cargar otro documento.");times.add(now);processing.add(user);
    }
    private ResponseStatusException unavailable(){return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"No pude analizar el documento. Reintenta o completa los datos manualmente.");}
}
