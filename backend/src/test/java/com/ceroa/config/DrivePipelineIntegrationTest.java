package com.ceroa.config;
import com.ceroa.domain.*;import com.ceroa.repository.*;import com.ceroa.service.*;import com.ceroa.api.dto.DocumentContracts;
import org.junit.jupiter.api.*;import org.springframework.beans.factory.annotation.Autowired;import org.springframework.boot.test.context.SpringBootTest;import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.mock.web.MockMultipartFile;import java.util.*;import java.time.*;import java.security.*;
import static org.junit.jupiter.api.Assertions.*;import static org.mockito.Mockito.*;import static org.mockito.ArgumentMatchers.*;
@SpringBootTest
class DrivePipelineIntegrationTest {
 @Autowired DriveSyncService service;@Autowired ApprovedDriveSourceRepository sources;@Autowired DriveSyncFileRepository files;@Autowired UserRepository users;
 @MockitoBean DocumentLibraryService library;@MockitoBean FinancialDocumentRepository documents;
 @Test void newFileAndModifiedVersionUseExistingUploadAndReplace()throws Exception{
  var u=new User();u.setFullName("Pipeline fixture");u.setEmail(UUID.randomUUID()+"@example.invalid");u=users.saveAndFlush(u);final var owner=u.getId();
  var source=new ApprovedDriveSource();source.ownerId=owner;source.folderId="approved";source.active=true;source.approvedAt=OffsetDateTime.now();source=sources.saveAndFlush(source);
  var id=UUID.randomUUID();var first=new DocumentContracts.Document(id,owner,null,"OTHER",null,null,null,null,"PENDING",1,OffsetDateTime.now());var second=new DocumentContracts.Document(id,owner,null,"OTHER",null,null,null,null,"PENDING",2,OffsetDateTime.now());
  when(library.upload(any(),any(),eq(true))).thenAnswer(i->{assertEquals(owner.toString(),org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName());return first;});when(library.replace(eq(id),eq(1),any(),eq(true),isNull())).thenReturn(second);when(documents.hash(id)).thenReturn("old");
  byte[] a="synthetic first".getBytes(),b="synthetic changed".getBytes();var w=service.validate(source.id,new DriveSyncService.Metadata("file","manual.pdf","application/pdf","1",HexFormat.of().formatHex(MessageDigest.getInstance("MD5").digest(a)),List.of("approved"),(long)a.length,false));assertEquals("QUEUED",service.ingest(w.id(),w.leaseToken(),new MockMultipartFile("file","manual.pdf","application/pdf",a)).status());
  var next=service.validate(source.id,new DriveSyncService.Metadata("file","manual.pdf","application/pdf","2",HexFormat.of().formatHex(MessageDigest.getInstance("MD5").digest(b)),List.of("approved"),(long)b.length,false));assertEquals(2,service.ingest(next.id(),next.leaseToken(),new MockMultipartFile("file","manual.pdf","application/pdf",b)).documentVersion());
  verify(library,times(1)).upload(any(),any(),eq(true));verify(library,times(1)).replace(eq(id),eq(1),any(),eq(true),isNull());assertEquals("2",files.findById(w.id()).orElseThrow().lastVersion);
 }
}
