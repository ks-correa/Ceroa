package com.ceroa.api;
import com.ceroa.service.ScheduledReminderService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import java.util.*;
@RestController
public class ScheduledReminderController {
    private final ScheduledReminderService service;
    public ScheduledReminderController(ScheduledReminderService service){this.service=service;}
    private <T> ResponseEntity<T> response(T body){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);}
    public record Token(String token) {}
    @GetMapping("/api/v1/integrations/telegram/reminders")
    public ResponseEntity<ScheduledReminderService.Settings> settings(){return response(service.settings());}
    @PutMapping("/api/v1/integrations/telegram/reminders")
    public ResponseEntity<ScheduledReminderService.Settings> save(@RequestBody ScheduledReminderService.SettingsRequest request){return response(service.save(request));}
    @GetMapping("/api/v1/integrations/telegram/deliveries")
    public ResponseEntity<?> history(){return response(service.history());}
    @PostMapping("/api/v1/reminder-worker/scan")
    public ResponseEntity<?> scan(@RequestParam(defaultValue="0") int page){return response(service.scan(page));}
    @GetMapping("/api/v1/reminder-worker/candidates")
    public ResponseEntity<?> candidates(){return response(service.candidates());}
    @PostMapping("/api/v1/reminder-worker/deliveries/{id}/reserve")
    public ResponseEntity<?> reserve(@PathVariable UUID id){return response(service.reserve(id));}
    @PostMapping("/api/v1/reminder-worker/deliveries/{id}/dispatch")
    public ResponseEntity<?> dispatch(@PathVariable UUID id,@RequestBody Token body){return response(service.dispatch(id,body.token));}
    @PostMapping("/api/v1/reminder-worker/deliveries/{id}/outcome")
    public ResponseEntity<?> outcome(@PathVariable UUID id,@RequestBody ScheduledReminderService.Outcome body){return response(service.outcome(id,body));}
}
