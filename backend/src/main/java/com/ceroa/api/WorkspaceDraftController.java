package com.ceroa.api;
import com.ceroa.service.WorkspaceDraftService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
@RestController
public class WorkspaceDraftController {
    private final WorkspaceDraftService drafts;
    public WorkspaceDraftController(WorkspaceDraftService drafts){this.drafts=drafts;}
    @PostMapping("/api/v1/workspace-actions/{code}/draft")
    public Object prepare(@PathVariable String code){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(drafts.prepare(code));}
}
