package com.ceroa.service;

import com.ceroa.repository.FinancialDocumentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class DocumentBatchAuthorizationTest {
    @Test void batchQueryEnforcesOwnerGrantsCurrentVersionAndIndexedStatus(){
        var dataSource=new DriverManagerDataSource("jdbc:h2:mem:"+UUID.randomUUID()+";MODE=PostgreSQL;DB_CLOSE_DELAY=-1","sa","");
        var db=new JdbcTemplate(dataSource);
        db.execute("CREATE TABLE financial_documents(id UUID PRIMARY KEY,owner_id UUID,processing_status VARCHAR,document_version INT)");
        db.execute("CREATE TABLE document_access_grants(actor_id UUID,owner_id UUID,expires_at TIMESTAMP,permission VARCHAR)");
        db.execute("CREATE TABLE document_chunks(id UUID PRIMARY KEY,document_id UUID,document_version INT,chunk_order INT,page INT,location VARCHAR,content VARCHAR)");
        UUID actor=UUID.randomUUID(),foreignOwner=UUID.randomUUID(),own=UUID.randomUUID(),foreign=UUID.randomUUID(),pending=UUID.randomUUID();
        db.update("INSERT INTO financial_documents VALUES (?,?,'INDEXED',2),(?,?,'INDEXED',1),(?,?,'PENDING',1)",own,actor,foreign,foreignOwner,pending,actor);
        db.update("INSERT INTO document_chunks VALUES (?,?,2,0,1,'page 1','current'),(?,?,1,0,1,'page 1','stale'),(?,?,1,0,1,'page 1','foreign'),(?,?,1,0,1,'page 1','pending')",UUID.randomUUID(),own,UUID.randomUUID(),own,UUID.randomUUID(),foreign,UUID.randomUUID(),pending);
        var repository=new FinancialDocumentRepository(dataSource);
        var requested=List.of(own,foreign,pending);
        var result=repository.indexedSourcesBatch(actor,requested);
        assertEquals(List.of("current"),result.stream().map(s->s.content()).toList());
        db.update("INSERT INTO document_access_grants VALUES (?,?,DATEADD('HOUR',1,CURRENT_TIMESTAMP),'DOCUMENT_READ')",actor,foreignOwner);
        assertEquals(Set.of("current","foreign"),new HashSet<>(repository.indexedSourcesBatch(actor,requested).stream().map(s->s.content()).toList()));
        db.update("UPDATE document_access_grants SET expires_at=DATEADD('HOUR',-1,CURRENT_TIMESTAMP)");
        assertEquals(1,repository.indexedSourcesBatch(actor,requested).size());
        assertTrue(repository.indexedSourcesBatch(actor,List.of()).isEmpty());
        assertThrows(IllegalArgumentException.class,()->repository.indexedSourcesBatch(actor,Collections.nCopies(51,own)));
    }
}
