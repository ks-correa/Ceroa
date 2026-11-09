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
    public record Message(String message,String audio,String mime,UUID documentId) {}
    @PostMapping("/api/v1/assistant/messages")
    public ResponseEntity<AssistantService.Reply> message(@RequestBody Message body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.message(body.message,body.audio,body.mime,AssistantService.Channel.web,body.documentId));
    }
    @GetMapping("/api/v1/assistant-tools/requests/{id}/query")
    public ResponseEntity<AssistantService.Reply> query(@PathVariable UUID id,@RequestParam AssistantService.Intent intent,
        @RequestParam(required=false) Integer year,@RequestParam(required=false) Integer month) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.query(id,intent,year,month));
    }
    @GetMapping("/api/v1/assistant-tools/requests/{id}/data")
    public ResponseEntity<AssistantAnalysisService.Evidence> data(@PathVariable UUID id,
        @RequestParam AssistantAnalysisService.Dataset dataset,@RequestParam int year,@RequestParam int month,
        @RequestParam(defaultValue="0") int offset,@RequestParam(required=false) UUID scope) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.scoped(id,scope,()->service.data(id,dataset,year,month,offset)));
    }
    @GetMapping("/api/v1/assistant-tools/requests/{id}/calculate")
    public ResponseEntity<AssistantAnalysisService.Evidence> calculate(@PathVariable UUID id,
        @RequestParam AssistantAnalysisService.Operation operation,@RequestParam List<String> refs,@RequestParam(required=false) UUID scope) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.scoped(id,scope,()->service.calculate(id,operation,refs)));
    }
    private static <T> ResponseEntity<T> privateResponse(T value){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(value);}
    public record Completion(String answer,String transcript,String mode,List<String> sources) {}
    @PostMapping("/api/v1/assistant-tools/requests/{id}/external/authorize")
    public Object mcpAuthorize(@PathVariable UUID id,@RequestParam UUID scope){return privateResponse(service.scoped(id,scope,()->service.authorizeMcpClient(id)));}
    @PostMapping("/api/v1/assistant-tools/requests/{id}/external/result")
    public Object mcpResult(@PathVariable UUID id,@RequestParam UUID scope,@RequestBody com.fasterxml.jackson.databind.JsonNode input){return privateResponse(service.scoped(id,scope,()->service.mcpClientResult(id,input)));}
    @PostMapping("/api/v1/assistant-tools/requests/{id}/support/booking")
    public Object booking(@PathVariable UUID id,@RequestParam UUID scope,@RequestParam String operation,@RequestParam String value){return privateResponse(service.scoped(id,scope,()->service.bookingTool(id,operation,value)));}
    @PostMapping("/api/v1/assistant-tools/requests/{id}/communications/propose")
    public Object proposeMail(@PathVariable UUID id,@RequestParam UUID scope,@RequestParam com.ceroa.service.IntegrationEventService.MailKind kind){return privateResponse(service.scoped(id,scope,()->service.proposeMail(id,kind)));}
    @GetMapping("/api/v1/assistant-tools/requests/{id}/capacity")
    public Object capacity(@PathVariable UUID id,@RequestParam UUID scope){return privateResponse(service.scoped(id,scope,()->service.capacity(id)));}
    @GetMapping("/api/v1/assistant-tools/requests/{id}/simulate")
    public Object simulate(@PathVariable UUID id,@RequestParam UUID scope,@RequestParam String debtName,@RequestParam String strategy,@RequestParam(defaultValue="") String extraPaymentRef){
        return privateResponse(service.scoped(id,scope,()->service.simulate(id,debtName,com.ceroa.domain.StrategyType.fromValue(strategy),extraPaymentRef)));
    }
    @GetMapping("/api/v1/assistant-tools/requests/{id}/financial-documents")
    public ResponseEntity<AssistantService.LibraryEvidence> financialDocuments(@PathVariable UUID id,
        @RequestParam com.ceroa.api.dto.DocumentContracts.Intent intent,@RequestParam(required=false) String question,
        @RequestParam(required=false) com.ceroa.api.dto.DocumentContracts.Identification identificationType,
        @RequestParam(required=false) com.ceroa.api.dto.DocumentContracts.Kind documentType,
        @RequestParam(required=false) java.time.LocalDate periodFrom,@RequestParam(required=false) java.time.LocalDate periodToExclusive,
        @RequestParam(defaultValue="0") int offset,@RequestParam(required=false) UUID scope) {
        var filters=new com.ceroa.api.dto.DocumentContracts.Filters(null,identificationType,documentType,null,periodFrom,periodToExclusive);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.scoped(id,scope,()->service.financialDocuments(id,new com.ceroa.api.dto.DocumentContracts.Query(intent,question,filters,offset,10))));
    }
    @GetMapping("/api/v1/assistant-tools/requests/{id}/documents")
    public ResponseEntity<AssistantService.DocumentEvidence> documents(@PathVariable UUID id,@RequestParam String query,@RequestParam(required=false) UUID scope){
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.scoped(id,scope,()->service.documents(id,query)));
    }
    @DeleteMapping("/api/v1/assistant/conversation")
    public ResponseEntity<Void> forget(){service.forget(AssistantService.Channel.web);return ResponseEntity.noContent().build();}
    public record Preparation(String transcript) {}
    @GetMapping("/api/v1/assistant-tools/requests/{id}/agent-context")
    public ResponseEntity<com.ceroa.service.AgentContracts.Context> agentContext(@PathVariable UUID id){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.agentContext(id));}
    @PostMapping("/api/v1/assistant-tools/requests/{id}/orchestration/start")
    public Object start(@PathVariable UUID id){return privateResponse(service.startOrchestration(id));}
    @PostMapping("/api/v1/assistant-tools/requests/{id}/delegations/{role}/begin")
    public Object begin(@PathVariable UUID id,@PathVariable com.ceroa.service.AgentContracts.Role role,@RequestBody com.ceroa.service.AgentRuntime.Task task){return privateResponse(service.beginDelegation(id,role,task));}
    @PostMapping("/api/v1/assistant-tools/requests/{id}/delegations/{token}/complete")
    public Object finish(@PathVariable UUID id,@PathVariable UUID token,@RequestBody com.ceroa.service.AgentRuntime.Result result){return privateResponse(service.finishDelegation(id,token,result,false));}
    public record SpecialistFailure(String errorCode){}
    @PostMapping("/api/v1/assistant-tools/requests/{id}/delegations/{token}/fail")
    public Object fail(@PathVariable UUID id,@PathVariable UUID token,@RequestBody(required=false) SpecialistFailure failure){return privateResponse(service.failDelegation(id,token,failure==null||failure.errorCode()==null?"SPECIALIST_UNAVAILABLE":failure.errorCode()));}
    @PostMapping("/api/v1/assistant-tools/requests/{id}/observe")
    public ResponseEntity<Void> observe(@PathVariable UUID id,@RequestBody com.ceroa.service.AssistantTrace.WorkerObservation observation){service.observe(id,observation);return ResponseEntity.noContent().build();}
    @PostMapping("/api/v1/assistant-tools/requests/{id}/prepare")
    public ResponseEntity<AssistantAnalysisService.Evidence> prepare(@PathVariable UUID id,@RequestBody Preparation body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.prepare(id,body.transcript));
    }
    @PostMapping("/api/v1/assistant-tools/requests/{id}/complete")
    public ResponseEntity<AssistantService.Reply> complete(@PathVariable UUID id,@RequestBody Completion body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.complete(id,body.answer,body.transcript,body.mode,body.sources));
    }
    @PostMapping("/api/v1/assistant-tools/requests/{id}/review")
    public ResponseEntity<AssistantService.DraftReview> review(@PathVariable UUID id,@RequestBody Completion body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.review(id,body.answer,body.transcript,body.mode,body.sources));
    }
}
