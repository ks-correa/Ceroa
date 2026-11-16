package com.ceroa.service;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

/** Additional fail-closed check: an exact number is not proof of its financial meaning. */
final class FinancialClaimGrounding {
    private FinancialClaimGrounding() {}
    private static String normalized(String s) {
        return Normalizer.normalize(s.toLowerCase(Locale.ROOT), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }
    private static String concept(String s) {
        String n=normalized(s);
        var m=Pattern.compile("fecha(?: estimada)? de pago|estimatedPayoffDate|payoffDate|date|presupuesto(?: mensual)?|monthlyBudget|plazo(?: estimado)?|tasa(?:s)? de interes|interestRate|interestSavings|interestDifference|ahorro(?: en intereses)?|diferencia (?:de|en) intereses(?: totales)?|monthsDifference|monthsReduced|meses|months|intereses|interes|interest|basePayment|normalPayment|extraPayment|pago minimo|minimumPayment|saldo|balance|tasa|rate|cuota|installment|monthlyPayment|pagos?|pagaste|pagados?|abonos?|amount|importe|pagina|page|numero de obligacion|cuenta|referencia|priority|prioridad|horario|hora|disponibilidad|asesoria|cita|programad[oa]|agendad[oa]|reserva|propuesta|expira|hasta|fecha|documento|periodo",Pattern.CASE_INSENSITIVE).matcher(n);
        String last="";
        while(m.find())last=switch(m.group().toLowerCase(Locale.ROOT)) {
            case "saldo","balance" -> "balance";
            case "tasa","rate","tasa de interes","tasas de interes","interestrate" -> "rate";
            case "interes","intereses","interest" -> "interest";
            case "interestsavings","interestdifference","ahorro","ahorro en intereses","diferencia de intereses" -> "savings";
            case "monthsdifference","monthsreduced","meses","months","plazo","plazo estimado" -> "months";
            case "presupuesto","presupuesto mensual","monthlybudget" -> "budget";
            case "diferencia en intereses","diferencia en intereses totales","diferencia de intereses totales" -> "savings";
            case "fecha de pago","fecha estimada de pago","date","estimatedpayoffdate","payoffdate" -> "date";
            case "pago minimo","minimumpayment" -> "minimum";
            case "cuota","installment","monthlypayment" -> "installment";
            case "basepayment","normalpayment","extrapayment","pago","pagos","pagaste","pagado","pagados","abono","abonos","amount","importe" -> "payment";
            case "fecha","documento","periodo","horario","hora","disponibilidad","asesoria","cita","programada","programado","agendada","agendado","reserva","propuesta","expira" -> "date";
            case "pagina","page" -> "page";
            case "cuenta","referencia","numero de obligacion" -> "reference";
            case "hasta" -> "date";
            default -> "priority";
        };
        return last;
    }
    static boolean permits(Map<String,AssistantAnalysisService.Fact> facts, AssistantAnalysisService.Fact fact,
                           String answer,int start,int end) {
        return permits(facts,fact,answer,start,end,false);
    }
    private static boolean permits(Map<String,AssistantAnalysisService.Fact> facts, AssistantAnalysisService.Fact fact,
                           String answer,int start,int end,boolean aggregate) {
        if(fact==null||fact.value().isNull())return false;
        String path=fact.source();
        String parent=path.substring(0,Math.max(0,path.lastIndexOf('/')));
        boolean document=path.startsWith("financialDocuments/");
        if(document&&path.matches(".*/(?:context|quote|kindHint|transactionReference)$"))return false;
        if(document&&"RATE".equals(sibling(facts,parent,"kind"))&&
            !DocumentRateMode.consistent(sibling(facts,parent,"rateMode"),sibling(facts,parent,"quote"),sibling(facts,parent,"context")))return false;
        if(path.contains("/verifiedData/analysis/facts/")&&!sibling(facts,parent,"validationStatus").isEmpty()&&
            !sibling(facts,parent,"validationStatus").equals("VERIFIED"))return false;
        int boundary=Math.max(answer.lastIndexOf('\n',start),Math.max(answer.lastIndexOf(';',start),answer.lastIndexOf('.',start)));
        String before=answer.substring(Math.max(boundary+1,start-180),start);
        String claim=concept(before);
        if(path.startsWith("supportBooking/")||path.startsWith("workspaceProposal/"))
            return claim.isEmpty()||claim.equals("date");
        if(!fact.value().isNumber()&&!fact.value().asText().codePoints().anyMatch(Character::isDigit))return true;
        if(path.matches("(?i).*/(?:id|documentId|chunkId|ownerId)$"))return true; // renderer omits internal IDs
        String sourceConcept=concept(path);
        if(path.matches("(?i).*/(?:periodStart|periodEnd|periodEndInclusive|issuedAt|dateValue|periodYear|periodMonth|start|end|expiresAt|dueDate|nextDueDate)$"))sourceConcept="date";
        String context=sibling(facts,parent,"context");
        String kind=sibling(facts,parent,"kind");
        if(path.startsWith("calculation/")) {
            var operands=Arrays.stream(path.substring(path.lastIndexOf('/')+1).split(","))
                .map(facts::get).filter(Objects::nonNull).toList();
            if(operands.isEmpty())return false;
            return operands.stream().allMatch(operand->permits(facts,operand,answer,start,end,true));
        }
        if(!kind.isEmpty())sourceConcept=switch(kind) {
            case "BALANCE" -> "balance"; case "RATE" -> "rate";
            case "MINIMUM_PAYMENT" -> "minimum"; case "INSTALLMENT" -> "installment";
            case "MOVEMENT" -> "payment"; default -> sourceConcept;
        };
        if(!context.isEmpty())sourceConcept=concept(context.split(":",2)[0]);
        if(document&&sourceConcept.equals("page")&&!claim.equals("page"))return false;
        if(document&&sourceConcept.equals("date")&&!claim.isEmpty()&&!claim.equals("date"))return false;
        if(!claim.isEmpty()&&!claim.equals(sourceConcept)) {
            // Masked account identifiers are display evidence, never balances or arithmetic.
            if(!(claim.equals("reference")&&fact.value().asText().matches("\\*{2,4}\\d+")))return false;
        }
        int stop=answer.indexOf(';',end);if(stop<0)stop=answer.indexOf('\n',end);if(stop<0)stop=answer.length();
        String line=answer.substring(Math.max(boundary+1,start-16),Math.min(stop,end+12));
        String normalizedLine=normalized(before+" "+line);
        String lineModes=(normalizedLine.contains("efectiva anual")?" EA":"")+(normalizedLine.contains("efectiva mensual")?" EM":"")+(normalizedLine.contains("nominal anual")?" NAMV":"")+(normalizedLine.contains("nominal mensual")?" NMV":"");
        String effectiveLine=line+lineModes;
        if(!document) {
            String rateType=sibling(facts,parent,"rateType");
            if(!rateType.isEmpty()&&sourceConcept.equals("rate")) {
                for(String token:List.of("EA","EM","MV","NMV","NAMV")) {
                    var p=Pattern.compile("(?i)(?<![a-z])"+token+"(?![a-z])");
                    if(p.matcher(effectiveLine).find()&&!p.matcher(rateType).find())return false;
                }
            }
            return true;
        }
        if(path.endsWith("/numericValue")&&path.contains("/verifiedData/analysis/")&&
            !sibling(facts,parent,"validationStatus").equals("VERIFIED"))return false;
        if(path.contains("/documentValues/")&&(path.endsWith("/literal")||path.endsWith("/numericValue"))) {
            if(sourceConcept.isEmpty()&&!(claim.equals("reference")&&fact.value().asText().matches("\\*{2,4}\\d+")))return false;
            if(claim.isEmpty()&&!aggregate)return false;
            if(!context.isEmpty()&&!normalized(context).matches("(?s)^(?:saldo|tasa|pago|abono|interes|cuota|pagina|cuenta|referencia).*"))return false;
            if(normalized(context).matches("(?s).*(?:ignora|instrucciones|system prompt|ignore previous|prompt injection).*"))return false;
        }
        String quote=sibling(facts,parent,"quote");
        String rateMode=sibling(facts,parent,"rateMode");
        if(sourceConcept.equals("rate")) {
            if(rateMode.isEmpty())rateMode=DocumentRateMode.unique(context+" "+quote);
            // Legacy retrieval may quote a percentage without naming its modality.
            // It cannot assert one, and typed RATE facts still require it above.
            if(rateMode==null) {
                if(!DocumentRateMode.modes(context+" "+quote).isEmpty()||!DocumentRateMode.modes(effectiveLine).isEmpty())return false;
            }else if(!DocumentRateMode.consistent(rateMode,context,quote,effectiveLine))return false;
        }
        String unit=context+" "+quote+" "+sibling(facts,parent,"currency");
        for(String token:List.of("COP","USD","EUR")) {
            var p=Pattern.compile("(?i)(?<![a-z])"+token+"(?![a-z])");
            if(p.matcher(effectiveLine).find()&&!p.matcher(unit).find())return false;
        }
        String documentId=sibling(facts,parent,"documentId");
        boolean periodMatches=false;
        if(!documentId.isEmpty()&&!aggregate) {
            String period=facts.values().stream().filter(f->f.source().contains("/documents/")&&f.source().endsWith("/id")&&f.value().asText().equals(documentId))
                .map(f->sibling(facts,f.source().substring(0,f.source().lastIndexOf('/')),"periodStart")).findFirst().orElse("");
            var months=List.of("enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre");
            String n=normalized(before);
            int month=-1,latest=-1;
            for(int i=0;i<months.size();i++)if(n.lastIndexOf(months.get(i))>latest){latest=n.lastIndexOf(months.get(i));month=i+1;}
            if(month!=-1) {
                if(period.length()<7||Integer.parseInt(period.substring(5,7))!=month)return false;
                periodMatches=facts.values().stream().filter(f->f.source().contains("/documents/")&&f.source().endsWith("/periodStart")&&f.value().asText().equals(period)).count()==1;
            }
        }
        // A bare document value cannot be attributed to a selected period/file when
        // multiple independent sources were supplied. Require the typed query path.
        if(!aggregate&&path.contains("/documentValues/")&&!claim.equals("page")&&!claim.equals("reference")) {
            long documents=facts.values().stream().filter(f->f.source().endsWith("/documentId"))
                .map(f->f.value().asText()).distinct().count();
            if(documents>1&&!periodMatches)return false;
        }
        return true;
    }
    private static String sibling(Map<String,AssistantAnalysisService.Fact> facts,String parent,String field) {
        return facts.values().stream().filter(f->f.source().equals(parent+"/"+field))
            .map(f->f.value().asText()).findFirst().orElse("");
    }
    static void arithmetic(Map<String,AssistantAnalysisService.Fact> facts,List<String> refs,AssistantAnalysisService.Operation operation) {
        refs=leaves(facts,refs,0);
        var currencies=new HashSet<String>();
        boolean documents=false;
        for(String ref:refs) {
            var fact=facts.get(ref);if(fact==null)throw new IllegalArgumentException("Hecho inexistente");
            if(!fact.source().startsWith("financialDocuments/"))continue;
            documents=true;
            String parent=fact.source().substring(0,fact.source().lastIndexOf('/'));
            String context=sibling(facts,parent,"context");
            String field=concept(context.split(":",2)[0]);
            if(!Set.of("payment","balance","minimum","installment").contains(field))throw new IllegalArgumentException("Operando documental sin concepto monetario verificable");
            var currency=Pattern.compile("(?i)\\b(COP|USD|EUR)\\b").matcher(context);
            if(!currency.find())throw new IllegalArgumentException("Moneda documental no especificada");
            currencies.add(currency.group().toUpperCase(Locale.ROOT));
        }
        if(documents&&(currencies.size()!=1||operation==AssistantAnalysisService.Operation.multiply||operation==AssistantAnalysisService.Operation.divide||
            refs.stream().anyMatch(ref->!facts.get(ref).source().startsWith("financialDocuments/"))))
            throw new IllegalArgumentException("Aritmética documental incompatible; utiliza el análisis tipado");
    }
    private static List<String> leaves(Map<String,AssistantAnalysisService.Fact> facts,List<String> refs,int depth) {
        if(depth>20)throw new IllegalArgumentException("Demasiados cálculos encadenados");
        var result=new ArrayList<String>();
        for(String ref:refs) {
            var f=facts.get(ref);
            if(f!=null&&f.source().startsWith("calculation/"))result.addAll(leaves(facts,Arrays.asList(f.source().substring(f.source().lastIndexOf('/')+1).split(",")),depth+1));
            else result.add(ref);
            if(result.size()>1000)throw new IllegalArgumentException("Demasiados operandos");
        }
        return result;
    }
}
