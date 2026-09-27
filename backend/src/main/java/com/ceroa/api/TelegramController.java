package com.ceroa.api;
import com.ceroa.service.TelegramService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
@RestController
public class TelegramController {
    private final TelegramService service;
    public TelegramController(TelegramService service) { this.service=service; }
    public record Consent(boolean consent) {}
    public record Delivery(String token) {}
    @GetMapping("/api/v1/integrations/telegram")
    public ResponseEntity<TelegramService.Status> status() { return response(service.status()); }
    @PostMapping("/api/v1/integrations/telegram")
    public ResponseEntity<TelegramService.Invitation> issue(@RequestBody Consent body) { return response(service.issue(body.consent)); }
    @DeleteMapping("/api/v1/integrations/telegram")
    public ResponseEntity<Void> unlink() { service.unlink(); return response(null); }
    @PostMapping("/api/v1/assistant-tools/telegram/authorize")
    public ResponseEntity<TelegramService.Authorization> authorize(@RequestBody TelegramService.Update body) { return response(service.authorize(body)); }
    @PostMapping("/api/v1/assistant-tools/telegram/updates")
    public ResponseEntity<TelegramService.Reply> update(@RequestBody TelegramService.Update body) { return response(service.update(body)); }
    @PostMapping("/api/v1/assistant-tools/telegram/delivery")
    public ResponseEntity<TelegramService.Reply> delivery(@RequestBody Delivery body) { return response(service.deliver(body.token)); }
    private <T> ResponseEntity<T> response(T body) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body); }
}
