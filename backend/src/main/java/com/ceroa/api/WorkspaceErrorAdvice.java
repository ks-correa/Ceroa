package com.ceroa.api;

import org.springframework.web.bind.annotation.*;
import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

/** Preserve connector authorization/conflict semantics instead of the recovery-specific global fallback. */
@Order(-10)
@RestControllerAdvice(assignableTypes={WorkspaceController.class,DriveSyncController.class,SupportBookingController.class,McpController.class})
public class WorkspaceErrorAdvice {
 @ExceptionHandler(ResponseStatusException.class)
 public ResponseEntity<?> status(ResponseStatusException error){
  String message=switch(error.getStatusCode().value()){
   case 401,403 -> "No tienes autorización para esta operación.";
   case 404 -> "Recurso no encontrado.";
   case 409 -> "La operación requiere revisar su estado vigente.";
   case 429 -> "Se alcanzó el límite temporal de solicitudes.";
   default -> "No fue posible completar la operación.";
  };
  return ResponseEntity.status(error.getStatusCode()).cacheControl(CacheControl.noStore()).body(Map.of("code","WORKSPACE_UNAVAILABLE","message",message));
 }
 @ExceptionHandler({IllegalArgumentException.class,org.springframework.http.converter.HttpMessageNotReadableException.class})
 public ResponseEntity<?> input(Exception error){return ResponseEntity.badRequest().cacheControl(CacheControl.noStore()).body(Map.of("code","WORKSPACE_INVALID_INPUT","message","Revisa los datos de la solicitud."));}
}
