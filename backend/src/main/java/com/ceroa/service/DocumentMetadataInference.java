package com.ceroa.service;

import com.ceroa.api.dto.DocumentContracts.*;
import java.time.LocalDate;
import java.util.*;

/** Applies evidence-checked AI metadata without changing ownership or financial records. */
public final class DocumentMetadataInference {
    private DocumentMetadataInference() {}
    public static Metadata merge(Metadata current,List<Proposal> proposals) {
        Map<String,String> values=new HashMap<>();Set<String> conflicts=new HashSet<>();
        for(var p:proposals){String value=p.value().trim();String previous=values.putIfAbsent(p.field(),value);if(previous!=null&&!previous.equals(value))conflicts.add(p.field());}
        conflicts.forEach(values::remove);
        Identification identification=current.identificationType();Kind kind=current.documentType();
        try{if(identification==null&&values.containsKey("identificationType"))identification=Identification.valueOf(values.get("identificationType"));}catch(IllegalArgumentException ignored){}
        try{if(kind==Kind.OTHER&&values.containsKey("documentType"))kind=Kind.valueOf(values.get("documentType"));}catch(IllegalArgumentException ignored){}
        String entity=current.financialEntity();if(entity==null){String candidate=values.get("financialEntity");if(candidate!=null&&!candidate.isBlank()&&candidate.length()<=160)entity=candidate;}
        LocalDate start=current.periodStart()==null?date(values.get("periodStart")):current.periodStart();
        LocalDate end=current.periodEnd()==null?date(values.get("periodEnd")):current.periodEnd();
        if(start!=null&&end!=null&&!end.isAfter(start)){start=current.periodStart();end=current.periodEnd();}
        LocalDate issued=current.issuedAt()==null?date(values.get("issuedAt")):current.issuedAt();
        return new Metadata(identification,kind,entity,start,end,issued,current.debtId());
    }
    private static LocalDate date(String value){try{return value==null?null:LocalDate.parse(value);}catch(java.time.DateTimeException ignored){return null;}}
}
