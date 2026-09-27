package com.ceroa.repository;
import com.ceroa.domain.TelegramLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.*;
public interface TelegramLinkRepository extends JpaRepository<TelegramLink,UUID> {
    Optional<TelegramLink> findByCodeHash(String hash);
    @Query("select t.userId from TelegramLink t where t.codeHash = :hash")
    Optional<UUID> findUserIdByCodeHash(String hash);
    Optional<TelegramLink> findBySenderId(Long senderId);
}
