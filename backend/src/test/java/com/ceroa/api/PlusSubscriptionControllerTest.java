package com.ceroa.api;

import com.ceroa.service.PlusSubscriptionService;
import com.ceroa.service.PlanAccessService;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class PlusSubscriptionControllerTest {
    @Test
    void signedWebhookRefreshesProviderAndDuplicateIsIdempotentAtEndpoint() throws Exception {
        PlusSubscriptionService service = mock(PlusSubscriptionService.class);
        PlusSubscriptionController controller = new PlusSubscriptionController(service, mock(PlanAccessService.class));
        ReflectionTestUtils.setField(controller, "webhookSecret", "test-secret");
        String timestamp = Long.toString(Instant.now().getEpochSecond());
        String manifest = "id:abc123;request-id:request-1;ts:" + timestamp + ";";
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec("test-secret".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        String signature = "ts=" + timestamp + ",v1=" + HexFormat.of().formatHex(mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8)));
        controller.webhook("ABC123", "subscription_preapproval", signature, "request-1");
        controller.webhook("ABC123", "subscription_preapproval", signature, "request-1");
        verify(service, times(2)).refresh("ABC123");
        assertThrows(ResponseStatusException.class,
                () -> controller.webhook("ABC123", "subscription_preapproval", "ts=" + timestamp + ",v1=00", "request-1"));
    }
}
