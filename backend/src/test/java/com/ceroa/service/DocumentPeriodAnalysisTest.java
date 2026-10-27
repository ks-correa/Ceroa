package com.ceroa.service;

import com.ceroa.api.dto.DocumentContracts.*;
import com.ceroa.domain.User;
import com.ceroa.repository.FinancialDocumentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DocumentPeriodAnalysisTest {
    final UUID owner=UUID.randomUUID();
    final FinancialDocumentRepository repo=mock(FinancialDocumentRepository.class);
    final CurrentUserService current=mock(CurrentUserService.class);
    final DocumentLibraryService service;
    final Filters filters=new Filters(null,null,Kind.BANK_STATEMENT,null,LocalDate.of(2026,8,1),LocalDate.of(2026,9,1));
    DocumentPeriodAnalysisTest(){
        var user=new User();user.setId(owner);user.setActive(true);when(current.entity()).thenReturn(user);
        service=new DocumentLibraryService(repo,current,null,null,null,null,null,new ObjectMapper().findAndRegisterModules(),mock(PlatformTransactionManager.class),null,null,null,null,true);
    }
    Document document(String status){return new Document(UUID.randomUUID(),owner,"CC","BANK_STATEMENT","Banco de prueba",filters.periodFrom(),filters.periodToExclusive(),null,status,1,OffsetDateTime.now());}
    Source source(Document document,String content){return new Source(document.id(),UUID.randomUUID(),1,"page 1",content,0,1);}
    @Test void includesEveryIndexedStatementInPeriodWithoutSemanticRanking(){
        var first=document("INDEXED");var second=document("INDEXED");
        when(repo.search(owner,filters,0,11)).thenReturn(List.of(first,second));
        when(repo.indexedSources(owner,first.id())).thenReturn(List.of(source(first,"Pago $100.000")));
        when(repo.indexedSources(owner,second.id())).thenReturn(List.of(source(second,"Intereses $20.000")));
        var result=service.query(new Query(Intent.PERIOD_ANALYSIS,"pagos e intereses",filters,0,10));
        assertEquals("AVAILABLE",result.evidenceStatus());assertEquals(2,result.documents().size());assertEquals(2,result.sources().size());
        assertEquals(false,((Map<?,?>)result.verifiedData()).get("hasMoreDocuments"));
        verify(repo,never()).retrieve(any(),any(),any(),any());
    }
    @Test void incompleteIndexIsReportedAsPartialAndCannotSupportACompleteTotal(){
        var indexed=document("INDEXED");var pending=document("PENDING");
        when(repo.search(owner,filters,0,11)).thenReturn(List.of(indexed,pending));
        when(repo.indexedSources(owner,indexed.id())).thenReturn(List.of(source(indexed,"Pago $100.000")));
        var result=service.query(new Query(Intent.PERIOD_ANALYSIS,"pagos",filters,0,10));
        assertEquals("PARTIAL",result.evidenceStatus());assertEquals(false,((Map<?,?>)result.verifiedData()).get("complete"));
        verify(repo,never()).indexedSources(owner,pending.id());
    }
}
