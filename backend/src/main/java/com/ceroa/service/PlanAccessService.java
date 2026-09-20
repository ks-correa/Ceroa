package com.ceroa.service;

import com.ceroa.domain.User;
import com.ceroa.domain.UserPlan;
import com.ceroa.domain.PlusSubscription;
import com.ceroa.repository.PlusSubscriptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;

/** The persisted server-side account entitlement is authoritative until subscriptions are introduced. */
@Service
public class PlanAccessService {
    public static final int CERO_DEBT_LIMIT = 2;
    @Autowired(required = false) private PlusSubscriptionRepository subscriptions;

    public static UserPlan plan(User user) {
        return user.getPlan() == UserPlan.PLUS ? UserPlan.PLUS : UserPlan.CERO;
    }

    public static boolean plusActive(User user) {
        return plan(user) == UserPlan.PLUS;
    }

    public boolean entitled(User user) {
        if (subscriptions == null) return plusActive(user);
        return subscriptions.findFirstByUserIdOrderByCreatedAtDesc(user.getId())
                .map(this::subscriptionEntitled).orElseGet(() -> plusActive(user));
    }

    private boolean subscriptionEntitled(PlusSubscription s) {
        return "ACTIVE".equals(s.status) || (("CANCEL_PENDING".equals(s.status)
                || "CANCEL_SCHEDULED".equals(s.status)) && s.accessUntil != null
                && s.accessUntil.isAfter(OffsetDateTime.now()));
    }

    public UserPlan effectivePlan(User user) { return entitled(user) ? UserPlan.PLUS : UserPlan.CERO; }

    public PlanAccess access(User user) {
        boolean plus = entitled(user);
        return new PlanAccess(plus ? UserPlan.PLUS : UserPlan.CERO, plus,
                new Capabilities(true, true, true, plus, plus, plus, plus),
                new Limits(plus ? null : CERO_DEBT_LIMIT, plus ? "FULL" : "BASIC", plus ? "DETAILED" : "BASIC"));
    }

    public PlanAccess catalog(UserPlan plan) {
        User candidate = new User();
        candidate.setPlan(plan);
        return access(candidate);
    }

    public record PlanAccess(UserPlan plan, boolean plusActive, Capabilities capabilities, Limits limits) {}
    public record Capabilities(boolean payments, boolean dashboard, boolean snowballAndAvalanche,
            boolean simulation, boolean fullStrategyDetail, boolean advancedReminders, boolean detailedMonthlySummary) {}
    public record Limits(Integer maxDetailedDebts, String strategyDetailLevel, String monthlySummaryDetailLevel) {}
}
