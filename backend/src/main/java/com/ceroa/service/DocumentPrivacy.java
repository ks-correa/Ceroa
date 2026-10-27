package com.ceroa.service;

import org.springframework.stereotype.Component;
import java.util.regex.Pattern;

/** Conservative minimization: identification/account/card numbers never enter embeddings. */
@Component
public class DocumentPrivacy {
    private static final Pattern NUMBERS = Pattern.compile("(?<!\\p{N})(?:\\p{N}[ .-]?){4,}\\p{N}(?!\\p{N})");
    private static final Pattern LABELED_ID=Pattern.compile("(?iu)(\\b(?:CC|CE|TI|NIT|PASAPORTE|PASSPORT|IDENTIFICACI[ÓO]N|C[ÉE]DULA)\\s*[:#.-]?\\s*)([A-Z]{0,3}(?:\\d[ .-]?){3,20}[A-Z0-9]?)");
    private static final Pattern LABELED_ACCOUNT=Pattern.compile("(?iu)(\\b(?:cuenta|tarjeta|account|card|iban)\\b[^\\r\\n\\d]{0,25})(\\d(?:[ .-]?\\d){4,})");
    private static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,}");
    private static final Pattern DATE = Pattern.compile("\\b(?:\\d{4}[-/]\\d{2}[-/]\\d{2}|\\d{2}[-/]\\d{2}[-/]\\d{4})\\b");
    private static final Pattern MONEY_OR_RATE = Pattern.compile("(?iu)(?<![\\p{L}\\p{N}])(?:[+-]?\\s*\\$\\s*\\d[\\d.,]*|\\bCOP\\s*\\$?\\s*\\d[\\d.,]*|\\d[\\d.,]*\\s*(?:(?:COP|pesos|por ciento)\\b|%))");
    private static final Pattern LABELED_AMOUNT = Pattern.compile("(?iu)\\b(?:pagos?|abonos?|cuotas?|intereses?|capital|valor|importe|total|saldo|compras?|retiros?|transferencias?|seguros?)\\b[^\\r\\n\\d\\[]{0,40}([+-]?\\d[\\d.,]*)");
    public String redact(String text, String identification) {
        if(text==null) return "";
        if(identification!=null && !identification.isBlank()) text=text.replace(identification,"[IDENTIFICACION]");
        text=LABELED_ID.matcher(text).replaceAll("$1[IDENTIFICACION]");
        text=LABELED_ACCOUNT.matcher(text).replaceAll("$1[NUMERO_PRIVADO]");
        // Preserve validated dates needed for documentary periods; do not mistake them for account numbers.
        var dates=new java.util.ArrayList<String>();var matcher=DATE.matcher(text);var protectedText=new StringBuffer();
        while(matcher.find()) {
            String literal=matcher.group();String[] p=literal.split("[-/]");
            try {
                java.time.LocalDate.of(Integer.parseInt(p[p[0].length()==4?0:2]),Integer.parseInt(p[1]),Integer.parseInt(p[p[0].length()==4?2:0]));
                String token="[FECHA_"+dates.size()+"]";dates.add(literal);matcher.appendReplacement(protectedText,token);
            }catch(java.time.DateTimeException ignored){matcher.appendReplacement(protectedText,java.util.regex.Matcher.quoteReplacement(literal));}
        }
        matcher.appendTail(protectedText);
        var amounts=new java.util.ArrayList<String>();
        String protectedAmounts=protect(MONEY_OR_RATE,protectedText.toString(),amounts);
        var labeled=LABELED_AMOUNT.matcher(protectedAmounts);var labeledText=new StringBuffer();
        while(labeled.find()) {
            String token="[IMPORTE_"+amounts.size()+"]";amounts.add(labeled.group(1));
            labeled.appendReplacement(labeledText,java.util.regex.Matcher.quoteReplacement(labeled.group().replace(labeled.group(1),token)));
        }
        labeled.appendTail(labeledText);
        String redacted=NUMBERS.matcher(EMAIL.matcher(labeledText).replaceAll("[CORREO]")).replaceAll("[NUMERO_PRIVADO]");
        for(int i=0;i<amounts.size();i++)redacted=redacted.replace("[IMPORTE_"+i+"]",amounts.get(i));
        for(int i=0;i<dates.size();i++)redacted=redacted.replace("[FECHA_"+i+"]",dates.get(i));
        return redacted;
    }
    private String protect(Pattern pattern,String text,java.util.List<String> values) {
        var matcher=pattern.matcher(text);var result=new StringBuffer();
        while(matcher.find()) {
            String token="[IMPORTE_"+values.size()+"]";values.add(matcher.group());
            matcher.appendReplacement(result,token);
        }
        matcher.appendTail(result);
        return result.toString();
    }
}
