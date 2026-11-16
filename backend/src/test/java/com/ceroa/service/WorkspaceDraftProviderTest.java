package com.ceroa.service;

import com.ceroa.api.dto.DashboardSummaryResponse;
import com.ceroa.domain.*;
import com.ceroa.repository.WorkspaceActionRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.*;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class WorkspaceDraftProviderTest {
    final WorkspaceActionRepository actions=mock(WorkspaceActionRepository.class);
    final CurrentUserService current=mock(CurrentUserService.class);
    final DashboardService dashboard=mock(DashboardService.class);
    WorkspaceDraftService service;MockRestServiceServer provider;WorkspaceAction proposal;User user;
    static final String URL="http://n8n:5678/webhook/draft",KEY="synthetic-provider-test-at-least-32-characters";
    @BeforeEach void setup(){
        user=new User();user.setId(UUID.randomUUID());user.setEmail("owner@example.invalid");user.setActive(true);when(current.entityForUpdate()).thenReturn(user);
        proposal=new WorkspaceAction();proposal.id=UUID.randomUUID();proposal.kind="FINANCIAL_SUMMARY";proposal.expiresAt=OffsetDateTime.now().plusMinutes(5);
        when(actions.byCode(user.getId(),"CODE")).thenReturn(Optional.of(proposal));
        var summary=mock(DashboardSummaryResponse.class);when(summary.totalRegisteredDebt()).thenReturn(new BigDecimal("123.45"));when(summary.activeDebtCount()).thenReturn(2);when(dashboard.getSummary()).thenReturn(summary);
        var builder=RestClient.builder();provider=MockRestServiceServer.bindTo(builder).build();var client=builder.build();
        service=new WorkspaceDraftService(actions,current,dashboard,URL,KEY){@Override RestClient client(){return client;}};
    }
    String response(String id,String sent){return "{\"proposalId\":\""+proposal.id+"\",\"id\":\""+id+"\",\"sent\":"+sent+"}";}
    void assertStatus(int status){assertEquals(status,assertThrows(ResponseStatusException.class,()->service.prepare("CODE")).getStatusCode().value());assertEquals("PROPOSED",proposal.status);}
    @Test void validPayloadUsesOwnerAndTrustedSummaryAndStableProposalAcrossRetries(){
        for(int i=0;i<2;i++)provider.expect(requestTo(URL)).andExpect(method(HttpMethod.POST))
            .andExpect(header("X-Ceroa-Workspace",KEY)).andExpect(jsonPath("$.recipient").value(user.getEmail()))
            .andExpect(jsonPath("$.proposalId").value(proposal.id.toString())).andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("123.45")))
            .andRespond(withSuccess(response("draft","false"),MediaType.APPLICATION_JSON));
        assertFalse(service.prepare("CODE").path("sent").booleanValue());service.prepare("CODE");provider.verify();assertEquals("PROPOSED",proposal.status);
    }
    @ParameterizedTest @ValueSource(strings={"true","\"false\"","0","1","null"})
    void onlyJsonBooleanFalseCanAuthorizeDraftResponse(String sent){provider.expect(requestTo(URL)).andRespond(withSuccess(response("draft",sent),MediaType.APPLICATION_JSON));assertStatus(502);provider.verify();}
    @ParameterizedTest @ValueSource(strings={"{}","{\"id\":\"draft\",\"sent\":false}","not-json"})
    void absentFieldsOrMalformedProviderResponseAreControlled(String body){provider.expect(requestTo(URL)).andRespond(withSuccess(body,MediaType.APPLICATION_JSON));assertStatus(502);}
    @Test void missingSentWrongProposalAndBlankDraftIdAreRejected(){
        for(String body:List.of("{\"proposalId\":\""+proposal.id+"\",\"id\":\"draft\"}","{\"proposalId\":\"other\",\"id\":\"draft\",\"sent\":false}",response("","false"))){
            provider.reset();provider.expect(requestTo(URL)).andRespond(withSuccess(body,MediaType.APPLICATION_JSON));assertStatus(502);
        }
    }
    @Test void unavailableAndProviderFailuresDoNotConfirmOrClaimEffectWasRolledBack(){
        provider.expect(requestTo(URL)).andRespond(withException(new java.net.SocketTimeoutException("synthetic ambiguous timeout")));assertStatus(503);
        provider.reset();provider.expect(requestTo(URL)).andRespond(withServerError());assertStatus(502);
    }
    @Test void inactiveForeignExpiredAndWrongTypeAreRejectedBeforeProvider(){
        user.setActive(false);assertStatus(403);user.setActive(true);
        when(actions.byCode(user.getId(),"CODE")).thenReturn(Optional.empty());assertStatus(404);when(actions.byCode(user.getId(),"CODE")).thenReturn(Optional.of(proposal));
        proposal.expiresAt=OffsetDateTime.now().minusMinutes(1);assertStatus(410);proposal.expiresAt=OffsetDateTime.now().plusMinutes(5);
        proposal.kind="WELCOME";assertStatus(400);verifyNoInteractions(dashboard);
    }
    @Test void emptyAdapterConfigurationCannotInvokeProvider(){
        var disabled=new WorkspaceDraftService(actions,current,dashboard,"",KEY);
        assertEquals(503,assertThrows(ResponseStatusException.class,()->disabled.prepare("CODE")).getStatusCode().value());verifyNoInteractions(dashboard);
    }
    @Test void retriesKeepTheReviewedSnapshotWhenFinancialDataChanges(){
        for(int i=0;i<2;i++)provider.expect(requestTo(URL)).andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("123.45")))
            .andRespond(withSuccess(response("draft","false"),MediaType.APPLICATION_JSON));
        var first=service.prepare("CODE");
        when(dashboard.getSummary()).thenThrow(new AssertionError("Snapshot must not be recomputed"));
        assertEquals(first,service.prepare("CODE"));assertNotNull(proposal.draftSnapshot);assertEquals("draft",proposal.draftProviderId);provider.verify();
    }
    @Test void timeoutRetainsSnapshotForReconciliationAndCannotAuthorizeConfirmation(){
        provider.expect(requestTo(URL)).andRespond(withException(new java.net.SocketTimeoutException("ambiguous")));
        assertStatus(503);assertNotNull(proposal.draftSnapshot);assertNull(proposal.draftProviderId);
    }
    @Test void changedEmailAndChangedProviderIdInvalidateTheExistingPreview(){
        provider.expect(requestTo(URL)).andRespond(withSuccess(response("draft","false"),MediaType.APPLICATION_JSON));service.prepare("CODE");
        user.setEmail("different@example.invalid");assertStatus(409);user.setEmail("owner@example.invalid");
        provider.reset();provider.expect(requestTo(URL)).andRespond(withSuccess(response("different","false"),MediaType.APPLICATION_JSON));assertStatus(502);
    }
    @ParameterizedTest @ValueSource(strings={"UPCOMING_DUES","SUBSCRIPTION_INFO"})
    void existingProposalKindsAlsoProvideAReviewableBoundDraft(String kind){
        var dues=mock(UpcomingDueService.class);when(dues.getUpcomingDues()).thenReturn(List.of());
        var subscriptions=mock(com.ceroa.repository.PlusSubscriptionRepository.class);
        when(subscriptions.findFirstByUserIdOrderByCreatedAtDesc(user.getId())).thenReturn(Optional.empty());
        var instance=new WorkspaceDraftService(actions,current,dashboard,dues,subscriptions,mock(PlusSubscriptionService.class),URL,KEY){@Override RestClient client(){return service.client();}};
        proposal.kind=kind;provider.expect(requestTo(URL)).andExpect(jsonPath("$.recipient").value(user.getEmail())).andRespond(withSuccess(response("draft","false"),MediaType.APPLICATION_JSON));
        var preview=instance.prepare("CODE");assertFalse(preview.path("message").asText().isBlank());assertFalse(preview.path("subject").asText().isBlank());assertEquals("draft",proposal.draftProviderId);verifyNoInteractions(dashboard);provider.verify();
    }
}
