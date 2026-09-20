package com.ceroa.service;

import com.ceroa.domain.PlusSubscription;
import com.ceroa.domain.User;
import com.ceroa.domain.UserPlan;
import com.ceroa.repository.PlusSubscriptionRepository;
import com.ceroa.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class PlusSubscriptionServiceTest {
    private final PlusSubscriptionRepository subscriptions = mock(PlusSubscriptionRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final CurrentUserService currentUser = mock(CurrentUserService.class);
    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final PlusSubscriptionService service = new PlusSubscriptionService(subscriptions, users, currentUser, builder);

    private void configure() {
        ReflectionTestUtils.setField(service, "monthlyPrice", "19900");
        ReflectionTestUtils.setField(service, "yearlyPrice", "199000");
        ReflectionTestUtils.setField(service, "currency", "COP");
        ReflectionTestUtils.setField(service, "accessToken", "test-token");
        ReflectionTestUtils.setField(service, "webhookSecret", "test-secret");
        ReflectionTestUtils.setField(service, "frontendUrl", "https://ceroa.example");
    }

    @Test
    void checkoutUsesServerPriceAndKeepsPlanCeroUntilProviderConfirms() {
        configure();
        User user = new User(); user.setId(UUID.randomUUID()); user.setEmail("payer@example.com");
        when(currentUser.entityForUpdate()).thenReturn(user);
        when(subscriptions.findFirstByUserIdAndStatusIn(any(), any())).thenReturn(Optional.empty());
        when(subscriptions.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        when(subscriptions.save(any())).thenAnswer(call -> call.getArgument(0));
        server.expect(requestTo("https://api.mercadopago.com/preapproval"))
                .andExpect(method(org.springframework.http.HttpMethod.POST))
                .andExpect(content().json("{\"auto_recurring\":{\"frequency\":1,\"transaction_amount\":19900,\"currency_id\":\"COP\"},\"payer_email\":\"payer@example.com\"}"))
                .andRespond(withSuccess("{\"id\":\"mp-123\",\"init_point\":\"https://www.mercadopago.com.co/subscriptions/checkout?id=mp-123\"}", MediaType.APPLICATION_JSON));
        var result = service.checkout("MONTHLY");
        assertEquals("PENDING", result.status());
        assertEquals(new BigDecimal("19900"), result.price());
        assertEquals(UserPlan.CERO, user.getPlan());
        assertFalse(PlanAccessService.plusActive(user));
        server.verify();
    }

    @Test
    void providerAuthorizedActivatesAndRepeatedRefreshDoesNotCreateAnotherSubscription() {
        configure();
        User user = new User(); user.setId(UUID.randomUUID());
        PlusSubscription subscription = new PlusSubscription();
        subscription.id = UUID.randomUUID(); subscription.user = user; subscription.providerId = "mp-123";
        subscription.periodicity = "MONTHLY"; subscription.amount = new BigDecimal("19900"); subscription.currency = "COP";
        when(subscriptions.findByProviderId("mp-123")).thenReturn(Optional.of(subscription));
        when(subscriptions.existsByUserIdAndStatus(user.getId(), "ACTIVE")).thenReturn(true);
        String response = "{\"id\":\"mp-123\",\"external_reference\":\"" + subscription.id + "\",\"status\":\"authorized\",\"auto_recurring\":{\"frequency\":1,\"frequency_type\":\"months\",\"transaction_amount\":19900,\"currency_id\":\"COP\"}}";
        server.expect(requestTo("https://api.mercadopago.com/preapproval/mp-123")).andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://api.mercadopago.com/preapproval/mp-123")).andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
        service.refresh("mp-123"); service.refresh("mp-123");
        assertEquals("ACTIVE", subscription.status);
        assertEquals(UserPlan.PLUS, user.getPlan());
        assertTrue(PlanAccessService.plusActive(user));
        verify(subscriptions, times(2)).save(subscription);
        server.verify();
    }

    @Test
    void nonActiveProviderStatesNeverGrantPlus() {
        configure();
        User user = new User(); user.setId(UUID.randomUUID());
        PlusSubscription subscription = new PlusSubscription();
        subscription.id = UUID.randomUUID(); subscription.user = user; subscription.providerId = "mp-456";
        subscription.periodicity = "YEARLY"; subscription.amount = new BigDecimal("199000"); subscription.currency = "COP";
        when(subscriptions.findByProviderId("mp-456")).thenReturn(Optional.of(subscription));
        for (String providerStatus : new String[] { "pending", "rejected", "cancelled", "paused" }) {
            String response = "{\"id\":\"mp-456\",\"external_reference\":\"" + subscription.id + "\",\"status\":\"" + providerStatus + "\",\"auto_recurring\":{\"frequency\":12,\"frequency_type\":\"months\",\"transaction_amount\":199000,\"currency_id\":\"COP\"}}";
            server.expect(requestTo("https://api.mercadopago.com/preapproval/mp-456")).andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
        }
        for (int index = 0; index < 4; index++) {
            service.refresh("mp-456");
            assertFalse(PlanAccessService.plusActive(user));
        }
        assertEquals("ERROR", subscription.status);
        server.verify();
    }
}
