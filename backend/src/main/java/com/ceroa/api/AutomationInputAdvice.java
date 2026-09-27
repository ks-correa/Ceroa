package com.ceroa.api;

import org.springframework.core.annotation.Order;
import org.springframework.http.*;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import java.time.OffsetDateTime;
import java.util.Map;

@Order(0)
@RestControllerAdvice(assignableTypes = AutomationController.class)
public class AutomationInputAdvice {
    @ExceptionHandler({MissingRequestHeaderException.class, MethodArgumentTypeMismatchException.class})
    ResponseEntity<ApiError> invalidIdempotencyHeader(Exception error) {
        return ResponseEntity.badRequest().body(new ApiError(OffsetDateTime.now(), 400, "INVALID_REQUEST",
            "Revisa los parámetros. Las escrituras requieren Idempotency-Key con un UUID válido.", Map.of()));
    }
}
