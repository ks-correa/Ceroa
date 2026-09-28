package com.ceroa.service;

import com.ceroa.domain.*;
import com.ceroa.repository.*;
import com.ceroa.api.dto.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.*;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;

/** Versioned, read-only financial decision. Only a one-use hypothetical simulation can be approved. */
@Service
public class SentinelService {
    private static final ZoneId ZONE=ZoneId.of("America/Bogota");
    private static final String POLICY="BUDGET_OVER_CAPACITY_V1";
    private final UserRepository users;private final FinancialProfileRepository profiles;private final DebtRepository debts;
    private final SentinelStateRepository states;private final SentinelAlertRepository alerts;private final SentinelApprovalRepository approvals;
    private final SentinelPreferenceRepository prefs;private final NotificationRepository notifications;
    private final TelegramLinkRepository links;private final DebtPaymentResolver resolver;private final PlanAccessService plans;
    private final CurrentUserService current;private final SimulationService simulations;private final SessionTokenService tokens;
    private final TransactionTemplate tx;private final boolean enabled;
    @PersistenceContext private EntityManager entityManager;
    private Clock clock=Clock.system(ZONE);
    public SentinelService(UserRepository users,FinancialProfileRepository profiles,DebtRepository debts,
        SentinelStateRepository states,SentinelAlertRepository alerts,SentinelApprovalRepository approvals,
        SentinelPreferenceRepository prefs,NotificationRepository notifications,TelegramLinkRepository links,
        DebtPaymentResolver resolver,PlanAccessService plans,CurrentUserService current,SimulationService simulations,
        SessionTokenService tokens,PlatformTransactionManager manager,@Value("${ceroa.sentinel.enabled:false}") boolean enabled){
        this.users=users;this.profiles=profiles;this.debts=debts;this.states=states;this.alerts=alerts;this.approvals=approvals;
        this.prefs=prefs;this.notifications=notifications;this.links=links;this.resolver=resolver;this.plans=plans;
        this.current=current;this.simulations=simulations;this.tokens=tokens;this.tx=new TransactionTemplate(manager);this.tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);this.enabled=enabled;
    }
    @TransactionalEventListener(phase=TransactionPhase.AFTER_COMMIT)
    public void financialChanged(SentinelVersionService.FinancialChanged event){
        if(!enabled)return;
        try{evaluate(event.userId());}
        catch(RuntimeException ignored){/* durable dirty state is retried by the scheduled scan */}
    }
    void useClock(Clock clock){this.clock=clock;}
    private OffsetDateTime now(){return OffsetDateTime.now(clock);}
    private LocalDate today(){return LocalDate.now(clock.withZone(ZONE));}
    private void on(){if(!enabled)throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);}
    private static String money(BigDecimal v){NumberFormat f=NumberFormat.getNumberInstance(Locale.forLanguageTag("es-CO"));f.setMaximumFractionDigits(2);return f.format(v);}
    public record Assessment(String policyVersion,OffsetDateTime evaluatedAt,long financialVersion,String quality,String condition,
        String reason,BigDecimal budget,BigDecimal requiredPayments,BigDecimal shortfall,List<String> allowedActions) {}
    public record AlertView(UUID id,long financialVersion,String condition,BigDecimal budget,BigDecimal requiredPayments,
        BigDecimal shortfall,OffsetDateTime createdAt,String deliveryStatus) {}
    public record Overview(Assessment evaluation,List<AlertView> alerts,boolean telegramAlerts,boolean canAuthorizeTelegram,boolean canSimulate) {}
    public record Consent(boolean telegramAlerts) {}
    public record Proposal(UUID alertId,UUID debtId,StrategyType strategy) {}
    public record ApprovalView(UUID id,UUID alertId,UUID debtId,StrategyType strategy,String action,String status,
        OffsetDateTime expiresAt,String resultStatus,String resultReason,List<String> assumptions,Integer projectedMonths,BigDecimal projectedInterest) {}
    public record Scan(int processed,boolean hasMore,int nextPage) {}
    public record Candidate(UUID id) {}
    public record Reservation(boolean reserved,UUID id,String token) {}
    public record Dispatch(boolean send,UUID id,String token,Long chatId,String text,OffsetDateTime validatedAt) {}
    public record Outcome(String token,String result,Long messageId,Integer retryAfter,String errorCode) {}
    private record Claim(ApprovalView view,boolean claimed) {}
    private SentinelState state(UUID userId){return states.findById(userId).orElseGet(()->{var s=new SentinelState();s.userId=userId;s.updatedAt=now();return s;});}
    private Assessment assess(UUID userId,long version){
        var all=debts.findAllByUserIdOrderByCreatedAtDesc(userId);var profile=profiles.findByUserId(userId).orElse(null);
        var active=all.stream().filter(d->d.getStatus()!=DebtStatus.PAID&&d.getCurrentBalance()!=null&&d.getCurrentBalance().signum()>0).toList();
        String missing=null;
        if(profile==null||profile.getAvailableForDebts()==null||profile.getAvailableForDebts().signum()<0)missing="Falta un presupuesto válido asignado a deudas.";
        else if(profile.getTotalDeclaredDebts()==null||profile.getTotalDeclaredDebts()!=all.size())missing="La cobertura de deudas registradas es parcial o inconsistente.";
        else if(all.isEmpty())missing="No hay obligaciones registradas para evaluar.";
        else if(profile.getUpdatedAt()==null||profile.getUpdatedAt().isBefore(now().minusDays(90))
            ||active.stream().anyMatch(d->d.getUpdatedAt()==null||d.getUpdatedAt().isBefore(now().minusDays(90))))missing="El presupuesto o una obligación activa no se ha actualizado en los últimos 90 días.";
        BigDecimal required=BigDecimal.ZERO;
        if(missing==null)for(var debt:active){var payment=resolver.resolveExigiblePayment(debt);if(payment==null||payment.signum()<0){missing="Falta el pago exigible de una obligación activa.";break;}required=required.add(payment);}
        BigDecimal budget=profile==null?null:profile.getAvailableForDebts();
        if(missing!=null)return new Assessment(POLICY,now(),version,"INSUFFICIENT_DATA","UNKNOWN",missing,budget,null,null,List.of());
        BigDecimal shortfall=required.subtract(budget).max(BigDecimal.ZERO);
        if(shortfall.signum()>0)return new Assessment(POLICY,now(),version,"COMPLETE","OVER_CAPACITY",
            "Los pagos exigibles registrados superan el presupuesto asignado a deudas.",budget,required,shortfall,List.of("GENERATE_SIMULATION"));
        return new Assessment(POLICY,now(),version,"COMPLETE","WITHIN_BUDGET",
            "Los pagos exigibles registrados caben en el presupuesto asignado; esta comparación no descarta otros riesgos financieros.",budget,required,BigDecimal.ZERO,List.of());
    }
    public Overview overview(){on();UUID id=current.id();var version=states.findById(id).map(s->s.financialVersion).orElse(0L);var p=prefs.findById(id).orElse(null);var user=current.entity();var link=links.findById(id).orElse(null);
        return new Overview(assess(id,version),alerts.findAllByUserIdOrderByCreatedAtDesc(id,PageRequest.of(0,20)).stream().map(this::view).toList(),
            consenting(p,link),plans.entitled(user)&&validLink(link),plans.entitled(user));}
    private AlertView view(SentinelAlert a){return new AlertView(a.id,a.financialVersion,"OVER_CAPACITY",a.budget,a.requiredPayments,a.shortfall,a.createdAt,a.deliveryStatus);}
    private boolean validLink(TelegramLink l){return l!=null&&l.linkedAt!=null&&l.senderId!=null&&l.senderId>0&&Objects.equals(l.chatId,l.senderId);}
    private boolean consenting(SentinelPreference p,TelegramLink l){return p!=null&&p.telegramAlerts&&p.consentLinkedAt!=null&&validLink(l)&&p.consentLinkedAt.toInstant().equals(l.linkedAt.toInstant());}
    public Overview consent(Consent input){on();if(input==null)throw new IllegalArgumentException();UUID id=current.id();tx.executeWithoutResult(s->{var user=users.findByIdForUpdate(id).orElseThrow();var link=links.findById(id).orElse(null);
        if(input.telegramAlerts&&(!user.isActive()||!plans.entitled(user)||!validLink(link)))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        var p=prefs.findById(id).orElseGet(SentinelPreference::new);p.userId=id;p.telegramAlerts=input.telegramAlerts;p.consentLinkedAt=input.telegramAlerts?link.linkedAt:null;p.updatedAt=now();prefs.save(p);
        if(!input.telegramAlerts)alerts.findAllByUserIdOrderByCreatedAtDesc(id,PageRequest.of(0,100)).stream().filter(a->Set.of("PENDING","RETRY","RESERVED").contains(a.deliveryStatus)).forEach(a->{a.deliveryStatus="INVALIDATED";a.deliveryError="CONSENT_REVOKED";});
    });return overview();}
    public Assessment evaluate(){on();return evaluate(current.id());}
    private Assessment evaluate(UUID id){return tx.execute(s->{var user=users.findByIdForUpdate(id).orElseThrow();var state=state(id);var a=assess(id,state.financialVersion);
        String next=a.condition;
        if(!"OVER_CAPACITY".equals(next)){state.condition=next;state.episodeId=null;}
        else{
            if(!"OVER_CAPACITY".equals(state.condition)||state.episodeId==null)state.episodeId=UUID.randomUUID();
            state.condition=next;
            if(alerts.findByUserIdAndEpisodeId(id,state.episodeId).isEmpty()){
                var n=new Notification();n.setUser(user);n.setType("SENTINEL_OVER_CAPACITY");n.setTitle("Revisa tu presupuesto de deudas");
                n.setMessage("Tus pagos exigibles registrados ("+money(a.requiredPayments())+" COP) superan tu presupuesto para deudas ("+money(a.budget())+" COP) por "+money(a.shortfall())+" COP. Revisa los datos y, si tienes Ceroa Plus, puedes aprobar una simulación hipotética.");
                n.setEventDate(today());n.setChannel("IN_APP");n.setEventKey("SENTINEL:OVER_CAPACITY:"+state.episodeId);
                n=notifications.saveAndFlush(n);
                var alert=new SentinelAlert();alert.id=UUID.randomUUID();alert.userId=id;alert.episodeId=state.episodeId;alert.notificationId=n.getId();alert.financialVersion=state.financialVersion;
                alert.budget=a.budget;alert.requiredPayments=a.requiredPayments;alert.shortfall=a.shortfall;alert.createdAt=now();alert.nextAttempt=now();alert.deliveryExpiresAt=now().plusDays(1);alerts.save(alert);
            }
        }
        state.dirty=false;state.evaluatedAt=now();state.updatedAt=now();states.save(state);return a;
    });}
    public Scan scan(int page){on();if(page<0||page>100000)throw new IllegalArgumentException();var batch=users.findAll(PageRequest.of(page,25,Sort.by("id")));
        for(var user:batch)if(user.isActive())evaluate(user.getId());return new Scan(batch.getNumberOfElements(),batch.hasNext(),page+1);}
    public ApprovalView propose(Proposal proposal){on();if(proposal==null||proposal.alertId==null||proposal.debtId==null||proposal.strategy==null)throw new IllegalArgumentException();UUID id=current.id();return tx.execute(s->{var user=users.findByIdForUpdate(id).orElseThrow();
        if(!user.isActive()||!plans.entitled(user))throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        var alert=alerts.findById(proposal.alertId).filter(a->a.userId.equals(id)).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        var state=state(id);var assessment=assess(id,state.financialVersion);
        if(!"OVER_CAPACITY".equals(assessment.condition())||!"COMPLETE".equals(assessment.quality())||!Objects.equals(state.episodeId,alert.episodeId))throw new ResponseStatusException(HttpStatus.CONFLICT,"La alerta ya no representa la situación actual.");
        var debt=debts.findByIdAndUserId(proposal.debtId,id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(debt.getCurrentBalance()==null||debt.getCurrentBalance().signum()<=0||debt.getStatus()==DebtStatus.PAID)throw new ResponseStatusException(HttpStatus.CONFLICT);
        approvals.findAllByUserIdAndStatus(id,"PENDING").forEach(this::expireApproval);
        if(approvals.countByUserIdAndStatus(id,"PENDING")>=5)throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
        var pending=new SentinelApproval();pending.id=UUID.randomUUID();pending.userId=id;pending.alertId=alert.id;pending.debtId=debt.getId();pending.strategy=proposal.strategy.name();pending.financialVersion=state.financialVersion;
        pending.issuedAt=now();pending.expiresAt=now().plusMinutes(10);approvals.save(pending);return approval(pending);
    });}
    private ApprovalView approval(SentinelApproval p){return new ApprovalView(p.id,p.alertId,p.debtId,StrategyType.valueOf(p.strategy),p.action,p.status,p.expiresAt,p.resultStatus,p.resultReason,
        p.resultAssumptions==null?List.of():List.of(p.resultAssumptions.split("\\n")),p.projectedMonths,p.projectedInterest);}
    public ApprovalView status(UUID id){on();return lockedApproval(id,p->{expireApproval(p);return approval(p);});}
    public ApprovalView discard(UUID id){on();return lockedApproval(id,p->{expireApproval(p);if("PENDING".equals(p.status))p.status="DISCARDED";return approval(p);});}
    private void expireApproval(SentinelApproval p){
        if(now().isAfter(p.expiresAt)&&"PENDING".equals(p.status))p.status="EXPIRED";
        if(now().isAfter(p.expiresAt)&&"EXECUTING".equals(p.status)){p.status="FAILED";p.resultStatus="UNKNOWN";p.resultReason="No se confirmó el resultado de la simulación. Prepara una aprobación nueva si quieres intentarlo otra vez.";}
    }
    private <T> T lockedApproval(UUID id,Function<SentinelApproval,T> action){UUID owner=current.id();return tx.execute(s->{users.findByIdForUpdate(owner).orElseThrow();var row=approvals.lock(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));entityManager.refresh(row,LockModeType.PESSIMISTIC_WRITE);
        if(!row.userId.equals(owner))throw new ResponseStatusException(HttpStatus.NOT_FOUND);return action.apply(row);});}
    public ApprovalView approve(UUID id){on();var claim=lockedApproval(id,p->{
        if(!"PENDING".equals(p.status))return new Claim(approval(p),false);
        var user=users.findById(p.userId).orElseThrow();var state=state(p.userId);var alert=alerts.findById(p.alertId).orElseThrow();
        var debt=debts.findByIdAndUserId(p.debtId,p.userId).orElse(null);var a=assess(p.userId,state.financialVersion);
        if(now().isAfter(p.expiresAt)){p.status="EXPIRED";return new Claim(approval(p),false);}
        if(!user.isActive()||!plans.entitled(user)||!"GENERATE_SIMULATION".equals(p.action)||!"OVER_CAPACITY".equals(a.condition())
            ||p.financialVersion!=state.financialVersion||!alert.userId.equals(p.userId)||!Objects.equals(state.episodeId,alert.episodeId)
            ||debt==null||debt.getStatus()==DebtStatus.PAID||debt.getCurrentBalance()==null||debt.getCurrentBalance().signum()<=0){p.status="INVALIDATED";return new Claim(approval(p),false);}
        p.status="EXECUTING";return new Claim(approval(p),true);
    });
        if(!claim.claimed())return claim.view();
        var reserved=claim.view();
        SimulationResponse result=null;String error=null;
        try{result=simulations.runSimulation(new SimulationRequest(reserved.debtId(),reserved.strategy(),List.of()));}
        catch(Exception e){error="La simulación no pudo completarse. Solicita una aprobación nueva si quieres reintentar.";}
        final SimulationResponse completed=result;final String failure=error;
        return lockedApproval(id,p->{
            if(!"EXECUTING".equals(p.status))return approval(p);
            var state=state(p.userId);var a=assess(p.userId,state.financialVersion);
            if(state.financialVersion!=p.financialVersion||!"OVER_CAPACITY".equals(a.condition())){p.status="INVALIDATED";return approval(p);}
            if(failure!=null||completed==null||!"SUCCESS".equals(completed.status())){
                p.status="FAILED";p.resultStatus=completed==null?"FAILED":completed.status();p.resultReason=failure!=null?failure:completed.statusReason();return approval(p);
            }
            p.status="COMPLETED";p.resultStatus="SUCCESS";p.resultReason="Escenario hipotético; no se registró ningún pago ni se cambió la estrategia.";
            p.projectedMonths=completed.simulated()==null?null:completed.simulated().estimatedMonths();
            p.projectedInterest=completed.simulated()==null?null:completed.simulated().totalInterest();
            p.resultAssumptions=String.join("\n",completed.assumptions()).substring(0,Math.min(2000,String.join("\n",completed.assumptions()).length()));return approval(p);
        });
    }
    // Telegram delivery API is deliberately separate from approval; no message or model output can approve.
    public List<Candidate> candidates(){on();tx.executeWithoutResult(s->{alerts.expirePending(now());alerts.expireDispatch(now());});return alerts.ready(now(),PageRequest.of(0,100)).stream().map(a->new Candidate(a.id)).toList();}
    private <T> T lockedAlert(UUID id,Function<SentinelAlert,T> action){return tx.execute(s->{var raw=alerts.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));users.findByIdForUpdate(raw.userId).orElseThrow();var row=alerts.lock(id).orElseThrow();entityManager.refresh(row,LockModeType.PESSIMISTIC_WRITE);return action.apply(row);});}
    private boolean deliverable(SentinelAlert alert){
        if(!now().isBefore(alert.deliveryExpiresAt)){alert.deliveryStatus="INVALIDATED";alert.deliveryError="EXPIRED";return false;}
        var state=states.findById(alert.userId).orElse(null);var user=users.findById(alert.userId).orElse(null);var pref=prefs.findById(alert.userId).orElse(null);var link=links.findById(alert.userId).orElse(null);
        if(!consenting(pref,link))return false;
        if(state==null||user==null||!user.isActive()||!plans.entitled(user)||!"OVER_CAPACITY".equals(state.condition)
            ||state.financialVersion!=alert.financialVersion||!Objects.equals(state.episodeId,alert.episodeId)){
            alert.deliveryStatus="INVALIDATED";alert.deliveryError="DATA_OR_PERMISSION_CHANGED";return false;
        }
        var a=assess(alert.userId,state.financialVersion);
        if(!"OVER_CAPACITY".equals(a.condition())||a.budget().compareTo(alert.budget)!=0||a.requiredPayments().compareTo(alert.requiredPayments)!=0){
            alert.deliveryStatus="INVALIDATED";alert.deliveryError="DATA_CHANGED";return false;
        }
        alert.linkedAt=link.linkedAt;alert.chatId=link.chatId;return true;
    }
    public Reservation reserve(UUID id){on();return lockedAlert(id,a->{
        if("DISPATCHING".equals(a.deliveryStatus)&&!now().isBefore(a.leaseExpiresAt)){a.deliveryStatus="AMBIGUOUS";a.deliveryError="UNKNOWN_DELIVERY";return new Reservation(false,id,null);}
        if("RESERVED".equals(a.deliveryStatus)&&!now().isBefore(a.leaseExpiresAt)){a.deliveryStatus="RETRY";a.nextAttempt=now();}
        if(!Set.of("PENDING","RETRY").contains(a.deliveryStatus)||now().isBefore(a.nextAttempt)||!deliverable(a))return new Reservation(false,id,null);
        if(a.deliveryAttempts>=4){a.deliveryStatus="FAILED";a.deliveryError="ATTEMPT_LIMIT";return new Reservation(false,id,null);}
        String token=tokens.createRawToken();a.leaseHash=tokens.hash(token);a.leaseExpiresAt=now().plusMinutes(3);a.nextAttempt=a.leaseExpiresAt;a.deliveryStatus="RESERVED";return new Reservation(true,id,token);
    });}
    private void token(SentinelAlert a,String value){if(value==null||!value.matches("[A-Za-z0-9_-]{43}")||!Objects.equals(tokens.hash(value),a.leaseHash))throw new ResponseStatusException(HttpStatus.CONFLICT);}
    public Dispatch dispatch(UUID id,String value){on();return lockedAlert(id,a->{token(a,value);if(!"RESERVED".equals(a.deliveryStatus)||!now().isBefore(a.leaseExpiresAt)||!deliverable(a))return new Dispatch(false,id,null,null,null,null);
        a.deliveryStatus="DISPATCHING";a.deliveryAttempts++;a.validatedAt=now();a.leaseExpiresAt=now().plusMinutes(3);a.nextAttempt=a.leaseExpiresAt;
        String message="Ceroa: tus pagos exigibles registrados ("+money(a.requiredPayments)+" COP) superan tu presupuesto para deudas ("+money(a.budget)+" COP). Revisa la alerta y las opciones de simulación hipotética en Ceroa. No se modificó tu cuenta.";
        return new Dispatch(true,id,value,a.chatId,message,a.validatedAt);
    });}
    public String outcome(UUID id,Outcome input){on();return lockedAlert(id,a->{token(a,input.token);
        if("SENT".equals(a.deliveryStatus)){if(!"SENT".equals(input.result)||!Objects.equals(a.telegramMessageId,input.messageId))throw new ResponseStatusException(HttpStatus.CONFLICT);return a.deliveryStatus;}
        if(("RETRY".equals(a.deliveryStatus)&&"RETRY".equals(input.result)&&Objects.equals(a.deliveryError,input.errorCode))||("AMBIGUOUS".equals(a.deliveryStatus)&&"AMBIGUOUS".equals(input.result))||("FAILED".equals(a.deliveryStatus)&&"FAILED".equals(input.result)))return a.deliveryStatus;
        if(!Set.of("DISPATCHING","AMBIGUOUS").contains(a.deliveryStatus))throw new ResponseStatusException(HttpStatus.CONFLICT);
        switch(input.result){
            case "SENT" -> {if(input.messageId==null||input.messageId<=0)throw new IllegalArgumentException();a.deliveryStatus="SENT";a.telegramMessageId=input.messageId;a.sentAt=now();a.deliveryError=null;
                notifications.findById(a.notificationId).ifPresent(n->{n.setChannel("TELEGRAM");notifications.save(n);});}
            case "RETRY" -> {if(!Set.of("RATE_LIMIT","TELEGRAM_5XX").contains(input.errorCode))throw new IllegalArgumentException();if(!deliverable(a))break;
                if(a.deliveryAttempts>=4){a.deliveryStatus="FAILED";a.deliveryError="ATTEMPT_LIMIT";break;}
                int delay=Math.max((int)Math.pow(2,a.deliveryAttempts)*30+ThreadLocalRandom.current().nextInt(15),input.retryAfter==null?0:Math.max(0,input.retryAfter));
                a.nextAttempt=now().plusSeconds(delay);a.deliveryStatus="RETRY";a.deliveryError=input.errorCode;}
            case "FAILED" -> {a.deliveryStatus="FAILED";a.deliveryError="TELEGRAM_PERMANENT";}
            case "AMBIGUOUS" -> {a.deliveryStatus="AMBIGUOUS";a.deliveryError="UNKNOWN_DELIVERY";}
            default -> throw new IllegalArgumentException();
        }return a.deliveryStatus;
    });}
}
