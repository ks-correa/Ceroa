package com.ceroa.service;

import com.ceroa.domain.User;
import com.ceroa.domain.UserPlan;
import org.springframework.stereotype.Service;

/** The persisted server-side account entitlement is authoritative until subscriptions are introduced. */
@Service
public class PlanAccessService {
    public static final int CERO_DEBT_LIMIT = 2;

    public static UserPlan plan(User user) {
        return user.getPlan() == UserPlan.PLUS ? UserPlan.PLUS : UserPlan.CERO;
    }

    public static boolean plusActive(User user) {
        return plan(user) == UserPlan.PLUS;
    }

    public PlanAccess access(User user) {
        boolean plus = plusActive(user);
        return new PlanAccess(plan(user), plus,
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
