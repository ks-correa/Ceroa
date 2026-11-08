package com.ceroa.config;
import com.ceroa.domain.*;
import com.ceroa.repository.*;
import com.ceroa.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import java.util.*;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest
class DriveSyncIntegrationTest {
 @Autowired DriveSyncService service;@Autowired ApprovedDriveSourceRepository sources;@Autowired DriveSyncFileRepository files;@Autowired UserRepository users;
 ApprovedDriveSource source;
 @BeforeEach void setup(){var u=new User();u.setFullName("Drive fixture");u.setEmail(UUID.randomUUID()+"@example.invalid");u=users.saveAndFlush(u);source=new ApprovedDriveSource();source.ownerId=u.getId();source.folderId="approved-folder";source.active=true;source.approvedAt=OffsetDateTime.now();source=sources.saveAndFlush(source);}
 DriveSyncService.Metadata metadata(String version,String checksum,List<String> parents){return new DriveSyncService.Metadata("file-1","manual.pdf","application/pdf",version,checksum,parents,100L,false);}
 @Test void rejectsUnapprovedFolderAndDisabledSource(){assertThrows(RuntimeException.class,()->service.validate(source.id,metadata("1","a".repeat(32),List.of("other"))));source.active=false;sources.saveAndFlush(source);assertThrows(RuntimeException.class,()->service.validate(source.id,metadata("1","a".repeat(32),List.of(source.folderId))));}
 @Test void leasesOnlyChangedFilesAndPreventsConcurrentDownloads(){var m=metadata("1","a".repeat(32),List.of(source.folderId));var w=service.validate(source.id,m);assertEquals("DOWNLOAD",w.status());assertThrows(RuntimeException.class,()->service.validate(source.id,m));assertThrows(RuntimeException.class,()->service.ingest(w.id(),UUID.randomUUID(),null));}
 @Test void checksumAndVersionSkipWithoutCreatingAnotherDocument(){var w=service.validate(source.id,metadata("1","a".repeat(32),List.of(source.folderId)));var f=files.findById(w.id()).orElseThrow();f.lastVersion="1";f.lastChecksum="a".repeat(32);f.leaseUntil=null;f.leaseToken=null;files.saveAndFlush(f);assertEquals("UNCHANGED",service.validate(source.id,metadata("2","a".repeat(32),List.of(source.folderId))).status());assertThrows(RuntimeException.class,()->service.validate(source.id,metadata("2","b".repeat(32),List.of(source.folderId))));assertEquals("UNCHANGED",service.validate(source.id,metadata("1","b".repeat(32),List.of(source.folderId))).status());}
 @Test void downloadedBytesMustMatchVerifiedMetadata(){var w=service.validate(source.id,metadata("1","a".repeat(32),List.of(source.folderId)));assertThrows(IllegalArgumentException.class,()->service.ingest(w.id(),w.leaseToken(),new org.springframework.mock.web.MockMultipartFile("file","manual.pdf","application/pdf","different".getBytes())));}
}
