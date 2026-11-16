package com.ceroa.service;
import com.fasterxml.jackson.databind.node.IntNode;
import org.junit.jupiter.api.Test;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
class FinancialProjectionGroundingTest {
    private boolean permits(String source,String text){
        var fact=new AssistantAnalysisService.Fact(source,IntNode.valueOf(120));
        int start=text.indexOf("{{f1}}");
        return FinancialClaimGrounding.permits(Map.of("f1",fact),fact,text,start,start+6);
    }
    @Test void interestAfterRateIsNotMisclassifiedAsRate(){
        assertTrue(permits("comparison/avalanche/totalInterest","Tasa de interés comparable. El interés proyectado es {{f1}}."));
        assertFalse(permits("debts/0/interestRate","El interés proyectado es {{f1}}."));
        assertTrue(permits("debts/0/interestRate","La tasa de interés es {{f1}}%."));
    }
    @Test void mentioningObligationsDoesNotChangeRateMeaning(){
        assertTrue(permits("debts/0/interestRate","Presenta la tasa de interés más alta de las obligaciones registradas, con un valor de {{f1}}%."));
        assertFalse(permits("debts/0/currentBalance","Presenta la tasa de interés más alta de las obligaciones registradas, con un valor de {{f1}}%."));
        assertTrue(permits("strategy/priorityDebt/priority","Con una prioridad de {{f1}}."));
        assertTrue(permits("strategy/priorityDebt/estimatedPayoffDate","Con un plazo estimado de varios meses hasta {{f1}}."));
        assertFalse(permits("debts/0/currentBalance","El número de obligación es {{f1}}."));
    }
    @Test void projectionLabelsDoNotInheritEarlierConcepts(){
        assertTrue(permits("strategy/projection/months","La tasa anterior es conocida y el plazo estimado es {{f1}} meses."));
        assertTrue(permits("strategy/priorityDebt/estimatedPayoffDate","La fecha estimada de pago es {{f1}}."));
        assertTrue(permits("strategy/projection/monthlyBudget","El plazo es conocido bajo el presupuesto mensual de {{f1}}."));
        assertTrue(permits("strategy/comparison/interestDifference","La diferencia en intereses totales es {{f1}}."));
        assertFalse(permits("strategy/projection/totalInterest","La diferencia en intereses totales es {{f1}}."));
    }
    @Test void basePaymentHasPaymentMeaning(){
        assertTrue(permits("strategy/priorityDebt/basePayment","Requiere un pago base de {{f1}}."));
        assertFalse(permits("strategy/priorityDebt/basePayment","El saldo es {{f1}}."));
    }
    @Test void savingsAndMonthsCannotBeSubstitutedByBalancesOrTotalInterest(){
        assertTrue(permits("comparison/interestDifference","La diferencia de intereses es {{f1}}."));
        assertFalse(permits("comparison/avalanche/totalInterest","El ahorro en intereses es {{f1}}."));
        assertFalse(permits("debts/0/currentBalance","El ahorro es {{f1}}."));
        assertTrue(permits("comparison/monthsDifference","La diferencia de meses es {{f1}}."));
        assertFalse(permits("comparison/interestDifference","La diferencia de meses es {{f1}}."));
    }
    @Test void supportBookingDateTimeAndLiteralsArePermittedAndGrounded(){
        var analysis=new AssistantAnalysisService(null,null,null,null,null,null,null,null,null);
        var startFact=new AssistantAnalysisService.Fact("supportBooking/start",com.fasterxml.jackson.databind.node.TextNode.valueOf("2026-11-16T10:00:00-05:00"));
        var endFact=new AssistantAnalysisService.Fact("supportBooking/end",com.fasterxml.jackson.databind.node.TextNode.valueOf("2026-11-16T10:30:00-05:00"));
        var instructionFact=new AssistantAnalysisService.Fact("supportBooking/instruction",com.fasterxml.jackson.databind.node.TextNode.valueOf("Confirmar asesoria CEROA-ABC123"));
        var facts=Map.of("f16",startFact,"f18",endFact,"f19",instructionFact);
        String grounded=analysis.groundForDelegation(facts,"Hay disponibilidad para una asesoría el próximo lunes a las 10:00 de Bogotá ({{f16}}), con fecha de finalización {{f18}}. Para confirmar usa {{f19}}.");
        assertTrue(grounded.contains("{{f16}}"));
        String resolved=analysis.resolve(facts,grounded);
        assertTrue(resolved.contains("2026-11-16T10:00:00-05:00"));
        assertTrue(resolved.contains("2026-11-16T10:30:00-05:00"));
        assertTrue(resolved.contains("Confirmar asesoria CEROA-ABC123"));
    }
}
