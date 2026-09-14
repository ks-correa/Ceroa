package com.ceroa.config;

import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import java.util.*;

@Component
public class OAuthProviders implements ClientRegistrationRepository {
    private final Map<String, ClientRegistration> registrations = new HashMap<>();
    public OAuthProviders(Environment env) {
        String base = env.getProperty("OAUTH_REDIRECT_BASE_URL", "http://localhost:8080");
        for (String provider : List.of("google", "microsoft")) {
            String prefix = provider.toUpperCase(Locale.ROOT);
            String id = env.getProperty(prefix + "_CLIENT_ID", "");
            String secret = env.getProperty(prefix + "_CLIENT_SECRET", "");
            if (id.isBlank() || secret.isBlank()) continue;
            var builder = ClientRegistration.withRegistrationId(provider).clientId(id).clientSecret(secret)
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_POST)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri(base + "/login/oauth2/code/" + provider).scope("openid", "profile", "email")
                .userNameAttributeName("sub").clientName(provider);
            if (provider.equals("google")) {
                builder.authorizationUri("https://accounts.google.com/o/oauth2/v2/auth")
                    .tokenUri("https://oauth2.googleapis.com/token").issuerUri("https://accounts.google.com")
                    .jwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
                    .userInfoUri("https://openidconnect.googleapis.com/v1/userinfo");
            } else {
                String tenant = env.getProperty("MICROSOFT_TENANT_ID", "");
                if (!tenant.matches("[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}")) continue;
                String authority = "https://login.microsoftonline.com/" + tenant;
                builder.authorizationUri(authority + "/oauth2/v2.0/authorize")
                    .tokenUri(authority + "/oauth2/v2.0/token").issuerUri(authority + "/v2.0")
                    .jwkSetUri(authority + "/discovery/v2.0/keys");
            }
            registrations.put(provider, builder.build());
        }
    }
    @Override public ClientRegistration findByRegistrationId(String id) { return registrations.get(id); }
    public boolean available() { return !registrations.isEmpty(); }
}
