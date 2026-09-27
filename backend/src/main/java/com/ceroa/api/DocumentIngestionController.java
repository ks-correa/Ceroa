package com.ceroa.api;
import com.ceroa.service.DocumentIngestionService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.*;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.UUID;
@RestController
public class DocumentIngestionController {
    private final DocumentIngestionService service;
    public DocumentIngestionController(DocumentIngestionService service){this.service=service;}
    @PostMapping(value="/api/v1/documents/debt-draft",consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentIngestionService.Reply> extract(@RequestParam MultipartFile file,@RequestParam String operation,
        @RequestParam(required=false) UUID debtId,@RequestParam(required=false) String sheet,@RequestParam boolean consent){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.extract(file,operation,debtId,sheet,consent));}
    @PostMapping("/api/v1/document-tools/requests/{id}/complete")
    public ResponseEntity<java.util.Map<String,Boolean>> complete(@PathVariable UUID id,@RequestBody JsonNode body){service.complete(id,body);return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(java.util.Map.of("ok",true));}
}
