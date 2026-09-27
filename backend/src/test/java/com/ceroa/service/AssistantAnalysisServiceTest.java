package com.ceroa.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.DecimalNode;
import com.fasterxml.jackson.databind.node.TextNode;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class AssistantAnalysisServiceTest {
    final AssistantAnalysisService service=new AssistantAnalysisService(new ObjectMapper(),null,null,null,null,null,null,null,null);
    @Test void translatesStructuredLabelsWithoutChangingDebtNames() {
        var facts=Map.of(
            "f1",new AssistantAnalysisService.Fact("strategy/type",TextNode.valueOf("avalanche")),
            "f2",new AssistantAnalysisService.Fact("debts/0/status",TextNode.valueOf("en_mora")),
            "f3",new AssistantAnalysisService.Fact("debts/0/rateType",TextNode.valueOf("NONE")),
            "f4",new AssistantAnalysisService.Fact("debts/0/name",TextNode.valueOf("avalanche")));
        assertEquals("Avalancha; en mora; sin intereses; avalanche",service.resolve(facts,"{{f1}}; {{f2}}; {{f3}}; {{f4}}"));
    }
    @Test void removesRepeatedEquivalentRatesAfterEvidenceSubstitution() {
        var facts=Map.of(
            "f1",new AssistantAnalysisService.Fact("rate",DecimalNode.valueOf(new BigDecimal("28.7"))),
            "f2",new AssistantAnalysisService.Fact("rate",DecimalNode.valueOf(BigDecimal.ZERO)),
            "f3",new AssistantAnalysisService.Fact("rateType",TextNode.valueOf("NONE")));
        assertEquals("28,7% EA; sin intereses",service.resolve(facts,"{{f1}}% EA (tasa comparable anual de {{f1}}% EA); sin intereses con una tasa del {{f2}}% {{f3}}"));
    }
    @Test void resolvesExactDecimalFactsWithoutModelFormatting() {
        var facts=new LinkedHashMap<String,AssistantAnalysisService.Fact>();
        facts.put("f1",new AssistantAnalysisService.Fact("balance",DecimalNode.valueOf(new BigDecimal("15420000.00"))));
        facts.put("f2",new AssistantAnalysisService.Fact("name",TextNode.valueOf("Tarjeta 2026")));
        assertEquals("Tarjeta 2026: 15.420.000",service.resolve(facts,"{{f2}}: {{f1}}"));
        assertThrows(IllegalArgumentException.class,()->service.resolve(facts,"Saldo 99999"));
        assertThrows(IllegalArgumentException.class,()->service.resolve(facts,"Saldo {{f3}}"));
        assertThrows(IllegalArgumentException.class,()->service.resolve(facts,"Saldo {{balance}}"));
    }
    @Test void separatesThousandsAndPreservesFractionsDatesAndYears() {
        var facts=new LinkedHashMap<String,AssistantAnalysisService.Fact>();
        facts.put("f1",new AssistantAnalysisService.Fact("amount",DecimalNode.valueOf(new BigDecimal("200000.50"))));
        facts.put("f2",new AssistantAnalysisService.Fact("rate",DecimalNode.valueOf(new BigDecimal("28.7000"))));
        facts.put("f3",new AssistantAnalysisService.Fact("progress/2026/9/0/year",DecimalNode.valueOf(new BigDecimal("2026"))));
        facts.put("f4",new AssistantAnalysisService.Fact("date",TextNode.valueOf("2026-09-27")));
        facts.put("f5",new AssistantAnalysisService.Fact("calculation/subtract/f1,f2",DecimalNode.valueOf(new BigDecimal("-1250000.12345678"))));
        assertEquals("200.000,5; 28,7%; 2026; 2026-09-27; -1.250.000,12345678",
            service.resolve(facts,"{{f1}}; {{f2}}%; {{f3}}; {{f4}}; {{f5}}"));
    }
    @Test void exactArithmeticCannotAcceptFabricatedOrTextOperands() {
        var facts=new LinkedHashMap<String,AssistantAnalysisService.Fact>();
        facts.put("f1",new AssistantAnalysisService.Fact("budget",DecimalNode.valueOf(new BigDecimal("800000.10"))));
        facts.put("f2",new AssistantAnalysisService.Fact("minimums",DecimalNode.valueOf(new BigDecimal("750000.05"))));
        var result=service.calculate(facts,AssistantAnalysisService.Operation.subtract,List.of("f1","f2"));
        assertEquals(0,new BigDecimal("50000.05").compareTo(result.facts().get("f3").value().decimalValue()));
        assertThrows(IllegalArgumentException.class,()->service.calculate(facts,AssistantAnalysisService.Operation.add,List.of("f1","f99")));
        facts.put("f4",new AssistantAnalysisService.Fact("name",TextNode.valueOf("123")));
        assertThrows(IllegalArgumentException.class,()->service.calculate(facts,AssistantAnalysisService.Operation.add,List.of("f1","f4")));
    }
    @Test void divisionByZeroFailsWithoutAnInventedResult() {
        var facts=new LinkedHashMap<String,AssistantAnalysisService.Fact>();
        facts.put("f1",new AssistantAnalysisService.Fact("balance",DecimalNode.valueOf(BigDecimal.TEN)));
        facts.put("f2",new AssistantAnalysisService.Fact("capacity",DecimalNode.valueOf(BigDecimal.ZERO)));
        assertThrows(ArithmeticException.class,()->service.calculate(facts,AssistantAnalysisService.Operation.divide,List.of("f1","f2")));
        assertEquals(2,facts.size());
    }
}
