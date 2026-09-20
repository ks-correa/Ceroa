package com.ceroa.service;

import com.ceroa.domain.User;
import com.ceroa.domain.UserPlan;
import com.ceroa.domain.PlusSubscription;
import com.ceroa.repository.PlusSubscriptionRepository;
import org.springframework.test.util.ReflectionTestUtils;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import static org.mockito.Mockito.*;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PlanAccessServiceTest {
    private final PlanAccessService service = new PlanAccessService();

    @Test
    void defaultsToCeroWithoutPlus() {
        User user = new User();
        user.setPlan(null);
        var access = service.access(user);
        assertEquals(UserPlan.CERO, access.plan());
        assertFalse(access.plusActive());
        assertEquals(2, access.limits().maxDetailedDebts());
        assertFalse(access.capabilities().simulation());
        assertTrue(access.capabilities().snowballAndAvalanche());
    }

    @Test
    void plusHasPremiumCapabilitiesAndNoFunctionalDebtLimit() {
        User user = new User();
        user.setPlan(UserPlan.PLUS);
        var access = service.access(user);
        assertTrue(access.plusActive());
        assertNull(access.limits().maxDetailedDebts());
        assertTrue(access.capabilities().simulation());
        assertTrue(access.capabilities().snowballAndAvalanche());
    }

    @Test
    void downgradeOnlyChangesPermissions() {
        User user = new User();
        user.setPlan(UserPlan.PLUS);
        assertTrue(service.access(user).capabilities().simulation());
        user.setPlan(UserPlan.CERO);
        assertFalse(service.access(user).capabilities().simulation());
    }

    @Test
    void scheduledCancellationExpiresByServerClockWithoutDeletingData() {
        User user = new User(); user.setId(UUID.randomUUID()); user.setPlan(UserPlan.PLUS);
        PlusSubscription subscription = new PlusSubscription();
        subscription.status = "CANCEL_SCHEDULED";
        subscription.accessUntil = OffsetDateTime.now().plusDays(1);
        PlusSubscriptionRepository repository = mock(PlusSubscriptionRepository.class);
        when(repository.findFirstByUserIdOrderByCreatedAtDesc(user.getId())).thenReturn(Optional.of(subscription));
        ReflectionTestUtils.setField(service, "subscriptions", repository);
        assertTrue(service.access(user).plusActive());
        subscription.accessUntil = OffsetDateTime.now().minusSeconds(1);
        assertFalse(service.access(user).plusActive());
        assertEquals(UserPlan.CERO, service.access(user).plan());
    }
}
