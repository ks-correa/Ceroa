package com.ceroa.service;

import com.ceroa.api.dto.FinancialProfileRequest;
import com.ceroa.api.dto.FinancialProfileResponse;
import com.ceroa.api.dto.UserResponse;
import com.ceroa.domain.FinancialProfile;
import com.ceroa.domain.StrategyType;
import com.ceroa.domain.User;
import com.ceroa.domain.UserPlan;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.FinancialProfileRepository;
import com.ceroa.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FinancialProfileServiceTest {
    @Mock FinancialProfileRepository profileRepository;
    @Mock DebtRepository debtRepository;
    @Mock UserRepository userRepository;
    @Mock CurrentUserService currentUser;
    @Mock AuthService authService;

    private FinancialProfileService service;
    private final UUID userId = UUID.randomUUID();
    private User testUser;

    @BeforeEach
    void setUp() {
        service = new FinancialProfileService(profileRepository, debtRepository, userRepository, currentUser, authService);
        testUser = new User();
        testUser.setId(userId);
        testUser.setFullName("Juan Perez");
        testUser.setEmail("juan@ceroa.com");
        testUser.setPlan(UserPlan.CERO);
        testUser.setInitialSetupComplete(false);
    }

    @Test
    void rejectsAvailableMoneyAboveIncomeAfterExpenses() {
        lenient().when(currentUser.id()).thenReturn(userId);
        FinancialProfileRequest request = new FinancialProfileRequest(
                new BigDecimal("5000000"),
                new BigDecimal("4000000"),
                new BigDecimal("1500000"),
                1,
                StrategyType.SNOWBALL);

        assertThatThrownBy(() -> service.update(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("ingreso restante");

        verify(profileRepository, never()).save(any());
    }

    @Test
    void rejectsExpensesExceedingIncome() {
        lenient().when(currentUser.id()).thenReturn(userId);
        FinancialProfileRequest request = new FinancialProfileRequest(
                new BigDecimal("3000000"),
                new BigDecimal("4000000"),
                new BigDecimal("500000"),
                1,
                StrategyType.SNOWBALL);

        assertThatThrownBy(() -> service.update(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("gastos fijos no pueden superar");

        verify(profileRepository, never()).save(any());
    }

    @Test
    void completesInitialSetupSuccessfullyWhenValid() {
        when(currentUser.id()).thenReturn(userId);
        when(currentUser.entityForUpdate()).thenReturn(testUser);

        FinancialProfile profile = new FinancialProfile();
        profile.setUser(testUser);
        profile.setMonthlyIncome(new BigDecimal("5000000"));
        profile.setEssentialExpenses(new BigDecimal("2000000"));
        profile.setAvailableForDebts(new BigDecimal("1000000"));
        profile.setTotalDeclaredDebts(3);
        profile.setActiveStrategy(StrategyType.SNOWBALL);

        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(debtRepository.countByUserId(userId)).thenReturn(1L);
        when(authService.toResponse(any())).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            return new UserResponse(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getDocumentId(), u.getBirthDate(), u.getPlan(), u.isInitialSetupComplete());
        });

        UserResponse response = service.completeInitialSetup();

        assertThat(response.initialSetupComplete()).isTrue();
        assertThat(testUser.isInitialSetupComplete()).isTrue();
        verify(userRepository).save(testUser);
    }

    @Test
    void rejectsCompletionWithoutRegisteredDebts() {
        when(currentUser.id()).thenReturn(userId);

        FinancialProfile profile = new FinancialProfile();
        profile.setUser(testUser);
        profile.setMonthlyIncome(new BigDecimal("5000000"));
        profile.setEssentialExpenses(new BigDecimal("2000000"));
        profile.setAvailableForDebts(new BigDecimal("1000000"));
        profile.setTotalDeclaredDebts(3);
        profile.setActiveStrategy(StrategyType.SNOWBALL);

        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(debtRepository.countByUserId(userId)).thenReturn(0L);

        assertThatThrownBy(() -> service.completeInitialSetup())
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Debe registrar al menos una deuda");

        verify(userRepository, never()).save(any());
    }

    @Test
    void rejectsCompletionWithoutStrategy() {
        when(currentUser.id()).thenReturn(userId);

        FinancialProfile profile = new FinancialProfile();
        profile.setUser(testUser);
        profile.setMonthlyIncome(new BigDecimal("5000000"));
        profile.setEssentialExpenses(new BigDecimal("2000000"));
        profile.setAvailableForDebts(new BigDecimal("1000000"));
        profile.setTotalDeclaredDebts(3);
        profile.setActiveStrategy(null);

        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(debtRepository.countByUserId(userId)).thenReturn(1L);

        assertThatThrownBy(() -> service.completeInitialSetup())
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("Debe seleccionar una estrategia");

        verify(userRepository, never()).save(any());
    }

    @Test
    void updatesStrategySuccessfully() {
        when(currentUser.id()).thenReturn(userId);
        when(currentUser.entity()).thenReturn(testUser);
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.empty());
        when(profileRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FinancialProfileResponse res = service.updateStrategy(StrategyType.AVALANCHE);

        assertThat(res.activeStrategy()).isEqualTo(StrategyType.AVALANCHE);
        verify(profileRepository).save(any());
    }
}
