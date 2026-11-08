package com.ceroa.service;
import com.ceroa.domain.*;import com.ceroa.repository.*;
import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;import org.springframework.web.server.ResponseStatusException;
import java.util.*;import java.time.*;
@Service
public class McpAccessService {
 public static final Set<String> SCOPES=Set.of("finance.summary","finance.debts","finance.upcoming","finance.strategy","subscription.read","support.availability","support.propose");
 public record Issued(UUID id,String token,Set<String> scopes,OffsetDateTime expiresAt){}
 private final McpAccessTokenRepository tokens;private final CurrentUserService current;private final SessionTokenService secrets;
 public McpAccessService(McpAccessTokenRepository tokens,CurrentUserService current,SessionTokenService secrets){this.tokens=tokens;this.current=current;this.secrets=secrets;}
 @Transactional public Issued issue(Set<String> scopes){if(scopes==null||scopes.isEmpty()||!SCOPES.containsAll(scopes))throw new IllegalArgumentException();var owner=current.entityForUpdate();if(!owner.isActive())throw new ResponseStatusException(HttpStatus.FORBIDDEN);String raw=secrets.createRawToken();var t=new McpAccessToken();t.ownerId=owner.getId();t.tokenHash=secrets.hash(raw);t.scopes=String.join(",",new TreeSet<>(scopes));t.expiresAt=OffsetDateTime.now().plusDays(30);tokens.saveAndFlush(t);return new Issued(t.id,raw,Set.copyOf(scopes),t.expiresAt);}
 @Transactional public void revoke(UUID id){var t=tokens.findByIdAndOwnerId(id,current.id()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));t.revokedAt=OffsetDateTime.now();}
}
