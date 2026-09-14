package com.ceroa.config;

import com.ceroa.repository.PasswordRecoveryRepository;
import com.ceroa.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import java.util.UUID;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
class RecoveryUnavailableTest {
    @Autowired MockMvc mvc;
    @Autowired PasswordRecoveryService service;
    @Autowired PasswordRecoveryRepository repository;
    @Autowired com.ceroa.repository.UserRepository users;
    @MockitoBean RecoveryMailService mail;
    @Test void missingConfigurationRejectsRequestWithoutClaimingDelivery() throws Exception {
        when(mail.available()).thenReturn(false);
        mvc.perform(post("/api/v1/auth/recovery/request").with(csrf()).contentType("application/json").content("{\"email\":\"missing@example.com\"}"))
            .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("RECOVERY_UNAVAILABLE"));
        verify(mail, never()).send(anyString(), anyString());
    }
    @Test void smtpFailureNeverLeavesUsableCode() {
        when(mail.available()).thenReturn(true);
        String email = UUID.randomUUID() + "@example.com";
        var user = new com.ceroa.domain.User(); user.setEmail(email); user.setFullName("Test SMTP failure"); users.save(user);
        doThrow(new org.springframework.mail.MailSendException("Sensitive SMTP diagnostics must not be logged"))
            .when(mail).send(eq(email), anyString());
        UUID id = service.request(email, UUID.randomUUID().toString());
        service.deliver(id);
        var row = repository.findById(id).orElseThrow();
        assertThat(row.state).isEqualTo("FAILED"); assertThat(row.codeHash).isNull();
        assertThatThrownBy(() -> service.verify(id, "12345678")).isInstanceOf(com.ceroa.exception.BusinessRuleException.class);
    }
}
