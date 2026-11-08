package com.ceroa.service;

import com.ceroa.domain.*;
import com.ceroa.repository.*;
import com.fasterxml.jackson.databind.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;

@Service
public class IntegrationEventService {
    public enum MailKind { WELCOME,PLUS_ACTIVATED,PLUS_RENEWED,PLUS_RENEWAL_CANCELLED,FINANCIAL_SUMMARY,UPCOMING_DUES,SUBSCRIPTION_INFO }
    public record Work(UUID id,UUID leaseToken,String channel,String kind,String recipient,JsonNode payload,int attempt) {}
    public record Outcome(String status,String providerId,String errorCode) {}
    private final IntegrationEventRepository events;private final UserRepository users;private final ObjectMapper json;
    private final boolean gmailEnabled,sheetsEnabled;
    public IntegrationEventService(IntegrationEventRepository events,UserRepository users,ObjectMapper json,
        @Value("${ceroa.workspace.gmail-enabled:false}") boolean gmailEnabled,@Value("${ceroa.workspace.sheets-enabled:false}") boolean sheetsEnabled){this.events=events;this.users=users;this.json=json;this.gmailEnabled=gmailEnabled;this.sheetsEnabled=sheetsEnabled;}
    @Transactional(propagation=Propagation.MANDATORY)
    public UUID mail(User user,MailKind kind,String key,Map<String,?> payload){
        users.findByIdForUpdate(user.getId()).orElseThrow();
        return enqueue("GMAIL",kind.name(),user.getId(),user.getEmail(),key,payload).id;
    }
    private IntegrationEvent enqueue(String channel,String kind,UUID owner,String recipient,String key,Object payload){
        if(key==null||key.length()>200)throw new IllegalArgumentException();
        var found=events.findByDedupeKey(key);if(found.isPresent())return found.get();
        var e=new IntegrationEvent();e.channel=channel;e.kind=kind;e.ownerId=owner;e.recipient=recipient;e.dedupeKey=key;
        try{e.payload=json.writeValueAsString(payload);}catch(Exception error){throw new IllegalArgumentException("Payload inválido");}
        if(e.payload.length()>24000)throw new IllegalArgumentException("Resumen demasiado amplio");return events.save(e);
    }
    @Transactional
    public List<Work> claim(String channel){
        if(!Set.of("GMAIL","SHEETS").contains(channel))throw new IllegalArgumentException();
        if(channel.equals("GMAIL")&&!gmailEnabled||channel.equals("SHEETS")&&!sheetsEnabled)return List.of();
        var now=OffsetDateTime.now();
        for(var e:events.expired(channel,now,PageRequest.of(0,50))){e.status=e.status.equals("DISPATCHING")&&!channel.equals("SHEETS")?"AMBIGUOUS":e.attempts>=5?"DEAD":"PENDING";e.errorCode=e.status.equals("AMBIGUOUS")?"LEASE_EXPIRED_AFTER_DISPATCH":null;e.leaseToken=null;e.leaseUntil=null;projection(e);}
        return events.ready(channel,now,PageRequest.of(0,1)).stream().map(e->{e.status="LEASED";e.attempts++;e.leaseToken=UUID.randomUUID();e.leaseUntil=now.plusMinutes(3);return work(e);}).toList();
    }
    private Work work(IntegrationEvent e){try{return new Work(e.id,e.leaseToken,e.channel,e.kind,e.recipient,json.readTree(e.payload),e.attempts);}catch(Exception ex){throw new IllegalStateException();}}
    private IntegrationEvent lease(UUID id,UUID token){var e=events.locked(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(token==null||!token.equals(e.leaseToken)||e.leaseUntil==null||!e.leaseUntil.isAfter(OffsetDateTime.now()))throw new ResponseStatusException(HttpStatus.CONFLICT,"Permiso de envío vencido");return e;}
    @Transactional
    public Work dispatch(UUID id,UUID token){
        var e=lease(id,token);if(!e.status.equals("LEASED"))throw new ResponseStatusException(HttpStatus.CONFLICT,"Intento ya iniciado");
        if(e.ownerId!=null){var u=users.findById(e.ownerId).orElseThrow();if(!u.isActive()||!Objects.equals(u.getEmail(),e.recipient)){e.status="CANCELLED";projection(e);return null;}}
        if(e.channel.equals("GMAIL"))MailKind.valueOf(e.kind);
        e.status="DISPATCHING";return work(e);
    }
    @Transactional
    public void outcome(UUID id,UUID token,Outcome input){
        var e=events.locked(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(e.status.equals("ACKNOWLEDGED")&&Objects.equals(e.leaseToken,token)&&input!=null&&"ACKNOWLEDGED".equals(input.status())&&Objects.equals(e.providerId,input.providerId()))return;
        e=lease(id,token);if(input==null||!Set.of("ACKNOWLEDGED","AMBIGUOUS","RETRY_BEFORE_DISPATCH","RETRY_PROJECTION").contains(input.status()))throw new IllegalArgumentException();
        if(input.status().equals("RETRY_BEFORE_DISPATCH")||input.status().equals("RETRY_PROJECTION")){
            if(input.status().equals("RETRY_PROJECTION")?(!e.channel.equals("SHEETS")||!e.status.equals("DISPATCHING")):!e.status.equals("LEASED"))throw new ResponseStatusException(HttpStatus.CONFLICT,"No se reintenta un envío potencialmente aceptado");
            e.status=e.attempts>=5?"DEAD":"PENDING";e.nextAttemptAt=OffsetDateTime.now().plusSeconds(Math.min(3600,30L<<e.attempts));e.leaseToken=null;e.leaseUntil=null;
        }else{
            if(!e.status.equals("DISPATCHING"))throw new ResponseStatusException(HttpStatus.CONFLICT);
            if(input.status().equals("ACKNOWLEDGED")&&(input.providerId()==null||!input.providerId().matches("[A-Za-z0-9_:@.\\-]{1,200}")))throw new IllegalArgumentException("Falta identificador del proveedor");
            e.status=input.status();e.providerId=input.status().equals("ACKNOWLEDGED")?input.providerId():null;
        }
        e.errorCode=input.errorCode()==null?null:Set.of("PROVIDER_UNAVAILABLE","PROVIDER_AMBIGUOUS","VALIDATION_FAILED").contains(input.errorCode())?input.errorCode():"PROVIDER_UNAVAILABLE";projection(e);
    }
    private void projection(IntegrationEvent e){if(e.channel.equals("SHEETS"))return;
        enqueue("SHEETS","OPERATIONAL_METRIC",null,null,"projection:"+e.id+":"+e.status+":"+e.attempts,Map.of("eventId",e.id.toString(),"workflow","ceroaWorkspaceMail40","event",e.kind,"status",e.status,"at",OffsetDateTime.now().toString(),"durationMs",Math.max(0,Duration.between(e.createdAt,OffsetDateTime.now()).toMillis()),"result",e.errorCode==null?e.status:e.errorCode));
    }
    @Transactional
    public void driveMetric(UUID syncId,String version,String status){
        if(!Set.of("QUEUED","READY","FAILED","UNCHANGED").contains(status))throw new IllegalArgumentException();
        enqueue("SHEETS","OPERATIONAL_METRIC",null,null,"drive:"+syncId+":"+version+":"+status,Map.of("eventId",syncId.toString(),"workflow","ceroaWorkspaceDrive40","event","DOCUMENT_SYNC","status",status,"at",OffsetDateTime.now().toString(),"durationMs",0,"result",status));
    }
}
