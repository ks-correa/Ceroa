package com.ceroa.service;

import com.ceroa.api.dto.DashboardSummaryResponse;
import com.ceroa.api.dto.StrategyComparisonResponse;
import com.ceroa.api.dto.StrategyStatsResponse;
import com.ceroa.domain.Debt;
import com.ceroa.domain.DebtStatus;
import com.ceroa.domain.DebtType;
import com.ceroa.domain.FinancialProfile;
import com.ceroa.domain.Payment;
import com.ceroa.domain.RateType;
import com.ceroa.domain.StrategyType;
import com.ceroa.domain.User;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.FinancialProfileRepository;
import com.ceroa.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock DebtRepository debtRepository;
    @Mock PaymentRepository paymentRepository;
    @Mock FinancialProfileRepository profileRepository;
    @Mock StrategyService strategyService;
    @Mock CurrentUserService currentUser;

    private DashboardService dashboardService;
    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        when(currentUser.id()).thenReturn(userId);
        dashboardService = new DashboardService(
                debtRepository,
                paymentRepository,
                profileRepository,
                strategyService,
                currentUser
        );
    }

    @Test
    @DisplayName("HU-037 CA-01 & CA-02: Calcula correctamente totales, cuotas y proyecciones para usuario con deudas")
    void calculatesTotalsAndIndicatorsCorrectly() {
        User user = new User();
        user.setId(userId);

        Debt card = new Debt();
        card.setId(UUID.randomUUID());
        card.setUser(user);
        card.setName("Tarjeta Visa");
        card.setType(DebtType.CREDIT_CARD);
        card.setOriginalAmount(new BigDecimal("5000000"));
        card.setCurrentBalance(new BigDecimal("2000000"));
        card.setMinimumPayment(new BigDecimal("150000"));
        card.setMonthlyPayment(BigDecimal.ZERO);
        card.setStatus(DebtStatus.CURRENT);
        card.setNextDueDate(LocalDate.now().plusDays(10));
        card.setRateType(RateType.EA);

        Debt loan = new Debt();
        loan.setId(UUID.randomUUID());
        loan.setUser(user);
        loan.setName("Préstamo Bancario");
        loan.setType(DebtType.PERSONAL_LOAN);
        loan.setOriginalAmount(new BigDecimal("10000000"));
        loan.setCurrentBalance(new BigDecimal("6000000"));
        loan.setMonthlyPayment(new BigDecimal("350000"));
        loan.setStatus(DebtStatus.CURRENT);
        loan.setNextDueDate(LocalDate.now().plusDays(20));
        loan.setRateType(RateType.EA);

        Debt paidDebt = new Debt();
        paidDebt.setId(UUID.randomUUID());
        paidDebt.setUser(user);
        paidDebt.setName("Crédito Pagado");
        paidDebt.setType(DebtType.RETAIL_CREDIT);
        paidDebt.setOriginalAmount(new BigDecimal("1000000"));
        paidDebt.setCurrentBalance(BigDecimal.ZERO);
        paidDebt.setStatus(DebtStatus.PAID);
        paidDebt.setRateType(RateType.EA);

        when(debtRepository.findAllByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(card, loan, paidDebt));
        when(paymentRepository.findAllByDebtUserIdOrderByDateDescCreatedAtDesc(userId)).thenReturn(List.of());

        FinancialProfile profile = new FinancialProfile();
        profile.setUser(user);
        profile.setAvailableForDebts(new BigDecimal("800000"));
        profile.setTotalDeclaredDebts(3);
        profile.setActiveStrategy(StrategyType.SNOWBALL);
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

        StrategyStatsResponse stats = new StrategyStatsResponse(new BigDecimal("500000"), "mar. de 2027", 18, BigDecimal.ZERO);
        when(strategyService.compare(StrategyType.SNOWBALL)).thenReturn(
                new StrategyComparisonResponse(StrategyType.SNOWBALL, stats, stats, List.of(card.getId(), loan.getId()))
        );

        DashboardSummaryResponse response = dashboardService.getSummary();

        // CA-01
        assertThat(response.totalRegisteredDebt()).isEqualByComparingTo("8000000"); // 2M + 6M (paid excluded)
        assertThat(response.activeDebtCount()).isEqualTo(2);
        assertThat(response.registeredDebtCount()).isEqualTo(3);
        assertThat(response.requiredPaymentsCurrentPeriod()).isEqualByComparingTo("500000"); // 150k + 350k
        assertThat(response.hasRequiredPaymentsData()).isTrue();
        assertThat(response.nextDue()).isNotNull();
        assertThat(response.nextDue().debtId()).isEqualTo(card.getId());
        assertThat(response.nextDue().amount()).isEqualByComparingTo("150000");

        // CA-02
        assertThat(response.availableForDebt()).isEqualByComparingTo("800000");
        assertThat(response.activeStrategy()).isEqualTo(StrategyType.SNOWBALL);
        assertThat(response.hasEstimatedDebtFreeDate()).isTrue();
        assertThat(response.estimatedDebtFreeDate()).isEqualTo("mar. de 2027");

        // Progreso (5M + 10M + 1M = 16M original. Pagado: (5-2)+(10-6)+(1-0) = 3+4+1 = 8M. 8/16 = 50%)
        assertThat(response.progress().hasProgressData()).isTrue();
        assertThat(response.progress().percentage()).isEqualTo(50);

        // HU-038 Cobertura (declaradas = 3, registradas = 3 -> no parcial)
        assertThat(response.partialCoverage()).isFalse();
        assertThat(response.status()).isEqualTo("SUCCESS");
    }

    @Test
    @DisplayName("HU-038: Identifica correctamente cobertura parcial cuando declaradas > registradas")
    void identifiesPartialCoverage() {
        User user = new User();
        user.setId(userId);

        Debt debt = new Debt();
        debt.setId(UUID.randomUUID());
        debt.setUser(user);
        debt.setName("Deuda Única");
        debt.setType(DebtType.PERSONAL_LOAN);
        debt.setOriginalAmount(new BigDecimal("2000000"));
        debt.setCurrentBalance(new BigDecimal("1000000"));
        debt.setMonthlyPayment(new BigDecimal("100000"));
        debt.setStatus(DebtStatus.CURRENT);
        debt.setRateType(RateType.EA);

        when(debtRepository.findAllByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(debt));
        when(paymentRepository.findAllByDebtUserIdOrderByDateDescCreatedAtDesc(userId)).thenReturn(List.of());

        FinancialProfile profile = new FinancialProfile();
        profile.setUser(user);
        profile.setAvailableForDebts(new BigDecimal("200000"));
        profile.setTotalDeclaredDebts(5); // Declaró 5 pero solo registró 1
        profile.setActiveStrategy(StrategyType.AVALANCHE);
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

        StrategyStatsResponse stats = new StrategyStatsResponse(BigDecimal.ZERO, "oct. de 2026", 5, BigDecimal.ZERO);
        when(strategyService.compare(StrategyType.AVALANCHE)).thenReturn(
                new StrategyComparisonResponse(StrategyType.AVALANCHE, stats, stats, List.of(debt.getId()))
        );

        DashboardSummaryResponse response = dashboardService.getSummary();

        assertThat(response.totalDeclaredDebts()).isEqualTo(5);
        assertThat(response.registeredDebtCount()).isEqualTo(1);
        assertThat(response.partialCoverage()).isTrue();
        // Los cálculos usan únicamente la registrada
        assertThat(response.totalRegisteredDebt()).isEqualByComparingTo("1000000");
    }

    @Test
    @DisplayName("HU-037 CA-07: Devuelve estado EMPTY cuando el usuario no tiene ninguna deuda")
    void returnsEmptyStateWhenNoDebts() {
        when(debtRepository.findAllByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of());
        when(paymentRepository.findAllByDebtUserIdOrderByDateDescCreatedAtDesc(userId)).thenReturn(List.of());
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.empty());

        DashboardSummaryResponse response = dashboardService.getSummary();

        assertThat(response.status()).isEqualTo("EMPTY");
        assertThat(response.registeredDebtCount()).isEqualTo(0);
        assertThat(response.activeDebtCount()).isEqualTo(0);
        assertThat(response.totalRegisteredDebt()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.nextDue()).isNull();
        assertThat(response.hasEstimatedDebtFreeDate()).isFalse();
        assertThat(response.estimatedDebtFreeDate()).isNull();
    }

    @Test
    @DisplayName("HU-037 CA-08: Maneja datos insuficientes de proyección y cuotas sin inventar cifras ficticias")
    void handlesInsufficientDataWithoutFictitiousValues() {
        User user = new User();
        user.setId(userId);

        // Deuda informal sin cuota ni próximo vencimiento fijo
        Debt familyDebt = new Debt();
        familyDebt.setId(UUID.randomUUID());
        familyDebt.setUser(user);
        familyDebt.setName("Préstamo Amigo");
        familyDebt.setType(DebtType.FAMILY_LOAN);
        familyDebt.setCurrentBalance(new BigDecimal("500000"));
        familyDebt.setMonthlyPayment(BigDecimal.ZERO);
        familyDebt.setMinimumPayment(BigDecimal.ZERO);
        familyDebt.setStatus(DebtStatus.CURRENT);
        familyDebt.setRateType(RateType.NONE);
        familyDebt.setDetails(Map.of());

        when(debtRepository.findAllByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(familyDebt));
        when(paymentRepository.findAllByDebtUserIdOrderByDateDescCreatedAtDesc(userId)).thenReturn(List.of());

        FinancialProfile profile = new FinancialProfile();
        profile.setUser(user);
        profile.setAvailableForDebts(BigDecimal.ZERO);
        profile.setTotalDeclaredDebts(1);
        profile.setActiveStrategy(StrategyType.SNOWBALL);
        when(profileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));

        // Proyección no válida (excede meses o "Revisar capacidad")
        StrategyStatsResponse stats = new StrategyStatsResponse(BigDecimal.ZERO, "Revisar capacidad", 600, BigDecimal.ZERO);
        when(strategyService.compare(StrategyType.SNOWBALL)).thenReturn(
                new StrategyComparisonResponse(StrategyType.SNOWBALL, stats, stats, List.of(familyDebt.getId()))
        );

        DashboardSummaryResponse response = dashboardService.getSummary();

        // CA-08: No inventa cuota ficticia ni fecha inventada
        assertThat(response.hasRequiredPaymentsData()).isFalse();
        assertThat(response.requiredPaymentsCurrentPeriod()).isNull();

        assertThat(response.hasEstimatedDebtFreeDate()).isFalse();
        assertThat(response.estimatedDebtFreeDate()).isNull();

        assertThat(response.progress().hasProgressData()).isFalse();
        assertThat(response.progress().percentage()).isNull();

        assertThat(response.nextDue()).isNull();
    }
}

