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
import java.util.regex.Pattern;

/** Ephemeral user-bound evidence contexts. Model responses never authorize financial writes. */
@Service
public class AssistantService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AssistantService.class);
    public enum Channel { web, telegram }
    private record Audience(UUID user,Channel channel,UUID document) {}
    private record Conversation(UUID user,Channel channel,UUID id) {}
    public record DocumentEvidence(String status,Map<String,RagVectorStore.Chunk> sources) {}
    public enum Intent { debts, highest_interest, upcoming, payments, strategy, progress, write_request, unknown }
    public record Reply(String answer, String intent, List<com.ceroa.api.dto.DocumentContracts.Document> documents, UUID traceId) {
        public Reply(String answer,String intent){this(answer,intent,List.of(),null);}
    }
    private static final ZoneId ZONE = ZoneId.of("America/Bogota");
    private static final Set<String> AUDIO = Set.of("audio/webm", "audio/ogg", "audio/wav", "audio/mpeg", "audio/mp4");
    static class Job {
        final UUID user; final Instant expires = Instant.now().plusSeconds(180);
        volatile Reply result;
        final Map<String,AssistantAnalysisService.Fact> facts=new LinkedHashMap<>();
        final Map<String,AssistantAnalysisService.Evidence> cache=new HashMap<>();
        String question;
        String previousQuestion;
        com.ceroa.api.dto.DocumentContracts.Document selectedDocument;
        int toolCalls;
        int documentCalls;
        final Map<String,RagVectorStore.Chunk> documents=new LinkedHashMap<>();
        RagRetrievalService.Retrieval retrieval;
        com.ceroa.api.dto.DocumentContracts.Result libraryResult;
        com.ceroa.api.dto.DocumentContracts.Intent libraryIntent;
        int libraryCalls;
        boolean hadContentSearch;
        final Map<UUID,com.ceroa.api.dto.DocumentContracts.Document> libraryDocuments=new LinkedHashMap<>();
        Job(UUID user) { this.user = user; }
    }
    private record Turn(String question,String answer) {}
    private record Context(String intent, List<Turn> turns, Instant expires) {}
    private final Map<UUID, Job> jobs = new ConcurrentHashMap<>();
    private final Map<Conversation, Context> history = new ConcurrentHashMap<>();
    private final Map<Audience,UUID> conversations = new ConcurrentHashMap<>();
    private final Map<UUID, List<Instant>> requests = new HashMap<>();
    private final CurrentUserService current;
    private final DebtService debts; private final PaymentService payments;
    private final UpcomingDueService dues; private final StrategyService strategies;
    private final MonthlyProgressService monthly; private final DashboardService dashboard;
    private final ObjectMapper json;
    private final RateNormalizationService rates;
    private final AssistantAnalysisService analysis;
    private final RagRetrievalService rag;
    private final DocumentLibraryService library;
    private final String webhook, key;
    private final boolean enabled;
    public AssistantService(CurrentUserService current, DebtService debts, PaymentService payments,
        UpcomingDueService dues, StrategyService strategies, MonthlyProgressService monthly,
        DashboardService dashboard, ObjectMapper json, RateNormalizationService rates, AssistantAnalysisService analysis, RagRetrievalService rag, DocumentLibraryService library,
        @Value("${ceroa.assistant.enabled:false}") boolean enabled,
        @Value("${ceroa.assistant.webhook-url:}") String webhook,
        @Value("${ceroa.assistant.worker-key:}") String key) {
        this.current=current; this.debts=debts; this.payments=payments; this.dues=dues;
        this.strategies=strategies; this.monthly=monthly; this.dashboard=dashboard;
        this.json=json; this.rates=rates; this.analysis=analysis; this.rag=rag; this.library=library; this.enabled=enabled; this.webhook=webhook; this.key=key;
    }
    public Reply message(String message, String audio, String mime) {
        return message(message,audio,mime,Channel.web);
    }
    public void forget(Channel channel){
        UUID user=current.id();
        conversations.entrySet().removeIf(entry->{
            if(!entry.getKey().user().equals(user)||entry.getKey().channel()!=channel)return false;
            history.remove(new Conversation(user,channel,entry.getValue()));return true;
        });
    }
    public Reply message(String message, String audio, String mime,Channel channel) {
        return message(message,audio,mime,channel,null);
    }
    public Reply message(String message, String audio, String mime,Channel channel,UUID selectedDocumentId) {
        if (!enabled || webhook.isBlank() || key.length()<32) throw unavailable();
        var user=current.entity();
        if (!user.isActive()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        UUID userId=user.getId();
        var audience=new Audience(userId,channel,selectedDocumentId);
        boolean hasText=message!=null && !message.isBlank(), hasAudio=audio!=null && !audio.isBlank();
        if (hasText==hasAudio || (hasText && message.length()>2000)) throw new IllegalArgumentException();
        if (hasAudio) validateAudio(audio,mime);
        com.ceroa.api.dto.DocumentContracts.Document selected=null;
        if(selectedDocumentId!=null){
            selected=library.get(selectedDocumentId);
            if(!"INDEXED".equals(selected.status()))throw new IllegalArgumentException("El documento debe estar indexado antes de conversar sobre su contenido");
        }
        if (selected==null && hasText && message.trim().matches("(?iu)^(?:[¿?]\\s*)?(?:qué|que)\\s+(?:información\\s+)?(?:dice|contiene)\\s+(?:esto|este|esta)(?:\\s+documento)?[?.!\\s]*$"))
            return new Reply("¿A cuál documento te refieres? Indica el nombre del archivo o selecciónalo en la biblioteca para poder describir su contenido.","analysis");
        if (hasText && selected==null) {
            if(isDebtListQuestion(message))return new Reply(render(Intent.debts,null,null),Intent.debts.name());
        }
        UUID id=UUID.randomUUID(); var job=start(userId,id);
        job.selectedDocument=selected;
        var conversation=new Conversation(userId,channel,conversations.computeIfAbsent(audience,a->UUID.randomUUID()));
        job.question=hasText?message:"";
        try {
            LocalDate now=LocalDate.now(ZONE);
            Map<String,Object> input=new LinkedHashMap<>();
            input.put("requestId",id.toString()); input.put("message",hasText?message:"");
            if(selected!=null)input.put("selectedDocument",Map.of("id",selected.id().toString(),"type",selected.documentType(),"entity",selected.financialEntity()==null?"":selected.financialEntity()));
            input.put("audio",hasAudio?audio:""); input.put("mime",hasAudio?mime:"");
            input.put("year",now.getYear()); input.put("month",now.getMonthValue());
            var context=history.get(conversation);
            job.previousQuestion=context!=null&&!context.turns.isEmpty()?context.turns.get(context.turns.size()-1).question:"";
            input.put("ragEnabled",rag.enabled());
            input.put("previousIntent",context!=null && context.expires.isAfter(Instant.now())?context.intent:"");
            input.put("conversation",context!=null && context.expires.isAfter(Instant.now())?context.turns:List.of());
            var request=HttpRequest.newBuilder(URI.create(webhook)).timeout(Duration.ofSeconds(150))
                .header("Content-Type","application/json").header("X-Ceroa-Assistant",key)
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(input))).build();
            var client=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(5)).build();
            var response=client.send(request,HttpResponse.BodyHandlers.discarding());
            if (response.statusCode()!=200 || job.result==null) throw unavailable();
            List<Turn> turns=new ArrayList<>(context!=null && context.expires.isAfter(Instant.now())?context.turns:List.of());
            turns.add(new Turn(contextOnly(job.question),contextOnly(job.result.answer)));
            if(turns.size()>3) turns=new ArrayList<>(turns.subList(turns.size()-3,turns.size()));
            synchronized(this) {
                if(history.size()>=100 && !history.containsKey(conversation)) history.keySet().stream().findFirst().ifPresent(history::remove);
                history.put(conversation,new Context(job.result.intent,List.copyOf(turns),Instant.now().plusSeconds(300)));
            }
            return job.result;
        } catch (InterruptedException e) { Thread.currentThread().interrupt(); throw unavailable();
        } catch (ResponseStatusException e) { throw e;
        } catch (Exception e) { throw unavailable();
        } finally { jobs.remove(id); }
    }
    private boolean isDebtListQuestion(String question) {
        String plain=java.text.Normalizer.normalize(question.toLowerCase(Locale.ROOT),java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{M}","").replaceAll("[^a-z ]"," ").trim().replaceAll("\\s+"," ");
        return plain.matches("(?:que deudas tengo|cuales son mis deudas|que deudas tengo registradas|muestrame mis deudas|dime que deudas tengo|lista mis deudas|listar mis deudas)");
    }
    private String selectedMetadataSummary(com.ceroa.api.dto.DocumentContracts.Document selected) {
        String type=switch(selected.documentType()) {
            case "BANK_STATEMENT" -> "extracto bancario";
            case "PAYMENT_RECEIPT" -> "comprobante de pago";
            case "LOAN_AGREEMENT" -> "contrato de crédito";
            default -> "documento financiero";
        };
        String period=selected.periodStart()!=null&&selected.periodEnd()!=null
            ?" El período registrado va del "+selected.periodStart()+" al "+selected.periodEnd().minusDays(1)+".":"";
        return "Los metadatos indican que es un "+type+(selected.financialEntity()==null?"":" de "+selected.financialEntity())+"."+period;
    }
    private <T> T withJob(UUID id,java.util.function.Function<Job,T> work) {
        var job=jobs.get(id);
        if(job==null || job.expires.isBefore(Instant.now())) throw new ResponseStatusException(HttpStatus.GONE);
        synchronized(job) {
            if(job.result!=null || job.expires.isBefore(Instant.now())) throw new ResponseStatusException(HttpStatus.GONE);
            var previous=SecurityContextHolder.getContext();
            var context=SecurityContextHolder.createEmptyContext();
            context.setAuthentication(new UsernamePasswordAuthenticationToken(job.user.toString(),null,List.of()));
            SecurityContextHolder.setContext(context);
            try {
                if(!current.entity().isActive()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
                return work.apply(job);
            } finally { SecurityContextHolder.setContext(previous); }
        }
    }
    private String contextOnly(String text){
        if(java.util.regex.Pattern.compile("(?iu)\\b(password|contrase[nñ]a|credenciales|secreto|api[ _-]?key|bot[ _-]?token)\\b").matcher(text).find())return "[turno omitido: credenciales no se conservan]";
        int sources=text.indexOf("\n\nFuentes:");if(sources>=0)text=text.substring(0,sources);
        return text.replaceAll("\\p{N}+(?:[.,/\\-]\\p{N}+)*","[dato anterior: consultar de nuevo]");
    }
    public AssistantAnalysisService.Evidence data(UUID id,AssistantAnalysisService.Dataset dataset,int year,int month,int offset) {
        return withJob(id,job->{
            if(job.selectedDocument!=null)throw new IllegalArgumentException("Consulta limitada al documento seleccionado");
            String source=dataset+"/"+year+"/"+month+"/"+offset;
            if(job.cache.containsKey(source)) return job.cache.get(source);
            if(++job.toolCalls>16) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
            var evidence=analysis.evidence(job.facts,analysis.read(dataset,year,month,offset),source);
            job.cache.put(source,evidence); return evidence;
        });
    }
    public AssistantAnalysisService.Evidence calculate(UUID id,AssistantAnalysisService.Operation operation,List<String> refs) {
        return withJob(id,job->{
            if(job.selectedDocument!=null)throw new IllegalArgumentException("Consulta limitada al documento seleccionado");
            if(++job.toolCalls>16) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
            return analysis.calculate(job.facts,operation,refs);
        });
    }
    public record LibrarySnippet(UUID documentId,Integer page,String content) {}
    public record LibraryEvidence(String status, AssistantAnalysisService.Evidence evidence,List<LibrarySnippet> snippets) {}
    public LibraryEvidence financialDocuments(UUID id,com.ceroa.api.dto.DocumentContracts.Query query) {
        return withJob(id,job->{
            if(++job.toolCalls>16||++job.libraryCalls>6)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
            var effective=query;
            if(job.selectedDocument!=null){
                var selected=job.selectedDocument;
                var filters=new com.ceroa.api.dto.DocumentContracts.Filters(null,null,null,null,null,null,selected.id());
                var intent=effective.intent()==com.ceroa.api.dto.DocumentContracts.Intent.METADATA_SEARCH?com.ceroa.api.dto.DocumentContracts.Intent.HYBRID_SEARCH:effective.intent();
                if(intent==com.ceroa.api.dto.DocumentContracts.Intent.STRUCTURED_QUERY||intent==com.ceroa.api.dto.DocumentContracts.Intent.COMBINED_QUERY||intent==com.ceroa.api.dto.DocumentContracts.Intent.PERIOD_ANALYSIS)
                    intent=com.ceroa.api.dto.DocumentContracts.Intent.HYBRID_SEARCH;
                effective=new com.ceroa.api.dto.DocumentContracts.Query(intent,job.question,filters,0,10);
            }
            var result=library.query(effective);
            job.libraryResult=result;
            job.libraryIntent=effective.intent();
            if(effective.intent()!=com.ceroa.api.dto.DocumentContracts.Intent.METADATA_SEARCH)job.hadContentSearch=true;
            for(var document:result.documents())job.libraryDocuments.put(document.id(),document);
            com.fasterxml.jackson.databind.node.ObjectNode minimized=json.valueToTree(result);
            minimized.path("documents").forEach(d->{if(d instanceof com.fasterxml.jackson.databind.node.ObjectNode doc)doc.remove("ownerId");});
            if(job.selectedDocument!=null) {
                var selected=library.get(job.selectedDocument.id());
                if(!selected.status().equals("INDEXED")||selected.version()!=job.selectedDocument.version())throw new IllegalArgumentException("Documento modificado; consulta de nuevo");
                var metadata=minimized.putObject("selectedDocumentMetadata");
                metadata.put("financialEntity",selected.financialEntity());metadata.put("documentType",selected.documentType());
                metadata.put("identificationType",selected.identificationType());
                if(selected.periodStart()!=null)metadata.put("periodStart",selected.periodStart().toString());
                if(selected.periodEnd()!=null)metadata.put("periodEndExclusive",selected.periodEnd().toString());
                if(selected.issuedAt()!=null)metadata.put("issuedAt",selected.issuedAt().toString());
            }
            minimized.remove("sources");
            var values=minimized.putArray("documentValues");
            var literal=Pattern.compile("\\b\\d{4}-\\d{2}-\\d{2}\\b|\\b\\d{2}/\\d{2}/\\d{4}\\b|[+-]?\\$[\\d.,]+|\\b\\d+(?:[.,]\\d+)?\\s*%|\\b\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?\\s*(?:COP|pesos)\\b|\\b\\d+\\s+cuotas?\\b",Pattern.CASE_INSENSITIVE|Pattern.UNICODE_CASE);
            var labeled=Pattern.compile("(?iu)\\b(?:pagos?|pagad[oa]s?|abonos?|intereses?|tasa)\\b[^\\d\\n]{0,35}([+-]?\\d+(?:[.,]\\d+)?)");
            for(var source:result.sources()){
                var captured=new ArrayList<int[]>();
                var match=literal.matcher(source.content());
                while(match.find()&&values.size()<250){
                    captured.add(new int[]{match.start(),match.end()});
                    var value=values.addObject();value.put("documentId",source.documentId().toString());
                    if(source.page()!=null)value.put("page",source.page());
                    value.put("literal",match.group());
                    if(match.group().contains("$")||match.group().matches("(?iu).*\\b(?:COP|pesos)\\b.*")||match.group().contains("%")){
                        BigDecimal number=documentNumber(match.group());if(number!=null)value.put("numericValue",number);
                    }
                }
                var nearby=labeled.matcher(source.content());
                while(nearby.find()&&values.size()<250){
                    if(captured.stream().anyMatch(span->span[0]<=nearby.start(1)&&nearby.end(1)<=span[1]))continue;
                    String raw=nearby.group(1);
                    if(raw.matches("\\d{4}")&&nearby.end(1)<source.content().length()&&source.content().charAt(nearby.end(1))=='-')continue;
                    var value=values.addObject();value.put("documentId",source.documentId().toString());
                    if(source.page()!=null)value.put("page",source.page());
                    value.put("literal",raw);value.put("kindHint",nearby.group().toLowerCase(Locale.ROOT).startsWith("tasa")?"rate":"amount");
                    if(!raw.matches("-?\\d+[,.-]\\d{3}" )||raw.contains(".")){
                        BigDecimal number=documentNumber(raw);if(number!=null)value.put("numericValue",number);
                    }
                }
            }
            var evidence=analysis.evidence(job.facts,minimized,"financialDocuments/"+result.traceId());
            // Give the model one evidence representation, just like the established financial tools.
            // Duplicating raw result fields encouraged literal dates/IDs outside the fID contract.
            return new LibraryEvidence(result.evidenceStatus(),evidence,result.sources().stream().map(source->new LibrarySnippet(source.documentId(),source.page(),source.content())).toList());
        });
    }
    private BigDecimal documentNumber(String literal) {
        String value=literal.replaceAll("[^0-9,.-]","");
        if(value.isEmpty())return null;
        if(value.matches("-?\\d{1,3}(?:\\.\\d{3})+(?:,\\d+)?"))value=value.replace(".","").replace(',','.');
        else if(value.indexOf(',')>=0&&value.indexOf('.')<0)value=value.replace(',','.');
        try{return new BigDecimal(value);}catch(NumberFormatException ignored){return null;}
    }
    public Reply complete(UUID id,String answer,String transcript) {
        return complete(id,answer,transcript,null,List.of());
    }
    public DocumentEvidence documents(UUID id,String query) {
        return withJob(id,job->{
            if(job.selectedDocument!=null)throw new IllegalArgumentException("Consulta limitada al documento seleccionado");
            if(query==null||query.isBlank()||query.length()>4000)throw new IllegalArgumentException();
            if(job.question==null||job.question.isBlank())throw new IllegalArgumentException("Falta preparar la pregunta");
            if(++job.documentCalls>2)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
            // Anchor retrieval to the actual turn. The model cannot broaden an unsupported
            // question into a generic product query to obtain unrelated citations.
            String grounded=contextOnly(job.question);
            if(job.previousQuestion!=null&&!job.previousQuestion.isBlank()&&java.util.regex.Pattern.compile("(?iu)\\b(eso|esa|ese|esas|esos|aquella|aquello)\\b|cu[aá]l (?:estoy|uso|tengo)").matcher(grounded).find())
                grounded="Contexto de la pregunta anterior: "+job.previousQuestion.substring(0,Math.min(1800,job.previousQuestion.length()))+"\nPregunta actual: "+grounded;
            var result=rag.search(grounded);
            // A new snapshot replaces all earlier sources, rather than mixing versions.
            if(job.retrieval!=null&&!Objects.equals(job.retrieval.snapshot(),result.snapshot()))job.documents.clear();
            job.retrieval=result;
            var added=new LinkedHashMap<String,RagVectorStore.Chunk>();
            for(var chunk:result.chunks()){
                String ref=job.documents.entrySet().stream().filter(e->e.getValue().chunkId().equals(chunk.chunkId())).map(Map.Entry::getKey).findFirst().orElse("d"+(job.documents.size()+1));
                job.documents.put(ref,chunk);added.put(ref,chunk);
            }
            return new DocumentEvidence(result.status(),Map.copyOf(added));
        });
    }
    public Reply complete(UUID id,String answer,String transcript,String mode,List<String> sources) {
        final List<String> citations=sources==null?List.of():List.copyOf(sources);
        try { return withJob(id,job->{
            if(transcript==null || transcript.isBlank() || transcript.length()>2000) throw new IllegalArgumentException();
            if(!job.question.isEmpty() && !job.question.equals(transcript)) throw new IllegalArgumentException();
            String resolved;
            if(job.selectedDocument!=null) {
                var selected=library.get(job.selectedDocument.id());
                if(!selected.status().equals("INDEXED")||selected.version()!=job.selectedDocument.version())throw new IllegalArgumentException("Documento modificado; consulta de nuevo");
                resolved=job.libraryResult==null||job.libraryResult.sources().isEmpty()
                    ?"No encontré fragmentos indexados de este archivo para confirmar ese dato. "+selectedMetadataSummary(selected)
                    :analysis.resolve(job.facts,answer);
                job.libraryDocuments.clear();job.libraryDocuments.put(selected.id(),selected);
            }else if(job.libraryResult!=null && job.libraryIntent==com.ceroa.api.dto.DocumentContracts.Intent.METADATA_SEARCH && !job.hadContentSearch) {
                // Metadata lists need no model-generated prose/citations. Only the authenticated,
                // typed database results below become references; ignore proposed LLM citations.
                resolved=job.libraryDocuments.isEmpty()?"No hay documentos que coincidan con los filtros consultados.":"Encontré documentos que coinciden con los filtros consultados. Revisa las referencias adjuntas.";
            }else if(job.libraryResult!=null) {
                // Private documents are already authorized by the library. Public RAG
                // citations from the model must not turn a private follow-up into a 400.
                resolved=analysis.resolve(job.facts,answer);
            }else if(rag.enabled()) {
                if(!Set.of("documentary","personal","mixed").contains(mode==null?"":mode)||citations.size()>8||new HashSet<>(citations).size()!=citations.size())throw new IllegalArgumentException();
                if(!mode.equals("personal")&&job.documentCalls==0)throw new IllegalArgumentException("Falta consultar documentación");
                var used=new ArrayList<RagVectorStore.Chunk>();
                for(String ref:citations){var chunk=job.documents.get(ref);if(chunk==null)throw new IllegalArgumentException("Fuente no recuperada");used.add(chunk);}
                boolean current=!used.isEmpty()&&rag.current(job.retrieval,used.stream().map(RagVectorStore.Chunk::chunkId).toList());
                if(mode.equals("documentary")&&(!current||answer!=null&&answer.contains("No tengo información aprobada suficiente")))resolved=RagRetrievalService.ABSTENTION;
                else {
                    if(!used.isEmpty()&&!current)throw new IllegalArgumentException("Fuentes retiradas; vuelve a consultar");
                    resolved=analysis.resolve(job.facts,answer);
                    if(current)resolved+="\n\nFuentes:\n"+used.stream().map(c->"• "+c.title()+" (versión "+c.version()+", fragmento "+c.chunkId().substring(0,12)+")").distinct().collect(java.util.stream.Collectors.joining("\n"));
                    else if(mode.equals("mixed"))resolved+="\n\n"+RagRetrievalService.ABSTENTION;
                }
            }else resolved=analysis.resolve(job.facts,answer);
            job.question=transcript;
            if(job.libraryResult!=null) {
                var result=job.libraryResult;
                // Revalidate grants and versions before returning evidence to either channel.
                var documents=List.copyOf(job.libraryDocuments.values());
                for(var d:documents){var fresh=library.get(d.id());if(fresh.version()!=d.version()||fresh.status().equals("DELETING"))throw new IllegalArgumentException("Documento modificado; consulta de nuevo");}
                if(!documents.isEmpty())resolved+="\n\nFuentes documentales:\n"+documents.stream().map(d->"• "+d.documentType()+" · "+(d.financialEntity()==null?"Entidad no identificada":d.financialEntity())+" · "+d.id()).collect(java.util.stream.Collectors.joining("\n"));
                if(Set.of("INSUFFICIENT","PARTIAL").contains(result.evidenceStatus()))resolved+="\nNo hay evidencia documental suficiente para responder.";
                job.result=new Reply(resolved,"analysis",documents,result.traceId());
            }else job.result=job.selectedDocument==null?new Reply(resolved,"analysis"):new Reply(resolved,"analysis",List.of(job.selectedDocument),null);
            return job.result;
        }); } catch (IllegalArgumentException error) {
            log.warn("Assistant response validation rejected: {}", error.getMessage());
            throw error;
        }
    }
    public AssistantAnalysisService.Evidence prepare(UUID id,String transcript) {
        return withJob(id,job->{
            if(transcript==null || transcript.isBlank() || transcript.length()>2000) throw new IllegalArgumentException();
            if(!job.question.isEmpty() && !job.question.equals(transcript)) throw new IllegalArgumentException();
            job.question=transcript;
            if(job.cache.containsKey("inputs")) return job.cache.get("inputs");
            var values=json.createObjectNode();
            values.put("notation","Cifras de la pregunta, no datos registrados. Notación colombiana: coma decimal y punto de miles; confirmar si es ambiguo.");
            var amounts=values.putArray("userProvidedNumbers");
            var matcher=java.util.regex.Pattern.compile("(?<![\\p{L}\\p{N}])[-+]?\\d+(?:[.,]\\d+)*(?![\\p{L}\\p{N}])").matcher(transcript);
            while(matcher.find() && amounts.size()<16) {
                String literal=matcher.group(); if(literal.length()>30) continue;
                String normalized=literal;
                if(literal.contains(",")) normalized=literal.replace(".","").replace(",",".");
                else if(literal.matches("[-+]?\\d{1,3}(\\.\\d{3})+")) normalized=literal.replace(".","");
                try {
                    var parsed=new BigDecimal(normalized);
                    var number=amounts.addObject(); number.put("literal",literal); number.put("value",parsed);
                    number.put("isUserAssumption",true);
                } catch(NumberFormatException e) { /* Ambiguous inputs are not usable arithmetic evidence. */ }
            }
            values.put("percentScale",100); values.put("monthsPerYear",12);
            var evidence=analysis.evidence(job.facts,values,"inputs"); job.cache.put("inputs",evidence); return evidence;
        });
    }
    private synchronized void limit(UUID user) {
        Instant now=Instant.now();
        jobs.entrySet().removeIf(e->e.getValue().expires.isBefore(now));
        history.entrySet().removeIf(e->e.getValue().expires.isBefore(now));
        conversations.entrySet().removeIf(e->history.keySet().stream().noneMatch(c->c.user.equals(e.getKey().user)&&c.channel==e.getKey().channel&&c.id.equals(e.getValue()))
            && jobs.values().stream().noneMatch(j->j.user.equals(e.getKey().user)));
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
            case highest_interest -> highestInterest();
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
    private String highestInterest() {
        var active = debts.findAll().stream()
            .filter(d -> d.currentBalance() != null && d.currentBalance().signum() > 0
                && d.status() != com.ceroa.domain.DebtStatus.PAID).toList();
        if (active.isEmpty()) return "No tienes deudas pendientes registradas.";
        var comparable = active.stream().filter(d -> rates.normalize(d.rateType(), d.interestRate()).comparable()).toList();
        if (comparable.isEmpty()) return "No puedo determinar cuál tiene mayor tasa de interés: las tasas registradas necesitan datos adicionales para compararse.";
        var maximum = comparable.stream().map(d -> rates.normalize(d.rateType(), d.interestRate()).comparableAnnualRate())
            .max(BigDecimal::compareTo).orElseThrow();
        var winners = comparable.stream().filter(d -> rates.normalize(d.rateType(), d.interestRate()).comparableAnnualRate().compareTo(maximum) == 0).toList();
        StringBuilder answer = new StringBuilder();
        if (maximum.signum() == 0) answer.append("Todas las deudas comparables tienen una tasa de interés de 0%.\n");
        else answer.append(winners.size() == 1 ? "La deuda con mayor tasa de interés" : "Las deudas empatadas con mayor tasa de interés")
            .append(active.size() != comparable.size() ? " entre las que puedo comparar" : "").append(":\n");
        winners.stream().limit(10).forEach(d -> answer.append(d.name()).append(": ")
            .append(money(d.interestRate())).append("% ").append(d.rateType())
            .append("; equivalente a ").append(money(maximum)).append("% efectivo anual. Saldo: ")
            .append(money(d.currentBalance())).append(".\n"));
        if (winners.size() > 10) answer.append("Mostrando 10 de las ").append(winners.size()).append(" deudas empatadas.\n");
        answer.append("Comparé las tasas en efectivo anual; esto no indica cuál genera el mayor monto de intereses.");
        if (active.size() != comparable.size()) answer.append(" Hay ").append(active.size() - comparable.size())
            .append(" deuda(s) sin tasa comparable o con tasa indexada sin índice disponible; no puedo confirmar un máximo absoluto.");
        return answer.toString();
    }
    private ResponseStatusException unavailable() { return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Asistente no disponible"); }
}
