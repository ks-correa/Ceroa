package com.ceroa.api;

import com.ceroa.service.CurrentUserService;
import com.ceroa.service.PlanAccessService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/plan")
public class PlanController {
    private final CurrentUserService currentUser;
    private final PlanAccessService planAccess;

    public PlanController(CurrentUserService currentUser, PlanAccessService planAccess) {
        this.currentUser = currentUser;
        this.planAccess = planAccess;
    }

    @GetMapping
    public PlanAccessService.PlanAccess get() {
        return planAccess.access(currentUser.entity());
    }
}
