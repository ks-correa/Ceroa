package com.ceroa.api;
import com.ceroa.service.*;import com.ceroa.repository.PlusSubscriptionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.*;import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.*;import java.time.*;
@RestController
public class McpController {
 private final McpAccessService access;private final AssistantAnalysisService analysis;private final SupportBookingService bookings;private final CurrentUserService current;private final PlusSubscriptionRepository subscriptions;private final ObjectMapper json;
 private record Window(Instant start,int calls){}private final Map<UUID,Window> windows=new HashMap<>();
 public McpController(McpAccessService access,AssistantAnalysisService analysis,SupportBookingService bookings,CurrentUserService current,PlusSubscriptionRepository subscriptions,ObjectMapper json){this.access=access;this.analysis=analysis;this.bookings=bookings;this.current=current;this.subscriptions=subscriptions;this.json=json;}
 public record Request(Set<String> scopes){}public record Arguments(String start,int offset){}
 @PostMapping("/api/v1/integrations/mcp/tokens") public Object issue(@RequestBody Request request){return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(access.issue(request.scopes()));}
 @DeleteMapping("/api/v1/integrations/mcp/tokens/{id}") public void revoke(@PathVariable UUID id){access.revoke(id);}
 private synchronized void budget(){var a=SecurityContextHolder.getContext().getAuthentication();if(!(a.getDetails() instanceof UUID id))throw new ResponseStatusException(HttpStatus.FORBIDDEN);var now=Instant.now();windows.entrySet().removeIf(e->e.getValue().start.plusSeconds(60).isBefore(now));if(windows.size()>10000)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);var w=windows.getOrDefault(id,new Window(now,0));if(w.calls>=30)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);windows.put(id,new Window(w.start,w.calls+1));}
 @PostMapping("/api/v1/mcp-tools/{operation}") public Object tool(@PathVariable String operation,@RequestBody Arguments args){budget();if(!McpAccessService.SCOPES.contains(operation)||args.offset()<0||args.offset()>10000||args.offset()%25!=0)throw new IllegalArgumentException();var now=LocalDate.now(ZoneId.of("America/Bogota"));Object result=switch(operation){
  case "finance.summary","finance.debts","finance.upcoming","finance.strategy"->analysis.read(AssistantAnalysisService.Dataset.valueOf(operation.substring(8)),now.getYear(),now.getMonthValue(),args.offset());
  case "subscription.read"->{var s=subscriptions.findFirstByUserIdOrderByCreatedAtDesc(current.id());yield s.map(v->Map.of("status",v.status,"accessUntil",v.accessUntil==null?"":v.accessUntil.toString())).orElse(Map.of("status","NONE","accessUntil",""));}
  case "support.availability"->bookings.availability(OffsetDateTime.parse(args.start()));case "support.propose"->bookings.propose(OffsetDateTime.parse(args.start()));default->throw new IllegalArgumentException();};
  if(json.valueToTree(result).toString().length()>32000)throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE);return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(result);
 }
}

