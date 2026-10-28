package com.ceroa.service;

import com.ceroa.api.dto.DocumentContracts.*;
import com.ceroa.repository.FinancialDocumentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.*;
import java.util.*;
import java.security.MessageDigest;

@Service
public class DocumentLibraryService {
    private final FinancialDocumentRepository repo;private final CurrentUserService current;private final DebtService debts;
    private final DocumentTextExtractor extractor;private final DocumentPrivacy privacy;private final PrivateDocumentStorage storage;
    private final RagEmbeddingClient embeddings;private final ObjectMapper json;private final TransactionTemplate tx;
    private final boolean enabled;
    private final com.ceroa.repository.UserRepository users;
    private final AssistantAnalysisService analysis;
    private final DocumentLibraryDispatcher dispatcher;
    private final DocumentOcrClient ocr;
    private final Map<UUID,ArrayDeque<Instant>> limits=new HashMap<>();
    private record DownloadTicket(UUID actor,UUID document,int version,Instant expires) {}
    public record DownloadContent(byte[] bytes,String contentType) {}
    private final Map<UUID,DownloadTicket> downloads=new java.util.concurrent.ConcurrentHashMap<>();
    public DocumentLibraryService(FinancialDocumentRepository repo,CurrentUserService current,DebtService debts,
        DocumentTextExtractor extractor,DocumentPrivacy privacy,PrivateDocumentStorage storage,RagEmbeddingClient embeddings,
        ObjectMapper json,org.springframework.transaction.PlatformTransactionManager tm,com.ceroa.repository.UserRepository users,AssistantAnalysisService analysis,DocumentLibraryDispatcher dispatcher,DocumentOcrClient ocr,@Value("${ceroa.library.enabled:false}") boolean enabled) {
        this.repo=repo;this.current=current;this.debts=debts;this.extractor=extractor;this.privacy=privacy;this.storage=storage;this.embeddings=embeddings;this.json=json;tx=new TransactionTemplate(tm);this.users=users;this.analysis=analysis;this.dispatcher=dispatcher;this.ocr=ocr;this.enabled=enabled;
    }
    private UUID actor() {available();var u=current.entity();if(!u.isActive())throw new org.springframework.security.access.AccessDeniedException("Cuenta inactiva");return u.getId();}
    private void available(){if(!enabled)throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Biblioteca documental pendiente de configurar");}
    private synchronized void limit(UUID actor) {
        Instant now=Instant.now();limits.values().forEach(q->{while(!q.isEmpty()&&q.peek().isBefore(now.minusSeconds(60)))q.remove();});limits.entrySet().removeIf(e->e.getValue().isEmpty());
        if(limits.size()>10000)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
        var q=limits.computeIfAbsent(actor,k->new ArrayDeque<>());if(q.size()>=20)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);q.add(now);
    }
    private void metadata(Metadata m) {m.validate();if(m.debtId()!=null)debts.findById(m.debtId());}
    private record Upload(byte[] bytes,String hash,String suffix,String mime,boolean review) {}
    private Upload prepareUpload(MultipartFile file,String sheet) {
        if(file==null||file.isEmpty()||file.getSize()>DocumentTextExtractor.MAX_BYTES)throw new IllegalArgumentException();
        String name=Optional.ofNullable(file.getOriginalFilename()).orElse("").toLowerCase(Locale.ROOT);boolean scanned=false;
        try{var source=extractor.extract(file,sheet);if(source.segments().isEmpty())throw new IllegalArgumentException("Selecciona explícitamente una hoja XLSX");}
        catch(IllegalArgumentException e){if(name.endsWith(".pdf")&&e.getMessage()!=null&&e.getMessage().contains("escaneadas"))scanned=true;else throw e;}
        try{byte[] bytes=file.getBytes();String suffix=name.endsWith(".pdf")?"pdf":name.endsWith(".docx")?"docx":"xlsx";
            String mime=suffix.equals("pdf")?"application/pdf":suffix.equals("docx")?"application/vnd.openxmlformats-officedocument.wordprocessingml.document":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            return new Upload(bytes,HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)),suffix,mime,scanned&&!ocr.configured());
        }catch(Exception e){throw new IllegalArgumentException("No fue posible validar el archivo",e);}
    }
    public Document upload(MultipartFile file,Metadata m,boolean consent) {
        return upload(file,m,consent,null);
    }
    public Document upload(MultipartFile file,Metadata m,boolean consent,String sheet) {
        UUID owner=actor();limit(owner);if(!consent)throw new IllegalArgumentException("Autoriza el procesamiento documental");
        boolean automatic=m==null;Metadata initial=automatic?new Metadata(null,Kind.OTHER,null,null,null,null,null):m;metadata(initial);
        Upload input=prepareUpload(file,sheet);
        try {
            byte[] bytes=input.bytes();String hash=input.hash();
            var duplicate=repo.duplicate(owner,hash);if(duplicate.isPresent())return duplicate.get();
            UUID id=UUID.randomUUID();String suffix=input.suffix();
            String path=owner+"/"+id+"."+suffix;
            storage.put(path,bytes,input.mime());
            try {var saved=tx.execute(s->{repo.insert(id,owner,initial,path,input.mime(),hash);repo.automaticMetadata(id,automatic);repo.sheet(id,sheet);if(org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getAuthorities().stream().anyMatch(a->a.getAuthority().equals("DOCUMENT_CONNECTOR")))repo.connectorSource(id,owner);if(input.review()){var job=repo.jobs(id).getFirst();repo.finish(job,"REVIEW_REQUIRED","OCR_NOT_CONFIGURED");}return repo.get(owner,id,false,false);});dispatcher.wake();return saved;}
            catch(RuntimeException e){storage.delete(path);var existing=repo.duplicate(owner,hash);if(existing.isPresent())return existing.get();throw e;}
        }catch(RuntimeException e){throw e;}catch(Exception e){throw new IllegalArgumentException("No fue posible guardar el documento",e);}
    }
    public Document replace(UUID id,int expectedVersion,MultipartFile file,boolean consent,String sheet) {
        UUID actor=actor();limit(actor);var currentDocument=repo.get(actor,id,true,false);
        if(!consent)throw new IllegalArgumentException("Autoriza el análisis del nuevo original");
        if(currentDocument.version()!=expectedVersion||currentDocument.status().equals("DELETING"))throw new ResponseStatusException(HttpStatus.CONFLICT,"El documento cambió; actualiza antes de reemplazarlo");
        Upload input=prepareUpload(file,sheet);
        if(repo.hash(id).equals(input.hash()))return currentDocument;
        if(repo.duplicate(currentDocument.ownerId(),input.hash()).isPresent())throw new ResponseStatusException(HttpStatus.CONFLICT,"El archivo ya pertenece a otro documento de esta cuenta");
        String path=currentDocument.ownerId()+"/"+id+"/revisions/"+UUID.randomUUID()+"."+input.suffix();
        storage.put(path,input.bytes(),input.mime());
        Document saved;
        try{saved=tx.execute(s->{
            var d=repo.get(actor,id,true,true);if(d.version()!=expectedVersion||d.status().equals("DELETING"))throw new ResponseStatusException(HttpStatus.CONFLICT,"El documento cambió; actualiza antes de reemplazarlo");
            repo.archive(id);var m=metadata(d);repo.update(id,new Metadata(m.identificationType(),m.documentType(),m.financialEntity(),m.periodStart(),m.periodEnd(),m.issuedAt(),repo.debt(id)),d.version()+1);
            repo.replacePointer(id,path,input.mime(),input.hash(),sheet);
            if(input.review())repo.finish(repo.jobs(id).getFirst(),"REVIEW_REQUIRED","OCR_NOT_CONFIGURED");
            auditResource(actor,id,"REPLACE");return repo.get(actor,id,false,false);
        });}catch(RuntimeException error){storage.delete(path);throw error;}
        downloads.entrySet().removeIf(e->e.getValue().document().equals(id));dispatcher.wake();return saved;
    }
    public List<com.ceroa.api.dto.DocumentContracts.Version> versions(UUID id){get(id);return repo.versions(id);}
    public Document get(UUID id){UUID a=actor();var d=repo.get(a,id,false,false);if(!d.ownerId().equals(a))repo.audit(UUID.randomUUID(),a,Intent.METADATA_SEARCH,"{\"documentId\":\""+id+"\"}",1,0);return d;}
    public List<Job> jobs(UUID id){get(id);return repo.jobs(id);}
    public com.fasterxml.jackson.databind.JsonNode proposals(UUID id){get(id);try{return json.readTree(repo.proposals(id));}catch(Exception e){throw new IllegalStateException(e);}}
    public String download(UUID id){
        return downloadVersion(id,get(id).version());
    }
    public String downloadVersion(UUID id,int version){
        UUID actor=actor();limit(actor);var d=get(id);if(d.status().equals("DELETING"))throw new com.ceroa.exception.ResourceNotFoundException("Documento eliminado");repo.original(id,version);
        Instant now=Instant.now();downloads.entrySet().removeIf(e->!e.getValue().expires().isAfter(now));
        if(downloads.size()>=2000)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
        UUID ticket=UUID.randomUUID();downloads.put(ticket,new DownloadTicket(actor,id,version,now.plusSeconds(60)));
        return "/api/v1/financial-documents/"+id+"/content?ticket="+ticket;
    }
    public DownloadContent content(UUID id,UUID ticket){
        UUID actor=actor();limit(actor);var issued=downloads.get(ticket);
        if(issued==null||!issued.actor().equals(actor)||!issued.document().equals(id)||!issued.expires().isAfter(Instant.now()))throw new com.ceroa.exception.ResourceNotFoundException("Enlace vencido o no autorizado");
        var d=get(id);if(d.status().equals("DELETING"))throw new com.ceroa.exception.ResourceNotFoundException("Documento eliminado");
        var original=repo.original(id,issued.version());byte[] bytes=storage.read(original.path());var fresh=get(id);
        if(fresh.status().equals("DELETING")||fresh.version()!=d.version())throw new com.ceroa.exception.ResourceNotFoundException("Documento modificado");
        return new DownloadContent(bytes,original.mime());
    }
    public Document update(UUID id,Metadata m) {
        UUID actor=actor();limit(actor);metadata(m);
        return tx.execute(s->{var d=repo.get(actor,id,true,true);if(!d.ownerId().equals(actor)&&m.debtId()!=null)throw new IllegalArgumentException("La vinculación de deuda debe confirmarla su titular");if(d.status().equals("DELETING"))throw new IllegalArgumentException();var updated=new Metadata(m.identificationType(),m.documentType(),m.financialEntity(),m.periodStart(),m.periodEnd(),m.issuedAt(),m.debtId()==null?repo.debt(id):m.debtId());repo.update(id,updated,d.version()+1);auditResource(actor,id,"UPDATE");return repo.get(actor,id,false,false);});
    }
    public Document reprocess(UUID id) {var d=get(id);var m=metadata(d);return update(id,new Metadata(m.identificationType(),m.documentType(),m.financialEntity(),m.periodStart(),m.periodEnd(),m.issuedAt(),repo.debt(id)));}
    public void delete(UUID id) {
        UUID actor=actor();limit(actor);
        var paths=tx.execute(s->{repo.get(actor,id,true,true);repo.tombstone(id);auditResource(actor,id,"DELETE");return repo.paths(id);});
        downloads.entrySet().removeIf(e->e.getValue().document().equals(id));
        for(String path:paths)storage.delete(path); // Includes archived originals. Partial failure is safely retryable.
        tx.executeWithoutResult(s->{repo.get(actor,id,true,true);repo.delete(id);});
    }
    public Result query(Query q) {
        if(q==null||q.intent()==null||q.offset()<0||q.offset()>10000||q.limit()<1||q.limit()>50||q.question()!=null&&q.question().length()>2000)throw new IllegalArgumentException();
        UUID actor=actor();limit(actor);long start=System.nanoTime();Filters f=q.filters()==null?Filters.empty():q.filters();f.validate();
        boolean textOnly=false;
        var sources=List.<Source>of();var documents=List.<Document>of();
        if(q.intent()==Intent.METADATA_SEARCH) documents=repo.search(actor,f,q.offset(),q.limit());
        else if(q.intent()==Intent.PERIOD_ANALYSIS) {
            if(f.periodFrom()==null||f.periodToExclusive()==null||f.documentId()!=null)throw new IllegalArgumentException("Indica un período para analizar varios archivos");
            var page=repo.search(actor,f,q.offset(),q.limit()+1);
            boolean more=page.size()>q.limit();documents=page.stream().limit(q.limit()).toList();
            var gathered=new ArrayList<Source>();int characters=0;boolean truncated=more;boolean contentTruncated=false;int missingContent=0;
            for(var document:documents) {
                if(!"INDEXED".equals(document.status())){truncated=true;missingContent++;continue;}
                var indexed=repo.indexedSources(actor,document.id());
                if(indexed.isEmpty()){truncated=true;missingContent++;}
                for(var source:indexed) {
                    if(characters+source.content().length()>90000){truncated=true;contentTruncated=true;continue;}
                    gathered.add(source);characters+=source.content().length();
                }
            }
            sources=List.copyOf(gathered);
            var coverage=Map.of("documentsOnPage",documents.size(),"indexedSources",sources.size(),"hasMoreDocuments",more,
                "nextOffset",q.offset()+documents.size(),"complete",!truncated,"documentsWithoutContent",missingContent,"contentTruncated",contentTruncated);
            UUID trace=UUID.randomUUID();long elapsed=(System.nanoTime()-start)/1_000_000;
            try{repo.audit(trace,actor,q.intent(),json.writeValueAsString(f),documents.size(),elapsed);}catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException(e);}
            String status=documents.isEmpty()?"INSUFFICIENT":truncated?"PARTIAL":"AVAILABLE";
            String message=documents.isEmpty()?"No encontré documentos para el período indicado.":truncated
                ?"La cobertura es parcial: hay más documentos, archivos sin índice o contenido fuera del límite. No afirmes un total del período.":"Contenido de todos los documentos de esta página disponible para analizar; verifica cada movimiento antes de sumarlo.";
            return new Result(message,coverage,f,sources,documents,status,trace,elapsed);
        }
        else if(q.intent()!=Intent.STRUCTURED_QUERY) {
            if(q.question()==null||q.question().isBlank())throw new IllegalArgumentException();
            String vector=null;
            try{vector=embeddings.embed(privacy.redact(q.question(),current.entity().getDocumentId()));}
            catch(InterruptedException e){Thread.currentThread().interrupt();throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Embeddings no disponibles");}
            catch(Exception e){if(q.intent()==Intent.SEMANTIC_SEARCH)throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Embeddings no disponibles");textOnly=true;}
            sources=repo.retrieve(actor,q,vector,RagEmbeddingClient.MODEL);
            documents=sources.stream().map(Source::documentId).distinct().map(id->repo.get(actor,id,false,false)).toList();
        }
        // Financial aggregates remain in the established evidence tools, never inferred from document text.
        Object data=null;
        if(q.intent()==Intent.STRUCTURED_QUERY||q.intent()==Intent.COMBINED_QUERY) {
            var now=LocalDate.now(ZoneId.of("America/Bogota"));
            data=Map.of("summary",analysis.read(AssistantAnalysisService.Dataset.summary,now.getYear(),now.getMonthValue(),0),"scope","AUTHENTICATED_OWNER","periodMeaning","Document filters do not change current financial summary. Historical totals use the existing progress tool.");
        }
        UUID trace=UUID.randomUUID();long elapsed=(System.nanoTime()-start)/1_000_000;
        try{repo.audit(trace,actor,q.intent(),json.writeValueAsString(f),documents.size(),elapsed);}catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException(e);}
        boolean sufficient=!documents.isEmpty()||data!=null;
        String status=!sufficient?"INSUFFICIENT":q.intent()==Intent.COMBINED_QUERY&&documents.isEmpty()?"PARTIAL":textOnly?"TEXT_ONLY":"AVAILABLE";
        String message=status.equals("INSUFFICIENT")?"No hay evidencia documental suficiente para responder.":status.equals("PARTIAL")?"Hay datos financieros del backend, pero no evidencia documental suficiente.":"Resultados disponibles en las fuentes y datos adjuntos; verifica los originales.";
        if(textOnly)message="Recuperación textual: el proveedor semántico no está disponible. "+message;
        return new Result(message,data,f,sources,documents,status,trace,elapsed);
    }
    public List<String> indexedContent(UUID id) {
        UUID reader=actor();limit(reader);
        return repo.indexedContent(reader,id);
    }
    public List<Map<String,Object>> audit(int offset){UUID actor=actor();if(offset<0||offset>10000)throw new IllegalArgumentException();return repo.audit(actor,offset);}
    static Metadata metadata(Document d){return new Metadata(d.identificationType()==null?null:Identification.valueOf(d.identificationType()),Kind.valueOf(d.documentType()),d.financialEntity(),d.periodStart(),d.periodEnd(),d.issuedAt(),null);}
    public Optional<Work> claim() {
        available();
        return tx.execute(s->{
            var claimed=repo.claim();if(claimed.isEmpty())return Optional.empty();Job j=claimed.get();var d=repo.forJob(j);
            try {
                byte[] bytes=storage.read(repo.storage(d.id()));String path=repo.storage(d.id());String mime=repo.mime(d.id());
                MultipartFile file=new MultipartFile(){public String getName(){return "file";}public String getOriginalFilename(){return path;}public String getContentType(){return mime;}public boolean isEmpty(){return bytes.length==0;}public long getSize(){return bytes.length;}public byte[] getBytes(){return bytes;}public java.io.InputStream getInputStream(){return new java.io.ByteArrayInputStream(bytes);}public void transferTo(java.io.File dest)throws java.io.IOException{throw new java.io.IOException("No disk extraction");}};
                DocumentTextExtractor.Source extracted;
                try{extracted=extractor.extract(file,repo.sheet(d.id()));repo.extraction(d.id(),"NATIVE");}
                catch(IllegalArgumentException e){if(path.endsWith(".pdf")&&e.getMessage()!=null&&e.getMessage().contains("escaneadas")&&ocr.configured()){extracted=ocr.extract(bytes);repo.extraction(d.id(),"GEMINI_OCR");}else throw e;}
                if(extracted.segments().isEmpty()){repo.finish(j,"REVIEW_REQUIRED","SHEET_SELECTION_REQUIRED");return Optional.empty();}
                var parts=new ArrayList<Part>();
                // Owner's exact identification is removed in addition to conservative numeric redaction.
                String identification=ownerIdentification(d.ownerId());
                for(var segment:extracted.segments()) {
                    String text=privacy.redact(segment.text(),identification);Integer page=null;
                    var number=java.util.regex.Pattern.compile("(?iu)p.gina (\\d+)").matcher(segment.location());if(number.find())page=Integer.valueOf(number.group(1));
                    for(int i=0;i<text.length();i+=1600) {parts.add(new Part(text.substring(i,Math.min(text.length(),i+1800)),segment.location(),page));if(parts.size()>120)throw new IllegalArgumentException();}
                }
                var work=new Work(j.id(),d.id(),d.version(),j.attempts(),RagEmbeddingClient.MODEL,List.copyOf(parts),metadata(d));
                repo.payload(j.id(),json.writeValueAsString(work));return Optional.of(work);
            }catch(Exception e){repo.finish(j,"REVIEW_REQUIRED","EXTRACTION_UNAVAILABLE");return Optional.empty();}
        });
    }
    private String ownerIdentification(UUID owner){return users.findById(owner).map(com.ceroa.domain.User::getDocumentId).orElse(null);}
    private void auditResource(UUID actor,UUID id,String action){repo.audit(UUID.randomUUID(),actor,Intent.METADATA_SEARCH,"{\"documentId\":\""+id+"\",\"action\":\""+action+"\"}",1,0);}
    public void complete(UUID id,Completion completion) {
        available();tx.executeWithoutResult(s->{
            var initial=repo.job(id);var d=repo.forJob(initial);var j=repo.lockJob(id);
            if(!users.findById(d.ownerId()).map(com.ceroa.domain.User::isActive).orElse(false))throw new org.springframework.security.access.AccessDeniedException("Cuenta inactiva");
            if(d.version()!=j.version()||d.status().equals("DELETING"))throw new IllegalArgumentException("Trabajo obsoleto");
            if(Set.of("INDEXED","REVIEW_REQUIRED").contains(j.status())&&j.attempts()==completion.attempt())return;
            if(!repo.leaseValid(id)||j.attempts()!=completion.attempt()||d.version()!=j.version()||!d.status().equals("PROCESSING"))throw new IllegalArgumentException("Trabajo obsoleto");
            try {
                Work work=json.readValue(repo.payload(id),Work.class);
                var proposed=completion.proposals()==null?List.<Proposal>of():completion.proposals();
                for(var p:proposed) {
                    if(!Set.of("identificationType","documentType","financialEntity","periodStart","periodEnd","issuedAt").contains(p.field())
                        ||work.chunks().stream().noneMatch(c->c.location().equals(p.location())&&c.text().contains(p.quote())))throw new IllegalArgumentException("Metadato sin evidencia");
                }
                repo.proposals(d.id(),json.writeValueAsString(proposed));
                if(!RagEmbeddingClient.MODEL.equals(completion.model())||completion.vectors().size()!=work.chunks().size())throw new IllegalArgumentException();
                var seen=new HashSet<Integer>();
                for(var v:completion.vectors()) {
                    if(v.order()<0||v.order()>=work.chunks().size()||!seen.add(v.order()))throw new IllegalArgumentException();
                    String vector=RagEmbeddingClient.normalized(v.values().stream().mapToDouble(Double::doubleValue).toArray());
                    repo.insertChunk(d.id(),d.version(),UUID.randomUUID(),v.order(),work.chunks().get(v.order()),vector,completion.model());
                }
                Metadata effective=metadata(d);
                if(repo.automaticMetadata(d.id())){effective=DocumentMetadataInference.merge(effective,proposed);repo.inferredMetadata(d.id(),effective);}
                boolean missingMetadata=effective.identificationType()==null || effective.documentType()==Kind.BANK_STATEMENT&&(effective.periodStart()==null||effective.periodEnd()==null);
                repo.finish(j,missingMetadata?"REVIEW_REQUIRED":"INDEXED",null);
            }catch(com.fasterxml.jackson.core.JsonProcessingException e){throw new IllegalStateException(e);}
        });
    }
    public void fail(UUID id,int attempt){available();tx.executeWithoutResult(s->{repo.forJob(repo.job(id));var j=repo.lockJob(id);if(!repo.leaseValid(id)||j.attempts()!=attempt)throw new IllegalArgumentException();repo.finish(j,"FAILED","PROVIDER_FAILED");});}
}
