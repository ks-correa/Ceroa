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
        var m=Pattern.compile("pago minimo|minimumPayment|saldo|balance|tasa|rate|cuota|installment|monthlyPayment|pagos?|pagaste|pagados?|abonos?|amount|importe|pagina|page|cuenta|referencia|obligacion|prioridad|fecha|documento|periodo",Pattern.CASE_INSENSITIVE).matcher(n);
        String last="";
        while(m.find())last=switch(m.group().toLowerCase(Locale.ROOT)) {
            case "saldo","balance" -> "balance";
            case "tasa","rate" -> "rate";
            case "pago minimo","minimumpayment" -> "minimum";
            case "cuota","installment","monthlypayment" -> "installment";
            case "pago","pagos","pagaste","pagado","pagados","abono","abonos","amount","importe" -> "payment";
            case "fecha","documento","periodo" -> "date";
            case "pagina","page" -> "page";
            case "cuenta","referencia","obligacion" -> "reference";
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
        if(!fact.value().isNumber()&&!fact.value().asText().codePoints().anyMatch(Character::isDigit))return true;
        String path=fact.source();
        if(path.matches("(?i).*/(?:id|documentId|chunkId|ownerId)$"))return true; // renderer omits internal IDs
        int boundary=Math.max(answer.lastIndexOf('\n',start),Math.max(answer.lastIndexOf(';',start),answer.lastIndexOf('.',start)));
        String before=answer.substring(Math.max(boundary+1,start-180),start);
        String claim=concept(before);
        boolean document=path.startsWith("financialDocuments/");
        if(document&&path.matches(".*/(?:context|quote|kindHint|transactionReference)$"))return false;
        String sourceConcept=concept(path);
        if(path.matches("(?i).*/(?:periodStart|periodEnd|periodEndInclusive|issuedAt|dateValue|periodYear|periodMonth)$"))sourceConcept="date";
        String parent=path.substring(0,Math.max(0,path.lastIndexOf('/')));
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
        if(!document)return true;
        if(path.endsWith("/numericValue")&&path.contains("/verifiedData/analysis/")&&
            !sibling(facts,parent,"validationStatus").equals("VERIFIED"))return false;
        if(path.contains("/documentValues/")&&(path.endsWith("/literal")||path.endsWith("/numericValue"))) {
            if(sourceConcept.isEmpty()&&!(claim.equals("reference")&&fact.value().asText().matches("\\*{2,4}\\d+")))return false;
            if(claim.isEmpty()&&!aggregate)return false;
            if(!context.isEmpty()&&!normalized(context).matches("(?s)^(?:saldo|tasa|pago|abono|interes|cuota|pagina|cuenta|referencia).*"))return false;
            if(normalized(context).matches("(?s).*(?:ignora|instrucciones|system prompt|ignore previous|prompt injection).*"))return false;
        }
        int stop=answer.indexOf(';',end);if(stop<0)stop=answer.indexOf('\n',end);if(stop<0)stop=answer.length();
        String line=answer.substring(Math.max(boundary+1,start-16),Math.min(stop,end+12));
        String unit=context+" "+sibling(facts,parent,"currency")+" "+sibling(facts,parent,"rateMode");
        for(String token:List.of("COP","USD","EUR","EA","EM","MV","NMV","NAMV")) {
            var p=Pattern.compile("(?i)(?<![a-z])"+token+"(?![a-z])");
            if(p.matcher(line).find()&&!p.matcher(unit).find())return false;
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
