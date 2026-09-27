package com.ceroa.service;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.stereotype.Component;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.*;

@Component
public class DocumentDraftValidator {
    public static final List<String> FIELDS=List.of("name","entity","categoryLabel","accountNumber","notes","originalAmount","currentBalance","interestRate","monthlyPayment","minimumPayment","dueDateDay","termRemainingMonths","nextDueDate","disbursementDate","type","rateType","color","details");
    private static final Set<String> NUMBERS=Set.of("originalAmount","currentBalance","interestRate","monthlyPayment","minimumPayment","dueDateDay","termRemainingMonths");
    private static final Set<String> DATES=Set.of("nextDueDate","disbursementDate");
    private static final Set<String> MONEY=Set.of("originalAmount","currentBalance","monthlyPayment","minimumPayment");
    private static final Map<String,String> LABELS=Map.ofEntries(Map.entry("name","nombre"),Map.entry("entity","entidad"),Map.entry("categoryLabel","categoría"),Map.entry("accountNumber","referencia de cuenta"),Map.entry("notes","notas"),Map.entry("originalAmount","monto original"),Map.entry("currentBalance","saldo actual"),Map.entry("interestRate","tasa de interés"),Map.entry("monthlyPayment","cuota mensual"),Map.entry("minimumPayment","pago mínimo"),Map.entry("dueDateDay","día de pago"),Map.entry("termRemainingMonths","meses restantes"),Map.entry("nextDueDate","próximo vencimiento"),Map.entry("disbursementDate","fecha de desembolso"),Map.entry("type","tipo de obligación"),Map.entry("rateType","modalidad de tasa"));
    private static final Map<String,String> TYPES=Map.ofEntries(Map.entry("credit_card","tarjeta de credito"),Map.entry("personal_loan","prestamo personal|libre inversion"),Map.entry("mortgage","hipotec|vivienda"),Map.entry("auto_loan","vehicul"),Map.entry("student_loan","educativ|estudiantil"),Map.entry("retail_credit","credito comercial|credito de almacen"),Map.entry("installment_purchase","compra a cuotas|compra en cuotas"),Map.entry("overdue_bill","factura vencida|factura en mora"),Map.entry("family_loan","prestamo familiar|prestamo entre familiares"),Map.entry("other","otra obligacion|otro tipo de deuda"));
    private static final Map<String,String> RATES=Map.of("EA","\\bea\\b|efectiva anual","MV","\\bmv\\b|mes vencido|mensual vencida","NAMV","\\bnamv\\b|nominal anual mes vencido","INDEXED","indexad","IBR_MARGIN","\\bibr\\b","IPC_MARGIN","\\bipc\\b","UVR_MARGIN","\\buvr\\b","NONE","sin intereses|sin interes|no genera intereses");
    public record Evidence(String field,String quote,String location) {}
    public record Result(JsonNode draft,List<Evidence> evidence,List<String> warnings) {}
    private final ObjectMapper json;
    public DocumentDraftValidator(ObjectMapper json){this.json=json;}
    public Result validate(JsonNode raw,DocumentTextExtractor.Source source) {
        if(raw==null||!raw.isObject()||!keys(raw).equals(Set.of("draft","evidence","warnings"))||!raw.path("draft").isObject()||!keys(raw.path("draft")).equals(new HashSet<>(FIELDS))||!raw.path("evidence").isArray()||raw.path("evidence").size()>100||!raw.path("warnings").isArray()||raw.path("warnings").size()>20)throw invalid();
        ObjectNode draft=raw.path("draft").deepCopy();var warnings=new ArrayList<>(source.warnings());
        for(var warning:raw.path("warnings")){if(!warning.isTextual()||warning.asText().length()>500)throw invalid();warnings.add(warning.asText());}
        var evidence=new ArrayList<Evidence>();
        for(var node:raw.path("evidence")) {
            if(!node.isObject()||!keys(node).equals(Set.of("field","quote","location"))||!node.path("field").isTextual()||!FIELDS.contains(node.path("field").asText())||!node.path("quote").isTextual()||node.path("quote").asText().isBlank()||node.path("quote").asText().length()>1500||!node.path("location").isTextual())throw invalid();
            evidence.add(new Evidence(node.path("field").asText(),node.path("quote").asText(),node.path("location").asText()));
        }
        var verified=new ArrayList<Evidence>();
        for(String field:FIELDS) {
            JsonNode value=draft.get(field);if(value.isNull())continue;
            if(!validType(field,value))throw invalid();
            var matches=evidence.stream().filter(e->e.field.equals(field)).toList();
            boolean supported=!matches.isEmpty() && matches.stream().allMatch(e->source.segments().stream().anyMatch(s->s.location().equals(e.location)&&s.text().contains(e.quote))&&containsValue(field,value,e.quote));
            if(field.equals("color")||field.equals("details")||!supported||conflicts(field,source)) {
                draft.putNull(field);warnings.add(field.equals("dueDateDay")?"El documento no confirma un día de pago mensual fijo. La fecha del próximo vencimiento se revisa por separado; completa el día de pago si corresponde.":"Revisa "+LABELS.getOrDefault(field,"este dato")+": no se pudo comprobar un valor inequívoco en el documento.");
            } else verified.addAll(matches);
        }
        if(draft.get("interestRate").isNull()&&draft.get("rateType").isNull())warnings.add("No se encontró una tasa verificable. Completa su valor y modalidad; no se asumió cero ni ausencia de intereses.");
        warnings.add("Este borrador no se ha guardado. Revisa cada dato antes de confirmar.");
        return new Result(draft,List.copyOf(verified),warnings.stream().distinct().limit(50).toList());
    }
    private boolean validType(String field,JsonNode value) {
        if(NUMBERS.contains(field)) {
            if(!value.isNumber()||value.decimalValue().signum()<0||value.decimalValue().precision()>18||value.decimalValue().scale()>8)return false;
            if(field.equals("dueDateDay"))return value.isIntegralNumber()&&value.intValue()>=1&&value.intValue()<=31;
            if(field.equals("termRemainingMonths"))return value.isIntegralNumber()&&value.longValue()<=1200;
            return value.decimalValue().compareTo(new BigDecimal("999999999999999"))<=0;
        }
        if(field.equals("type"))return value.isTextual()&&TYPES.containsKey(value.asText());
        if(field.equals("rateType"))return value.isTextual()&&RATES.containsKey(value.asText());
        if(field.equals("color")||field.equals("details"))return false;
        if(!value.isTextual()||value.asText().isBlank()||value.asText().length()>(field.equals("notes")?1000:field.equals("accountNumber")?80:160))return false;
        if(DATES.contains(field)){try{LocalDate.parse(value.asText());}catch(Exception e){return false;}}
        return true;
    }
    private boolean containsValue(String field,JsonNode value,String quote) {
        if(field.equals("dueDateDay")) {
            var day=Pattern.compile("(?:dia (?:de )?pago|dia (?:de )?vencimiento)[^\\d\\n]{0,30}(\\d{1,2})(?![\\d/.-])").matcher(normalize(quote));
            while(day.find())if(Integer.parseInt(day.group(1))==value.intValue())return true;
            return false;
        }
        if(NUMBERS.contains(field))return numbers(quote,MONEY.contains(field)).stream().anyMatch(n->n.compareTo(value.decimalValue())==0);
        if(field.equals("type"))return Pattern.compile(TYPES.get(value.asText())).matcher(normalize(quote)).find();
        if(field.equals("rateType"))return Pattern.compile(RATES.get(value.asText())).matcher(normalize(quote)).find();
        if(DATES.contains(field)) {
            if(quote.contains(value.asText()))return true;
            var date=LocalDate.parse(value.asText());
            // Numeric day/month is safe only when the day disambiguates the order.
            return date.getDayOfMonth()>12 && Pattern.compile("(?<!\\d)0?"+date.getDayOfMonth()+"[/.-]0?"+date.getMonthValue()+"[/.-]"+date.getYear()+"(?!\\d)").matcher(quote).find();
        }
        return quote.contains(value.asText());
    }
    private List<BigDecimal> numbers(String text,boolean monetary) {
        var result=new ArrayList<BigDecimal>();var matcher=Pattern.compile("(?<![\\p{L}\\p{N}])\\d+(?:[.,]\\d+)*(?![\\p{L}\\p{N}])").matcher(text);
        while(matcher.find()) {
            String literal=matcher.group();if(literal.length()>30)continue;
            String normalized=literal;
            if(literal.contains(",")&&literal.contains(".")) {
                char decimal=literal.lastIndexOf(',')>literal.lastIndexOf('.')?',':'.';char group=decimal==','?'.':',';
                normalized=literal.replace(String.valueOf(group),"").replace(decimal,'.');
            } else if(literal.matches("\\d{1,3}([.,]\\d{3}){2,}"))normalized=literal.replace(".","").replace(",","");
            else if(literal.matches("\\d{1,3}[.,]\\d{3}")) {
                // A single separator is ambiguous unless this exact amount explicitly uses COP.
                boolean cop=Pattern.compile("(?i)^\\s*COP\\b").matcher(text.substring(matcher.end())).find()
                    ||Pattern.compile("(?i)\\bCOP\\s*\\$?\\s*$").matcher(text.substring(0,matcher.start())).find();
                if(!monetary||!cop)continue;
                normalized=literal.replace(".","").replace(",","");
            }
            else normalized=literal.replace(',','.');
            try{result.add(new BigDecimal(normalized));}catch(NumberFormatException ignored){}
        }
        return result;
    }
    private boolean conflicts(String field,DocumentTextExtractor.Source source) {
        String label=switch(field){case "currentBalance"->"saldo actual|saldo pendiente|saldo total";case "originalAmount"->"monto original|valor inicial|cupo total";case "monthlyPayment"->"cuota mensual|cuota fija";case "minimumPayment"->"pago minimo";default->"";};
        if(label.isBlank())return false;
        var pattern=Pattern.compile("(?:"+label+")[^\\d\\n]{0,30}(\\d+(?:[.,]\\d+)*)(?:[ \\t]*cop\\b)?");Set<BigDecimal> values=new HashSet<>();
        for(var segment:source.segments()){var m=pattern.matcher(normalize(segment.text()));while(m.find())numbers(m.group(),MONEY.contains(field)).forEach(n->values.add(n.stripTrailingZeros()));}
        return values.size()>1;
    }
    private String normalize(String text){return Normalizer.normalize(text,Normalizer.Form.NFD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT);}
    private Set<String> keys(JsonNode node){Set<String> keys=new HashSet<>();node.fieldNames().forEachRemaining(keys::add);return keys;}
    private IllegalArgumentException invalid(){return new IllegalArgumentException("La extracción no produjo un borrador válido. Puedes reintentar o completar manualmente.");}
}
