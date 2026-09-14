package com.ceroa.service;
import com.ceroa.config.SessionAuthenticationFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import java.time.Duration;
@Service
public class AuthCookieService {
    private final boolean secure;
    private final long days;
    public AuthCookieService(@Value("${ceroa.session.secure-cookie:false}") boolean secure,
                             @Value("${ceroa.session.days:30}") long days) { this.secure = secure; this.days = days; }
    public String issue(String token) {
        return ResponseCookie.from(SessionAuthenticationFilter.COOKIE_NAME, token).httpOnly(true).secure(secure)
            .sameSite("Lax").path("/").maxAge(token.isEmpty() ? Duration.ZERO : Duration.ofDays(days)).build().toString();
    }
}
