package com.ceroa.service;

import com.ceroa.domain.User;
import com.ceroa.domain.UserPlan;
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
}
