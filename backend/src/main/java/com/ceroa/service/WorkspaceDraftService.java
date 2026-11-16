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
    private final String url,key;
    public WorkspaceDraftService(WorkspaceActionRepository actions,CurrentUserService current,DashboardService dashboard,
        @Value("${ceroa.workspace.draft-url:}") String url,@Value("${ceroa.workspace.worker-key:}") String key){
        this.actions=actions;this.current=current;this.dashboard=dashboard;this.url=url;this.key=key;
    }
    @Transactional
    public JsonNode prepare(String code){
        var user=current.entityForUpdate();
        if(!user.isActive())throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        var proposal=actions.byCode(user.getId(),code).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));
        if(!"PROPOSED".equals(proposal.status)||!proposal.expiresAt.isAfter(OffsetDateTime.now()))throw new ResponseStatusException(HttpStatus.GONE);
        // Start with one explicit template and no free-form recipients or model-supplied amounts.
        if(!"FINANCIAL_SUMMARY".equals(proposal.kind))throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        if(key.length()<32||!url.matches("http://n8n:5678/webhook/[A-Za-z0-9/_-]+"))throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE);
        var summary=dashboard.getSummary();
        JsonNode result;
        try { result=client().post().uri(url)
            .header("X-Ceroa-Workspace",key).body(Map.of("proposalId",proposal.id.toString(),"recipient",user.getEmail(),
                "subject","Resumen financiero Ceroa - pendiente de revision",
                "message","Deuda registrada: "+summary.totalRegisteredDebt()+". Obligaciones activas: "+summary.activeDebtCount()+". Revisa y confirma la propuesta en Ceroa."))
            .retrieve().body(JsonNode.class);
        } catch(org.springframework.web.client.ResourceAccessException error) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Estado del proveedor no confirmado");
        } catch(org.springframework.web.client.RestClientException error) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,"Respuesta del proveedor no valida");
        }
        if(result==null||result.toString().length()>12000||!proposal.id.toString().equals(result.path("proposalId").asText())
            ||!result.path("id").isTextual()||result.path("id").asText().isBlank()
            ||!result.path("sent").isBoolean()||result.path("sent").booleanValue())throw new ResponseStatusException(HttpStatus.BAD_GATEWAY);
        return result;
    }
    RestClient client(){
        var factory=new org.springframework.http.client.SimpleClientHttpRequestFactory();factory.setConnectTimeout(3000);factory.setReadTimeout(15000);
        return RestClient.builder().requestFactory(factory).build();
    }
}
