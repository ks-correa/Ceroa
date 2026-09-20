package com.ceroa.service;

import com.ceroa.domain.PlusSubscription;
import com.ceroa.domain.User;
import com.ceroa.domain.UserPlan;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.repository.PlusSubscriptionRepository;
import com.ceroa.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.net.URI;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class PlusSubscriptionService {
    private final PlusSubscriptionRepository subscriptions;
    private final UserRepository users;
    private final CurrentUserService currentUser;
    private final RestClient client;
    @Value("${ceroa.plus.monthly-price:}") private String monthlyPrice;
    @Value("${ceroa.plus.yearly-price:}") private String yearlyPrice;
    @Value("${ceroa.plus.currency:COP}") private String currency;
    @Value("${ceroa.mercado-pago.access-token:}") private String accessToken;
    @Value("${ceroa.mercado-pago.webhook-secret:}") private String webhookSecret;
    @Value("${ceroa.frontend-url}") private String frontendUrl;

    public PlusSubscriptionService(PlusSubscriptionRepository subscriptions, UserRepository users, CurrentUserService currentUser,
                                   RestClient.Builder clientBuilder) {
        this.subscriptions = subscriptions; this.users = users; this.currentUser = currentUser;
        this.client = clientBuilder.baseUrl("https://api.mercadopago.com").build();
    }

    public record Offer(String periodicity, BigDecimal price, String currency, boolean automaticRenewal, boolean available) {}
    public record SubscriptionView(String status, String periodicity, BigDecimal price, String currency,
                                   boolean automaticRenewal, OffsetDateTime startedAt, OffsetDateTime nextPaymentAt, String checkoutUrl) {}
    public record CheckoutRequest(String periodicity) {}

    public List<Offer> offers() {
        return List.of(offer("MONTHLY"), offer("YEARLY"));
    }

    private Offer offer(String periodicity) {
        String configured = periodicity.equals("MONTHLY") ? monthlyPrice : yearlyPrice;
        BigDecimal price = null;
        try { price = new BigDecimal(configured); } catch (NumberFormatException ignored) { }
        boolean available = price != null && price.signum() > 0 && !accessToken.isBlank() && !webhookSecret.isBlank();
        return new Offer(periodicity, price, currency, true, available);
    }

    @Transactional
    public SubscriptionView checkout(String periodicity) {
        if (!"MONTHLY".equals(periodicity) && !"YEARLY".equals(periodicity))
            throw new BusinessRuleException("INVALID_PERIODICITY", "Selecciona Mensual o Anual.");
        Offer offer = offer(periodicity);
        if (!offer.available()) throw new BusinessRuleException("PLUS_UNAVAILABLE", "La contratación de Plus no está disponible en este momento.");
        User user = currentUser.entityForUpdate();
        Optional<PlusSubscription> existing = subscriptions.findFirstByUserIdAndStatusIn(user.getId(), List.of("PENDING", "ACTIVE"));
        if (existing.isPresent()) return view(existing.get());
        PlusSubscription subscription = new PlusSubscription();
        subscription.user = user; subscription.periodicity = periodicity;
        subscription.amount = offer.price(); subscription.currency = offer.currency();
        subscription.id = UUID.randomUUID();
        subscriptions.saveAndFlush(subscription);
        Map<String, Object> recurring = Map.of("frequency", periodicity.equals("MONTHLY") ? 1 : 12,
                "frequency_type", "months", "transaction_amount", offer.price(), "currency_id", offer.currency());
        Map<String, Object> payload = Map.of("reason", "Ceroa Plus", "external_reference", subscription.id.toString(),
                "payer_email", user.getEmail(), "auto_recurring", recurring,
                "back_url", frontendUrl, "status", "pending");
        try {
            JsonNode response = client.post().uri("/preapproval")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("X-Idempotency-Key", subscription.id.toString())
                    .contentType(MediaType.APPLICATION_JSON).body(payload).retrieve().body(JsonNode.class);
            if (response == null || response.path("id").asText().isBlank()) throw new IllegalStateException();
            String url = response.path("init_point").asText();
            if (!safeCheckoutUrl(url)) throw new IllegalStateException();
            subscription.providerId = response.path("id").asText();
            subscription.checkoutUrl = url;
            return view(subscriptions.save(subscription));
        } catch (Exception ex) {
            throw new BusinessRuleException("CHECKOUT_ERROR", "No fue posible iniciar Mercado Pago. Intenta de nuevo.");
        }
    }

    @Transactional
    public SubscriptionView current() {
        PlusSubscription subscription = subscriptions.findFirstByUserIdOrderByCreatedAtDesc(currentUser.id()).orElse(null);
        if (subscription == null) return null;
        if (subscription.providerId != null) {
            try { refresh(subscription.providerId); } catch (Exception ignored) { /* Keep the last confirmed state. */ }
        }
        return view(subscription);
    }

    public SubscriptionView view(PlusSubscription s) {
        return new SubscriptionView(s.status, s.periodicity, s.amount, s.currency,
                s.automaticRenewal, s.startedAt, s.nextPaymentAt, s.checkoutUrl);
    }

    @Transactional
    public void refresh(String providerId) {
        PlusSubscription s = subscriptions.findByProviderId(providerId).orElse(null);
        if (s == null) return;
        JsonNode data = client.get().uri("/preapproval/{id}", providerId)
                .header("Authorization", "Bearer " + accessToken).retrieve().body(JsonNode.class);
        if (data == null || !providerId.equals(data.path("id").asText())
                || !s.id.toString().equals(data.path("external_reference").asText())) return;
        JsonNode recurring = data.path("auto_recurring");
        if (!s.currency.equals(recurring.path("currency_id").asText())
                || s.amount.compareTo(recurring.path("transaction_amount").decimalValue()) != 0
                || recurring.path("frequency").asInt() != (s.periodicity.equals("MONTHLY") ? 1 : 12)
                || !"months".equals(recurring.path("frequency_type").asText())) return;
        String status = switch (data.path("status").asText()) {
            case "authorized" -> "ACTIVE";
            case "cancelled", "canceled" -> "CANCELLED";
            case "rejected" -> "REJECTED";
            case "pending" -> "PENDING";
            default -> "ERROR";
        };
        s.status = status;
        if (status.equals("ACTIVE") && s.startedAt == null) s.startedAt = OffsetDateTime.now();
        if (data.hasNonNull("next_payment_date")) s.nextPaymentAt = OffsetDateTime.parse(data.get("next_payment_date").asText());
        subscriptions.save(s);
        User user = s.user;
        user.setPlan(subscriptions.existsByUserIdAndStatus(user.getId(), "ACTIVE") ? UserPlan.PLUS : UserPlan.CERO);
        users.save(user);
    }

    private boolean safeCheckoutUrl(String url) {
        try {
            URI uri = URI.create(url);
            String host = uri.getHost();
            return "https".equals(uri.getScheme()) && host != null
                    && (host.equals("mercadopago.com") || host.endsWith(".mercadopago.com")
                    || host.matches("(www\\.)?mercadopago\\.com\\.[a-z]{2}"));
        } catch (Exception ex) { return false; }
    }
}
