package com.ceroa.service;

import com.ceroa.exception.BusinessRuleException;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.stereotype.Service;
import java.math.*;
import java.util.*;
import java.util.regex.*;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;

/** Read-only evidence and arithmetic for the assistant. No model-selected SQL or URLs. */
@Service
public class AssistantAnalysisService {
    public enum Dataset { summary, profile, debts, payments, upcoming, strategy, comparison, progress }
    public enum Operation { add, subtract, multiply, divide, min, max }
    public record Fact(String source, JsonNode value) {}
    public record Evidence(Map<String, Fact> facts) {}
    private static final Pattern REFERENCE = Pattern.compile("\\{\\{(f[1-9][0-9]*)}}" );
    private final ObjectMapper json;
    private final DebtService debts;
    private final PaymentService payments;
    private final UpcomingDueService dues;
    private final DashboardService dashboard;
    private final FinancialProfileService profile;
    private final StrategyService strategy;
    private final MonthlyProgressService progress;
    private final RateNormalizationService rates;
    public AssistantAnalysisService(ObjectMapper json, DebtService debts, PaymentService payments,
        UpcomingDueService dues, DashboardService dashboard, FinancialProfileService profile,
        StrategyService strategy, MonthlyProgressService progress, RateNormalizationService rates) {
        this.json=json; this.debts=debts; this.payments=payments; this.dues=dues;
        this.dashboard=dashboard; this.profile=profile; this.strategy=strategy; this.progress=progress; this.rates=rates;
    }
    public JsonNode read(Dataset dataset, int year, int month, int offset) {
        if (offset < 0 || offset > 10000 || offset % 25 != 0 || year < 2000 || year > 2100 || month < 1 || month > 12)
            throw new IllegalArgumentException();
        try {
            return switch(dataset) {
                case summary -> {
                    var summary=dashboard.getSummary();
                    ObjectNode node=(ObjectNode) sanitized(json.valueToTree(summary));
                    if(summary.hasRequiredPaymentsData() && summary.availableForDebt()!=null && summary.requiredPaymentsCurrentPeriod()!=null)
                        node.put("allocatedBudgetAfterRequiredPayments",summary.availableForDebt().subtract(summary.requiredPaymentsCurrentPeriod()));
                    node.put("budgetMeaning","availableForDebt es el presupuesto asignado a deudas, no necesariamente todo el ingreso restante.");
                    yield node;
                }
                case profile -> {
                    var financial=profile.get();
                    ObjectNode node=json.valueToTree(financial);
                    node.put("incomeAfterExpenses",financial.monthlyIncome().subtract(financial.fixedExpenses()));
                    node.put("unallocatedAfterDebtBudget",financial.monthlyIncome().subtract(financial.fixedExpenses()).subtract(financial.availableMoney()));
                    node.put("budgetMeaning","availableMoney y paymentCapacity son presupuesto asignado por el usuario. incomeAfterExpenses es ingreso menos gastos. No son conceptos equivalentes.");
                    yield node;
                }
                case strategy -> sanitized(json.valueToTree(strategy.getActiveStrategy()));
                case comparison -> sanitized(json.valueToTree(strategy.getComparison()));
                case progress -> json.valueToTree(progress.get(year, month));
                case debts -> page(debts.findAll().stream().map(d -> {
                    ObjectNode node = json.createObjectNode();
                    node.put("name",d.name()); node.put("type",d.type().value());
                    node.set("balance",json.valueToTree(d.currentBalance()));
                    node.set("originalAmount",json.valueToTree(d.originalAmount()));
                    node.set("rate",json.valueToTree(d.interestRate())); node.put("rateType",d.rateType().value());
                    node.put("status",d.status().value());
                    node.set("monthlyPayment",json.valueToTree(d.monthlyPayment()));
                    node.set("minimumPayment",json.valueToTree(d.minimumPayment()));
                    node.set("nextDueDate",json.valueToTree(d.nextDueDate()));
                    node.set("termRemainingMonths",json.valueToTree(d.termRemainingMonths()));
                    node.set("normalizedRate",json.valueToTree(rates.normalize(d.rateType(),d.interestRate())));
                    return node;
                }).toList(),offset);
                case payments -> page(payments.findAll(null).stream().map(p -> {
                    ObjectNode node=json.createObjectNode(); node.put("debtName",p.debtName());
                    node.set("amount",json.valueToTree(p.amount())); node.set("date",json.valueToTree(p.date()));
                    node.put("type",p.typeLabel()); return node;
                }).toList(),offset);
                case upcoming -> page(dues.getUpcomingDues().stream().map(d -> {
                    ObjectNode node=json.createObjectNode(); node.put("debtName",d.debtName());
                    node.set("amount",json.valueToTree(d.amount())); node.set("dueDate",json.valueToTree(d.dueDate()));
                    node.put("daysUntilDue",d.daysUntilDue()); node.put("status",d.status().value()); return node;
                }).toList(),offset);
            };
        } catch (BusinessRuleException e) {
            return json.valueToTree(Map.of("available",false,"reason",e.getMessage(),"code",e.getCode()));
        }
    }
    private JsonNode page(List<? extends JsonNode> rows,int offset) {
        ObjectNode result=json.createObjectNode(); result.put("total",rows.size()); result.put("offset",offset);
        result.put("hasMore",offset+25<rows.size()); result.put("nextOffset",offset+25);
        ArrayNode items=result.putArray("items"); rows.stream().skip(offset).limit(25).forEach(items::add); return result;
    }
    private JsonNode sanitized(JsonNode node) {
        if (node instanceof ObjectNode object) {
            object.remove(List.of("id","debtId","entity","orderedDebtIds"));
            object.elements().forEachRemaining(this::sanitized);
        } else if(node.isArray()) node.elements().forEachRemaining(this::sanitized);
        return node;
    }
    public Evidence evidence(Map<String,Fact> all,JsonNode data,String source) {
        Map<String,Fact> added=new LinkedHashMap<>(); flatten(all,added,data,source);
        return new Evidence(added);
    }
    private void flatten(Map<String,Fact> all,Map<String,Fact> added,JsonNode node,String path) {
        if (node.isObject()) node.fields().forEachRemaining(e->flatten(all,added,e.getValue(),path+"/"+e.getKey()));
        else if (node.isArray()) { for(int i=0;i<node.size();i++) flatten(all,added,node.get(i),path+"/"+i); }
        else {
            if(all.size()>=4000) throw new IllegalArgumentException("Demasiados datos para una consulta");
            String id="f"+(all.size()+1); Fact fact=new Fact(path,node.deepCopy()); all.put(id,fact); added.put(id,fact);
        }
    }
    public Evidence calculate(Map<String,Fact> facts,Operation operation,List<String> refs) {
        if(refs==null || refs.size()<2 || refs.size()>50) throw new IllegalArgumentException();
        var values=refs.stream().map(id->{
            Fact fact=facts.get(id); if(fact==null || !fact.value().isNumber()) throw new IllegalArgumentException();
            return fact.value().decimalValue();
        }).toList();
        BigDecimal value=values.get(0);
        for(int i=1;i<values.size();i++) {
            BigDecimal next=values.get(i);
            value=switch(operation) {
                case add -> value.add(next); case subtract -> value.subtract(next);
                case multiply -> value.multiply(next); case divide -> value.divide(next,8,RoundingMode.HALF_UP);
                case min -> value.min(next); case max -> value.max(next);
            };
            if(value.precision()>40) throw new IllegalArgumentException();
        }
        return evidence(facts,DecimalNode.valueOf(value.stripTrailingZeros()),"calculation/"+operation+"/"+String.join(",",refs));
    }
    /** Substitute only facts emitted for this request. Reject unsupported numerical claims. */
    public String resolve(Map<String,Fact> facts,String answer) {
        if(answer==null || answer.isBlank() || answer.length()>12000) throw new IllegalArgumentException();
        answer=groundExactLiterals(facts,answer.replaceAll("(?m)^(\\s*)\\d+[.)]\\s+","$1• "));
        var matcher=REFERENCE.matcher(answer); StringBuffer rendered=new StringBuffer();
        while(matcher.find()) {
            Fact fact=facts.get(matcher.group(1));
            if(fact==null || fact.value().isNull()) throw new IllegalArgumentException();
            String value=fact.value().isNumber()?displayNumber(fact):displayText(fact);
            matcher.appendReplacement(rendered,Matcher.quoteReplacement(value));
        }
        matcher.appendTail(rendered);
        String prose=REFERENCE.matcher(answer).replaceAll("");
        if(prose.codePoints().anyMatch(Character::isDigit) || prose.contains("{{") || prose.contains("}}"))
            throw new IllegalArgumentException("Respuesta con cifras sin evidencia");
        if(rendered.length()>16000) throw new IllegalArgumentException("Respuesta demasiado extensa");
        return rendered.toString()
            .replaceAll("(?i)([\\d.,]+%\\s*EA)\\s*\\((?:y una )?tasa (?:anual comparable|comparable anual) (?:de )?\\1\\)","$1")
            .replaceAll("(?i)sin intereses con una tasa (?:del|de) 0% sin intereses","sin intereses")
            .replaceAll("(?i)0% sin intereses","sin intereses");
    }
    private String groundExactLiterals(Map<String,Fact> facts,String answer) {
        var literals=new ArrayList<Map.Entry<String,String>>();
        for(var entry:facts.entrySet()) {
            var fact=entry.getValue();
            if(fact.value().isNull()||fact.source().matches("(?i).*(?:/id|/documentId|/chunkId|/ownerId)$"))continue;
            var candidates=new LinkedHashSet<String>();
            if(fact.value().isNumber()) {
                candidates.add(displayNumber(fact));
                candidates.add(fact.value().asText());
            } else if(fact.value().isTextual()) {
                String value=fact.value().asText();candidates.add(value);
                if(value.matches("\\d+(?:[.,]\\d+)?\\s*%")) {
                    String compact=value.replace(" ","");
                    candidates.add(compact.replace(',','.'));
                    candidates.add(compact.replace('.',','));
                    candidates.add(compact.replace("%"," %"));
                }
            }
            for(String candidate:candidates)
                if(candidate.length()>=2&&candidate.length()<=120&&!candidate.matches("f[1-9][0-9]*")&&candidate.codePoints().anyMatch(Character::isDigit))
                    literals.add(Map.entry(candidate,entry.getKey()));
        }
        literals.sort(Comparator.comparingInt((Map.Entry<String,String> literal)->literal.getKey().length()).reversed());
        var references=REFERENCE.matcher(answer);var grounded=new StringBuilder();int cursor=0;
        while(references.find()) {
            grounded.append(groundProse(answer.substring(cursor,references.start()),literals));
            grounded.append(references.group());cursor=references.end();
        }
        grounded.append(groundProse(answer.substring(cursor),literals));
        return grounded.toString();
    }
    private String groundProse(String prose,List<Map.Entry<String,String>> literals) {
        String result=prose;
        for(var literal:literals) {
            result=Pattern.compile("(?<![\\p{L}\\p{N}])"+Pattern.quote(literal.getKey())+"(?![\\p{L}\\p{N}])")
                .matcher(result).replaceAll(Matcher.quoteReplacement("{{"+literal.getValue()+"}}"));
        }
        return result;
    }
    private String displayText(Fact fact) {
        String value=fact.value().asText();
        // Translate structured labels only; preserve user-provided names verbatim.
        if(fact.source().equals("name") || fact.source().endsWith("/name")) return value;
        return switch(value) {
            case "avalanche" -> "Avalancha";
            case "snowball" -> "Bola de nieve";
            case "manual" -> "prioridad manual";
            case "en_mora" -> "en mora";
            case "NONE" -> "sin intereses";
            default -> value;
        };
    }
    private String displayNumber(Fact fact) {
        BigDecimal value=fact.value().decimalValue().stripTrailingZeros();
        if(fact.source().equals("year") || fact.source().endsWith("/year")) return value.toPlainString();
        DecimalFormatSymbols symbols=new DecimalFormatSymbols(Locale.forLanguageTag("es-CO"));
        symbols.setGroupingSeparator('.'); symbols.setDecimalSeparator(',');
        DecimalFormat format=new DecimalFormat("#,##0",symbols);
        format.setMaximumFractionDigits(Math.max(0,value.scale()));
        return format.format(value);
    }
}
