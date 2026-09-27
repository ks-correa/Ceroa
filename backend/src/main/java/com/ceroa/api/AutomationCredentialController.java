package com.ceroa.api;

import com.ceroa.service.AutomationCredentialService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/v1/integrations/tokens")
public class AutomationCredentialController {
    public record IssueRequest(@NotBlank @Size(max = 80) String name, boolean allowWrites,
                               @Min(1) @Max(90) int days) {}
    private final AutomationCredentialService credentials;
    public AutomationCredentialController(AutomationCredentialService credentials) { this.credentials = credentials; }
    @GetMapping
    public ResponseEntity<List<AutomationCredentialService.TokenView>> list() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(credentials.list());
    }
    @PostMapping
    public ResponseEntity<AutomationCredentialService.IssuedToken> issue(@Valid @RequestBody IssueRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).cacheControl(CacheControl.noStore())
            .body(credentials.issue(body.name(), body.allowWrites(), body.days()));
    }
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revoke(@PathVariable UUID id) { credentials.revoke(id); }
}
