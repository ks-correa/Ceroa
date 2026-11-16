package com.ceroa.service;
import com.ceroa.domain.*;
import com.ceroa.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.time.OffsetDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class WorkspacePreviewConfirmationTest {
 @Test void confirmationUsesExactReviewedTextAndRejectsUncertainOrChangedRecipient(){
  var actions=mock(WorkspaceActionRepository.class);var current=mock(CurrentUserService.class);var users=mock(UserRepository.class);var events=mock(IntegrationEventService.class);var dashboard=mock(DashboardService.class);
  var service=new WorkspaceActionService(actions,current,users,events,dashboard,mock(UpcomingDueService.class),mock(PlusSubscriptionRepository.class),mock(PlusSubscriptionService.class));
  var user=new User();user.setId(UUID.randomUUID());user.setActive(true);user.setEmail("synthetic@example.invalid");when(current.entityForUpdate()).thenReturn(user);
  var a=new WorkspaceAction();a.id=UUID.randomUUID();a.kind="FINANCIAL_SUMMARY";a.expiresAt=OffsetDateTime.now().plusMinutes(5);
  a.draftSnapshot="{\"proposalId\":\""+a.id+"\",\"recipient\":\"synthetic@example.invalid\",\"subject\":\"Reviewed subject\",\"message\":\"Reviewed balance 123\"}";
  when(actions.byCode(user.getId(),"CODE")).thenReturn(Optional.of(a));
  assertEquals(409,assertThrows(ResponseStatusException.class,()->service.confirmMail("CODE")).getStatusCode().value());verifyNoInteractions(events);
  a.draftProviderId="draft-1";user.setEmail("changed@example.invalid");assertThrows(ResponseStatusException.class,()->service.confirmMail("CODE"));verifyNoInteractions(events);
  user.setEmail("synthetic@example.invalid");service.confirmMail("CODE");
  verify(events).mail(user,IntegrationEventService.MailKind.FINANCIAL_SUMMARY,"confirmed-mail:"+a.id,Map.of("approvedSubject","Reviewed subject","approvedMessage","Reviewed balance 123","draftId","draft-1"));
  verifyNoInteractions(dashboard);assertEquals("CONFIRMED",a.status);
  service.confirmMail("CODE");verifyNoMoreInteractions(events);
 }
}
