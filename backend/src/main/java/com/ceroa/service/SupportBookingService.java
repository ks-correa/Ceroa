package com.ceroa.service;
import com.ceroa.domain.*;
import com.ceroa.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.*;
import java.util.*;
import java.security.SecureRandom;
@Service
public class SupportBookingService {
 public record View(String code,String status,OffsetDateTime start,OffsetDateTime end,OffsetDateTime expiresAt,String meetUrl,String instruction){}
 public record Slot(OffsetDateTime start,OffsetDateTime end){}
 public record Availability(String status,String message,String timezone,LocalDate minDate,LocalDate maxDate,List<Slot> slots){}
 private static final ZoneId ZONE=ZoneId.of("America/Bogota");
 public Availability availableSlots(LocalDate date){
  var now=ZonedDateTime.now(ZONE);var today=now.toLocalDate();var last=today.plusDays(14);
  String guide="Las asesorías duran 30 minutos, de lunes a viernes de 9:00 a. m. a 5:00 p. m., hora de Bogotá, con una hora de anticipación. Elige una fecha y después un horario; la reserva requiere tu confirmación.";
  if(date!=null&&(date.isBefore(today)||date.isAfter(last)||date.getDayOfWeek().getValue()>5))
   return new Availability("NEEDS_DATE","Selecciona un día hábil dentro de las próximas dos semanas. "+guide,ZONE.getId(),today,last,List.of());
  var first=date==null?today:date;var endDate=date==null?last:date;
  try{
   var busy=calendar.busy(first.atTime(9,0).atZone(ZONE).toOffsetDateTime(),endDate.atTime(17,0).atZone(ZONE).toOffsetDateTime());
   var slots=new ArrayList<Slot>();
   for(var day=first;!day.isAfter(endDate);day=day.plusDays(1)){
    if(day.getDayOfWeek().getValue()>5)continue;
    int perDay=0;
    for(int minute=9*60;minute<17*60;minute+=30){
     var start=day.atTime(minute/60,minute%60).atZone(ZONE).toOffsetDateTime();var end=start.plusMinutes(30);
     if(start.toInstant().isBefore(now.plusHours(1).toInstant())||start.toInstant().isAfter(now.plusDays(14).toInstant()))continue;
     if(busy.stream().noneMatch(b->b.start().isBefore(end.toInstant())&&b.end().isAfter(start.toInstant()))){slots.add(new Slot(start,end));perDay++;}
     if(date==null&&(perDay>=3||slots.size()>=12))break;
    }
    if(date==null&&slots.size()>=12)break;
   }
   return new Availability("AVAILABLE",(slots.isEmpty()?"Calendar no muestra espacios libres en el período consultado. Prueba otra fecha. ":"Consulté Google Calendar. Estos horarios están disponibles por ahora; volveré a comprobarlos al reservar. ")+guide,ZONE.getId(),today,last,List.copyOf(slots));
  }catch(RuntimeException error){
   return new Availability("UNAVAILABLE","No pude verificar Google Calendar en este momento. Puedes elegir una fecha y volver a consultar; todavía no hay una reserva. "+guide,ZONE.getId(),today,last,List.of());
  }
 }
 private final SupportBookingRepository bookings;private final CurrentUserService current;private final WorkspaceCalendarGateway calendar;private final TransactionTemplate tx;private final IntegrationEventService events;
 public SupportBookingService(SupportBookingRepository bookings,CurrentUserService current,WorkspaceCalendarGateway calendar,PlatformTransactionManager tm,IntegrationEventService events){this.bookings=bookings;this.current=current;this.calendar=calendar;this.events=events;tx=new TransactionTemplate(tm);}
 private static String code(){var random=new SecureRandom();var s=new StringBuilder();for(int i=0;i<20;i++)s.append((char)('A'+random.nextInt(26)));return s.toString();}
 private void slot(OffsetDateTime start){if(start==null)throw new IllegalArgumentException();var local=start.atZoneSameInstant(ZoneId.of("America/Bogota"));if(start.isBefore(OffsetDateTime.now().plusHours(1))||start.isAfter(OffsetDateTime.now().plusDays(14))||local.getDayOfWeek().getValue()>5||local.getHour()<9||local.getHour()>=17||local.getMinute()%30!=0||local.getSecond()!=0||local.getNano()!=0)throw new IllegalArgumentException("Selecciona un horario habil de treinta minutos en Bogota");}
 public Map<String,Object> availability(OffsetDateTime start){
  try{slot(start);}catch(IllegalArgumentException error){return Map.of("status","NEEDS_DATE","message","Indica un día hábil dentro de las próximas dos semanas y una hora entre 09:00 y 16:30 en Bogotá, en bloques de 30 minutos y con una hora de anticipación. No se ha reservado nada.");}
  try{
   return Map.of("start",start,"end",start.plusMinutes(30),"available",calendar.available(start,start.plusMinutes(30)),"calendarConfigured",true,"timezone","America/Bogota");
  }catch(ResponseStatusException ex){
   if(ex.getStatusCode()==HttpStatus.SERVICE_UNAVAILABLE){
    return Map.of("start",start,"end",start.plusMinutes(30),"available",false,"calendarConfigured",false,"status","CALENDAR_DISABLED","timezone","America/Bogota","message","La integracion con Google Calendar permanece desactivada en este entorno. Indica al usuario el procedimiento de solicitud de asesoria en horario habil de Bogota (lunes a viernes de 09:00 a 16:30, bloques de 30 minutos) y que la confirmacion de agenda requiere habilitar el conector de Calendar.");
   }
   throw ex;
  }
 }
 public View propose(OffsetDateTime start){slot(start);var owner=current.entity();if(!owner.isActive())throw new ResponseStatusException(HttpStatus.FORBIDDEN);if(!calendar.available(start,start.plusMinutes(30)))throw new ResponseStatusException(HttpStatus.CONFLICT,"Horario no disponible");return tx.execute(t->{var b=new SupportBooking();b.ownerId=owner.getId();b.code=code();b.start=start;b.end=start.plusMinutes(30);b.expiresAt=OffsetDateTime.now().plusMinutes(10);b.status="PROPOSED";return view(bookings.saveAndFlush(b));});}
 private SupportBooking owned(String code){if(code==null||!code.matches("[A-Z]{20}"))throw new IllegalArgumentException();return bookings.owned(current.id(),code).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));}
 private View view(SupportBooking b){String instruction=b.status.equals("PROPOSED")?"Confirmar asesoria "+b.code:b.cancelCode!=null?"Confirmar cancelacion "+b.code+" "+b.cancelCode:"";return new View(b.code,b.status,b.start,b.end,b.expiresAt,b.meetUrl,instruction);}
 public View confirm(String code){
  boolean[] fresh={false};var b=tx.execute(t->{var x=owned(code);if(!x.status.equals("PROPOSED"))return x;if(!x.expiresAt.isAfter(OffsetDateTime.now()))throw new ResponseStatusException(HttpStatus.CONFLICT,"Propuesta vencida");x.activeSlot=x.start.toInstant().toString();x.providerId=x.id.toString().replace("-","");x.status="CREATING";fresh[0]=true;return bookings.saveAndFlush(x);});
  if(!fresh[0])return view(b);
  // Only the transaction that changed PROPOSED may create. Subsequent confirmations reconcile via get().
  try{if(!calendar.available(b.start,b.end))return update(code,"CONFLICT",null,true);return accept(code,calendar.call("create",b.start,b.end,b.providerId,current.entity().getEmail()));}catch(RuntimeException ex){return update(code,"AMBIGUOUS",null,false);}
 }
 private View accept(String code,JsonNode response){return tx.execute(t->{var b=owned(code);if(!Set.of("CREATING","AMBIGUOUS","PENDING_MEET").contains(b.status))return view(b);var start=response.path("start").path("dateTime").asText();var end=response.path("end").path("dateTime").asText();if(!b.providerId.equals(response.path("id").asText())||!"confirmed".equals(response.path("status").asText())||!b.start.toInstant().equals(OffsetDateTime.parse(start).toInstant())||!b.end.toInstant().equals(OffsetDateTime.parse(end).toInstant()))throw new IllegalStateException("Calendar no verifico la reserva");String meet=response.path("hangoutLink").asText();if(!meet.matches("https://meet\\.google\\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}"))meet=null;b.meetUrl=meet;b.status=meet==null?"PENDING_MEET":"CONFIRMED";if(meet!=null)events.mail(current.entity(),IntegrationEventService.MailKind.BOOKING_CONFIRMED,"booking:"+b.id+":confirmed",Map.of("start",b.start.toString(),"end",b.end.toString(),"meetUrl",meet));return view(b);});}
 private View update(String code,String status,String meet,boolean release){return tx.execute(t->{var b=owned(code);b.status=status;b.meetUrl=meet;if(release)b.activeSlot=null;if(status.equals("CANCELLED"))events.mail(current.entity(),IntegrationEventService.MailKind.BOOKING_CANCELLED,"booking:"+b.id+":cancelled",Map.of("start",b.start.toString()));return view(b);});}
 public View get(String code){var b=tx.execute(t->owned(code));if(Set.of("CANCEL_AMBIGUOUS","CANCELLING").contains(b.status)){try{var proof=calendar.call("get",b.start,b.end,b.providerId,null);if(b.providerId.equals(proof.path("id").asText())&&"cancelled".equals(proof.path("status").asText()))return update(code,"CANCELLED",null,true);}catch(RuntimeException ignored){/* An unavailable or absent event is not proof of cancellation. */}return view(b);}if(Set.of("AMBIGUOUS","PENDING_MEET","CREATING").contains(b.status)){try{return accept(code,calendar.call("get",b.start,b.end,b.providerId,null));}catch(RuntimeException e){return view(b);}}return view(b);}
 public View proposeCancellation(String code){return tx.execute(t->{var b=owned(code);if(b.status.equals("CANCELLED"))return view(b);if(!Set.of("CONFIRMED","PENDING_MEET").contains(b.status))throw new ResponseStatusException(HttpStatus.CONFLICT);b.cancelCode=code();b.cancelExpiresAt=OffsetDateTime.now().plusMinutes(10);return view(b);});}
 public View confirmCancellation(String code,String confirmation){var b=tx.execute(t->{var x=owned(code);if(x.status.equals("CANCELLED"))return x;if(!Objects.equals(confirmation,x.cancelCode)||x.cancelExpiresAt==null||!x.cancelExpiresAt.isAfter(OffsetDateTime.now())||!Set.of("CONFIRMED","PENDING_MEET").contains(x.status))throw new ResponseStatusException(HttpStatus.CONFLICT);x.status="CANCELLING";x.cancelCode=null;return x;});if(b.status.equals("CANCELLED"))return view(b);try{calendar.call("delete",b.start,b.end,b.providerId,null);return update(code,"CANCELLED",null,true);}catch(RuntimeException e){return update(code,"CANCEL_AMBIGUOUS",b.meetUrl,false);}}
}
