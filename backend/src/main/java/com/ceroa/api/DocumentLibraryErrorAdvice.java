package com.ceroa.api;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@Order(-10)
@RestControllerAdvice(assignableTypes=DocumentLibraryController.class)
public class DocumentLibraryErrorAdvice {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException error){return ResponseEntity.status(error.getStatusCode()).cacheControl(CacheControl.noStore()).body(Map.of("code","DOCUMENT_LIBRARY_ERROR","message",error.getReason()==null?"Operación no disponible":error.getReason()));}
}
