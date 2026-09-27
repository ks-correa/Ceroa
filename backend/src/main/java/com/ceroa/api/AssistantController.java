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
    public record Message(String message,String audio,String mime) {}
    @PostMapping("/api/v1/assistant/messages")
    public ResponseEntity<AssistantService.Reply> message(@RequestBody Message body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.message(body.message,body.audio,body.mime));
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
    public record Completion(String answer,String transcript) {}
    public record Preparation(String transcript) {}
    @PostMapping("/api/v1/assistant-tools/requests/{id}/prepare")
    public ResponseEntity<AssistantAnalysisService.Evidence> prepare(@PathVariable UUID id,@RequestBody Preparation body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.prepare(id,body.transcript));
    }
    @PostMapping("/api/v1/assistant-tools/requests/{id}/complete")
    public ResponseEntity<AssistantService.Reply> complete(@PathVariable UUID id,@RequestBody Completion body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.complete(id,body.answer,body.transcript));
    }
}
