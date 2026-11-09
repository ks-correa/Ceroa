package com.ceroa.service;

import java.util.*;

/** Runtime capabilities; every operation additionally requires a backend request-scoped grant. */
public final class AgentContracts {
    private AgentContracts() {}
    public enum Role { ORCHESTRATOR, FINANCIAL, RAG, SUPPORT }
    public enum Intent { FINANCIAL, KNOWLEDGE, UNKNOWN, DOCUMENT_SINGLE, DOCUMENT_PERIOD, DOCUMENT_COMPARISON, SUPPORT, COMPOSITE }
    public record Budget(int maxIterations,int maxToolCalls,int maxLibraryCalls,int maxContextCharacters,int deadlineMs) {}
    public record Context(String schemaVersion,UUID requestId,UUID correlationId,Intent intent,Budget budget,Map<Role,List<String>> tools,String authorization) {}
    public static List<String> capabilities(Role role){return switch(role){
        case ORCHESTRATOR -> List.of("delegate.financial","delegate.rag","delegate.support");
        case FINANCIAL -> List.of("finance.read","finance.calculate","finance.simulate","documents.facts","communications.propose");
        case RAG -> List.of("documents.facts","documents.retrieve","knowledge.approved");
        case SUPPORT -> List.of("knowledge.approved","support.propose","communications.propose","support.booking","support.external");
    };}
    public static Intent intent(String question,boolean selected){
        if(selected)return Intent.DOCUMENT_SINGLE;
        String q=java.text.Normalizer.normalize(question==null?"":question.toLowerCase(Locale.ROOT),java.text.Normalizer.Form.NFD).replaceAll("\\p{M}","");
        if(q.matches("(?s).*(extracto|documento|archivo).*")){
            if(q.contains("compara")||q.contains("diferencia"))return Intent.DOCUMENT_COMPARISON;
            if(q.contains("mes")||q.contains("periodo")||q.contains("extractos"))return Intent.DOCUMENT_PERIOD;
            return Intent.DOCUMENT_SINGLE;
        }
        var roles=selectedRoles(question,false);
        if(roles.size()>1)return Intent.COMPOSITE;
        if(roles.equals(Set.of(Role.SUPPORT)))return Intent.SUPPORT;
        if(roles.equals(Set.of(Role.RAG)))return Intent.KNOWLEDGE;
        if(roles.isEmpty())return Intent.UNKNOWN;
        return Intent.FINANCIAL;
    }
    /** Conservative lexical routing, not an authorization substitute. Unknown turns cannot acquire tools. */
    public static String routingQuestion(String question,String previous,boolean selected){
        return previous!=null&&!previous.isBlank()&&selectedRoles(question,selected).isEmpty()&&java.util.regex.Pattern.compile("(?iu)\\b(eso|esa|ese|esas|esos|entonces)\\b|y ahora").matcher(question==null?"":question).find()?previous+"\n"+question:question;
    }
    public static Set<Role> selectedRoles(String question,boolean selected){
        if(selected)return Set.of(Role.RAG);
        String q=java.text.Normalizer.normalize(question==null?"":question.toLowerCase(Locale.ROOT),java.text.Normalizer.Form.NFD).replaceAll("\\p{M}","")
            .replaceAll("\\b(?:no necesito|no quiero|sin necesidad de)\\b[^.;!?]*","");
        boolean document=q.matches("(?s).*\\b(extractos?|documentos?|archivos?)\\b.*");
        boolean operational=q.matches("(?s).*(registrar (?:un |el |una |la )?(?:pago|obligacion)|soporte|ayuda con (?:la|mi) cuenta|asesoria|\\bcita\\b|contrasena|iniciar sesion|navegacion|suscripcion|\\bmcp\\b).*" );
        boolean concept=q.matches("(?s).*(concepto|bola de nieve|avalancha|que es |que significa|como funciona).*" );
        boolean personal=q.matches("(?s).*(\\bmis? (?:deudas|obligaciones|finanzas|pagos|vencimientos|saldos|estrategias)|obligaciones registradas|datos financieros actuales).*" );
        boolean finance=q.matches("(?s).*(saldo|deuda|obligacion|tasa|pago|capacidad|estrategia|ingreso|gasto|financial|finance|analysis).*" );
        var roles=EnumSet.noneOf(Role.class);
        if(document||concept)roles.add(Role.RAG);
        if(operational)roles.add(Role.SUPPORT);
        if(!operational&&!document&&(personal||finance&&!concept))roles.add(Role.FINANCIAL);
        if(personal&&concept&&!document)roles.add(Role.FINANCIAL);
        if(personal&&operational&&q.matches("(?s).*(analiza|interpreta|contrasta|compara|saldo).*"))roles.add(Role.FINANCIAL);
        if(operational&&!concept&&!document)roles.remove(Role.RAG);
        return Collections.unmodifiableSet(roles);
    }
    public static Budget budget(Intent intent){return switch(intent){
        case FINANCIAL,KNOWLEDGE,UNKNOWN,SUPPORT -> new Budget(4,8,3,16000,60000);
        case DOCUMENT_SINGLE -> new Budget(6,10,4,30000,90000);
        case DOCUMENT_PERIOD -> new Budget(8,14,6,90000,150000);
        case DOCUMENT_COMPARISON,COMPOSITE -> new Budget(10,16,6,90000,150000);
    };}
    public static Context context(UUID id,String question,boolean selected){
        var intent=intent(question,selected);
        var tools=new EnumMap<Role,List<String>>(Role.class);var roles=selectedRoles(question,selected);
        tools.put(Role.ORCHESTRATOR,roles.stream().map(r->"delegate."+r.name().toLowerCase(Locale.ROOT)).toList());
        for(var role:roles)tools.put(role,selected?List.of("documents.facts","documents.retrieve"):capabilities(role));
        return new Context("1.1",id,id,intent,budget(intent),tools,"BACKEND_REVALIDATES_EACH_CALL; CONTEXT_IS_NOT_A_BEARER_CREDENTIAL");
    }
}
