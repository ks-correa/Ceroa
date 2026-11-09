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
    private static final java.util.regex.Pattern FOLLOW_UP = java.util.regex.Pattern.compile(
        "(?iu)\\b(eso|esa|ese|esas|esos|aquel|aquella|aquello|entonces|anterior|anteriores)\\b"
        + "|\\b(?:la|el)\\s+(?:primera?|segunda?|tercera?|otra|otro|misma|mismo)(?:\\s+(?:opci[oó]n|alternativa|estrategia|deuda|obligaci[oó]n|punto|caso))?\\b"
        + "|\\b(?:primera|segunda|tercera)\\s+(?:opci[oó]n|alternativa|estrategia)\\b"
        + "|\\b(?:expl[ií]came|detalla|ampl[ií]a|profundiza|aclara)\\s+(?:mejor|m[aá]s)\\b"
        + "|^\\s*[¿?]?\\s*y\\s+(?:cu[aá]l|qu[eé]|c[oó]mo|cu[aá]ndo|cu[aá]nto|d[oó]nde|por\\s+qu[eé]|si|la|el|las|los|en)\\b"
        + "|\\b(?:m[aá]s\\s+pr[oó]xim[oa]|cu[aá]l\\s+de\\s+(?:ellas|ellos|las\\s+dos|los\\s+dos))\\b"
        + "|y\\s+ahora");
    private static final java.util.regex.Pattern AMBIGUOUS_OPTION = java.util.regex.Pattern.compile(
        "(?iu).*\\b(?:(?:la|el)\\s+(?:primera?|segunda?|tercera?)(?:\\s+(?:opci[oó]n|alternativa))?|(?:primera|segunda|tercera)\\s+(?:opci[oó]n|alternativa)|esa\\s+(?:opci[oó]n|alternativa))\\b.*");
    private static String normalize(String text){
        return java.text.Normalizer.normalize(text==null?"":text.toLowerCase(Locale.ROOT),java.text.Normalizer.Form.NFD).replaceAll("\\p{M}","");
    }
    public static boolean isFollowUp(String question){
        return question!=null&&FOLLOW_UP.matcher(question).find();
    }
    public static boolean requiresContextualClarification(String question,String previous){
        if(question==null||question.isBlank()||!selectedRoles(question,false).isEmpty()||!isFollowUp(question))return false;
        if(previous==null||previous.isBlank())return true;
        if(AMBIGUOUS_OPTION.matcher(question).matches()){
            String prev=normalize(previous);
            return !prev.matches("(?s).*(?:opci|alternativa|bola de nieve|avalancha|plan(?:es)?\\s+cero|ceroa\\s+plus|diferencia|compar).*");
        }
        return false;
    }
    public static Intent intent(String question,boolean selected){
        if(selected)return Intent.DOCUMENT_SINGLE;
        var roles=selectedRoles(question,false);
        if(roles.size()>1)return Intent.COMPOSITE;
        if(roles.equals(Set.of(Role.SUPPORT)))return Intent.SUPPORT;
        String q=normalize(question);
        if(q.matches("(?s).*\\b(extractos?|documentos?|archivos?|pdfs?)\\b.*")){
            if(q.contains("compara")||q.contains("diferencia"))return Intent.DOCUMENT_COMPARISON;
            if(q.contains("mes")||q.contains("periodo")||q.contains("extractos"))return Intent.DOCUMENT_PERIOD;
            return Intent.DOCUMENT_SINGLE;
        }
        if(roles.equals(Set.of(Role.RAG)))return Intent.KNOWLEDGE;
        if(roles.isEmpty())return Intent.UNKNOWN;
        return Intent.FINANCIAL;
    }
    /** Conservative lexical routing, not an authorization substitute. Unknown turns cannot acquire tools. */
    public static String routingQuestion(String question,String previous,boolean selected){
        return previous!=null&&!previous.isBlank()&&selectedRoles(question,selected).isEmpty()&&isFollowUp(question)?previous+"\n"+question:question;
    }
    public static Set<Role> selectedRoles(String question,boolean selected){
        if(selected)return Set.of(Role.RAG);
        String q=normalize(question)
            .replaceAll("\\b(?:no necesito|no quiero|no busco|sin necesidad de|sin consultar|no me expliques)\\b[^.;!?]*","");
        boolean document=q.matches("(?s).*\\b(extractos?|documentos?|archivos?|pdfs?)\\b.*");
        boolean operational=q.matches("(?s).*("
            + "registr(?:ar|o|e|as|an|amos)\\s+(?:un |el |una |la |mis |las |los )?(?:pagos?|obligaciones?|deudas?|abonos?)"
            + "|(?:como|donde|pasos para|manera de|forma de|quiero saber como|explicame como)\\s+(?:se\\s+|puedo\\s+)?(?:registr\\w*|agreg\\w*|cre\\w*|anad\\w*|carg\\w*|sub\\w*|edit\\w*|modific\\w*|actualiz\\w*|elimin\\w*|borr\\w*)\\s+(?:un |el |una |la |mis |las |los )?(?:pagos?|obligaciones?|deudas?|abonos?|extractos?|documentos?|archivos?)"
            + "|(?:como\\s+funciona|para\\s+que\\s+sirve|como\\s+se\\s+usa|como\\s+uso|como\\s+utiliz\\w*)\\s+(?:el\\s+|la\\s+)?(?:simulador|seccion\\s+simular|biblioteca|centinela)"
            + "|\\bplan(?:es)?\\s+cero\\b|\\bceroa\\s+plus\\b|(?:diferencias?|compar\\w*)\\s+entre\\s+(?:el\\s+|los\\s+)?plan(?:es)?"
            + "|soporte|ayuda con (?:la|mi) cuenta|asesori\\w*|\\bcitas?\\b|contrasen\\w*|iniciar sesion|cerrar sesion|navegacion|suscripcion\\w*|\\bmcp\\b"
            + ").*");
        boolean concept=q.matches("(?s).*(concepto|bola de nieve|avalancha|amortizacion|(?:que es |que significa|como se interpreta)(?![^.;!?]*(?:plan cero|ceroa plus|simulador|asesoria|soporte|cuenta))).*")
            ||(q.matches("(?s).*como funciona.*")&&!operational);
        boolean personal=q.matches("(?s).*(\\bmis? (?:deudas?|obligaciones?|finanzas|pagos?|vencimientos?|saldos?|estrategias?|capacidad|progreso|ingresos?|gastos?)\\b|(?:obligaciones?|deudas?|pagos?|saldos?|vencimientos?)\\s+registrad[oa]s?|datos financieros actuales|(?:mas\\s+proxim[oa]|cual|que)\\s+(?:a\\s+)?venc(?:er|e|en)).*");
        boolean finance=q.matches("(?s).*(saldo|deuda|obligacion|tasa|pago|capacidad|estrategia|ingreso|gasto|vencimiento|vencer|vence|vencen|priorizar|financial|finance|analysis).*");
        var roles=EnumSet.noneOf(Role.class);
        if(document||concept)roles.add(Role.RAG);
        if(operational)roles.add(Role.SUPPORT);
        if(!operational&&!document&&(personal||finance&&!concept))roles.add(Role.FINANCIAL);
        if(personal&&concept&&!document)roles.add(Role.FINANCIAL);
        if(personal&&document&&!operational)roles.add(Role.FINANCIAL);
        if(personal&&operational&&q.matches("(?s).*(analiza|interpreta|contrasta|compara|saldo|vencimiento|vencer).*"))roles.add(Role.FINANCIAL);
        if(operational&&!concept&&(!document||q.matches("(?s).*(?:como|donde)\\s+(?:se\\s+|puedo\\s+)?(?:carg\\w*|sub\\w*|elimin\\w*|borr\\w*).*")))roles.remove(Role.RAG);
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
