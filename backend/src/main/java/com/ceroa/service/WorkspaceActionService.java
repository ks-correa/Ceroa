package com.ceroa.service;
import com.ceroa.domain.*;
import com.ceroa.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.time.*;
import java.security.SecureRandom;

@Service
public class WorkspaceActionService {
    public record Proposal(UUID id,String confirmationCode,String status,OffsetDateTime expiresAt,String instruction) {}
    private final WorkspaceActionRepository actions;private final CurrentUserService current;private final UserRepository users;
    private final IntegrationEventService events;private final DashboardService dashboard;private final UpcomingDueService dues;
    private final PlusSubscriptionRepository subscriptions;private final PlusSubscriptionService plus;
    private final SecureRandom random=new SecureRandom();
    public WorkspaceActionService(WorkspaceActionRepository actions,CurrentUserService current,UserRepository users,IntegrationEventService events,DashboardService dashboard,UpcomingDueService dues,PlusSubscriptionRepository subscriptions,PlusSubscriptionService plus){this.actions=actions;this.current=current;this.users=users;this.events=events;this.dashboard=dashboard;this.dues=dues;this.subscriptions=subscriptions;this.plus=plus;}
    @Transactional
    public Proposal propose(IntegrationEventService.MailKind kind){
        if(!Set.of(IntegrationEventService.MailKind.FINANCIAL_SUMMARY,IntegrationEventService.MailKind.UPCOMING_DUES,IntegrationEventService.MailKind.SUBSCRIPTION_INFO).contains(kind))throw new IllegalArgumentException();
        var user=current.entityForUpdate();if(!user.isActive())throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if(actions.countByOwnerIdAndStatusAndExpiresAtAfter(user.getId(),"PROPOSED",OffsetDateTime.now())>=3)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
        var a=new WorkspaceAction();a.ownerId=user.getId();a.kind=kind.name();a.confirmationCode=randomCode();a.expiresAt=OffsetDateTime.now().plusMinutes(10);actions.save(a);return view(a);
    }
    private String randomCode(){StringBuilder s=new StringBuilder();for(int i=0;i<20;i++)s.append((char)('A'+random.nextInt(26)));return s.toString();}
    private Proposal view(WorkspaceAction a){return new Proposal(a.id,a.confirmationCode,a.status,a.expiresAt,"Para autorizar el envío a tu correo registrado escribe: Confirmar envio "+a.confirmationCode);}
    @Transactional
    public Proposal confirmMail(String code){
        var user=current.entityForUpdate();var a=actions.byCode(user.getId(),code).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(a.status.equals("CONFIRMED"))return view(a);
        if(!a.status.equals("PROPOSED")||!a.expiresAt.isAfter(OffsetDateTime.now()))throw new ResponseStatusException(HttpStatus.GONE,"Propuesta vencida");
        var payload=new LinkedHashMap<String,Object>();payload.put("asOf",OffsetDateTime.now().toString());
        switch(IntegrationEventService.MailKind.valueOf(a.kind)){
            case FINANCIAL_SUMMARY -> {var s=dashboard.getSummary();payload.put("totalRegisteredDebt",s.totalRegisteredDebt());payload.put("activeDebtCount",s.activeDebtCount());payload.put("requiredPayments",s.requiredPaymentsCurrentPeriod());payload.put("allocatedBudget",s.availableForDebt());payload.put("partialCoverage",s.partialCoverage());}
            case UPCOMING_DUES -> payload.put("dues",dues.getUpcomingDues().stream().limit(100).map(d->{var m=new LinkedHashMap<String,Object>();m.put("name",d.debtName());m.put("amount",d.amount());m.put("dueDate",d.dueDate());return m;}).toList());
            case SUBSCRIPTION_INFO -> {var s=subscriptions.findFirstByUserIdOrderByCreatedAtDesc(user.getId()).orElse(null);payload.put("status",s==null?"NONE":plus.view(s).status());payload.put("accessUntil",s==null?null:plus.view(s).accessUntil());payload.put("automaticRenewal",s!=null&&s.automaticRenewal);}
            default -> throw new IllegalArgumentException();
        }
        a.eventId=events.mail(user,IntegrationEventService.MailKind.valueOf(a.kind),"confirmed-mail:"+a.id,payload);a.status="CONFIRMED";return view(a);
    }
}
