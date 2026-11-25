package com.ceroa.service;
import org.junit.jupiter.api.Test;import java.time.*;import static org.junit.jupiter.api.Assertions.*;
class AssistantProviderGateTest {
 @Test void completedQueriesDoNotConsumeAnUnmeasuredMinuteBudget(){var time=new Time();var gate=new AssistantProviderGate(true,15,1,60,time);gate.estimatedMinuteLimit=false;try(var first=gate.acquire(8)){assertThrows(AssistantProviderGate.Throttled.class,()->gate.acquire(8));}try(var second=gate.acquire(8)){}gate.quotaFailure();assertEquals(61,assertThrows(AssistantProviderGate.Throttled.class,()->gate.acquire(8)).retryAfter);time.value=time.value.plusSeconds(60);try(var next=gate.acquire(8)){} }
 static class Time extends Clock {Instant value=Instant.parse("2026-11-09T12:00:00Z");public ZoneId getZone(){return ZoneOffset.UTC;}public Clock withZone(ZoneId z){return this;}public Instant instant(){return value;}}
 @Test void concurrencyAndMinuteBudgetApplyAcrossRequests(){var time=new Time();var gate=new AssistantProviderGate(true,15,1,60,time);var first=gate.acquire(8);assertThrows(org.springframework.web.server.ResponseStatusException.class,()->gate.acquire(1));first.close();first.close();assertThrows(org.springframework.web.server.ResponseStatusException.class,()->gate.acquire(8));try(var second=gate.acquire(7)){}time.value=time.value.plusSeconds(60);try(var third=gate.acquire(15)){} }
 @Test void quotaCooldownIsSharedAndFailureDoesNotRefundReservations(){var time=new Time();var gate=new AssistantProviderGate(true,15,1,90,time);try(var lease=gate.acquire(8)){}gate.quotaFailure();time.value=time.value.plusSeconds(61);assertThrows(org.springframework.web.server.ResponseStatusException.class,()->gate.acquire(1));time.value=time.value.plusSeconds(30);try(var lease=gate.acquire(8)){} }
 @Test void reservationsBoundRootAndSpecialistIterations(){
  assertEquals(10,AssistantProviderGate.reservation(AgentContracts.budget(AgentContracts.Intent.FINANCIAL),java.util.Set.of(AgentContracts.Role.FINANCIAL)));
  assertEquals(7,AssistantProviderGate.reservation(AgentContracts.budget(AgentContracts.Intent.SUPPORT),java.util.Set.of(AgentContracts.Role.SUPPORT)));
  assertEquals(10,AssistantProviderGate.reservation(AgentContracts.budget(AgentContracts.Intent.DOCUMENT_SINGLE),java.util.Set.of(AgentContracts.Role.RAG)));
  assertEquals(15,AssistantProviderGate.reservation(AgentContracts.budget(AgentContracts.Intent.COMPOSITE),java.util.Set.of(AgentContracts.Role.FINANCIAL,AgentContracts.Role.SUPPORT)));
  assertEquals(16,AssistantProviderGate.reservation(AgentContracts.budget(AgentContracts.Intent.COMPOSITE),java.util.Set.of(AgentContracts.Role.RAG,AgentContracts.Role.FINANCIAL)));
  var threeRoles=java.util.Set.of(AgentContracts.Role.FINANCIAL,AgentContracts.Role.RAG,AgentContracts.Role.SUPPORT);
  int threeReservation=AssistantProviderGate.reservation(AgentContracts.budget(AgentContracts.Intent.COMPOSITE),threeRoles);
  assertEquals(15,threeReservation);
  var strictGate=new AssistantProviderGate(true,14,1,60,new Time());
  assertThrows(org.springframework.web.server.ResponseStatusException.class,()->strictGate.acquire(threeReservation));
 }
}
