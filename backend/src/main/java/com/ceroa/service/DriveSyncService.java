package com.ceroa.service;
import com.ceroa.domain.*;
import com.ceroa.repository.*;
import com.ceroa.api.dto.DocumentContracts;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import java.util.*;
import java.time.*;
import java.security.MessageDigest;
import java.math.BigInteger;

/** Connector provenance and synchronization only. Extraction, storage, jobs and indexing remain in the existing library. */
@Service
public class DriveSyncService {
    public record Metadata(String id,String name,String mimeType,String version,String md5Checksum,List<String> parents,Long size,boolean trashed) {}
    public record Work(UUID id,UUID leaseToken,String fileId,String version,String status,UUID documentId,Integer documentVersion) {}
    private record UploadContext(UUID owner,UUID document,Integer documentVersion,String checksum,String version) {}
    private final ApprovedDriveSourceRepository sources;private final DriveSyncFileRepository files;private final UserRepository users;
    private final DocumentLibraryService library;private final FinancialDocumentRepository documents;private final TransactionTemplate tx;private final IntegrationEventService events;
    public DriveSyncService(ApprovedDriveSourceRepository sources,DriveSyncFileRepository files,UserRepository users,DocumentLibraryService library,FinancialDocumentRepository documents,PlatformTransactionManager tm,IntegrationEventService events){this.sources=sources;this.files=files;this.users=users;this.library=library;this.documents=documents;this.events=events;tx=new TransactionTemplate(tm);}
    private ApprovedDriveSource approved(UUID id){var s=sources.locked(id).orElseThrow(()->new ResponseStatusException(HttpStatus.FORBIDDEN));if(!s.active||s.approvedAt==null||!users.findById(s.ownerId).orElseThrow().isActive())throw new ResponseStatusException(HttpStatus.FORBIDDEN);return s;}
    public Work validate(UUID sourceId,Metadata m){return tx.execute(t->{
        var source=approved(sourceId);
        if(m==null||m.trashed()||m.id()==null||!m.id().matches("[A-Za-z0-9_-]{1,200}")||m.parents()==null||!m.parents().contains(source.folderId))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Origen no aprobado");
        if(m.name()==null||m.name().length()>255||m.version()==null||!m.version().matches("[0-9]{1,30}")||m.md5Checksum()==null||!m.md5Checksum().matches("[a-f0-9]{32}")||m.size()==null||m.size()<1||m.size()>DocumentTextExtractor.MAX_BYTES||!Set.of("application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet").contains(m.mimeType()))throw new IllegalArgumentException("Archivo no compatible");
        var f=files.findBySourceIdAndFileId(sourceId,m.id()).orElseGet(()->{var n=new DriveSyncFile();n.sourceId=sourceId;n.fileId=m.id();n.status="NEW";return n;});
        if(f.lastVersion!=null&&new BigInteger(m.version()).compareTo(new BigInteger(f.lastVersion))<=0){if(f.lastVersion.equals(m.version())&&!Objects.equals(f.lastChecksum,m.md5Checksum()))throw new ResponseStatusException(HttpStatus.CONFLICT,"Versión con contenido inconsistente");return work(f,"UNCHANGED");}
        if(Objects.equals(f.lastChecksum,m.md5Checksum())){f.lastVersion=m.version();files.save(f);return work(f,"UNCHANGED");}
        if(f.leaseUntil!=null&&f.leaseUntil.isAfter(OffsetDateTime.now()))throw new ResponseStatusException(HttpStatus.CONFLICT,"Sincronización en curso");
        f.pendingVersion=m.version();f.pendingChecksum=m.md5Checksum();f.fileName=m.name();f.mimeType=m.mimeType();f.status="LEASED";f.leaseToken=UUID.randomUUID();f.leaseUntil=OffsetDateTime.now().plusMinutes(5);files.save(f);return work(f,"DOWNLOAD");
    });}
    private Work work(DriveSyncFile f,String status){return new Work(f.id,f.leaseToken,f.fileId,f.pendingVersion,status,f.documentId,f.documentVersion);}
    private DriveSyncFile lease(UUID id,UUID token){var f=files.locked(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));if(token==null||!token.equals(f.leaseToken)||f.leaseUntil==null||!f.leaseUntil.isAfter(OffsetDateTime.now()))throw new ResponseStatusException(HttpStatus.CONFLICT);return f;}
    private DriveSyncFile approvedLease(UUID id,UUID token){var snapshot=files.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));approved(snapshot.sourceId);return lease(id,token);}
    public List<Work> reconcile(){var result=new ArrayList<Work>();for(var snapshot:files.findTop20ByStatusOrderByUpdatedAtAsc("QUEUED")){
        try{var w=tx.execute(t->{var s=approved(snapshot.sourceId);var f=files.locked(snapshot.id).orElseThrow();if(!"QUEUED".equals(f.status)||f.documentId==null)return work(f,f.status);var d=documents.get(s.ownerId,f.documentId,false,false);if(d.version()!=f.documentVersion)f.status="SUPERSEDED";else if("INDEXED".equals(d.status()))f.status="READY";else if("FAILED".equals(d.status()))f.status="FAILED";else if("REVIEW_REQUIRED".equals(d.status()))f.status="REVIEW_REQUIRED";f.updatedAt=OffsetDateTime.now();files.saveAndFlush(f);if(Set.of("READY","FAILED").contains(f.status))events.driveMetric(f.id,f.lastVersion,f.status);return work(f,f.status);});result.add(w);}catch(ResponseStatusException e){/* Revoked sources cannot be read by the connector. */}
    }return List.copyOf(result);}
    public Work ingest(UUID id,UUID token,MultipartFile file){
        var input=tx.execute(t->{var f=approvedLease(id,token);var s=sources.findById(f.sourceId).orElseThrow();if(!Set.of("LEASED","INDEXING").contains(f.status))throw new ResponseStatusException(HttpStatus.CONFLICT);f.status="INDEXING";return new UploadContext(s.ownerId,f.documentId,f.documentVersion,f.pendingChecksum,f.pendingVersion);});
        try{
            if(file==null||file.isEmpty()||file.getSize()>DocumentTextExtractor.MAX_BYTES||!HexFormat.of().formatHex(MessageDigest.getInstance("MD5").digest(file.getBytes())).equals(input.checksum()))throw new IllegalArgumentException("El archivo descargado no coincide con su versión");
            var previous=SecurityContextHolder.getContext();var c=SecurityContextHolder.createEmptyContext();c.setAuthentication(new UsernamePasswordAuthenticationToken(input.owner().toString(),null,List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("DOCUMENT_CONNECTOR"))));SecurityContextHolder.setContext(c);
            DocumentContracts.Document doc;
            try{
                String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(file.getBytes()));
                if(input.document()!=null&&hash.equals(documents.hash(input.document())))doc=library.get(input.document());
                else if(input.document()!=null)doc=library.replace(input.document(),input.documentVersion(),file,true,null);
                else doc=library.upload(file,new DocumentContracts.Metadata(DocumentContracts.Identification.OTHER,DocumentContracts.Kind.OTHER,null,null,null,null,null),true);
            }finally{SecurityContextHolder.setContext(previous);}
            return tx.execute(t->{var f=approvedLease(id,token);f.documentId=doc.id();f.documentVersion=doc.version();f.lastVersion=input.version();f.lastChecksum=input.checksum();f.status="QUEUED";f.leaseUntil=null;f.leaseToken=null;events.driveMetric(f.id,f.lastVersion,"QUEUED");return work(f,"QUEUED");});
        }catch(RuntimeException e){throw e;}catch(Exception e){throw new IllegalArgumentException("No fue posible incorporar el archivo");}
    }
}
