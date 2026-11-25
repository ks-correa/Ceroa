package com.ceroa.config;
import com.ceroa.domain.*;import com.ceroa.repository.*;import com.ceroa.service.*;
import org.junit.jupiter.api.*;import org.springframework.beans.factory.annotation.Autowired;import org.springframework.boot.test.context.SpringBootTest;import org.springframework.test.context.bean.override.mockito.MockitoBean;
import com.fasterxml.jackson.databind.ObjectMapper;import java.util.*;import java.time.*;
import org.springframework.security.core.context.SecurityContextHolder;import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import static org.junit.jupiter.api.Assertions.*;import static org.mockito.Mockito.*;import static org.mockito.ArgumentMatchers.*;
@SpringBootTest
class SupportBookingIntegrationTest {
 @Autowired SupportBookingService service;@Autowired SupportBookingRepository bookings;@Autowired UserRepository users;@Autowired ObjectMapper json;@MockitoBean WorkspaceCalendarGateway calendar;
 User owner;OffsetDateTime slot;
 @BeforeEach void setup(){bookings.deleteAll();owner=new User();owner.setFullName("Calendar fixture");owner.setEmail(UUID.randomUUID()+"@example.invalid");owner=users.saveAndFlush(owner);as(owner.getId());slot=LocalDate.now(ZoneId.of("America/Bogota")).plusDays(2).atTime(10,0).atOffset(ZoneOffset.ofHours(-5));while(slot.getDayOfWeek().getValue()>5)slot=slot.plusDays(1);when(calendar.available(any(),any())).thenReturn(true);}
 void as(UUID id){var c=SecurityContextHolder.createEmptyContext();c.setAuthentication(new UsernamePasswordAuthenticationToken(id.toString(),null,List.of()));SecurityContextHolder.setContext(c);}
 @AfterEach void clear(){SecurityContextHolder.clearContext();}
 @Test void listsOnlyFreeSlotsAndNeverCreatesEvents(){
  when(calendar.busy(any(),any())).thenReturn(List.of(new WorkspaceCalendarGateway.Busy(slot.toInstant(),slot.plusMinutes(30).toInstant())));
  var result=service.availableSlots(slot.toLocalDate());
  assertEquals("AVAILABLE",result.status());assertEquals(15,result.slots().size());
  assertFalse(result.slots().stream().anyMatch(s->s.start().toInstant().equals(slot.toInstant())));
  verify(calendar,never()).call(eq("create"),any(),any(),any(),any());
 }
 @Test void missingCalendarDataIsNotReportedAsFreeTime(){
  when(calendar.busy(any(),any())).thenThrow(new IllegalStateException());
  var result=service.availableSlots(slot.toLocalDate());assertEquals("UNAVAILABLE",result.status());assertTrue(result.slots().isEmpty());assertTrue(result.message().contains("volver a consultar"));
 }
 @Test void listsOnlyOwnedReservationsWithPagingAndLabelsExpiredProposals(){
  for(int i=0;i<12;i++){
   var b=new SupportBooking();b.ownerId=owner.getId();b.code=String.valueOf((char)('A'+i)).repeat(20);b.start=slot.plusMinutes(i*30);b.end=b.start.plusMinutes(30);b.expiresAt=OffsetDateTime.now().minusMinutes(1);b.status=i==11?"CONFIRMED":"PROPOSED";b.cancelCode="Z".repeat(20);bookings.saveAndFlush(b);
  }
  var other=new User();other.setFullName("Other account");other.setEmail(UUID.randomUUID()+"@example.invalid");users.saveAndFlush(other);
  var foreign=new SupportBooking();foreign.ownerId=other.getId();foreign.code="Z".repeat(20);foreign.start=slot.plusDays(1);foreign.end=foreign.start.plusMinutes(30);foreign.expiresAt=OffsetDateTime.now().plusMinutes(10);foreign.status="CONFIRMED";bookings.saveAndFlush(foreign);
  var first=service.list(0);assertEquals(12,first.total());assertEquals(10,first.items().size());assertEquals(1,first.nextPage());
  assertEquals("CONFIRMED",first.items().getFirst().status());assertTrue(first.items().getFirst().canCancel());
  assertEquals("EXPIRED",first.items().get(1).status());assertFalse(first.items().get(1).canCancel());
  assertFalse(first.items().stream().anyMatch(b->b.code().equals(foreign.code)));
  var second=service.list(1);assertEquals(2,second.items().size());assertNull(second.nextPage());
  assertEquals(12,java.util.stream.Stream.concat(first.items().stream(),second.items().stream()).map(SupportBookingService.BookingItem::code).distinct().count());
  as(other.getId());assertEquals(List.of(foreign.code),service.list(0).items().stream().map(SupportBookingService.BookingItem::code).toList());
  verifyNoInteractions(calendar);assertThrows(IllegalArgumentException.class,()->service.list(-1));
 }
 @Test void invalidDatesGuideTheUserWithoutCallingCalendar(){
  assertEquals("NEEDS_DATE",service.availableSlots(LocalDate.now(ZoneId.of("America/Bogota")).minusDays(1)).status());
  assertEquals("NEEDS_DATE",service.availability(null).get("status"));verify(calendar,never()).busy(any(),any());
 }
 @Test void proposalDoesNotCreateAndOtherOwnerCannotConfirm(){var p=service.propose(slot);verify(calendar,never()).call(eq("create"),any(),any(),any(),any());as(UUID.randomUUID());assertThrows(RuntimeException.class,()->service.confirm(p.code()));}
 @Test void expiredProposalAndOccupiedSlotCannotCreate(){var p=service.propose(slot);var b=bookings.findAll().getFirst();b.expiresAt=OffsetDateTime.now().minusMinutes(1);bookings.saveAndFlush(b);assertThrows(RuntimeException.class,()->service.confirm(p.code()));var p2=service.propose(slot.plusMinutes(30));when(calendar.available(any(),any())).thenReturn(false);assertEquals("CONFLICT",service.confirm(p2.code()).status());verify(calendar,never()).call(eq("create"),any(),any(),any(),any());}
 @Test void confirmedProviderProofIsRequiredAndConfirmIsIdempotent() throws Exception {var p=service.propose(slot);when(calendar.call(eq("create"),any(),any(),any(),any())).thenAnswer(i->json.readTree("{\"id\":\""+i.getArgument(3)+"\",\"status\":\"confirmed\",\"start\":{\"dateTime\":\""+slot+"\"},\"end\":{\"dateTime\":\""+slot.plusMinutes(30)+"\"},\"hangoutLink\":\"https://meet.google.com/abc-defg-hij\"}"));assertEquals("CONFIRMED",service.confirm(p.code()).status());service.confirm(p.code());verify(calendar,times(1)).call(eq("create"),any(),any(),any(),any());var cancel=service.proposeCancellation(p.code());String nonce=cancel.instruction().substring(cancel.instruction().lastIndexOf(' ')+1);when(calendar.call(eq("delete"),any(),any(),any(),any())).thenReturn(json.createObjectNode());assertThrows(RuntimeException.class,()->service.confirmCancellation(p.code(),"wrong"));assertEquals("CANCELLED",service.confirmCancellation(p.code(),nonce).status());assertNull(bookings.findAll().getFirst().activeSlot);}
 @Test void ambiguousCreateIsHeldAndNeverAutomaticallyRepeated(){var p=service.propose(slot);when(calendar.call(eq("create"),any(),any(),any(),any())).thenThrow(new IllegalStateException());assertEquals("AMBIGUOUS",service.confirm(p.code()).status());service.confirm(p.code());verify(calendar,times(1)).call(eq("create"),any(),any(),any(),any());assertNotNull(bookings.findAll().getFirst().activeSlot);}
 @Test void withdrawingCancellationKeepsBookingAndInvalidatesTheOldConfirmation(){
  var p=service.propose(slot);var b=bookings.findAll().getFirst();b.status="CONFIRMED";b.activeSlot=slot.toInstant().toString();bookings.saveAndFlush(b);
  var pending=service.proposeCancellation(p.code());String nonce=pending.instruction().substring(pending.instruction().lastIndexOf(' ')+1);
  assertEquals("CONFIRMED",service.withdrawCancellation(p.code()).status());assertEquals("",service.get(p.code()).instruction());
  assertThrows(RuntimeException.class,()->service.confirmCancellation(p.code(),nonce));assertNotNull(bookings.findAll().getFirst().activeSlot);
  verify(calendar,never()).call(eq("delete"),any(),any(),any(),any());
  service.proposeCancellation(p.code());as(UUID.randomUUID());assertThrows(RuntimeException.class,()->service.withdrawCancellation(p.code()));
 }
 @Test void secondReservationCannotTakeSameSlot(){var p=service.propose(slot);when(calendar.call(eq("create"),any(),any(),any(),any())).thenThrow(new IllegalStateException());service.confirm(p.code());var p2=service.propose(slot);assertThrows(RuntimeException.class,()->service.confirm(p2.code()));}
 @Test void ambiguousCancellationRequiresProviderProofAndNeverRepeatsDelete()throws Exception{
  var p=service.propose(slot);var b=bookings.findAll().getFirst();b.status="CONFIRMED";b.providerId=b.id.toString().replace("-","");b.activeSlot=slot.toInstant().toString();bookings.saveAndFlush(b);
  var proposal=service.proposeCancellation(p.code());String nonce=proposal.instruction().substring(proposal.instruction().lastIndexOf(' ')+1);
  when(calendar.call(eq("delete"),any(),any(),any(),any())).thenThrow(new IllegalStateException());
  assertEquals("CANCEL_AMBIGUOUS",service.confirmCancellation(p.code(),nonce).status());
  when(calendar.call(eq("get"),any(),any(),any(),isNull())).thenReturn(json.readTree("{\"id\":\"other\",\"status\":\"cancelled\"}"));assertEquals("CANCEL_AMBIGUOUS",service.get(p.code()).status());assertNotNull(bookings.findAll().getFirst().activeSlot);
  when(calendar.call(eq("get"),any(),any(),any(),isNull())).thenReturn(json.readTree("{\"id\":\""+b.providerId+"\",\"status\":\"cancelled\"}"));assertEquals("CANCELLED",service.get(p.code()).status());assertNull(bookings.findAll().getFirst().activeSlot);
  service.get(p.code());verify(calendar,times(1)).call(eq("delete"),any(),any(),any(),any());
 }
}
