package com.ceroa.api;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.ResponseEntity;
import java.util.Map;
@RestControllerAdvice(assignableTypes=DocumentIngestionController.class)
public class DocumentErrorAdvice {
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String,String>> invalid(IllegalArgumentException e){return ResponseEntity.badRequest().body(Map.of("message",e.getMessage()==null?"Revisa el documento y los campos.":e.getMessage(),"code","DOCUMENT_INVALID"));}
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String,String>> status(ResponseStatusException e){return ResponseEntity.status(e.getStatusCode()).body(Map.of("message",e.getReason()==null?"No se pudo autorizar o completar la lectura del documento.":e.getReason(),"code","DOCUMENT_UNAVAILABLE"));}
}
