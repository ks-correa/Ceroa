package com.ceroa.api;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
@RestControllerAdvice(assignableTypes=ScheduledReminderController.class)
public class ReminderErrorAdvice {
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> invalid(){return ResponseEntity.badRequest().body(Map.of("message","Revisa las preferencias o el resultado de entrega."));}
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> status(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",e.getReason()==null?"Operación de entrega no disponible.":e.getReason()));}
}
