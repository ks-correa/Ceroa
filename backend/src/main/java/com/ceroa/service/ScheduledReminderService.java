package com.ceroa.service;

import com.ceroa.domain.*;
import com.ceroa.repository.*;
import com.ceroa.api.dto.UpcomingDueResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Supplier;

/** Durable outbox. No Telegram network calls or financial mutations. */
@Service
public class ScheduledReminderService {
    private static final ZoneId ZONE=ZoneId.of("America/Bogota");
    private final UserRepository users;
    private final TelegramLinkRepository links;
    private final ReminderPreferenceRepository preferences;
    private final ScheduledDeliveryRepository deliveries;
    private final NotificationRepository notifications;
    private final NotificationService notificationService;
    private final UpcomingDueService upcoming;
    private final DashboardService dashboard;
    private final PlanAccessService plans;
    private final CurrentUserService current;
    private final SessionTokenService tokens;
    private final TransactionTemplate tx;
    private final boolean enabled;
    private Clock clock=Clock.system(ZONE);
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    public ScheduledReminderService(UserRepository users,TelegramLinkRepository links,
        ReminderPreferenceRepository preferences,ScheduledDeliveryRepository deliveries,
        NotificationRepository notifications,NotificationService notificationService,UpcomingDueService upcoming,
        DashboardService dashboard,PlanAccessService plans,CurrentUserService current,SessionTokenService tokens,
        PlatformTransactionManager manager,@Value("${ceroa.reminders.enabled:false}") boolean enabled) {
        this.users=users;this.links=links;this.preferences=preferences;this.deliveries=deliveries;
        this.notifications=notifications;this.notificationService=notificationService;this.upcoming=upcoming;
        this.dashboard=dashboard;this.plans=plans;this.current=current;this.tokens=tokens;this.tx=new TransactionTemplate(manager);this.enabled=enabled;
    }
    void useClock(Clock clock){this.clock=clock;}
    private OffsetDateTime now(){return OffsetDateTime.now(clock);}
    private LocalDate today(){return LocalDate.now(clock.withZone(ZONE));}
    public record Settings(boolean enabled,boolean linked,boolean plus,boolean reminders,boolean briefing,String cadence,int hour,int weeklyDay,String timezone) {}
    public record SettingsRequest(boolean reminders,boolean briefing,String cadence,int hour,int weeklyDay) {
        public SettingsRequest(boolean reminders,boolean briefing,String cadence,int hour){this(reminders,briefing,cadence,hour,1);}
    }
    public record DeliveryStatus(UUID id,UUID notificationId,String kind,String status,int attempts,OffsetDateTime sentAt,String lastError) {}
    public record ScanResult(int processed,boolean hasMore,int nextPage) {}
    public record Candidate(UUID id,String kind,String milestone) {}
    public record Reservation(boolean reserved,UUID id,String token) {}
    public record Dispatch(boolean send,UUID id,String token,Long chatId,String text,OffsetDateTime validatedAt) {}
    public record Outcome(String token,String result,Long messageId,Integer retryAfter,String errorCode) {}
    public Settings settings(){
        var user=current.entity();var link=links.findById(user.getId()).orElse(null);var pref=preferences.findById(user.getId()).orElse(null);
        boolean valid=consented(pref,link);
        return new Settings(enabled,validLink(link),plans.entitled(user),valid&&pref.reminders,valid&&pref.briefing,pref==null?"WEEKLY":pref.cadence,pref==null?8:pref.hour,pref==null?1:pref.weeklyDay,ZONE.getId());
    }
    public Settings save(SettingsRequest request){
        if(request==null||request.hour<0||request.hour>23||request.weeklyDay<1||request.weeklyDay>7||!Set.of("WEEKLY","MONTHLY").contains(request.cadence))throw new IllegalArgumentException();
        tx.executeWithoutResult(s->{
            var user=current.entityForUpdate();var link=links.findById(user.getId()).orElse(null);
            if((request.reminders||request.briefing)&&(!enabled||!user.isActive()||!validLink(link)))throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Vincula Telegram para autorizar los envíos.");
            var pref=preferences.findById(user.getId()).orElseGet(ReminderPreference::new);
            pref.userId=user.getId();pref.reminders=request.reminders;pref.briefing=request.briefing;pref.cadence=request.cadence;pref.hour=request.hour;pref.weeklyDay=request.weeklyDay;
            pref.consentLinkedAt=validLink(link)?link.linkedAt:null;pref.updatedAt=now();preferences.save(pref);
            deliveries.invalidateUser(user.getId());
        });
        return settings();
    }
    public List<DeliveryStatus> history(){return deliveries.findAllByUserIdOrderByCreatedAtDesc(current.id(),PageRequest.of(0,50)).stream().map(this::status).toList();}
    private DeliveryStatus status(ScheduledDelivery d){return new DeliveryStatus(d.id,d.notificationId,d.kind,d.status,d.attempts,d.sentAt,d.lastError);}
    private boolean validLink(TelegramLink link){return link!=null&&link.senderId!=null&&link.senderId>0&&Objects.equals(link.chatId,link.senderId)&&link.linkedAt!=null;}
    private boolean consented(ReminderPreference p,TelegramLink link){return p!=null&&p.consentLinkedAt!=null&&validLink(link)&&Objects.equals(p.consentLinkedAt.toInstant(),link.linkedAt.toInstant());}
    private boolean eligible(User user,ReminderPreference p,TelegramLink link,String kind){return user.isActive()&&plans.entitled(user)&&p!=null&&p.consentLinkedAt!=null&&consented(p,link)&&("REMINDER".equals(kind)?p.reminders:p.briefing);}
    private void requireEnabled(){if(!enabled)throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);}
    public ScanResult scan(int page){
        requireEnabled();if(page<0||page>100000)throw new IllegalArgumentException();
        var batch=users.findAll(PageRequest.of(page,25,org.springframework.data.domain.Sort.by("id")));
        for(var user:batch)tx.executeWithoutResult(s->{
            var locked=users.findByIdForUpdate(user.getId()).orElseThrow();if(!locked.isActive())return;
            // Internal milestones remain available to all plans, independent of Telegram.
            notificationService.syncMilestoneNotifications(locked,today());
            var pref=preferences.findById(locked.getId()).orElse(null);var link=links.findById(locked.getId()).orElse(null);
            if(pref==null||ZonedDateTime.now(clock.withZone(ZONE)).getHour()<pref.hour)return;
            if(eligible(locked,pref,link,"REMINDER"))for(var due:upcoming.getUpcomingDues(locked.getId(),today())){
                if(due.reminderMilestone()==null||due.reminderMilestone()==ReminderMilestone.NONE)continue;
                String key="DUE_MILESTONE:"+due.debtId()+":"+due.dueDate()+":"+due.reminderMilestone().name();
                var notification=notifications.findByUserIdAndEventKey(locked.getId(),key).orElseThrow();
                create(locked,notification,"REMINDER",due,key,link);
            }
            boolean briefingDay="WEEKLY".equals(pref.cadence)?today().getDayOfWeek().getValue()==pref.weeklyDay:today().getDayOfMonth()==1;
            if(briefingDay&&eligible(locked,pref,link,"BRIEFING")){
                String key="BRIEFING:"+pref.cadence+":"+today();
                if(!deliveries.existsByUserIdAndEventKey(locked.getId(),key)){
                    var n=notifications.findByUserIdAndEventKey(locked.getId(),key).orElseGet(()->{
                        var event=new Notification();event.setUser(locked);event.setType("FINANCIAL_BRIEFING");event.setTitle("Resumen financiero de Ceroa");
                        event.setMessage(asUser(locked.getId(),this::briefing));event.setEventDate(today());event.setChannel("IN_APP");event.setEventKey(key);return notifications.saveAndFlush(event);
                    });create(locked,n,"BRIEFING",null,key,link);
                }
            }
        });
        return new ScanResult(batch.getNumberOfElements(),batch.hasNext(),page+1);
    }
    private void create(User user,Notification n,String kind,UpcomingDueResponse due,String key,TelegramLink link){
        if(deliveries.existsByUserIdAndEventKey(user.getId(),key))return;
        var d=new ScheduledDelivery();d.id=UUID.randomUUID();d.userId=user.getId();d.notificationId=n.getId();d.eventKey=key;d.kind=kind;
        d.debtId=due==null?null:due.debtId();d.dueDate=due==null?null:due.dueDate();d.milestone=due==null?null:due.reminderMilestone().name();
        d.periodDate=today();d.nextAttempt=now();d.expiresAt=today().plusDays(1).atStartOfDay(ZONE).toOffsetDateTime();d.createdAt=now();d.linkedAt=link.linkedAt;deliveries.save(d);
    }
    public List<Candidate> candidates(){requireEnabled();tx.executeWithoutResult(s->{deliveries.expirePending(now());deliveries.expireDispatch(now());});return deliveries.ready(now(),PageRequest.of(0,100)).stream().map(d->new Candidate(d.id,d.kind,d.milestone)).toList();}
    private <T> T locked(UUID id,java.util.function.Function<ScheduledDelivery,T> action){
        return tx.execute(s->{
            var row=deliveries.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
            users.findByIdForUpdate(row.userId).orElseThrow(); // Consistent user-before-delivery lock order.
            var delivery=deliveries.lock(id).orElseThrow();
            entityManager.refresh(delivery,jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            return action.apply(delivery);
        });
    }
    private boolean current(ScheduledDelivery d){
        if(!now().isBefore(d.expiresAt)||!today().equals(d.periodDate)){d.status="INVALIDATED";d.lastError="EXPIRED";return false;}
        var user=users.findById(d.userId).orElse(null);var pref=preferences.findById(d.userId).orElse(null);var link=links.findById(d.userId).orElse(null);
        if(user==null||!eligible(user,pref,link,d.kind)||!Objects.equals(d.linkedAt.toInstant(),link.linkedAt.toInstant())){d.status="INVALIDATED";d.lastError="PERMISSION_REVOKED";return false;}
        if("REMINDER".equals(d.kind)){
            var due=upcoming.getUpcomingDueForDebt(d.debtId,d.userId,today());
            if(due==null||due.status()==DebtStatus.PAID||due.amount()==null||due.amount().signum()<=0||!Objects.equals(due.dueDate(),d.dueDate)||due.reminderMilestone()==null||!Objects.equals(due.reminderMilestone().name(),d.milestone)){
                d.status="INVALIDATED";d.lastError="FINANCIAL_CHANGE";return false;
            }
            d.message=reminder(due);
        }else{
            String expected="BRIEFING:"+pref.cadence+":"+today();
            if(!expected.equals(d.eventKey)){d.status="INVALIDATED";d.lastError="PREFERENCE_CHANGED";return false;}
            d.message=asUser(d.userId,this::briefing);
        }
        d.chatId=link.chatId;return true;
    }
    public Reservation reserve(UUID id){requireEnabled();return locked(id,d->{
        if("DISPATCHING".equals(d.status)&&!now().isBefore(d.leaseExpiresAt)){d.status="AMBIGUOUS";d.lastError="UNKNOWN_TELEGRAM_RESULT";return new Reservation(false,id,null);}
        if("RESERVED".equals(d.status)&&!now().isBefore(d.leaseExpiresAt)){d.status="RETRY";d.nextAttempt=now();}
        if(!Set.of("PENDING","RETRY").contains(d.status)||now().isBefore(d.nextAttempt)||!current(d))return new Reservation(false,id,null);
        if(d.attempts>=4){d.status="FAILED";d.lastError="ATTEMPT_LIMIT";return new Reservation(false,id,null);}
        String token=tokens.createRawToken();d.leaseHash=tokens.hash(token);d.leaseExpiresAt=now().plusMinutes(3);d.status="RESERVED";
        // Hide active leases from subsequent batches; expiry recovers unsent reservations only.
        d.nextAttempt=d.leaseExpiresAt;
        return new Reservation(true,id,token);
    });}
    private void verify(ScheduledDelivery d,String token){if(token==null||!token.matches("[A-Za-z0-9_-]{43}")||!Objects.equals(tokens.hash(token),d.leaseHash))throw new ResponseStatusException(HttpStatus.CONFLICT);}
    public Dispatch dispatch(UUID id,String token){requireEnabled();return locked(id,d->{
        verify(d,token);
        if(!"RESERVED".equals(d.status)||!now().isBefore(d.leaseExpiresAt)||!current(d))return new Dispatch(false,id,null,null,null,null);
        d.status="DISPATCHING";d.attempts++;d.validatedAt=now();d.leaseExpiresAt=now().plusMinutes(3);d.nextAttempt=d.leaseExpiresAt;
        return new Dispatch(true,id,token,d.chatId,d.message,d.validatedAt);
    });}
    public DeliveryStatus outcome(UUID id,Outcome result){requireEnabled();return locked(id,d->{
        verify(d,result.token);
        if(("RETRY".equals(d.status)&&"RETRY".equals(result.result)&&Objects.equals(d.lastError,result.errorCode))
            ||("FAILED".equals(d.status)&&"FAILED".equals(result.result))
            ||("AMBIGUOUS".equals(d.status)&&"AMBIGUOUS".equals(result.result)))return status(d);
        if("SENT".equals(d.status)){
            if(!"SENT".equals(result.result)||!Objects.equals(d.telegramMessageId,result.messageId))throw new ResponseStatusException(HttpStatus.CONFLICT);
            return status(d);
        }
        if(!Set.of("DISPATCHING","AMBIGUOUS").contains(d.status))throw new ResponseStatusException(HttpStatus.CONFLICT);
        switch(result.result){
            case "SENT" -> {
                if(result.messageId==null||result.messageId<=0)throw new IllegalArgumentException();
                d.status="SENT";d.telegramMessageId=result.messageId;d.sentAt=now();d.lastError=null;
                var n=notifications.findById(d.notificationId).orElseThrow();n.setChannel("TELEGRAM");n.setMessage(d.message);n.setPlanRestricted(false);
            }
            case "RETRY" -> {
                if(!Set.of("RATE_LIMIT","TELEGRAM_5XX").contains(result.errorCode))throw new IllegalArgumentException();
                if(!current(d))break;
                if(d.attempts>=4){d.status="FAILED";d.lastError="ATTEMPT_LIMIT";break;}
                int delay=Math.max((int)Math.pow(2,d.attempts)*30+ThreadLocalRandom.current().nextInt(15),result.retryAfter==null?0:Math.max(0,result.retryAfter));
                d.nextAttempt=now().plusSeconds(delay);d.status="RETRY";d.lastError=result.errorCode;
            }
            case "FAILED" -> {d.status="FAILED";d.lastError="TELEGRAM_PERMANENT";}
            case "AMBIGUOUS" -> {d.status="AMBIGUOUS";d.lastError="UNKNOWN_TELEGRAM_RESULT";}
            default -> throw new IllegalArgumentException();
        }
        return status(d);
    });}
    private String reminder(UpcomingDueResponse due){
        String when=switch(due.reminderMilestone()){case SEVEN_DAYS->"vence en 7 días";case THREE_DAYS->"vence en 3 días";case DUE_TODAY->"vence hoy";default->throw new IllegalArgumentException();};
        return "Ceroa: tu obligación "+due.debtName()+" "+when+" ("+due.dueDate()+"). Monto exigible: "+money(due.amount())+" COP. Revisa los detalles y registra tus pagos en Ceroa.";
    }
    private String briefing(){
        var summary=dashboard.getSummary();String strategy=switch(summary.activeStrategy()){case AVALANCHE->"Avalancha";case SNOWBALL->"Bola de nieve";default->"prioridad manual";};
        String text="Resumen financiero de Ceroa — "+today()+". Saldo registrado: "+money(summary.totalRegisteredDebt())+" COP. Deudas activas: "+summary.activeDebtCount()+". Estrategia: "+strategy+".";
        if(summary.hasRequiredPaymentsData())text+=" Pagos requeridos del período: "+money(summary.requiredPaymentsCurrentPeriod())+" COP.";
        // Resolve dates with the same Colombia clock as the scheduler, including midnight.
        var due=upcoming.getUpcomingDues(current.id(),today()).stream().findFirst().orElse(null);
        if(due!=null)text+=(due.daysUntilDue()<0?" Vencimiento pendiente: ":" Próximo vencimiento: ")+due.debtName()+", "+due.dueDate()+"; "+money(due.amount())+" COP.";
        if(summary.progress()!=null&&summary.progress().hasProgressData())text+=" Pagos registrados: "+money(summary.progress().totalRecordedPayments())+" COP.";
        if(summary.partialCoverage())text+=" Cobertura parcial: faltan deudas por registrar.";
        return text+" Consulta el detalle actualizado en Ceroa.";
    }
    private String money(BigDecimal amount){var f=NumberFormat.getNumberInstance(Locale.forLanguageTag("es-CO"));f.setMaximumFractionDigits(2);return amount==null?"no disponible":f.format(amount);}
    private <T> T asUser(UUID id,Supplier<T> action){var previous=SecurityContextHolder.getContext();var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(new UsernamePasswordAuthenticationToken(id.toString(),null,List.of()));SecurityContextHolder.setContext(context);try{return action.get();}finally{SecurityContextHolder.setContext(previous);}}
}
