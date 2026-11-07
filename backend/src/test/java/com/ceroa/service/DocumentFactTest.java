package com.ceroa.service;

import com.ceroa.api.dto.DocumentContracts.*;
import com.ceroa.api.dto.DocumentFactContracts.*;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class DocumentFactTest {
    Document document(int month){return new Document(UUID.randomUUID(),owner,"CC","BANK_STATEMENT","Banco",LocalDate.of(2026,month,1),LocalDate.of(2026,month,1).plusMonths(1),null,"INDEXED",1,OffsetDateTime.now());}
    final UUID owner=UUID.randomUUID();
    List<Fact> extract(Document d,String text){return DocumentFactExtractor.extract(new Source(d.id(),UUID.randomUUID(),1,"page 1","\n"+text+"\n",0,d.version()));}
    @Test void extractsTypedValuesWithExactOffsetsAndConservativeUnknowns(){
        var d=document(8);String text="Saldo: COP 1.234,56\nPago mínimo: $100.000\nTasa: 2,5% EM\nFecha de vencimiento: 31/08/2026\nEntidad: Banco";
        var facts=extract(d,text);assertEquals(5,facts.size());
        var balance=facts.getFirst();assertEquals("1234.56",balance.numericValue().toPlainString());assertEquals("COP",balance.currency());assertEquals("VERIFIED",balance.validationStatus());
        assertEquals("NEEDS_REVIEW",facts.get(1).validationStatus());assertNull(facts.get(1).currency());assertNull(facts.get(1).numericValue());
        assertEquals("EM",facts.get(2).rateMode());assertEquals(LocalDate.of(2026,8,31),facts.get(3).dateValue());
        for(var f:facts){assertEquals(f.quote(),("\n"+text+"\n").substring(f.quoteStart(),f.quoteEnd()));assertEquals(d.version(),f.documentVersion());}
    }
    @Test void incompleteChunkEdgesCannotCreateTruncatedNumbers(){
        var d=document(8);
        assertTrue(DocumentFactExtractor.extract(new Source(d.id(),UUID.randomUUID(),1,"page 1","Saldo: COP 100",0,1)).isEmpty());
        assertTrue(DocumentFactExtractor.extract(new Source(d.id(),UUID.randomUUID(),1,"page 1","continuación\nSaldo: COP 100",0,1)).isEmpty());
        assertTrue(extract(d,"Fecha de corte: 31/02/2026\nTasa: 200% EA\nSaldo: COP 100 USD").isEmpty());
    }
    @Test void comparesOnlyLinkedObligationsWithCompatibleUnitsAndDisjointPeriods(){
        var a=document(8);var b=document(9);var debt=UUID.randomUUID();var facts=new ArrayList<>(extract(a,"Saldo: COP 1000"));facts.addAll(extract(b,"Saldo: COP 800"));
        var result=DocumentFactAnalysis.analyze(List.of(a,b),facts,Map.of(a.id(),debt,b.id(),debt),com.ceroa.api.dto.DocumentFactContracts.Kind.BALANCE);
        assertTrue(result.complete());assertEquals(1,result.comparisons().size());assertEquals(-200,result.comparisons().getFirst().delta().intValueExact());
        assertFalse(DocumentFactAnalysis.analyze(List.of(a,b),facts,Map.of(),com.ceroa.api.dto.DocumentFactContracts.Kind.BALANCE).complete());
        var different=new ArrayList<>(extract(a,"Saldo: COP 1000"));different.addAll(extract(b,"Saldo: USD 800"));
        assertTrue(DocumentFactAnalysis.analyze(List.of(a,b),different,Map.of(a.id(),debt,b.id(),debt),com.ceroa.api.dto.DocumentFactContracts.Kind.BALANCE).comparisons().isEmpty());
    }
    @Test void repeatedMovementReferencesAreSubtotalsNotRegisteredPayments(){
        var a=document(8);var b=document(8);var debt=UUID.randomUUID();
        var facts=new ArrayList<>(extract(a,"Movimiento ref ABC123 2026-08-02 COP -100"));facts.addAll(extract(b,"Movimiento ref ABC123 2026-08-02 COP -100"));
        var result=DocumentFactAnalysis.analyze(List.of(a,b),facts,Map.of(a.id(),debt,b.id(),debt),com.ceroa.api.dto.DocumentFactContracts.Kind.MOVEMENT);
        assertFalse(result.complete());assertEquals(1,result.movementTotals().getFirst().uniqueMovements());assertEquals(-100,result.movementTotals().getFirst().signedSubtotal().intValueExact());
        facts.addAll(extract(b,"Movimiento ref ABC123 2026-08-02 COP -200"));
        var conflicting=DocumentFactAnalysis.analyze(List.of(a,b),facts,Map.of(a.id(),debt,b.id(),debt),com.ceroa.api.dto.DocumentFactContracts.Kind.MOVEMENT);
        assertTrue(conflicting.movementTotals().isEmpty());assertTrue(conflicting.limitations().contains("CONFLICTING_MOVEMENT_REFERENCE"));
    }
    @Test void staleVersionsAndOverlappingPeriodsCannotSupportAComparison(){
        var a=document(8);var b=document(8);var debt=UUID.randomUUID();var facts=new ArrayList<>(extract(a,"Saldo: COP 1000"));facts.addAll(extract(b,"Saldo: COP 800"));
        var result=DocumentFactAnalysis.analyze(List.of(a,b),facts,Map.of(a.id(),debt,b.id(),debt),com.ceroa.api.dto.DocumentFactContracts.Kind.BALANCE);
        assertFalse(result.complete());assertTrue(result.comparisons().isEmpty());
        var changed=new Document(a.id(),owner,"CC","BANK_STATEMENT","Banco",a.periodStart(),a.periodEnd(),null,"INDEXED",2,a.uploadedAt());
        assertTrue(DocumentFactAnalysis.analyze(List.of(changed),facts,Map.of(),com.ceroa.api.dto.DocumentFactContracts.Kind.BALANCE).facts().isEmpty());
    }
    @Test void contextBudgetsPreserveCoverageAndNeverTrimAnIndividualValue(){
        var d=document(8);var s=new Source(d.id(),UUID.randomUUID(),1,"page 1","Saldo: COP 1000",0,1);
        var result=new Result("available",Map.of("complete",true,"hasMoreDocuments",true,"nextOffset",10),Filters.empty(),List.of(s),List.of(d),"AVAILABLE",UUID.randomUUID(),1);
        var bounded=DocumentQueryBudget.bound(result,5);assertEquals("PARTIAL",bounded.evidenceStatus());assertTrue(bounded.sources().isEmpty());
        var coverage=(Map<?,?>)bounded.verifiedData();assertEquals(false,coverage.get("complete"));assertEquals(true,coverage.get("hasMoreDocuments"));assertEquals(10,coverage.get("nextOffset"));
    }
}
