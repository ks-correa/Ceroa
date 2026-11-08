package com.ceroa.service;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestClient;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.*;
import java.util.*;
/** Operator-configured private native n8n workflow. Never accepts a model URL or calendar identifier. */
@Component
public class WorkspaceCalendarGateway {
 private final String url,key;private final boolean enabled;
 public WorkspaceCalendarGateway(@Value("${ceroa.workspace.calendar-url:}")String url,@Value("${ceroa.workspace.worker-key:}")String key,@Value("${ceroa.workspace.calendar-enabled:false}")boolean enabled){this.url=url;this.key=key;this.enabled=enabled;}
 public JsonNode call(String operation,OffsetDateTime start,OffsetDateTime end,String eventId,String email){
  if(!enabled||key.length()<32||!url.matches("http://n8n:5678/webhook/[A-Za-z0-9/_-]+"))throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Calendar pendiente de configurar");
  var factory=new org.springframework.http.client.SimpleClientHttpRequestFactory();factory.setConnectTimeout(3000);factory.setReadTimeout(20000);
  var body=new HashMap<String,Object>();body.put("operation",operation);body.put("start",start.toString());body.put("end",end.toString());body.put("eventId",eventId==null?"":eventId);body.put("email",email==null?"":email);
  JsonNode result=RestClient.builder().requestFactory(factory).build().post().uri(url).header("X-Ceroa-Workspace",key).contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(JsonNode.class);
  if(result==null||result.toString().length()>24000)throw new IllegalStateException("Respuesta Calendar invalida");return result;
 }
 public boolean available(OffsetDateTime start,OffsetDateTime end){return call("availability",start,end,null,null).path("available").asBoolean(false);}
}
