package com.ceroa.service;

import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;

class WorkspaceCalendarGatewayTest {
    private static final OffsetDateTime START=OffsetDateTime.parse("2026-11-18T10:00:00-05:00");
    @Test void disabledCalendarFailsBeforeAnyExternalCall() {
        var gateway=new WorkspaceCalendarGateway("http://n8n:5678/webhook/synthetic-calendar","synthetic-key-with-at-least-32-characters",false);
        assertFalse(gateway.isEnabled());
        var error=assertThrows(ResponseStatusException.class,()->gateway.available(START,START.plusMinutes(30)));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE,error.getStatusCode());
    }
    @Test void enabledCalendarRejectsAnUntrustedDestinationBeforeAnyExternalCall() {
        var gateway=new WorkspaceCalendarGateway("https://attacker.invalid/calendar","synthetic-key-with-at-least-32-characters",true);
        assertFalse(gateway.isEnabled());
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE,assertThrows(ResponseStatusException.class,()->gateway.call("create",START,START.plusMinutes(30),"synthetic",null)).getStatusCode());
    }
    @Test void enabledCalendarRejectsMissingWorkerCredentialBeforeAnyExternalCall() {
        var gateway=new WorkspaceCalendarGateway("http://n8n:5678/webhook/synthetic-calendar","",true);
        assertFalse(gateway.isEnabled());
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE,assertThrows(ResponseStatusException.class,()->gateway.available(START,START.plusMinutes(30))).getStatusCode());
    }
}
