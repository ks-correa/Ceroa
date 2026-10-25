package com.ceroa.api;

import com.ceroa.api.dto.DocumentContracts.*;
import com.ceroa.service.DocumentLibraryService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.*;

@RestController
public class DocumentLibraryController {
    private final DocumentLibraryService service;
    private final com.ceroa.service.SupabaseRagConfiguration configuration;
    public DocumentLibraryController(DocumentLibraryService service,com.ceroa.service.SupabaseRagConfiguration configuration){this.service=service;this.configuration=configuration;}
    private <T> ResponseEntity<T> ok(T body){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);}
    @GetMapping("/api/v1/library-supabase/rest/v1/ceroa_rag_configuration")
    public ResponseEntity<com.fasterxml.jackson.databind.JsonNode> configuration(@RequestParam Map<String,String> query){return ok(configuration.read(query));}
    @GetMapping({"/api/v1/library-supabase/rest/v1/","/api/v1/library-supabase/rest/v1"})
    public ResponseEntity<com.fasterxml.jackson.databind.JsonNode> configurationDefinition(){return ok(configuration.definition());}
    @PostMapping(value="/api/v1/financial-documents",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Document> upload(@RequestPart MultipartFile file,@Valid @RequestPart(required=false) Metadata metadata,@RequestParam boolean consent,@RequestParam(required=false)String sheet){return ok(service.upload(file,metadata,consent,sheet));}
    @PostMapping(value="/api/v1/document-connectors/upload",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Document> connector(@RequestPart MultipartFile file,@Valid @RequestPart Metadata metadata,@RequestParam(required=false)String sheet){return ok(service.upload(file,metadata,true,sheet));}
    @GetMapping("/api/v1/financial-documents/{id}") public ResponseEntity<Document> get(@PathVariable UUID id){return ok(service.get(id));}
    @PostMapping(value="/api/v1/financial-documents/{id}/replace",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Document> replace(@PathVariable UUID id,@RequestParam int expectedVersion,@RequestPart MultipartFile file,@RequestParam boolean consent,@RequestParam(required=false)String sheet){return ok(service.replace(id,expectedVersion,file,consent,sheet));}
    @GetMapping("/api/v1/financial-documents/{id}/versions") public ResponseEntity<List<com.ceroa.api.dto.DocumentContracts.Version>> versions(@PathVariable UUID id){return ok(service.versions(id));}
    @PostMapping("/api/v1/financial-documents/{id}/versions/{version}/download") public ResponseEntity<Map<String,Object>> downloadVersion(@PathVariable UUID id,@PathVariable int version){return ok(Map.of("url",service.downloadVersion(id,version),"expiresIn",60));}
    @GetMapping("/api/v1/financial-documents/{id}/jobs") public ResponseEntity<List<Job>> jobs(@PathVariable UUID id){return ok(service.jobs(id));}
    @GetMapping("/api/v1/financial-documents/{id}/proposals") public ResponseEntity<com.fasterxml.jackson.databind.JsonNode> proposals(@PathVariable UUID id){return ok(service.proposals(id));}
    @PostMapping("/api/v1/financial-documents/search") public ResponseEntity<Result> search(@Valid @RequestBody Query query){return ok(service.query(query));}
    @PostMapping("/api/v1/financial-documents/{id}/download") public ResponseEntity<Map<String,Object>> download(@PathVariable UUID id){return ok(Map.of("url",service.download(id),"expiresIn",60));}
    @GetMapping("/api/v1/financial-documents/{id}/content") public ResponseEntity<byte[]> content(@PathVariable UUID id,@RequestParam UUID ticket){
        var file=service.content(id,ticket);String extension=file.contentType().equals("application/pdf")?"pdf":file.contentType().contains("wordprocessingml")?"docx":"xlsx";
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("Pragma","no-cache").header("X-Content-Type-Options","nosniff")
            .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename("documento-financiero."+extension).build().toString())
            .contentType(MediaType.parseMediaType(file.contentType())).body(file.bytes());
    }
    @PutMapping("/api/v1/financial-documents/{id}/metadata") public ResponseEntity<Document> update(@PathVariable UUID id,@Valid @RequestBody Metadata metadata){return ok(service.update(id,metadata));}
    @PostMapping("/api/v1/financial-documents/{id}/reprocess") public ResponseEntity<Document> reprocess(@PathVariable UUID id){return ok(service.reprocess(id));}
    @DeleteMapping("/api/v1/financial-documents/{id}") public ResponseEntity<Void> delete(@PathVariable UUID id){service.delete(id);return ResponseEntity.noContent().build();}
    @GetMapping("/api/v1/financial-documents/audit") public ResponseEntity<List<Map<String,Object>>> audit(@RequestParam(defaultValue="0")int offset){return ok(service.audit(offset));}
    @PostMapping("/api/v1/library-tools/claim") public ResponseEntity<Work> claim(){return service.claim().map(this::ok).orElseGet(()->ResponseEntity.noContent().build());}
    @PostMapping("/api/v1/library-tools/jobs/{id}/complete") public ResponseEntity<Void> complete(@PathVariable UUID id,@Valid @RequestBody Completion body){service.complete(id,body);return ResponseEntity.noContent().build();}
    public record Failure(@jakarta.validation.constraints.Min(1) int attempt){}
    @PostMapping("/api/v1/library-tools/jobs/{id}/fail") public ResponseEntity<Void> fail(@PathVariable UUID id,@Valid @RequestBody Failure body){service.fail(id,body.attempt());return ResponseEntity.noContent().build();}
}
