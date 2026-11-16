package com.ceroa.service;
import com.ceroa.domain.*;
import com.ceroa.repository.WorkspaceActionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.OffsetDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class WorkspaceDraftServiceTest {
    @Test void anotherOwnerCannotPrepareDraft(){
        var repo=mock(WorkspaceActionRepository.class);var current=mock(CurrentUserService.class);var dashboard=mock(DashboardService.class);
        var user=new User();user.setId(UUID.randomUUID());user.setActive(true);when(current.entityForUpdate()).thenReturn(user);
        when(repo.byCode(user.getId(),"CODE")).thenReturn(Optional.empty());
        var service=new WorkspaceDraftService(repo,current,dashboard,"http://n8n:5678/webhook/draft","synthetic-worker-with-at-least-32-characters");
        assertEquals(HttpStatus.NOT_FOUND,assertThrows(ResponseStatusException.class,()->service.prepare("CODE")).getStatusCode());verifyNoInteractions(dashboard);
    }
    @Test void expiredOrConfirmedProposalCannotCreateDraft(){
        var repo=mock(WorkspaceActionRepository.class);var current=mock(CurrentUserService.class);var dashboard=mock(DashboardService.class);
        var user=new User();user.setId(UUID.randomUUID());user.setActive(true);when(current.entityForUpdate()).thenReturn(user);
        var proposal=new WorkspaceAction();proposal.kind="FINANCIAL_SUMMARY";proposal.expiresAt=OffsetDateTime.now().minusMinutes(1);
        when(repo.byCode(user.getId(),"CODE")).thenReturn(Optional.of(proposal));
        var service=new WorkspaceDraftService(repo,current,dashboard,"http://n8n:5678/webhook/draft","synthetic-worker-with-at-least-32-characters");
        assertEquals(HttpStatus.GONE,assertThrows(ResponseStatusException.class,()->service.prepare("CODE")).getStatusCode());
        proposal.expiresAt=OffsetDateTime.now().plusMinutes(5);proposal.status="CONFIRMED";
        assertEquals(HttpStatus.GONE,assertThrows(ResponseStatusException.class,()->service.prepare("CODE")).getStatusCode());verifyNoInteractions(dashboard);
    }
}
