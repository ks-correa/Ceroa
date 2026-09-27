package com.ceroa.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
public class DocumentDraftValidatorTest {
    final ObjectMapper json=new ObjectMapper();final DocumentDraftValidator validator=new DocumentDraftValidator(json);
    public static ObjectNode empty(ObjectMapper json){var root=json.createObjectNode();var draft=root.putObject("draft");DocumentDraftValidator.FIELDS.forEach(draft::putNull);root.putArray("evidence");root.putArray("warnings");return root;}
    DocumentTextExtractor.Source source(String text){return new DocumentTextExtractor.Source("DOCX",List.of(),List.of(new DocumentTextExtractor.Segment("Párrafo 1",text)),List.of());}
    void proof(ObjectNode root,String field,String quote){root.withArray("evidence").addObject().put("field",field).put("quote",quote).put("location","Párrafo 1");}
    @Test void acceptsExplicitCopThousandsWithoutGuessingBareNumbersOrRates(){
        for(String quote:List.of("Cuota mensual $785.000 COP","Cuota mensual COP $785,000")){
            var root=empty(json);((ObjectNode)root.get("draft")).put("monthlyPayment",785000);proof(root,"monthlyPayment",quote);
            assertEquals(785000,validator.validate(root,source(quote)).draft().get("monthlyPayment").intValue());
        }
        var bare=empty(json);((ObjectNode)bare.get("draft")).put("monthlyPayment",785000);proof(bare,"monthlyPayment","Cuota mensual 785.000");
        assertTrue(validator.validate(bare,source("Cuota mensual 785.000")).draft().get("monthlyPayment").isNull());
        var rate=empty(json);((ObjectNode)rate.get("draft")).put("interestRate",785000);proof(rate,"interestRate","Tasa 785.000 COP");
        assertTrue(validator.validate(rate,source("Tasa 785.000 COP")).draft().get("interestRate").isNull());
    }
    @Test void detectsConflictingCopPayments(){
        var root=empty(json);((ObjectNode)root.get("draft")).put("monthlyPayment",785000);proof(root,"monthlyPayment","Cuota mensual $785.000 COP");
        assertTrue(validator.validate(root,source("Cuota mensual $785.000 COP\nCuota mensual $895.000 COP")).draft().get("monthlyPayment").isNull());
    }
    @Test void doesNotTurnNextDueDateIntoFixedMonthlyDay(){
        var root=empty(json);((ObjectNode)root.get("draft")).put("dueDateDay",15).put("nextDueDate","2026-10-15");
        proof(root,"dueDateDay","Próximo vencimiento 15/10/2026");proof(root,"nextDueDate","Próximo vencimiento 15/10/2026");
        var result=validator.validate(root,source("Próximo vencimiento 15/10/2026"));assertTrue(result.draft().get("dueDateDay").isNull());assertEquals("2026-10-15",result.draft().get("nextDueDate").asText());
        var explicit=empty(json);((ObjectNode)explicit.get("draft")).put("dueDateDay",15);proof(explicit,"dueDateDay","Día de pago: 15 de cada mes");
        assertEquals(15,validator.validate(explicit,source("Día de pago: 15 de cada mes")).draft().get("dueDateDay").intValue());
    }
    @Test void absentRateDoesNotBecomeZeroOrNone(){var result=validator.validate(empty(json),source("Saldo actual 2500000"));assertTrue(result.draft().get("interestRate").isNull());assertTrue(result.draft().get("rateType").isNull());}
    @Test void valuesRequireRealQuotesAndNumbersNotJustCorrectJson(){var root=empty(json);((ObjectNode)root.get("draft")).put("currentBalance",999999);proof(root,"currentBalance","Saldo actual 2500000");var result=validator.validate(root,source("Saldo actual 2500000"));assertTrue(result.draft().get("currentBalance").isNull());assertTrue(result.evidence().isEmpty());}
    @Test void acceptsLiteralBalanceButNullsConflictingObligations(){var root=empty(json);((ObjectNode)root.get("draft")).put("currentBalance",2500000);proof(root,"currentBalance","Saldo actual 2500000");assertEquals(2500000,validator.validate(root,source("Saldo actual 2500000")).draft().get("currentBalance").intValue());assertTrue(validator.validate(root,source("Saldo actual 2500000\nSaldo actual 3500000")).draft().get("currentBalance").isNull());}
    @Test void rejectsUnknownKeysInvalidEnumsAndInventedLocations(){var root=empty(json);root.put("userId","foreign");assertThrows(IllegalArgumentException.class,()->validator.validate(root,source("source")));var invalid=empty(json);((ObjectNode)invalid.get("draft")).put("rateType","unknown");assertThrows(IllegalArgumentException.class,()->validator.validate(invalid,source("source")));}
    @Test void ambiguousNumbersAndAbsentInterestEvidenceRemainUnknown(){var root=empty(json);((ObjectNode)root.get("draft")).put("currentBalance",1250).put("rateType","NONE");proof(root,"currentBalance","Saldo actual 1.250");proof(root,"rateType","Saldo actual 1.250");var result=validator.validate(root,source("Saldo actual 1.250"));assertTrue(result.draft().get("currentBalance").isNull());assertTrue(result.draft().get("rateType").isNull());}
}
