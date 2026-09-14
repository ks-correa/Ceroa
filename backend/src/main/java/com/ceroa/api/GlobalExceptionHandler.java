package com.ceroa.api;

import com.ceroa.exception.BusinessRuleException;
import com.ceroa.exception.InvalidCredentialsException;
import com.ceroa.exception.ResourceNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException exception) {
        return response(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage(), Map.of());
    }

    @ExceptionHandler(BusinessRuleException.class)
    ResponseEntity<ApiError> handleBusinessRule(BusinessRuleException exception) {
        return response(HttpStatus.UNPROCESSABLE_ENTITY, exception.getCode(), exception.getMessage(), Map.of());
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    ResponseEntity<ApiError> handleInvalidCredentials(InvalidCredentialsException exception) {
        return response(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", exception.getMessage(), Map.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> fields = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors()
                .forEach(error -> {
                    String field = switch (error.getField()) {
                        case "adult" -> "birthDate";
                        case "passwordConfirmed" -> "confirmPassword";
                        case "passwordWithinLimit" -> "password";
                        default -> error.getField();
                    };
                    fields.putIfAbsent(field, "Revisa este campo. " + switch (field) {
                        case "email" -> "Ingresa un correo válido, sin espacios.";
                        case "phone" -> "Ingresa entre 7 y 15 dígitos, con + opcional.";
                        case "birthDate" -> "Ingresa una fecha válida y acredita al menos 18 años.";
                        case "password" -> "Usa al menos 8 caracteres, una mayúscula y un carácter especial; máximo 72 bytes.";
                        case "confirmPassword" -> "Las contraseñas deben coincidir.";
                        case "acceptTerms", "acceptPrivacy" -> "Debes aceptar para continuar.";
                        default -> "Completa el dato solicitado.";
                    });
                });
        return response(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Revisa los datos enviados.", fields);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ApiError> handleIllegalArgument(IllegalArgumentException exception) {
        return response(HttpStatus.BAD_REQUEST, "INVALID_VALUE", "Revisa los datos enviados.", Map.of());
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    ResponseEntity<ApiError> handleOptimisticLock(ObjectOptimisticLockingFailureException exception) {
        return response(HttpStatus.CONFLICT, "CONCURRENT_UPDATE",
                "La información cambió mientras realizabas la operación. Actualiza los datos e intenta de nuevo.", Map.of());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ApiError> handleDataIntegrity(DataIntegrityViolationException exception) {
        LOGGER.warn("Database constraint violation");
        return response(HttpStatus.CONFLICT, "DATA_CONFLICT",
                "La operación entra en conflicto con información existente.", Map.of());
    }

    @ExceptionHandler(AccessDeniedException.class)
    ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException exception) {
        return response(HttpStatus.FORBIDDEN, "ACCESS_DENIED",
                "No tienes permiso para realizar esta operación.", Map.of());
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ApiError> handleUnexpected(Exception exception) {
        LOGGER.error("Unexpected API error");
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "Ocurrió un error inesperado. Intenta nuevamente.", Map.of());
    }

    @ExceptionHandler(org.springframework.web.server.ResponseStatusException.class)
    ResponseEntity<ApiError> handleServiceStatus(org.springframework.web.server.ResponseStatusException exception) {
        boolean limited = exception.getStatusCode().value() == 429;
        return response(limited ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.SERVICE_UNAVAILABLE,
            limited ? "RECOVERY_LIMIT" : "RECOVERY_UNAVAILABLE",
            limited ? "Demasiadas solicitudes. Intenta de nuevo en una hora."
                : "La recuperación no está disponible en este momento. Intenta más tarde.", Map.of());
    }

    @ExceptionHandler(org.springframework.dao.CannotAcquireLockException.class)
    ResponseEntity<ApiError> handleBusy(org.springframework.dao.CannotAcquireLockException exception) {
        return response(HttpStatus.CONFLICT, "RETRY_REQUEST", "La solicitud está en proceso. Intenta nuevamente.", Map.of());
    }

    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> handleMalformedBody(Exception exception) {
        return response(HttpStatus.BAD_REQUEST, "INVALID_VALUE", "Revisa los datos y el formato de la fecha.", Map.of());
    }

    private ResponseEntity<ApiError> response(
            HttpStatus status, String code, String message, Map<String, String> fields) {
        return ResponseEntity.status(status).body(
                new ApiError(OffsetDateTime.now(), status.value(), code, message, fields));
    }
}
