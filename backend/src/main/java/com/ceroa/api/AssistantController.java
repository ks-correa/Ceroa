package com.ceroa.api;
import com.ceroa.service.AssistantService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import java.util.UUID;
import java.util.List;
import com.ceroa.service.AssistantAnalysisService;

@RestController
public class AssistantController {
    private final AssistantService service;
    public AssistantController(AssistantService service) { this.service=service; }
    public record Message(String message,String audio,String mime,UUID documentId) {}
    @PostMapping("/api/v1/assistant/messages")
    public ResponseEntity<AssistantService.Reply> message(@RequestBody Message body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.message(body.message,body.audio,body.mime,AssistantService.Channel.web,body.documentId));
    }
    @GetMapping("/api/v1/assistant-tools/requests/{id}/query")
    public ResponseEntity<AssistantService.Reply> query(@PathVariable UUID id,@RequestParam AssistantService.Intent intent,
        @RequestParam(required=false) Integer year,@RequestParam(required=false) Integer month) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.query(id,intent,year,month));
    }
    @GetMapping("/api/v1/assistant-tools/requests/{id}/data")
    public ResponseEntity<AssistantAnalysisService.Evidence> data(@PathVariable UUID id,
        @RequestParam AssistantAnalysisService.Dataset dataset,@RequestParam int year,@RequestParam int month,
        @RequestParam(defaultValue="0") int offset) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.data(id,dataset,year,month,offset));
    }
    @GetMapping("/api/v1/assistant-tools/requests/{id}/calculate")
    public ResponseEntity<AssistantAnalysisService.Evidence> calculate(@PathVariable UUID id,
        @RequestParam AssistantAnalysisService.Operation operation,@RequestParam List<String> refs) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.calculate(id,operation,refs));
    }
    public record Completion(String answer,String transcript,String mode,List<String> sources) {}
    @GetMapping("/api/v1/assistant-tools/requests/{id}/financial-documents")
    public ResponseEntity<AssistantService.LibraryEvidence> financialDocuments(@PathVariable UUID id,
        @RequestParam com.ceroa.api.dto.DocumentContracts.Intent intent,@RequestParam(required=false) String question,
        @RequestParam(required=false) com.ceroa.api.dto.DocumentContracts.Identification identificationType,
        @RequestParam(required=false) com.ceroa.api.dto.DocumentContracts.Kind documentType,
        @RequestParam(required=false) java.time.LocalDate periodFrom,@RequestParam(required=false) java.time.LocalDate periodToExclusive,
        @RequestParam(defaultValue="0") int offset) {
        var filters=new com.ceroa.api.dto.DocumentContracts.Filters(null,identificationType,documentType,null,periodFrom,periodToExclusive);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.financialDocuments(id,new com.ceroa.api.dto.DocumentContracts.Query(intent,question,filters,offset,10)));
    }
    @GetMapping("/api/v1/assistant-tools/requests/{id}/documents")
    public ResponseEntity<AssistantService.DocumentEvidence> documents(@PathVariable UUID id,@RequestParam String query){
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.documents(id,query));
    }
    @DeleteMapping("/api/v1/assistant/conversation")
    public ResponseEntity<Void> forget(){service.forget(AssistantService.Channel.web);return ResponseEntity.noContent().build();}
    public record Preparation(String transcript) {}
    @PostMapping("/api/v1/assistant-tools/requests/{id}/prepare")
    public ResponseEntity<AssistantAnalysisService.Evidence> prepare(@PathVariable UUID id,@RequestBody Preparation body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.prepare(id,body.transcript));
    }
    @PostMapping("/api/v1/assistant-tools/requests/{id}/complete")
    public ResponseEntity<AssistantService.Reply> complete(@PathVariable UUID id,@RequestBody Completion body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.complete(id,body.answer,body.transcript,body.mode,body.sources));
    }
    @PostMapping("/api/v1/assistant-tools/requests/{id}/review")
    public ResponseEntity<AssistantService.DraftReview> review(@PathVariable UUID id,@RequestBody Completion body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.review(id,body.answer,body.transcript,body.mode,body.sources));
    }
}
