package com.ceroa.service;

import com.ceroa.api.dto.DocumentContracts.Source;
import com.ceroa.api.dto.DocumentFactContracts.*;
import java.math.BigDecimal;
import java.time.*;
import java.time.format.*;
import java.util.*;
import java.util.regex.*;

/** Conservative, versioned extraction. Only explicit labels; no LLM or financial writes. */
public final class DocumentFactExtractor {
    public static final int VERSION=1;
    private DocumentFactExtractor() {}
    private static final Pattern HEADER=Pattern.compile("(?iu)^(saldo(?:\\s+(?:total|actual|informado))?|pago m[ií]nimo|cuota|tasa(?:\\s+(?:de inter[eé]s|efectiva|nominal))?|fecha de corte|fecha de vencimiento|inicio del per[ií]odo|fin del per[ií]odo|entidad)\\s*:\\s*(.+)$");
    private static final Pattern MONEY=Pattern.compile("(?iu)^(?:(COP|USD|EUR)\\s*)?\\$?\\s*([+-]?[0-9][0-9.,]*)(?:\\s*(COP|USD|EUR))?$");
    private static final Pattern RATE=Pattern.compile("(?iu)^([0-9]+(?:[.,][0-9]{1,6})?)\\s*%\\s*(EA|EM|MV|NMV|NAMV)?$");
    // A movement needs a stable reference and date to support deterministic deduplication.
    private static final Pattern MOVEMENT=Pattern.compile("(?iu)^movimiento\\s+ref(?:erencia)?\\s*:?\\s*([A-Z0-9_-]{3,80})\\s+(\\d{4}-\\d{2}-\\d{2})\\s+(.+)$");
    public static List<Fact> extract(Source source){
        var result=new ArrayList<Fact>();var lines=Pattern.compile("[^\\r\\n]+").matcher(source.content());
        while(lines.find()){
            // Chunk edges may cut a number or a label. Only internally delimited
            // lines can establish a complete lexical value.
            if(lines.start()==0||lines.end()==source.content().length())continue;
            String quote=lines.group().strip();int offset=lines.start()+lines.group().indexOf(quote);
            var movement=MOVEMENT.matcher(quote);var header=HEADER.matcher(quote);
            if(movement.matches()){
                LocalDate date=date(movement.group(2));if(date==null)continue;
                Fact f=money(source,Kind.MOVEMENT,movement.group(3),quote,offset,movement.group(1).toUpperCase(Locale.ROOT),date);if(f!=null)result.add(f);
            }else if(header.matches()){
                String label=java.text.Normalizer.normalize(header.group(1).toLowerCase(Locale.ROOT),java.text.Normalizer.Form.NFD).replaceAll("\\p{M}","");
                String value=header.group(2).strip();
                Kind kind=label.startsWith("saldo")?Kind.BALANCE:label.startsWith("pago")?Kind.MINIMUM_PAYMENT:label.equals("cuota")?Kind.INSTALLMENT:label.startsWith("tasa")?Kind.RATE:label.equals("fecha de corte")?Kind.CUTOFF_DATE:label.equals("fecha de vencimiento")?Kind.DUE_DATE:label.startsWith("inicio")?Kind.PERIOD_START:label.startsWith("fin")?Kind.PERIOD_END:Kind.ENTITY;
                if(Set.of(Kind.BALANCE,Kind.MINIMUM_PAYMENT,Kind.INSTALLMENT).contains(kind)){Fact f=money(source,kind,value,quote,offset,null,null);if(f!=null)result.add(f);}
                else if(kind==Kind.RATE){
                    var m=RATE.matcher(value);if(!m.matches())continue;
                    BigDecimal number=new BigDecimal(m.group(1).replace(',','.'));if(number.compareTo(new BigDecimal("100"))>0)continue;
                    String mode=m.group(2)==null?null:m.group(2).toUpperCase(Locale.ROOT);
                    result.add(fact(source,kind,"NUMBER",number,null,null,"PERCENT",null,mode,null,null,mode==null?"NEEDS_REVIEW":"VERIFIED",quote,offset));
                }else if(kind==Kind.ENTITY){if(value.length()<=160)result.add(fact(source,kind,"TEXT",null,null,value,"TEXT",null,null,null,null,"VERIFIED",quote,offset));}
                else {LocalDate parsed=date(value);if(parsed!=null)result.add(fact(source,kind,"DATE",null,parsed,null,"DATE",null,null,null,null,"VERIFIED",quote,offset));}
            }
        }
        return List.copyOf(result);
    }
    private static Fact money(Source source,Kind kind,String literal,String quote,int offset,String reference,LocalDate effectiveDate){
        var m=MONEY.matcher(literal);if(!m.matches())return null;
        String currency=m.group(1)!=null?m.group(1):m.group(3);if(currency!=null)currency=currency.toUpperCase(Locale.ROOT);
        if(m.group(1)!=null&&m.group(3)!=null&&!m.group(1).equalsIgnoreCase(m.group(3)))return null;
        String raw=m.group(2),normalized=null;
        if(raw.matches("[+-]?\\d+"))normalized=raw;
        else if(raw.matches("[+-]?\\d+[.,]\\d{1,2}"))normalized=raw.replace(',','.');
        else if("COP".equals(currency)&&raw.matches("[+-]?\\d{1,3}(?:\\.\\d{3})+(?:,\\d{1,2})?"))normalized=raw.replace(".","").replace(',','.');
        else if("USD".equals(currency)&&raw.matches("[+-]?\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?"))normalized=raw.replace(",","");
        BigDecimal number=normalized==null?null:new BigDecimal(normalized);
        if(number!=null&&number.precision()-number.scale()>22)number=null;
        return fact(source,kind,"NUMBER",number,null,null,"MONEY",currency,null,reference,effectiveDate,number!=null&&currency!=null?"VERIFIED":"NEEDS_REVIEW",quote,offset);
    }
    private static LocalDate date(String value){
        try{return LocalDate.parse(value,DateTimeFormatter.ISO_LOCAL_DATE);}catch(DateTimeException ignored){}
        try{return LocalDate.parse(value,DateTimeFormatter.ofPattern("dd/MM/uuuu").withResolverStyle(ResolverStyle.STRICT));}catch(DateTimeException ignored){return null;}
    }
    private static Fact fact(Source s,Kind kind,String type,BigDecimal number,LocalDate date,String text,String unit,String currency,String mode,String reference,LocalDate effective,String status,String quote,int start){
        if(!s.content().substring(start,start+quote.length()).equals(quote))throw new IllegalArgumentException("Evidencia no verificable");
        return new Fact(UUID.randomUUID(),s.documentId(),s.documentVersion(),s.chunkId(),kind,type,number,date,text,unit,currency,mode,reference,effective,status,quote,start,start+quote.length(),VERSION);
    }
}
