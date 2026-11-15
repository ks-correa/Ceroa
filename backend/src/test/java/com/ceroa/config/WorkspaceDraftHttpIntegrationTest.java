package com.ceroa.config;

import com.ceroa.service.WorkspaceDraftService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc
class WorkspaceDraftHttpIntegrationTest {
    @Autowired MockMvc mvc;
    @MockitoBean WorkspaceDraftService drafts;
    static final String PATH="/api/v1/workspace-actions/CODE/draft";
    @Test void unauthenticatedAndMissingCsrfRequestsCannotPrepareDraft()throws Exception{
        mvc.perform(post(PATH).with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(post(PATH).with(user("owner"))).andExpect(status().isForbidden());
        verifyNoInteractions(drafts);
    }
    @ParameterizedTest @ValueSource(ints={400,403,404,410,502,503})
    void workspaceStatusIsPreservedByRealAdviceAndSecurity(int code)throws Exception{
        when(drafts.prepare("CODE")).thenThrow(new ResponseStatusException(HttpStatus.valueOf(code),"private provider detail"));
        mvc.perform(post(PATH).with(user("owner")).with(csrf())).andExpect(status().is(code))
            .andExpect(jsonPath("$.code").value("WORKSPACE_UNAVAILABLE"))
            .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("private provider detail"))))
            .andExpect(header().string("Cache-Control","no-store"));
    }
    @Test void missingAndForeignProposalsHaveIndistinguishableResponse()throws Exception{
        when(drafts.prepare(anyString())).thenThrow(new ResponseStatusException(HttpStatus.NOT_FOUND));
        String missing=mvc.perform(post(PATH).with(user("owner")).with(csrf())).andExpect(status().isNotFound()).andReturn().getResponse().getContentAsString();
        mvc.perform(post(PATH.replace("CODE","FOREIGN")).with(user("owner")).with(csrf())).andExpect(status().isNotFound()).andExpect(content().json(missing));
    }
    @Test void validDraftIsPrivateAndDoesNotRequireConfirmationToPrepare()throws Exception{
        when(drafts.prepare("CODE")).thenReturn(new ObjectMapper().readTree("{\"id\":\"synthetic-draft\",\"sent\":false}"));
        mvc.perform(post(PATH).with(user("owner")).with(csrf())).andExpect(status().isOk()).andExpect(jsonPath("$.sent").value(false)).andExpect(header().string("Cache-Control","no-store"));
    }
}
