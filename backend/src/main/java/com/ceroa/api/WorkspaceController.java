package com.ceroa.api;
import com.ceroa.service.IntegrationEventService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import java.util.*;

@RestController @RequestMapping("/api/v1/workspace-tools/events")
public class WorkspaceController {
    private final IntegrationEventService events;
    public WorkspaceController(IntegrationEventService events){this.events=events;}
    public record Claim(String channel) {}
    public record Lease(UUID leaseToken) {}
    public record Completion(UUID leaseToken,String status,String providerId,String errorCode) {}
    @PostMapping("/claim") public Object claim(@RequestBody Claim input){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(events.claim(input.channel()));}
    @PostMapping("/{id}/dispatch") public Object dispatch(@PathVariable UUID id,@RequestBody Lease input){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(events.dispatch(id,input.leaseToken()));}
    @PostMapping("/{id}/outcome") public Object complete(@PathVariable UUID id,@RequestBody Completion input){events.outcome(id,input.leaseToken(),new IntegrationEventService.Outcome(input.status(),input.providerId(),input.errorCode()));return ResponseEntity.noContent().build();}
}
