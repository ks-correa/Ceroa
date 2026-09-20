package com.ceroa.api;

import com.ceroa.service.PlusSubscriptionService;
import com.ceroa.service.PlanAccessService;
import com.ceroa.domain.UserPlan;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/v1/plus")
public class PlusSubscriptionController {
    private final PlusSubscriptionService service;
    private final PlanAccessService plans;
    @Value("${ceroa.mercado-pago.webhook-secret:}") private String webhookSecret;
    public PlusSubscriptionController(PlusSubscriptionService service, PlanAccessService plans) { this.service = service; this.plans = plans; }

    @GetMapping("/offers") public List<PlusSubscriptionService.Offer> offers() { return service.offers(); }
    @GetMapping("/capabilities") public PlanAccessService.PlanAccess capabilities(
            @RequestParam(defaultValue = "PLUS") UserPlan plan) { return plans.catalog(plan); }
    @GetMapping("/subscription") public ResponseEntity<PlusSubscriptionService.SubscriptionView> current() {
        PlusSubscriptionService.SubscriptionView subscription = service.current();
        return subscription == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(subscription);
    }
    @PostMapping("/checkout") public PlusSubscriptionService.SubscriptionView checkout(
            @RequestBody PlusSubscriptionService.CheckoutRequest request) { return service.checkout(request.periodicity()); }
    @PostMapping("/subscription/cancel-renewal") public PlusSubscriptionService.SubscriptionView cancelRenewal() {
        return service.cancelRenewal();
    }

    @PostMapping("/webhook")
    public void webhook(@RequestParam(name = "data.id", required = false) String id,
                        @RequestParam(name = "type", required = false) String type,
                        @RequestHeader(name = "x-signature", required = false) String signature,
                        @RequestHeader(name = "x-request-id", required = false) String requestId) {
        if (webhookSecret.isBlank() || id == null || !id.matches("[A-Za-z0-9_-]{1,100}")
                || requestId == null || signature == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        try {
            String ts = null, v1 = null;
            for (String part : signature.split(",")) {
                String[] pair = part.trim().split("=", 2);
                if (pair.length == 2 && pair[0].equals("ts")) ts = pair[1];
                if (pair.length == 2 && pair[0].equals("v1")) v1 = pair[1];
            }
            if (ts == null || v1 == null) throw new IllegalArgumentException();
            long timestamp = Long.parseLong(ts);
            if (ts.length() > 10) timestamp /= 1000;
            if (Math.abs(Instant.now().getEpochSecond() - timestamp) > 300)
                throw new IllegalArgumentException();
            String manifest = "id:" + id.toLowerCase(Locale.ROOT) + ";request-id:" + requestId + ";ts:" + ts + ";";
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expected = mac.doFinal(manifest.getBytes(StandardCharsets.UTF_8));
            if (!MessageDigest.isEqual(expected, HexFormat.of().parseHex(v1))) throw new IllegalArgumentException();
        } catch (Exception ex) { throw new ResponseStatusException(HttpStatus.UNAUTHORIZED); }
        if ("subscription_preapproval".equals(type)) service.refresh(id);
    }
}
