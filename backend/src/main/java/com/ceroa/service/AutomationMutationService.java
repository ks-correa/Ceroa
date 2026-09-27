package com.ceroa.service;

import com.ceroa.domain.AutomationRequest;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.repository.*;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.function.Supplier;

@Service
public class AutomationMutationService {
    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(AutomationMutationService.class);
    private final AutomationTokenRepository tokens;
    private final AutomationRequestRepository requests;
    private final SessionTokenService secrets;
    private final ObjectMapper json;
    public AutomationMutationService(AutomationTokenRepository tokens, AutomationRequestRepository requests,
                                     SessionTokenService secrets, ObjectMapper json) {
        this.tokens = tokens; this.requests = requests; this.secrets = secrets; this.json = json;
    }
    @Transactional
    public JsonNode execute(UUID key, String operation, Object payload, Supplier<?> mutation) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        UUID tokenId = (UUID) authentication.getDetails();
        var token = tokens.lockById(tokenId).orElseThrow(() -> new AccessDeniedException("Credencial no válida"));
        if (!token.usable() || !token.allowWrites || !token.user.getId().toString().equals(authentication.getName()))
            throw new AccessDeniedException("Credencial no válida");
        try {
            String fingerprint = secrets.hash(operation + "\n" + json.writeValueAsString(payload));
            var previous = requests.findByTokenIdAndRequestKey(tokenId, key);
            if (previous.isPresent()) {
                if (!previous.get().requestHash.equals(fingerprint))
                    throw new BusinessRuleException("IDEMPOTENCY_CONFLICT", "La clave ya se usó con otra operación o contenido.");
                return json.readTree(previous.get().responseJson);
            }
            JsonNode result = json.valueToTree(mutation.get());
            var record = new AutomationRequest();
            record.id = UUID.randomUUID(); record.tokenId = tokenId; record.requestKey = key;
            record.requestHash = fingerprint; record.responseJson = json.writeValueAsString(result);
            record.createdAt = OffsetDateTime.now(); requests.save(record);
            LOG.info("Automation mutation user={} credential={} operation={} request={}", token.user.getId(), tokenId, operation, key);
            return result;
        } catch (JsonProcessingException error) { throw new IllegalStateException("No fue posible serializar el resultado", error); }
    }
}
