package com.ceroa.api;

import com.ceroa.service.SentinelService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
public class SentinelController {
    private final SentinelService sentinel;
    public SentinelController(SentinelService sentinel){this.sentinel=sentinel;}
    private <T> ResponseEntity<T> response(T value){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);}

    @GetMapping("/api/v1/sentinel") public ResponseEntity<?> overview(){return response(sentinel.overview());}
    @PostMapping("/api/v1/sentinel/evaluate") public ResponseEntity<?> evaluate(){return response(sentinel.evaluate());}
    @PutMapping("/api/v1/sentinel/telegram-consent") public ResponseEntity<?> consent(@RequestBody SentinelService.Consent input){return response(sentinel.consent(input));}
    @PostMapping("/api/v1/sentinel/approvals") public ResponseEntity<?> propose(@RequestBody SentinelService.Proposal input){return response(sentinel.propose(input));}
    @GetMapping("/api/v1/sentinel/approvals/{id}") public ResponseEntity<?> status(@PathVariable UUID id){return response(sentinel.status(id));}
    @PostMapping("/api/v1/sentinel/approvals/{id}/approve") public ResponseEntity<?> approve(@PathVariable UUID id){return response(sentinel.approve(id));}
    @PostMapping("/api/v1/sentinel/approvals/{id}/discard") public ResponseEntity<?> discard(@PathVariable UUID id){return response(sentinel.discard(id));}

    public record Token(String token) {}
    @PostMapping("/api/v1/sentinel-worker/scan") public ResponseEntity<?> scan(@RequestParam(defaultValue="0") int page){return response(sentinel.scan(page));}
    @GetMapping("/api/v1/sentinel-worker/candidates") public ResponseEntity<?> candidates(){return response(sentinel.candidates());}
    @PostMapping("/api/v1/sentinel-worker/deliveries/{id}/reserve") public ResponseEntity<?> reserve(@PathVariable UUID id){return response(sentinel.reserve(id));}
    @PostMapping("/api/v1/sentinel-worker/deliveries/{id}/dispatch") public ResponseEntity<?> dispatch(@PathVariable UUID id,@RequestBody Token body){return response(sentinel.dispatch(id,body.token()));}
    @PostMapping("/api/v1/sentinel-worker/deliveries/{id}/outcome") public ResponseEntity<?> outcome(@PathVariable UUID id,@RequestBody SentinelService.Outcome body){return response(sentinel.outcome(id,body));}
}
