package com.ceroa.service;

import com.ceroa.repository.WorkspaceActionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;
import java.time.OffsetDateTime;
import java.util.Map;

/** A review draft supplements the persistent proposal; it never confirms or sends it. */
@Service
public class WorkspaceDraftService {
    private final WorkspaceActionRepository actions;
    private final CurrentUserService current;
    private final DashboardService dashboard;
    private final UpcomingDueService dues;
    private final com.ceroa.repository.PlusSubscriptionRepository subscriptions;
    private final PlusSubscriptionService plus;
    private final String url,key;
    public WorkspaceDraftService(WorkspaceActionRepository actions,CurrentUserService current,DashboardService dashboard,
        @Value("${ceroa.workspace.draft-url:}") String url,@Value("${ceroa.workspace.worker-key:}") String key){
        this(actions,current,dashboard,null,null,null,url,key);
    }
    @org.springframework.beans.factory.annotation.Autowired
    public WorkspaceDraftService(WorkspaceActionRepository actions,CurrentUserService current,DashboardService dashboard,
        UpcomingDueService dues,com.ceroa.repository.PlusSubscriptionRepository subscriptions,PlusSubscriptionService plus,
        @Value("${ceroa.workspace.draft-url:}") String url,@Value("${ceroa.workspace.worker-key:}") String key){
        this.actions=actions;this.current=current;this.dashboard=dashboard;this.dues=dues;this.subscriptions=subscriptions;this.plus=plus;this.url=url;this.key=key;
    }
    @Transactional(noRollbackFor=ResponseStatusException.class)
    public JsonNode prepare(String code){
        var user=current.entityForUpdate();
        if(!user.isActive())throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        var proposal=actions.byCode(user.getId(),code).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(!"PROPOSED".equals(proposal.status)||!proposal.expiresAt.isAfter(OffsetDateTime.now()))throw new ResponseStatusException(HttpStatus.GONE);
        if(!java.util.Set.of("FINANCIAL_SUMMARY","UPCOMING_DUES","SUBSCRIPTION_INFO").contains(proposal.kind))throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        if(key.length()<32||!url.matches("http://n8n:5678/webhook/[A-Za-z0-9/_-]+"))throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
        var json=new com.fasterxml.jackson.databind.ObjectMapper();
        JsonNode snapshot;
        if(proposal.draftSnapshot==null){
            String subject,message;
            switch(proposal.kind){
                case "FINANCIAL_SUMMARY" -> {var summary=dashboard.getSummary();subject="Resumen financiero Ceroa - pendiente de revision";message="Deuda registrada: "+summary.totalRegisteredDebt()+". Obligaciones activas: "+summary.activeDebtCount()+". Revisa y confirma la propuesta en Ceroa.";}
                case "UPCOMING_DUES" -> {
                    if(dues==null)throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
                    subject="Proximos vencimientos Ceroa - pendiente de revision";
                    message="Vencimientos registrados:\n"+dues.getUpcomingDues().stream().limit(100).map(d->d.debtName()+" | "+(d.amount()==null?"sin importe confirmado":d.amount())+" | "+(d.dueDate()==null?"sin fecha confirmada":d.dueDate())).collect(java.util.stream.Collectors.joining("\n"));
                }
                case "SUBSCRIPTION_INFO" -> {
                    if(subscriptions==null||plus==null)throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
                    var subscription=subscriptions.findFirstByUserIdOrderByCreatedAtDesc(user.getId()).orElse(null);
                    subject="Suscripcion Ceroa - pendiente de revision";
                    message="Estado almacenado en Ceroa: "+(subscription==null?"NONE":plus.view(subscription).status())+". Vigencia: "+(subscription==null?"no disponible":plus.view(subscription).accessUntil())+". Renovacion automatica: "+(subscription!=null&&subscription.automaticRenewal?"activa":"inactiva")+".";
                }
                default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
            }
            snapshot=json.valueToTree(Map.of("proposalId",proposal.id.toString(),"recipient",user.getEmail(),
                "subject",subject,"message",message));
            proposal.draftSnapshot=snapshot.toString();
            actions.saveAndFlush(proposal);
        }else{
            try{snapshot=json.readTree(proposal.draftSnapshot);}catch(Exception e){throw new ResponseStatusException(HttpStatus.CONFLICT);}
            if(!user.getEmail().equals(snapshot.path("recipient").asText()))throw new ResponseStatusException(HttpStatus.CONFLICT,"El destinatario cambio; crea una propuesta nueva");
        }
        JsonNode result;
        try { result=client().post().uri(url)
            .header("X-Ceroa-Workspace",key).body(snapshot)
            .retrieve().body(JsonNode.class);
        } catch(org.springframework.web.client.ResourceAccessException error) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Estado del proveedor no confirmado");
        } catch(org.springframework.web.client.RestClientException error) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"Respuesta del proveedor no valida");
        }
        if(result==null||result.toString().length()>12000||!proposal.id.toString().equals(result.path("proposalId").asText())
            ||!result.path("id").isTextual()||result.path("id").asText().isBlank()||result.path("id").asText().length()>256
            ||!result.path("sent").isBoolean()||result.path("sent").booleanValue())throw new ResponseStatusException(HttpStatus.BAD_GATEWAY);
        if(proposal.draftProviderId!=null&&!proposal.draftProviderId.equals(result.path("id").asText()))throw new ResponseStatusException(HttpStatus.BAD_GATEWAY);
        proposal.draftProviderId=result.path("id").asText();
        // The UI reviews the immutable server snapshot, never provider-authored text.
        var preview=json.createObjectNode();preview.put("id",proposal.draftProviderId);preview.put("proposalId",proposal.id.toString());preview.put("sent",false);
        preview.set("recipient",snapshot.get("recipient"));preview.set("subject",snapshot.get("subject"));preview.set("message",snapshot.get("message"));
        if(result.path("provider").isTextual()&&java.util.Set.of("GOOGLE","SIMULATED").contains(result.path("provider").asText()))preview.set("provider",result.get("provider"));
        return preview;
    }
    RestClient client(){
        var factory=new org.springframework.http.client.SimpleClientHttpRequestFactory();factory.setConnectTimeout(3000);factory.setReadTimeout(15000);
        return RestClient.builder().requestFactory(factory).build();
    }
}
