package com.ceroa.service;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;
import com.ceroa.api.dto.DocumentFactContracts.*;

/** Lexical modality checks only: never converts a rate or trusts a contradictory quote. */
final class DocumentRateMode {
    private DocumentRateMode() {}
    private static String normalized(String text) {
        return Normalizer.normalize(text==null?"":text.toLowerCase(Locale.ROOT),Normalizer.Form.NFD).replaceAll("\\p{M}","").replaceAll("\\s+"," ");
    }
    static String mode(String text) {
        String value=normalized(text).replaceAll("[.\\s]","").toUpperCase(Locale.ROOT);
        return Set.of("EA","EM","MV","NMV","NAMV").contains(value)?value:null;
    }
    private static String equivalent(String mode) { return "MV".equals(mode)?"EM":mode; }
    static Set<String> modes(String text) {
        String value=normalized(text);var found=new LinkedHashSet<String>();
        if(value.contains("efectiva anual"))found.add("EA");
        if(value.contains("efectiva mensual")||value.contains("mes vencido")&&!value.contains("nominal"))found.add("EM");
        if(value.contains("nominal anual"))found.add("NAMV");
        if(value.contains("nominal mensual"))found.add("NMV");
        var matcher=Pattern.compile("(?<![a-z])(?:n\\.?\\s*a\\.?\\s*m\\.?\\s*v|n\\.?\\s*m\\.?\\s*v|e\\.?\\s*a|e\\.?\\s*m|m\\.?\\s*v)\\.?(?![a-z])").matcher(value);
        while(matcher.find())found.add(equivalent(mode(matcher.group())));
        return found;
    }
    static String unique(String text) { var modes=modes(text);return modes.size()==1?modes.iterator().next():null; }
    static boolean consistent(String canonical,String... texts) {
        String value=mode(canonical);if(value==null)return false;
        for(String text:texts)if(modes(text).stream().anyMatch(m->!m.equals(equivalent(value))))return false;
        return true;
    }
    static Fact checked(Fact fact) {
        if(fact.kind()!=Kind.RATE||consistent(fact.rateMode(),fact.quote()))return fact;
        return new Fact(fact.id(),fact.documentId(),fact.documentVersion(),fact.chunkId(),fact.kind(),fact.valueType(),
            fact.numericValue(),fact.dateValue(),fact.textValue(),fact.unit(),fact.currency(),null,fact.transactionReference(),
            fact.effectiveDate(),"NEEDS_REVIEW",fact.quote(),fact.quoteStart(),fact.quoteEnd(),fact.extractorVersion());
    }
}
