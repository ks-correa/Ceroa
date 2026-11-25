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
                    var financial=profile.get();
                    node.set("monthlyIncome",json.valueToTree(financial.monthlyIncome()));
                    boolean complete=!summary.partialCoverage()&&!financial.incompleteCoverage()&&summary.hasRequiredPaymentsData()&&summary.requiredPaymentsCurrentPeriod()!=null;
                    if(complete&&financial.monthlyIncome()!=null&&financial.monthlyIncome().signum()>0){
                        node.put("monthlyDebtServicePercent",summary.requiredPaymentsCurrentPeriod().multiply(BigDecimal.valueOf(100)).divide(financial.monthlyIncome(),2,RoundingMode.HALF_UP));
                        node.put("debtServiceStatus","AVAILABLE");
                        node.put("debtServiceReason","Porcentaje de ingresos mensuales destinado a las cuotas exigibles registradas; no es saldo total dividido entre ingresos.");
                    }else{
                        node.putNull("monthlyDebtServicePercent");
                        node.put("debtServiceStatus","INSUFFICIENT_DATA");
                        node.put("debtServiceReason",!complete?"Faltan cuotas exigibles o la cobertura de deudas es parcial.":"Registra ingresos mensuales mayores que cero para calcular el porcentaje destinado a cuotas.");
                    }
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
            if(all.size()>=12000) throw new IllegalArgumentException("Demasiados datos para una consulta; reduce el período o la cantidad de archivos");
            String id="f"+(all.size()+1); Fact fact=new Fact(path,node.deepCopy()); all.put(id,fact); added.put(id,fact);
        }
    }
    public Evidence calculate(Map<String,Fact> facts,Operation operation,List<String> refs) {
        if(refs==null || refs.size()<2 || refs.size()>50) throw new IllegalArgumentException();
        FinancialClaimGrounding.arithmetic(facts,refs,operation);
        var values=refs.stream().map(id->{
            Fact fact=facts.get(id); if(fact==null || !fact.value().isNumber()||fact.source().contains("/verifiedData/analysis/")) throw new IllegalArgumentException();
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
        answer=groundExactLiterals(facts,normalizeInlineArtifacts(facts,answer).replaceAll("(?m)^(\\s*)\\d+[.)]\\s+","$1• "));
        var matcher=REFERENCE.matcher(answer); StringBuffer rendered=new StringBuffer();
        while(matcher.find()) {
            Fact fact=facts.get(matcher.group(1));
            if(fact==null || fact.value().isNull()) throw new IllegalArgumentException("Referencia de evidencia inexistente o sin valor: "+matcher.group(1));
            if(!FinancialClaimGrounding.permits(facts,fact,answer,matcher.start(),matcher.end()))
                throw new IllegalArgumentException("La referencia no acredita el concepto financiero, unidad o documento de la afirmación: "+matcher.group(1));
            if(fact.source().matches("(?i).*/(?:id|documentId|chunkId|ownerId)$")) {
                matcher.appendReplacement(rendered,Matcher.quoteReplacement("[referencia interna omitida]"));
                continue;
            }
            String value=fact.value().isNumber()?displayNumber(fact):displayText(fact);
            matcher.appendReplacement(rendered,Matcher.quoteReplacement(value));
        }
        matcher.appendTail(rendered);
        String prose=REFERENCE.matcher(answer).replaceAll("");
        if(Pattern.compile("(?i)\\bConfirmar\\s+(?:asesor[ií]a|env[ií]o|cancelaci[oó]n)\\b|\\b[A-Z]{20}\\b").matcher(prose).find())
            throw new IllegalArgumentException("Código o instrucción de confirmación sin evidencia.");
        if(prose.codePoints().anyMatch(Character::isDigit) || prose.contains("{{") || prose.contains("}}")) {
            var unsupported=Pattern.compile("\\d+(?:[.,/\\-]\\d+)*").matcher(prose).results().map(java.util.regex.MatchResult::group).distinct().limit(20).toList();
            throw new IllegalArgumentException("Respuesta con cifras sin evidencia. Sustituye u omite estos literales: "+unsupported+". No uses números de lista ni años literales; usa los hechos actuales con {{fID}}.");
        }
        if(rendered.length()>16000) throw new IllegalArgumentException("Respuesta demasiado extensa");
        return rendered.toString()
            .replaceAll("(?i)([\\d.,]+%\\s*EA)\\s*\\((?:y una )?tasa (?:anual comparable|comparable anual) (?:de )?\\1\\)","$1")
            .replaceAll("(?i)sin intereses con una tasa (?:del|de) 0% sin intereses","sin intereses")
            .replaceAll("(?i)0% sin intereses","sin intereses")
            .replaceAll("(?iu)\\b(?:avalancha|avalanche)\\s+avalancha\\b","Avalancha")
            .replaceAll("(?iu)\\b(?:bola\\s+de\\s+nieve|snowball)\\s+bola\\s+de\\s+nieve\\b","Bola de nieve")
            .replaceAll("(?i)(%\\s*)\\b(?:true|false)\\b","$1");
    }
    /** Final fallback after model repair: preserve supported facts without displaying unsupported numbers. */
    public String resolveConservatively(Map<String,Fact> facts,String answer) {
        if(answer==null||answer.isBlank()||answer.length()>12000)throw new IllegalArgumentException();
        String grounded=groundExactLiterals(facts,normalizeInlineArtifacts(facts,answer).replaceAll("(?m)^(\\s*)\\d+[.)]\\s+","$1• "));
        var references=REFERENCE.matcher(grounded);
        var safe=new StringBuilder();int cursor=0;boolean omitted=false;
        while(references.find()) {
            String prose=grounded.substring(cursor,references.start());
            String cleaned=prose.replaceAll("\\{\\{[^{}]*\\}\\}","[dato sin evidencia]")
                .replaceAll("(?i)\\bConfirmar\\s+(?:asesor[ií]a|env[ií]o|cancelaci[oó]n)(?:\\s+[A-Z0-9_-]+)*|\\b[A-Z]{20}\\b","[dato sin evidencia]")
                .replaceAll("[$]?\\p{N}+(?:[.,/\\-]\\p{N}+)*%?","[dato sin evidencia]");
            omitted|=!cleaned.equals(prose);safe.append(cleaned);
            Fact fact=facts.get(references.group(1));
            if(!FinancialClaimGrounding.permits(facts,fact,grounded,references.start(),references.end())) {safe.append("[dato sin evidencia]");omitted=true;}
            else safe.append(references.group());
            cursor=references.end();
        }
        String tail=grounded.substring(cursor);
        String cleaned=tail.replaceAll("\\{\\{[^{}]*\\}\\}","[dato sin evidencia]")
            .replaceAll("(?i)\\bConfirmar\\s+(?:asesor[ií]a|env[ií]o|cancelaci[oó]n)(?:\\s+[A-Z0-9_-]+)*|\\b[A-Z]{20}\\b","[dato sin evidencia]")
            .replaceAll("[$]?\\p{N}+(?:[.,/\\-]\\p{N}+)*%?","[dato sin evidencia]");
        omitted|=!cleaned.equals(tail);safe.append(cleaned);
        String resolved=resolve(facts,safe.toString());
        return omitted?resolved+"\n\nAlgunas cifras o referencias no pudieron verificarse y se omitieron.":resolved;
    }
    String groundForDelegation(Map<String,Fact> facts,String answer) {
        if(answer==null||answer.isBlank())return answer;
        return groundExactLiterals(facts,normalizeInlineArtifacts(facts,answer).replaceAll("(?m)^(\\s*)\\d+[.)]\\s+","$1• "));
    }
    private String normalizeInlineArtifacts(Map<String,Fact> facts,String answer) {
        String cleaned=answer
            .replaceAll("(?i)\\s*\\{\\{d[1-8]\\}\\}","")
            .replaceAll("(?i)\\s*\\[\\s*d[1-8](?:\\s*,\\s*d[1-8])*\\s*\\]","")
            .replaceAll("(?i)\\s*\\(\\s*d[1-8](?:\\s*,\\s*d[1-8])*\\s*\\)","");
        var pctMatcher=Pattern.compile("\\{\\{(f[1-9][0-9]*)\\}\\}(%?)\\s*\\{\\{(f[1-9][0-9]*)\\}\\}").matcher(cleaned);
        StringBuffer pctBuf=new StringBuffer();
        while(pctMatcher.find()) {
            Fact second=facts.get(pctMatcher.group(3));
            if(second!=null && second.source().endsWith("inputs/percentScale")) {
                pctMatcher.appendReplacement(pctBuf,Matcher.quoteReplacement("{{"+pctMatcher.group(1)+"}}%"));
            } else if(second!=null && second.source().endsWith("/comparable")) {
                pctMatcher.appendReplacement(pctBuf,Matcher.quoteReplacement("{{"+pctMatcher.group(1)+"}}"+pctMatcher.group(2)));
            } else {
                pctMatcher.appendReplacement(pctBuf,Matcher.quoteReplacement(pctMatcher.group()));
            }
        }
        pctMatcher.appendTail(pctBuf);
        String currentText=pctBuf.toString();
        var ctxMatcher=Pattern.compile("\\{\\{(f[1-9][0-9]*)\\}\\}").matcher(currentText);
        StringBuffer ctxBuf=new StringBuffer();
        while(ctxMatcher.find()) {
            Fact fact=facts.get(ctxMatcher.group(1));
            if(fact!=null && fact.source().startsWith("financialDocuments/") && fact.source().matches(".*/(?:context|quote)$")) {
                String parent=fact.source().substring(0,fact.source().lastIndexOf('/'));
                String docId=facts.values().stream().filter(f->f.source().equals(parent+"/documentId")).map(f->f.value().asText()).findFirst().orElse("");
                String docVersion=facts.values().stream().filter(f->f.source().equals(parent+"/documentVersion")).map(f->f.value().asText()).findFirst().orElse("");
                String ownerId=facts.values().stream().filter(f->f.source().equals(parent+"/ownerId")).map(f->f.value().asText()).findFirst().orElse("");
                boolean unverified=facts.values().stream().anyMatch(f->f.source().equals(parent+"/validationStatus")&&!"VERIFIED".equals(f.value().asText()));
                int start=ctxMatcher.start(),end=ctxMatcher.end();
                String sibling=unverified?ctxMatcher.group(1):facts.entrySet().stream()
                    .filter(e->e.getValue().source().equals(parent+"/numericValue")||e.getValue().source().equals(parent+"/literal")||e.getValue().source().equals(parent+"/textValue"))
                    .filter(e->{
                        String sp=e.getValue().source().substring(0,e.getValue().source().lastIndexOf('/'));
                        String sDoc=facts.values().stream().filter(f->f.source().equals(sp+"/documentId")).map(f->f.value().asText()).findFirst().orElse("");
                        String sVer=facts.values().stream().filter(f->f.source().equals(sp+"/documentVersion")).map(f->f.value().asText()).findFirst().orElse("");
                        String sOwn=facts.values().stream().filter(f->f.source().equals(sp+"/ownerId")).map(f->f.value().asText()).findFirst().orElse("");
                        return sp.equals(parent)&&sDoc.equals(docId)&&sVer.equals(docVersion)&&sOwn.equals(ownerId)
                            &&FinancialClaimGrounding.permits(facts,e.getValue(),currentText,start,end);
                    })
                    .sorted(Comparator.comparingInt(e->e.getValue().source().endsWith("/numericValue")?0:e.getValue().source().endsWith("/literal")?1:2))
                    .map(Map.Entry::getKey).findFirst().orElse(ctxMatcher.group(1));
                ctxMatcher.appendReplacement(ctxBuf,Matcher.quoteReplacement("{{"+sibling+"}}"));
            } else {
                ctxMatcher.appendReplacement(ctxBuf,Matcher.quoteReplacement(ctxMatcher.group()));
            }
        }
        ctxMatcher.appendTail(ctxBuf);
        String proseOnly=ctxBuf.toString().replaceAll("\\{\\{f[1-9][0-9]*\\}\\}","").replaceAll("[^\\p{L}]","");
        if(proseOnly.length()>=25) {
            var guideMatcher=Pattern.compile("\\s*\\(?\\{\\{(f[1-9][0-9]*)\\}\\}\\)?").matcher(ctxBuf.toString());
            StringBuffer guideBuf=new StringBuffer();
            while(guideMatcher.find()) {
                Fact fact=facts.get(guideMatcher.group(1));
                if(fact!=null && fact.source().startsWith("supportGuide/")
                    && !fact.source().equals("supportGuide/subscriptionCancellationButton")) {
                    guideMatcher.appendReplacement(guideBuf,"");
                } else {
                    guideMatcher.appendReplacement(guideBuf,Matcher.quoteReplacement(guideMatcher.group()));
                }
            }
            guideMatcher.appendTail(guideBuf);
            return guideBuf.toString();
        }
        return ctxBuf.toString();
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
                if(fact.source().equals("workspaceProposal/instruction")&&value.contains("Confirmar envio "))
                    candidates.add(value.substring(value.indexOf("Confirmar envio ")));
                if(value.matches("\\d+(?:[.,]\\d+)?\\s*%")) {
                    String compact=value.replace(" ","");
                    candidates.add(compact.replace(',','.'));
                    candidates.add(compact.replace('.',','));
                    candidates.add(compact.replace("%"," %"));
                }
                if(fact.source().matches("(?i)(?:.*/)?supportBooking/(?:start|end|expiresAt)")&&value.length()>=16) {
                    candidates.add(value.substring(0,10));
                    candidates.add(value.substring(11,16));
                    if(value.length()>=19)candidates.add(value.substring(11,19));
                }
            }
            // A verified profile button label is guidance, not a chat confirmation command.
            boolean profileButton=fact.source().equals("supportGuide/subscriptionCancellationButton")
                && fact.value().isTextual() && fact.value().asText().equals("Confirmar cancelación");
            boolean confirmationFact=profileButton||fact.source().matches("(?i)(?:.*/)?(?:supportBooking/(?:code|instruction)|workspaceProposal/(?:confirmationCode|instruction))$");
            for(String candidate:candidates)
                if(candidate.length()>=1&&candidate.length()<=120&&!candidate.matches("f[1-9][0-9]*")&&(candidate.codePoints().anyMatch(Character::isDigit)||confirmationFact))
                    literals.add(Map.entry(candidate,entry.getKey()));
        }
        literals.sort(Comparator.comparingInt((Map.Entry<String,String> literal)->literal.getKey().length()).reversed());
        var references=REFERENCE.matcher(answer);var grounded=new StringBuilder();int cursor=0;
        while(references.find()) {
            grounded.append(groundProse(answer.substring(cursor,references.start()),literals,facts));
            grounded.append(references.group());cursor=references.end();
        }
        grounded.append(groundProse(answer.substring(cursor),literals,facts));
        return grounded.toString();
    }
    private String groundProse(String prose,List<Map.Entry<String,String>> literals,Map<String,Fact> facts) {
        String result=prose;
        for(var literal:literals) {
            var matches=Pattern.compile("(?<![\\p{L}\\p{N}.,*/-])"+Pattern.quote(literal.getKey())+"(?![\\p{L}\\p{N}]|[.,/-]\\d)").matcher(result);
            var replacement=new StringBuffer();
            while(matches.find())matches.appendReplacement(replacement,Matcher.quoteReplacement(
                FinancialClaimGrounding.permits(facts,facts.get(literal.getValue()),result,matches.start(),matches.end())
                    ?"{{"+literal.getValue()+"}}":matches.group()));
            matches.appendTail(replacement);result=replacement.toString();
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
        if(fact.source().matches("(?i)(?:.*/)?(?:year|currentYear|periodYear)")) return value.toPlainString();
        DecimalFormatSymbols symbols=new DecimalFormatSymbols(Locale.forLanguageTag("es-CO"));
        symbols.setGroupingSeparator('.'); symbols.setDecimalSeparator(',');
        DecimalFormat format=new DecimalFormat("#,##0",symbols);
        format.setMaximumFractionDigits(Math.max(0,value.scale()));
        return format.format(value);
    }
}
