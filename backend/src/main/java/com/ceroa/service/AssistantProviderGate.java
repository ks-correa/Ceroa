package com.ceroa.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;

/** Process-wide admission for the single backend deployment. Reservations are not measured HTTP calls. */
@Component
public class AssistantProviderGate {
 private record Reservation(Instant at,int calls){}
 private final boolean enabled;private final int perMinute,concurrency,cooldownSeconds;private final Clock clock;
 private final Deque<Reservation> reservations=new ArrayDeque<>();private int active;private Instant cooldownUntil=Instant.MIN;
 @org.springframework.beans.factory.annotation.Autowired
 public AssistantProviderGate(@Value("${ceroa.assistant.provider-limits.enabled:true}") boolean enabled,@Value("${ceroa.assistant.provider-limits.calls-per-minute:15}") int calls,@Value("${ceroa.assistant.provider-limits.concurrency:1}") int concurrency,@Value("${ceroa.assistant.provider-limits.cooldown-seconds:60}") int cooldown){this(enabled,calls,concurrency,cooldown,Clock.systemUTC());}
 AssistantProviderGate(boolean enabled,int calls,int concurrency,int cooldown,Clock clock){if(calls<1||concurrency<1||cooldown<1)throw new IllegalArgumentException();this.enabled=enabled;this.perMinute=calls;this.concurrency=concurrency;this.cooldownSeconds=cooldown;this.clock=clock;}
 public static int reservation(AgentContracts.Budget budget,Set<AgentContracts.Role> roles){return Math.min(6,budget.maxIterations())+roles.stream().mapToInt(r->r==AgentContracts.Role.SUPPORT?3:4).sum();}
 public final class Lease implements AutoCloseable {private boolean closed;private Lease(){}public void close(){synchronized(AssistantProviderGate.this){if(!closed){closed=true;active--;}}}}
 public synchronized Lease acquire(int calls){
  var now=clock.instant();while(!reservations.isEmpty()&&!reservations.getFirst().at().plusSeconds(60).isAfter(now))reservations.removeFirst();
  if(enabled&&(active>=concurrency||cooldownUntil.isAfter(now)||calls>perMinute||reservations.stream().mapToInt(Reservation::calls).sum()+calls>perMinute))throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Capacidad temporal del proveedor agotada");
  if(calls<1)throw new IllegalArgumentException();if(enabled)reservations.addLast(new Reservation(now,calls));active++;return new Lease();
 }
 public synchronized void quotaFailure(){if(enabled)cooldownUntil=clock.instant().plusSeconds(cooldownSeconds);}
}
