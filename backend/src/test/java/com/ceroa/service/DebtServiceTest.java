package com.ceroa.service;

import com.ceroa.api.dto.DebtRequest;
import com.ceroa.domain.*;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DebtServiceTest {

    @Mock DebtRepository debtRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock CurrentUserService currentUser;

    private DebtService service;

    @BeforeEach
    void setUp() {
        service = new DebtService(debtRepository, paymentRepository, currentUser);
    }

    @Test
    void rejectsThirdDebtForCeroPlan() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setPlan(UserPlan.CERO);
        when(currentUser.entityForUpdate()).thenReturn(user);
        when(debtRepository.countByUserId(user.getId())).thenReturn(2L);

        assertThatThrownBy(() -> service.create(validRequest()))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("máximo 2 deudas");

        verify(debtRepository, never()).save(any());
        verify(currentUser).entityForUpdate();
    }

    @Test
    void rejectsBalanceGreaterThanOriginalAmount() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setPlan(UserPlan.PLUS);
        when(currentUser.entityForUpdate()).thenReturn(user);

        DebtRequest invalid = new DebtRequest(
                "Crédito", "Entidad", DebtType.PERSONAL_LOAN, null,
                BigDecimal.valueOf(1_000), BigDecimal.valueOf(1_001), BigDecimal.TEN,
                RateType.EA, BigDecimal.valueOf(100), BigDecimal.valueOf(100), 15,
                null, null, 12, null, DebtStatus.CURRENT, null, null, Map.of());

        assertThatThrownBy(() -> service.create(invalid))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("saldo actual");
    }

    private DebtRequest validRequest() {
        return new DebtRequest(
                "Crédito", "Entidad", DebtType.PERSONAL_LOAN, null,
                BigDecimal.valueOf(1_000), BigDecimal.valueOf(800), BigDecimal.TEN,
                RateType.EA, BigDecimal.valueOf(100), BigDecimal.valueOf(100), 15,
                null, null, 12, null, DebtStatus.CURRENT, null, null, Map.of());
    }
}
