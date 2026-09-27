package com.ceroa.api;
import com.ceroa.service.AssistantService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import java.util.UUID;

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
}
