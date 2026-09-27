package com.ceroa.repository;
import com.ceroa.domain.TelegramReceipt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.OffsetDateTime;
public interface TelegramReceiptRepository extends JpaRepository<TelegramReceipt,Long> {
    void deleteByCreatedAtBefore(OffsetDateTime before);
}
