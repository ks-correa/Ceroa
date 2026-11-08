package com.ceroa.service;

import java.util.*;

/** Runtime capabilities; every operation additionally requires a backend request-scoped grant. */
public final class AgentContracts {
    private AgentContracts() {}
    public enum Role { ORCHESTRATOR, FINANCIAL, RAG, SUPPORT }
    public enum Intent { FINANCIAL, DOCUMENT_SINGLE, DOCUMENT_PERIOD, DOCUMENT_COMPARISON, SUPPORT, COMPOSITE }
    public record Budget(int maxIterations,int maxToolCalls,int maxLibraryCalls,int maxContextCharacters,int deadlineMs) {}
    public record Context(String schemaVersion,UUID requestId,UUID correlationId,Intent intent,Budget budget,Map<Role,List<String>> tools,String authorization) {}
    public static List<String> capabilities(Role role){return switch(role){
        case ORCHESTRATOR -> List.of("delegate.financial","delegate.rag","delegate.support");
        case FINANCIAL -> List.of("finance.read","finance.calculate","finance.simulate","documents.facts");
        case RAG -> List.of("documents.facts","documents.retrieve","knowledge.approved");
        case SUPPORT -> List.of("knowledge.approved","support.propose");
    };}
    public static Intent intent(String question,boolean selected){
        if(selected)return Intent.DOCUMENT_SINGLE;
        String q=java.text.Normalizer.normalize(question==null?"":question.toLowerCase(Locale.ROOT),java.text.Normalizer.Form.NFD).replaceAll("\\p{M}","");
        if(q.matches("(?s).*(extracto|documento|archivo).*")){
            if(q.contains("compara")||q.contains("diferencia"))return Intent.DOCUMENT_COMPARISON;
            if(q.contains("mes")||q.contains("periodo")||q.contains("extractos"))return Intent.DOCUMENT_PERIOD;
            return Intent.DOCUMENT_SINGLE;
        }
        if(q.matches("(?s).*(soporte|ayuda con la cuenta|asesoria|cita).*"))return Intent.SUPPORT;
        return Intent.FINANCIAL;
    }
    public static Budget budget(Intent intent){return switch(intent){
        case FINANCIAL,SUPPORT -> new Budget(4,8,3,16000,60000);
        case DOCUMENT_SINGLE -> new Budget(6,10,4,30000,90000);
        case DOCUMENT_PERIOD -> new Budget(8,14,6,90000,150000);
        case DOCUMENT_COMPARISON,COMPOSITE -> new Budget(10,16,6,90000,150000);
    };}
    public static Context context(UUID id,String question,boolean selected){
        var intent=intent(question,selected);
        Map<Role,List<String>> tools=selected?Map.of(Role.ORCHESTRATOR,List.of("delegate.rag"),Role.RAG,List.of("documents.facts","documents.retrieve")):
            Map.of(Role.ORCHESTRATOR,capabilities(Role.ORCHESTRATOR),Role.FINANCIAL,capabilities(Role.FINANCIAL),Role.RAG,capabilities(Role.RAG),Role.SUPPORT,capabilities(Role.SUPPORT));
        return new Context("1.1",id,id,intent,budget(intent),tools,"BACKEND_REVALIDATES_EACH_CALL; CONTEXT_IS_NOT_A_BEARER_CREDENTIAL");
    }
}
