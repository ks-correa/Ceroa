package com.ceroa.config;
import com.ceroa.domain.*;
import com.ceroa.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import java.time.OffsetDateTime;
import java.util.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(properties={"ceroa.assistant.enabled=true","ceroa.assistant.worker-key=telegram-test-worker-key-at-least-32-characters","ceroa.telegram.bot-username=Ceroa_bot"})
@AutoConfigureMockMvc
class TelegramIntegrationTest {
    static final String KEY="telegram-test-worker-key-at-least-32-characters";
    @Autowired MockMvc mvc; @Autowired UserRepository users; @Autowired TelegramLinkRepository links;
    @Autowired TelegramReceiptRepository receipts; @Autowired ObjectMapper json;
    String owner; long sequence;
    @BeforeEach void setup() {
        links.deleteAll(); receipts.deleteAll();
        var u=new User(); u.setFullName("Telegram test");u.setEmail(UUID.randomUUID()+"@example.com");u.setActive(true);u.setPlan(UserPlan.CERO);
        owner=users.saveAndFlush(u).getId().toString(); sequence=System.nanoTime();
    }
    String invite() throws Exception {
        var response=mvc.perform(post("/api/v1/integrations/telegram").with(user(owner)).with(csrf()).contentType("application/json").content("{\"consent\":true}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(response).path("url").asText().split("start=")[1];
    }
    void update(String text,long sender,long chat,boolean privateChat,boolean send) throws Exception {
        mvc.perform(post("/api/v1/assistant-tools/telegram/updates").header("X-Ceroa-Assistant",KEY).contentType("application/json")
            .content(json.writeValueAsString(Map.of("updateId",sequence++,"senderId",sender,"chatId",chat,"privateChat",privateChat,"text",text))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.send").value(send));
    }
    @Test void requiresSessionCsrfConsentAndSeparateWorkerCredential() throws Exception {
        mvc.perform(get("/api/v1/integrations/telegram").header("X-Ceroa-Assistant",KEY)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/integrations/telegram").with(user(owner)).contentType("application/json").content("{\"consent\":true}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/integrations/telegram").with(user(owner)).with(csrf()).contentType("application/json").content("{\"consent\":false}")).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/assistant-tools/telegram/updates").with(user(owner)).with(csrf()).contentType("application/json").content("{}")).andExpect(status().isForbidden());
    }
    @Test void oneUsePrivateLinkCannotBeReplayedByAnotherSenderAndUnlinkRevokesAudio() throws Exception {
        String code=invite(); update("/start "+code,101,101,true,true);
        assertEquals(101L,links.findById(UUID.fromString(owner)).orElseThrow().senderId);
        update("/start "+code,202,202,true,true);
        assertTrue(links.findBySenderId(202L).isEmpty());
        mvc.perform(delete("/api/v1/integrations/telegram").with(user(owner)).with(csrf())).andExpect(status().isOk());
        mvc.perform(post("/api/v1/assistant-tools/telegram/authorize").header("X-Ceroa-Assistant",KEY).contentType("application/json")
            .content("{\"senderId\":101,\"chatId\":101,\"privateChat\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.allowed").value(false));
    }
    @Test void expiredCodeAndGroupOrForgedChatCannotLink() throws Exception {
        String code=invite(); update("/start "+code,303,-101,false,false); update("/start "+code,303,404,true,false);
        var link=links.findById(UUID.fromString(owner)).orElseThrow(); assertNull(link.senderId);
        link.codeExpiresAt=OffsetDateTime.now().minusSeconds(1); links.saveAndFlush(link);
        update("/start "+code,303,303,true,true); assertNull(links.findById(link.userId).orElseThrow().senderId);
    }
    @Test void duplicateUpdatesDoNotConsumeAnotherCodeAndInactiveUserCannotAuthorize() throws Exception {
        String code=invite(); long id=sequence; update("/start "+code,505,505,true,true);
        sequence=id; update("/desvincular",505,505,true,false);
        var u=users.findById(UUID.fromString(owner)).orElseThrow();u.setActive(false);users.saveAndFlush(u);
        mvc.perform(post("/api/v1/assistant-tools/telegram/authorize").header("X-Ceroa-Assistant",KEY).contentType("application/json")
            .content("{\"senderId\":505,\"chatId\":505,\"privateChat\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.allowed").value(false));
    }
}
