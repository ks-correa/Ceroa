package com.ceroa.service;

import com.ceroa.api.dto.DocumentContracts.Document;
import com.ceroa.api.dto.DocumentFactContracts.*;
import java.math.BigDecimal;
import java.util.*;

/** Documentary arithmetic only. No canonical balance, interest or registered payment updates. */
public final class DocumentFactAnalysis {
    private DocumentFactAnalysis() {}
    public static Kind requestedKind(String question){
        String q=java.text.Normalizer.normalize(question==null?"":question.toLowerCase(Locale.ROOT),java.text.Normalizer.Form.NFD).replaceAll("\\p{M}","");
        var kinds=new LinkedHashSet<Kind>();
        if(q.matches(".*\\bsaldos?\\b.*"))kinds.add(Kind.BALANCE);
        if(q.contains("pago minimo")||q.contains("pagos minimos"))kinds.add(Kind.MINIMUM_PAYMENT);
        if(q.matches(".*\\bcuotas?\\b.*"))kinds.add(Kind.INSTALLMENT);
        if(q.matches(".*\\btasas?\\b.*"))kinds.add(Kind.RATE);
        if(q.matches(".*\\bmovimientos?\\b.*"))kinds.add(Kind.MOVEMENT);
        return kinds.size()==1?kinds.iterator().next():null;
    }
    public static Analysis analyze(List<Document> documents,List<Fact> input,Map<UUID,UUID> debts,Kind requested){
        var docs=new HashMap<UUID,Document>();for(var d:documents)docs.put(d.id(),d);
        // Defensive against stale caches and out-of-scope repository adapters.
        var facts=input.stream().filter(f->docs.containsKey(f.documentId())&&docs.get(f.documentId()).version()==f.documentVersion()&&(requested==null||f.kind()==requested)).toList();
        var limitations=new LinkedHashSet<String>();var differences=new ArrayList<Difference>();
        if(requested==null)limitations.add("EXPLICIT_SINGLE_FIELD_REQUIRED_FOR_COMPLETE_ANALYSIS");
        if(documents.isEmpty())limitations.add("NO_DOCUMENTS");
        record Group(UUID owner,UUID debt,Kind kind,String unit,String currency,String mode){}
        var groups=new LinkedHashMap<Group,List<Fact>>();
        for(var d:documents){
            if(!"INDEXED".equals(d.status()))limitations.add("DOCUMENT_NOT_INDEXED");
            var matching=facts.stream().filter(f->f.documentId().equals(d.id())&&(requested==null||f.kind()==requested)).toList();
            if(matching.isEmpty())limitations.add("MISSING_FACTS");
            if(matching.stream().anyMatch(f->!f.validationStatus().equals("VERIFIED")))limitations.add("UNVERIFIED_VALUES");
            if(d.periodStart()==null||d.periodEnd()==null)limitations.add("UNKNOWN_DOCUMENT_PERIOD");
            if(requested==Kind.MOVEMENT)limitations.add("MOVEMENT_COVERAGE_IS_A_SUBSET");
            if(requested==null||requested==Kind.MOVEMENT)continue;
            var numeric=matching.stream().filter(f->f.validationStatus().equals("VERIFIED")&&f.numericValue()!=null).toList();
            if(numeric.size()!=1){limitations.add("MISSING_OR_AMBIGUOUS_FIELD");continue;}
            var f=numeric.getFirst();var debt=debts.get(d.id());
            if(debt==null){if(documents.size()>1)limitations.add("OBLIGATION_LINK_REQUIRED_FOR_COMPARISON");continue;}
            if(f.unit().equals("MONEY")&&f.currency()==null||f.kind()==Kind.RATE&&f.rateMode()==null){limitations.add("UNKNOWN_UNIT");continue;}
            groups.computeIfAbsent(new Group(d.ownerId(),debt,f.kind(),f.unit(),f.currency(),f.rateMode()),k->new ArrayList<>()).add(f);
        }
        for(var entry:groups.entrySet()){
            var values=entry.getValue();values.removeIf(f->docs.get(f.documentId()).periodStart()==null||docs.get(f.documentId()).periodEnd()==null);
            values.sort(Comparator.comparing(f->docs.get(f.documentId()).periodStart()));
            // Duplicate/overlapping periods are ambiguous; never choose a statement silently.
            boolean overlap=false;for(int i=1;i<values.size();i++)if(docs.get(values.get(i-1).documentId()).periodEnd().isAfter(docs.get(values.get(i).documentId()).periodStart()))overlap=true;
            if(overlap){limitations.add("OVERLAPPING_OR_DUPLICATE_PERIODS");continue;}
            for(int i=1;i<values.size();i++){
                var previous=values.get(i-1);var current=values.get(i);var g=entry.getKey();
                differences.add(new Difference(previous.documentId(),current.documentId(),g.debt(),g.kind(),g.unit(),g.currency(),g.mode(),docs.get(previous.documentId()).periodStart(),docs.get(current.documentId()).periodStart(),previous.numericValue(),current.numericValue(),current.numericValue().subtract(previous.numericValue()),List.of(previous.id(),current.id())));
            }
        }
        if(documents.size()>1&&requested!=null&&requested!=Kind.MOVEMENT&&differences.isEmpty())limitations.add("NO_COMPARABLE_PERIOD_PAIR");
        var totals=requested==null||requested==Kind.MOVEMENT?movements(documents,facts,debts,limitations):List.<MovementTotal>of();
        return new Analysis(facts,List.copyOf(differences),totals,limitations.isEmpty(),List.copyOf(limitations));
    }
    private static List<MovementTotal> movements(List<Document> documents,List<Fact> facts,Map<UUID,UUID> debts,Set<String> limitations){
        var docs=new HashMap<UUID,Document>();for(var d:documents)docs.put(d.id(),d);
        record Group(UUID owner,UUID instrument,String entity,String currency,java.time.LocalDate start,java.time.LocalDate end){}
        var grouped=new LinkedHashMap<Group,List<Fact>>();
        for(var f:facts){
            if(f.kind()!=Kind.MOVEMENT)continue;
            var d=docs.get(f.documentId());
            if(!"VERIFIED".equals(f.validationStatus())||f.numericValue()==null||f.currency()==null||f.transactionReference()==null||f.effectiveDate()==null||d.periodStart()==null||d.periodEnd()==null||d.financialEntity()==null){limitations.add("MOVEMENT_IDENTITY_INCOMPLETE");continue;}
            if(f.effectiveDate().isBefore(d.periodStart())||!f.effectiveDate().isBefore(d.periodEnd())){limitations.add("MOVEMENT_OUTSIDE_DOCUMENT_PERIOD");continue;}
            grouped.computeIfAbsent(new Group(d.ownerId(),debts.getOrDefault(d.id(),d.id()),d.financialEntity(),f.currency(),d.periodStart(),d.periodEnd()),k->new ArrayList<>()).add(f);
        }
        var totals=new ArrayList<MovementTotal>();
        for(var entry:grouped.entrySet()){
            var unique=new LinkedHashMap<String,Fact>();boolean conflict=false;
            for(var f:entry.getValue()){
                // Reference is the identity; a changed date or amount is a conflict, not another movement.
                var old=unique.putIfAbsent(f.transactionReference(),f);
                if(old!=null&&(old.numericValue().compareTo(f.numericValue())!=0||!old.effectiveDate().equals(f.effectiveDate())))conflict=true;
            }
            if(conflict){limitations.add("CONFLICTING_MOVEMENT_REFERENCE");continue;}
            var group=entry.getKey();var ids=entry.getValue().stream().map(Fact::documentId).distinct().toList();
            totals.add(new MovementTotal(debts.get(ids.getFirst()),ids,group.entity(),group.currency(),group.start(),group.end(),unique.values().stream().map(Fact::numericValue).reduce(BigDecimal.ZERO,BigDecimal::add),unique.size(),unique.values().stream().map(Fact::id).toList(),"VERIFIED_REFERENCED_MOVEMENTS_ONLY_NOT_REGISTERED_PAYMENTS"));
        }
        return List.copyOf(totals);
    }
}
