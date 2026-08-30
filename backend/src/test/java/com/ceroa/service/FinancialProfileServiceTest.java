package com.ceroa.service;

import com.ceroa.api.dto.FinancialProfileRequest;
import com.ceroa.domain.StrategyType;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.FinancialProfileRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class FinancialProfileServiceTest {
    @Mock FinancialProfileRepository profileRepository;
    @Mock DebtRepository debtRepository;
    @Mock CurrentUserService currentUser;

    private FinancialProfileService service;

    @BeforeEach
    void setUp() {
        service = new FinancialProfileService(profileRepository, debtRepository, currentUser);
    }

    @Test
    void rejectsAvailableMoneyAboveIncomeAfterExpenses() {
        FinancialProfileRequest request = new FinancialProfileRequest(
                new BigDecimal("5000000"),
                new BigDecimal("4000000"),
                new BigDecimal("1500000"),
                1,
                StrategyType.SNOWBALL);

        assertThatThrownBy(() -> service.update(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("ingreso restante");

        verify(profileRepository, never()).save(org.mockito.ArgumentMatchers.any());
    }
}
