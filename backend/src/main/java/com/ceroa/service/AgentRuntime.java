package com.ceroa.service;

import java.util.*;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Ephemeral grants belong to one authenticated request, never to a model-selected user. */
public final class AgentRuntime {
    public record Task(String task,List<String> evidenceRefs) {}
    public record AdvisoryProposal(String status,String topic,String availability) {}
    public record Result(String schemaVersion,AgentContracts.Role role,String status,String answer,List<String> evidenceRefs,
                         List<String> sources,String coverage,List<String> missingData,boolean requiresConfirmation,
                         UUID requestId,UUID correlationId,AdvisoryProposal advisoryProposal,boolean requiresClarification,String errorCode,Map<String,Object> metrics) {
        public Result(String schemaVersion,AgentContracts.Role role,String status,String answer,List<String> evidenceRefs,List<String> sources,String coverage,List<String> missingData,boolean requiresConfirmation){this(schemaVersion,role,status,answer,evidenceRefs,sources,coverage,missingData,requiresConfirmation,null,null,null,false,null,Map.of());}
    }
    public record Grant(UUID requestId,UUID correlationId,AgentContracts.Role role,UUID scopeToken,String task,
                        int maxIterations,long remainingMs,int maxContextCharacters,Result cached,
                        Map<String,AssistantAnalysisService.Fact> evidence,String channel,List<String> capabilities,
                        String schemaVersion,AgentContracts.Budget budget) {}
    static final class Scope {
        final UUID token=UUID.randomUUID(); final AgentContracts.Role role; final String task; final Set<String> issued=new HashSet<>();
        final long started=System.nanoTime(); final int iterations; int calls; long toolNanos; int characters;
        final Map<String,Integer> tools=new LinkedHashMap<>();
        boolean partial; Result result; long elapsedMs;
        Scope(AgentContracts.Role role,String task,int iterations,Collection<String> refs){this.role=role;this.task=task;this.iterations=iterations;issued.addAll(refs);}
    }
    private final UUID requestId; private final Instant deadline; private final AgentContracts.Budget budget;
    private final Map<UUID,Scope> scopes=new LinkedHashMap<>(); private final Map<String,Scope> tasks=new HashMap<>();
    private final Set<String> partialRefs=new HashSet<>();
    private final Set<String> shared=new HashSet<>(),initial=new HashSet<>(); private int reserved=6,cacheHits,characters;
    public AgentRuntime(UUID id,AgentContracts.Budget budget,Collection<String> initial){requestId=id;this.budget=budget;deadline=Instant.now().plusMillis(budget.deadlineMs());shared.addAll(initial);this.initial.addAll(initial);}
    public Grant begin(AgentContracts.Role role,Task input,boolean selected){
        checkTime();
        if(role==AgentContracts.Role.ORCHESTRATOR||selected&&role!=AgentContracts.Role.RAG)throw denied();
        if(input==null||input.task()==null||input.task().isBlank()||input.task().length()>2000)throw new IllegalArgumentException("Tarea inválida");
        var refs=input.evidenceRefs()==null?List.<String>of():List.copyOf(input.evidenceRefs());
        if(role==AgentContracts.Role.SUPPORT&&!refs.isEmpty())throw denied();
        if(refs.size()>100||!shared.containsAll(refs))throw denied();
        String key=role+":"+input.task().strip().replaceAll("\\s+"," ")+":"+new TreeSet<>(refs);
        var existing=tasks.get(key);
        if(existing!=null){if(existing.result==null)throw new ResponseStatusException(HttpStatus.CONFLICT,"Delegación en curso");cacheHits++;return grant(existing);}
        int iterations=role==AgentContracts.Role.SUPPORT?3:4;
        if(scopes.size()>=4||reserved+iterations>22)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Presupuesto de delegación agotado");
        reserved+=iterations;var scope=new Scope(role,input.task(),iterations,refs);scope.partial=refs.stream().anyMatch(partialRefs::contains);if(role!=AgentContracts.Role.SUPPORT)scope.issued.addAll(initial);scopes.put(scope.token,scope);tasks.put(key,scope);return grant(scope);
    }
    private Grant grant(Scope s){long remaining=Math.max(0,java.time.Duration.between(Instant.now(),deadline).toMillis());return new Grant(requestId,requestId,s.role,s.token,s.task,s.iterations,remaining,budget.maxContextCharacters(),s.result,Map.of(),"",List.of(),"1.1",new AgentContracts.Budget(s.iterations,Math.min(8,budget.maxToolCalls()),budget.maxLibraryCalls(),Math.max(0,budget.maxContextCharacters()-characters),(int)remaining));}
    Grant context(Grant g,Map<String,AssistantAnalysisService.Fact> facts,String channel,List<String> capabilities){
        var evidence=new LinkedHashMap<String,AssistantAnalysisService.Fact>();var scope=scopes.get(g.scopeToken());
        for(String ref:scope.issued)if(facts.containsKey(ref))evidence.put(ref,facts.get(ref));
        return new Grant(g.requestId(),g.correlationId(),g.role(),g.scopeToken(),g.task(),g.maxIterations(),g.remainingMs(),g.maxContextCharacters(),g.cached(),Map.copyOf(evidence),channel,List.copyOf(capabilities),g.schemaVersion(),g.budget());
    }
    Scope scope(UUID token){checkTime();var s=scopes.get(token);if(s==null||s.result!=null)throw denied();return s;}
    void authorize(Scope s,String capability){
        checkTime();boolean allowed=switch(s.role){
            case FINANCIAL -> Set.of("finance.read","finance.calculate","finance.simulate","documents.facts","communications.propose").contains(capability);
            case RAG -> Set.of("documents.facts","documents.retrieve","knowledge.approved").contains(capability);
            case SUPPORT -> Set.of("knowledge.approved","communications.propose").contains(capability);
            default -> false;
        };
        if(!allowed)throw denied();if(++s.calls>8)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);s.tools.merge(capability,1,Integer::sum);
    }
    void delivered(Scope s,int size){if(size<0||characters+size>budget.maxContextCharacters())throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Contexto global agotado");characters+=size;s.characters+=size;}
    Result complete(Scope s,Result result){
        if(result==null||!"1.1".equals(result.schemaVersion())||result.role()!=s.role||!Set.of("OK","PARTIAL","INSUFFICIENT","FAILED").contains(result.status())||result.answer()==null||result.answer().isBlank()||result.answer().length()>10000||result.evidenceRefs()==null||result.sources()==null||result.missingData()==null||result.missingData().size()>12||!Set.of("COMPLETE","PARTIAL","NONE").contains(result.coverage()))throw new IllegalArgumentException("Resultado de agente inválido");
        var declared=new HashSet<String>(result.evidenceRefs());declared.addAll(result.sources());
        if(new HashSet<>(result.evidenceRefs()).size()!=result.evidenceRefs().size()||new HashSet<>(result.sources()).size()!=result.sources().size())throw new IllegalArgumentException("Referencias duplicadas");
        if(result.evidenceRefs().stream().anyMatch(r->r==null||!r.matches("f[1-9][0-9]*"))||result.sources().stream().anyMatch(r->r==null||!r.matches("d[1-8]"))||result.missingData().stream().anyMatch(x->x==null||x.length()>200))throw new IllegalArgumentException("Referencias inválidas");
        if(declared.size()>100||!s.issued.containsAll(declared))throw denied();
        var m=java.util.regex.Pattern.compile("\\{\\{(f[0-9]+)}}").matcher(result.answer());while(m.find())if(!result.evidenceRefs().contains(m.group(1)))throw denied();
        if(s.partial&&result.coverage().equals("COMPLETE"))throw new IllegalArgumentException("La cobertura recuperada es parcial");
        if(s.role==AgentContracts.Role.SUPPORT&&result.answer().matches("(?is).*(meet\\.google|calendar\\.google|cita (?:confirmada|reservada)|reuni[oó]n (?:confirmada|reservada)).*"))throw new IllegalArgumentException("Solo se permiten propuestas de asesoría");
        var proposal=result.advisoryProposal();
        if(proposal!=null&&(s.role!=AgentContracts.Role.SUPPORT||!"PROPOSED".equals(proposal.status())||!result.requiresConfirmation()||proposal.topic()==null||proposal.topic().isBlank()||proposal.topic().length()>500||proposal.availability()!=null&&proposal.availability().length()>300))throw new IllegalArgumentException("Propuesta de asesoría inválida");
        s.elapsedMs=(System.nanoTime()-s.started)/1_000_000;
        s.result=new Result(result.schemaVersion(),s.role,result.status(),result.answer(),List.copyOf(result.evidenceRefs()),List.copyOf(result.sources()),result.coverage(),List.copyOf(result.missingData()),result.requiresConfirmation(),requestId,requestId,proposal,result.requiresClarification(),result.status().equals("FAILED")?"SPECIALIST_UNAVAILABLE":null,Map.of("elapsedMs",s.elapsedMs,"toolCalls",s.calls,"tools",Map.copyOf(s.tools),"toolMs",s.toolNanos/1_000_000,"contextCharacters",s.characters));
        shared.addAll(declared);if(!result.coverage().equals("COMPLETE"))partialRefs.addAll(declared);return s.result;
    }
    Result fail(Scope s){s.partial=true;return complete(s,new Result("1.1",s.role,"FAILED","No fue posible completar esta parte de la consulta.",List.of(),List.of(),"NONE",List.of("SPECIALIST_UNAVAILABLE"),false));}
    void validateShared(String answer,List<String> sources){var m=java.util.regex.Pattern.compile("\\{\\{(f[0-9]+)}}").matcher(answer==null?"":answer);while(m.find())if(!shared.contains(m.group(1)))throw denied();if(sources!=null&&!shared.containsAll(sources))throw denied();}
    public boolean limited(){return scopes.values().stream().anyMatch(s->s.result==null||!s.result.status().equals("OK")||!s.result.coverage().equals("COMPLETE"));}
    private Map<String,Object> scopeMetrics(Scope s){
        var metrics=new LinkedHashMap<String,Object>();metrics.put("role",s.role);metrics.put("status",s.result==null?"INCOMPLETE":s.result.status());metrics.put("elapsedMs",s.result==null?(System.nanoTime()-s.started)/1_000_000:s.elapsedMs);
        metrics.put("toolCalls",s.calls);metrics.put("tools",Map.copyOf(s.tools));metrics.put("toolMs",s.toolNanos/1_000_000);metrics.put("contextCharacters",s.characters);
        metrics.put("llmCalls",null);metrics.put("iterations",null);metrics.put("providerRetries",null);return Collections.unmodifiableMap(metrics);
    }
    public Map<String,Object> metrics(){return Map.of("delegations",scopes.size(),"delegationCacheHits",cacheHits,"maxDepth",scopes.isEmpty()?0:1,"reservedIterations",reserved,"agents",scopes.values().stream().map(this::scopeMetrics).toList());}
    private void checkTime(){if(!Instant.now().isBefore(deadline))throw new ResponseStatusException(HttpStatus.GONE,"Plazo de delegación agotado");}
    static ResponseStatusException denied(){return new ResponseStatusException(HttpStatus.FORBIDDEN,"Herramienta fuera del alcance delegado");}
}
