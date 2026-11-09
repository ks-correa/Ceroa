package com.ceroa.service;

import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Request-scoped operational counters. No prompts, evidence, user IDs or provider secrets. */
public final class AssistantTrace {
    public record WorkerObservation(String executionId,long agentElapsedMs,int modelCallsLowerBound,Integer iterations,Integer toolActions) {}
    private final UUID id;private final long started=System.nanoTime();
    private final Map<String,Long> stages=new LinkedHashMap<>();
    private final Map<String,WorkerObservation> workers=new LinkedHashMap<>();
    private final Set<UUID> retrievalTraceIds=new LinkedHashSet<>();
    private Map<String,Object> agents=Map.of();
    private String functionalStatus;
    public synchronized void outcome(String value){functionalStatus=value;}
    public synchronized void agents(Map<String,Object> value){agents=value;}
    private int cacheHits,fragments,contextCharacters,documents,errors;
    public AssistantTrace(UUID id){this.id=id;}
    public synchronized void stage(String name,long nanos){stages.merge(name,nanos/1_000_000,Long::sum);}
    public synchronized void cached(){cacheHits++;}
    public synchronized void delivered(int characters){contextCharacters+=characters;}
    public synchronized void retrieved(int docs,int parts,int characters){documents+=docs;fragments+=parts;contextCharacters+=characters;}
    public synchronized void error(){errors++;}
    public synchronized void retrievalTrace(UUID trace){if(trace!=null)retrievalTraceIds.add(trace);}
    public synchronized void worker(WorkerObservation observation){
        if(observation.executionId()==null||!observation.executionId().matches("[A-Za-z0-9_-]{1,80}")||observation.agentElapsedMs()<0||observation.agentElapsedMs()>240000||observation.modelCallsLowerBound()<0||observation.modelCallsLowerBound()>32||observation.iterations()!=null&&(observation.iterations()<0||observation.iterations()>32)||observation.toolActions()!=null&&(observation.toolActions()<0||observation.toolActions()>64))throw new IllegalArgumentException("Métrica inválida");
        if(!workers.containsKey(observation.executionId())&&workers.size()>=4)throw new IllegalArgumentException();
        workers.putIfAbsent(observation.executionId(),observation);
    }
    public synchronized Map<String,Object> snapshot(String route){
        var result=new LinkedHashMap<String,Object>();result.put("requestId",id);result.put("route",route);result.put("totalMs",(System.nanoTime()-started)/1_000_000);
        result.put("stagesMs",Map.copyOf(stages));result.put("springHandlingMs",Math.max(0,(System.nanoTime()-started)/1_000_000-stages.getOrDefault("n8nRoundTrip",0L))+stages.getOrDefault("backendTools",0L));result.put("cacheHits",cacheHits);result.put("documents",documents);result.put("fragments",fragments);result.put("contextCharacters",contextCharacters);result.put("errors",errors);
        result.put("functionalStatus",functionalStatus);result.put("multiagent",agents);result.put("workerObservations",List.copyOf(workers.values()));result.put("retrievalTraceIds",List.copyOf(retrievalTraceIds));result.put("llmCalls",null);result.put("modelDurationMs",null);result.put("measurementNote","Native agent aggregate is measured; exact provider calls, retries and model-only durations require provider trace data. Null means unobserved, never zero.");return result;
    }
    public void log(org.slf4j.Logger log,ObjectMapper json,String route){try{log.info("CEROA_QUERY_METRICS {}",json.writeValueAsString(snapshot(route)));}catch(Exception ignored){log.warn("CEROA_QUERY_METRICS serialization failed");}}
}
