import java.nio.file.*;import java.sql.*;import java.util.*;import java.io.*;import java.net.URI;import java.time.*;import java.math.BigDecimal;
import org.hibernate.cfg.Configuration;import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;import org.springframework.web.client.RestClient;import org.springframework.http.*;import org.springframework.http.client.*;
import com.ceroa.domain.*;import com.ceroa.repository.*;import com.ceroa.service.*;
public class Block12ReceiptCheck {
 static void check(boolean x,String m){if(!x)throw new IllegalStateException(m);}
 static void field(Object o,String n,Object v)throws Exception{var f=o.getClass().getDeclaredField(n);f.setAccessible(true);f.set(o,v);}
 static class Provider implements ClientHttpRequestFactory {
  Map<String,Deque<String>> replies=new HashMap<>();int requests;
  void add(String path,String json){replies.computeIfAbsent(path,x->new ArrayDeque<>()).add(json);}
  public ClientHttpRequest createRequest(URI uri,HttpMethod method){
   return new ClientHttpRequest(){HttpHeaders headers=new HttpHeaders();public Map<String,Object> getAttributes(){return new HashMap<>();}public URI getURI(){return uri;}public HttpMethod getMethod(){return method;}public HttpHeaders getHeaders(){return headers;}public OutputStream getBody(){return new ByteArrayOutputStream();}
   public ClientHttpResponse execute(){requests++;var q=replies.get(uri.getPath());if(q==null||q.isEmpty())throw new IllegalStateException("Unexpected fixture request");byte[] data=q.remove().getBytes(java.nio.charset.StandardCharsets.UTF_8);return new ClientHttpResponse(){public HttpStatusCode getStatusCode(){return HttpStatus.OK;}public String getStatusText(){return "OK";}public void close(){}public InputStream getBody(){return new ByteArrayInputStream(data);}public HttpHeaders getHeaders(){var h=new HttpHeaders();h.setContentType(MediaType.APPLICATION_JSON);return h;}};}};
  }
 }
 static void provider(Provider p,PlusSubscription s,String status,OffsetDateTime boundary){p.add("/preapproval/"+s.providerId,"{\"id\":\""+s.providerId+"\",\"external_reference\":\""+s.id+"\",\"status\":\""+status+"\",\"next_payment_date\":\""+boundary+"\",\"auto_recurring\":{\"frequency\":1,\"frequency_type\":\"months\",\"transaction_amount\":19900,\"currency_id\":\"COP\"}}");}
 static void payment(Provider p,PlusSubscription s,String id,String status){p.add("/authorized_payments/"+id,"{\"id\":\""+id+"\",\"status\":\"processed\",\"payment\":{\"status\":\""+status+"\"},\"preapproval_id\":\""+s.providerId+"\",\"transaction_amount\":\"19900.00\",\"currency_id\":\"COP\"}");}
 public static void main(String[] args)throws Exception{
  String url="jdbc:postgresql://127.0.0.1:5432/migration_v31_verified?currentSchema=ceroa";
  var strict=org.flywaydb.core.Flyway.configure().dataSource(url,"postgres","").defaultSchema("ceroa").schemas("ceroa").locations("filesystem:/private/block12c/candidate/BOOT-INF/classes/db/migration").load();strict.validate();check(strict.info().pending().length==0,"strictNoPending");
  var cfg=new Configuration();cfg.setProperty("hibernate.connection.url",url);cfg.setProperty("hibernate.connection.username","postgres");cfg.setProperty("hibernate.connection.password","");cfg.setProperty("hibernate.default_schema","ceroa");cfg.setProperty("hibernate.hbm2ddl.auto","validate");
  var root=Path.of("/private/block12c/candidate/BOOT-INF/classes/com/ceroa/domain");try(var paths=Files.walk(root)){for(var p:paths.filter(p->p.toString().endsWith(".class")&&!p.toString().contains("$")).toList()){var c=Class.forName("com.ceroa.domain."+root.relativize(p).toString().replace('/','.').replace(".class",""));if(c.isAnnotationPresent(jakarta.persistence.Entity.class))cfg.addAnnotatedClass(c);}}
  try(var sf=cfg.buildSessionFactory();var em=sf.createEntityManager()){
   em.getTransaction().begin();try{
    var factory=new JpaRepositoryFactory(em);var users=factory.getRepository(UserRepository.class);var subscriptions=factory.getRepository(PlusSubscriptionRepository.class);var charges=factory.getRepository(SubscriptionChargeRepository.class);var events=factory.getRepository(IntegrationEventRepository.class);
    var mock=new Provider();var service=new PlusSubscriptionService(subscriptions,users,null,RestClient.builder().requestFactory(mock),charges);field(service,"entityManager",em);field(service,"accessToken","synthetic-no-provider-token");field(service,"workspaceEvents",new IntegrationEventService(events,users,new com.fasterxml.jackson.databind.ObjectMapper(),false,false));
    var user=new User();user.setFullName("B12C synthetic receipt fixture");user.setEmail(UUID.randomUUID()+"@example.invalid");user.setActive(true);users.saveAndFlush(user);
    var s=new PlusSubscription();s.user=user;s.periodicity="MONTHLY";s.amount=new BigDecimal("19900");s.currency="COP";s.providerId="fixture-"+UUID.randomUUID();subscriptions.saveAndFlush(s);
    OffsetDateTime first=OffsetDateTime.parse("2030-01-08T10:00:00Z"),second=first.plusMonths(1),third=second.plusMonths(1);String a="b12c-"+UUID.randomUUID(),b="b12c-"+UUID.randomUUID();
    provider(mock,s,"authorized",first);service.refresh(s.providerId);payment(mock,s,a,"approved");provider(mock,s,"authorized",second);service.refreshAuthorizedPayment(a);payment(mock,s,b,"approved");provider(mock,s,"authorized",third);service.refreshAuthorizedPayment(b);
    int requests=mock.requests;service.refreshAuthorizedPayment(a);check(mock.requests==requests,"oldReplayNoProvider");check(charges.existsById("MERCADO_PAGO:"+a)&&charges.existsById("MERCADO_PAGO:"+b),"durableReceipts");check(charges.findById("MERCADO_PAGO:"+a).orElseThrow().billingBoundary.toInstant().equals(second.toInstant()),"receiptBoundary");
    provider(mock,s,"authorized",first);service.refresh(s.providerId);check(s.nextPaymentAt.toInstant().equals(third.toInstant()),"noBoundaryRegression");
    String rejected="rejected-"+UUID.randomUUID();payment(mock,s,rejected,"rejected");service.refreshAuthorizedPayment(rejected);check(!charges.existsById("MERCADO_PAGO:"+rejected),"rejectedNoReceipt");
    provider(mock,s,"cancelled",third);service.refresh(s.providerId);provider(mock,s,"authorized",third.plusMonths(1));service.refresh(s.providerId);check(s.status.equals("CANCEL_SCHEDULED")&&!s.automaticRenewal&&s.accessUntil.toInstant().equals(third.toInstant()),"cancellation");
    em.flush();long activated=em.createQuery("SELECT count(e) FROM IntegrationEvent e WHERE e.ownerId=:owner AND e.kind='PLUS_ACTIVATED'",Long.class).setParameter("owner",user.getId()).getSingleResult();long renewed=em.createQuery("SELECT count(e) FROM IntegrationEvent e WHERE e.ownerId=:owner AND e.kind='PLUS_RENEWED'",Long.class).setParameter("owner",user.getId()).getSingleResult();check(activated==1&&renewed==2,"deduplicatedFixtureEvents");

   }finally{if(em.getTransaction().isActive())em.getTransaction().rollback();}
  }
  var result=Map.of("strictFlywayValidate",true,"durableReceiptPersistence",true,"oldReplaySkipsProvider",true,"duplicateEventsPrevented",true,"staleBoundaryRejected",true,"rejectedChargeNoReceipt",true,"cancellationKeepsPaidAccess",true,"fixtureTransactionRolledBack",true,"realProvidersContacted",false);
  Files.writeString(Path.of("/private/block12c/receipt-results.json"),new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(result));System.out.println("B12C_RECEIPT_FIXTURES_VERIFIED");
 }
}



