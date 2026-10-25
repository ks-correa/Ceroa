package com.ceroa.service;

import org.springframework.stereotype.Component;
import java.util.regex.Pattern;

/** Conservative minimization: identification/account/card numbers never enter embeddings. */
@Component
public class DocumentPrivacy {
    private static final Pattern NUMBERS = Pattern.compile("(?<!\\p{N})(?:\\p{N}[ .-]?){4,}\\p{N}(?!\\p{N})");
    private static final Pattern LABELED_ID=Pattern.compile("(?iu)(\\b(?:CC|CE|TI|NIT|PASAPORTE|PASSPORT|IDENTIFICACI[ÓO]N|C[ÉE]DULA)\\s*[:#.-]?\\s*)([A-Z]{0,3}(?:\\d[ .-]?){3,20}[A-Z0-9]?)");
    private static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w.-]+\\.[A-Za-z]{2,}");
    private static final Pattern DATE = Pattern.compile("\\b(?:\\d{4}[-/]\\d{2}[-/]\\d{2}|\\d{2}[-/]\\d{2}[-/]\\d{4})\\b");
    public String redact(String text, String identification) {
        if(text==null) return "";
        if(identification!=null && !identification.isBlank()) text=text.replace(identification,"[IDENTIFICACION]");
        text=LABELED_ID.matcher(text).replaceAll("$1[IDENTIFICACION]");
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
        String redacted=EMAIL.matcher(NUMBERS.matcher(protectedText).replaceAll("[NUMERO_PRIVADO]")).replaceAll("[CORREO]");
        for(int i=0;i<dates.size();i++)redacted=redacted.replace("[FECHA_"+i+"]",dates.get(i));
        return redacted;
    }
}
