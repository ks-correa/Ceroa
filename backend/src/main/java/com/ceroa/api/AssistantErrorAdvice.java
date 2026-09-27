package com.ceroa.api;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestControllerAdvice(assignableTypes=AssistantController.class)
public class AssistantErrorAdvice {
    @ExceptionHandler({org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
        org.springframework.web.bind.MissingServletRequestParameterException.class,
        org.springframework.http.converter.HttpMessageNotReadableException.class})
    public ResponseEntity<Map<String,String>> input(Exception error) {
        return ResponseEntity.badRequest().body(Map.of("code","ASSISTANT_INVALID_INPUT","message","Revisa el mensaje, formato de audio o período solicitado."));
    }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String,String>> status(ResponseStatusException error) {
        int status=error.getStatusCode().value();
        String message=switch(status) {
            case 429 -> "Espera un minuto antes de enviar otra consulta.";
            case 403 -> "No tienes autorización para esta consulta.";
            case 410 -> "La consulta expiró. Envía una nueva pregunta.";
            default -> "No pude consultar tu información. Intenta nuevamente; no se realizó ningún cambio.";
        };
        return ResponseEntity.status(error.getStatusCode()).body(Map.of("code","ASSISTANT_UNAVAILABLE","message",message));
    }
}
