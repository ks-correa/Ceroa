package com.ceroa.api;
import com.ceroa.service.DriveSyncService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;
@RestController @RequestMapping("/api/v1/workspace-tools/drive")
public class DriveSyncController {
    private final DriveSyncService service;
    public DriveSyncController(DriveSyncService service){this.service=service;}
    public record Validation(UUID sourceId,DriveSyncService.Metadata metadata) {}
    @PostMapping("/validate") public Object validate(@RequestBody Validation input){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.validate(input.sourceId(),input.metadata()));}
    @PostMapping(value="/{id}/ingest",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) public Object ingest(@PathVariable UUID id,@RequestParam UUID leaseToken,@RequestPart MultipartFile file){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.ingest(id,leaseToken,file));}
}
