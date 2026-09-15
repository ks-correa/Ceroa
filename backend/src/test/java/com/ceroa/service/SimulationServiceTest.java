package com.ceroa.service;

import com.ceroa.api.dto.SimulationEventRequest;
import com.ceroa.api.dto.SimulationRequest;
import com.ceroa.api.dto.SimulationResponse;
import com.ceroa.domain.*;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.exception.ResourceNotFoundException;
import com.ceroa.repository.DebtRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SimulationServiceTest {

    @Mock
    private DebtRepository debtRepository;

    @Mock
    private CurrentUserService currentUser;

    private SimulationEngine simulationEngine;
    private SimulationService simulationService;

    private User plusUser;
    private User ceroUser;
    private Debt testDebt;
    private UUID debtId;

    @BeforeEach
    void setUp() {
        RateNormalizationService rateService = new RateNormalizationService();
        DebtPaymentResolver paymentResolver = new DebtPaymentResolver();
        simulationEngine = new SimulationEngine(rateService, paymentResolver);
        simulationService = new SimulationService(debtRepository, currentUser, simulationEngine);

        UUID plusId = UUID.randomUUID();
        plusUser = new User();
        plusUser.setId(plusId);
        plusUser.setPlan(UserPlan.PLUS);

        UUID ceroId = UUID.randomUUID();
        ceroUser = new User();
        ceroUser.setId(ceroId);
        ceroUser.setPlan(UserPlan.CERO);

        debtId = UUID.randomUUID();
        testDebt = new Debt();
        testDebt.setId(debtId);
        testDebt.setUser(plusUser);
        testDebt.setName("Tarjeta Éxito");
        testDebt.setEntity("Tuya");
        testDebt.setType(DebtType.CREDIT_CARD);
        testDebt.setCategoryLabel("Tarjetas");
        testDebt.setCurrentBalance(new BigDecimal("3000000"));
        testDebt.setOriginalAmount(new BigDecimal("3000000"));
        testDebt.setInterestRate(new BigDecimal("25.0"));
        testDebt.setRateType(RateType.EA);
        testDebt.setMonthlyPayment(new BigDecimal("250000"));
        testDebt.setMinimumPayment(new BigDecimal("200000"));
    }

    @Test
    @DisplayName("HU-045 CA-01: Usuario CERO no puede ejecutar simulaciones (PLAN_RESTRICTED)")
    void rejectsCeroPlanUser() {
        when(currentUser.entity()).thenReturn(ceroUser);

        SimulationRequest request = new SimulationRequest(
                debtId,
                StrategyType.SNOWBALL,
                List.of(new SimulationEventRequest(null, 1, new BigDecimal("100000"), null))
        );

        assertThatThrownBy(() -> simulationService.runSimulation(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("exclusiva de Ceroa Plus")
                .extracting(e -> ((BusinessRuleException) e).getCode())
                .isEqualTo("PLAN_RESTRICTED");
    }

    @Test
    @DisplayName("HU-045 CA-01 & CA-02: Deuda no perteneciente al usuario es rechazada")
    void rejectsDebtNotOwnedByUser() {
        when(currentUser.entity()).thenReturn(plusUser);
        when(debtRepository.findByIdAndUserId(debtId, plusUser.getId())).thenReturn(Optional.empty());

        SimulationRequest request = new SimulationRequest(
                debtId,
                StrategyType.SNOWBALL,
                List.of()
        );

        assertThatThrownBy(() -> simulationService.runSimulation(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("no encontrada");
    }

    @Test
    @DisplayName("HU-045 CA-05: Rechaza evento con montos <= 0")
    void rejectsNegativeOrZeroAmounts() {
        when(currentUser.entity()).thenReturn(plusUser);
        when(debtRepository.findByIdAndUserId(debtId, plusUser.getId())).thenReturn(Optional.of(testDebt));

        SimulationRequest request = new SimulationRequest(
                debtId,
                StrategyType.SNOWBALL,
                List.of(new SimulationEventRequest(null, 1, new BigDecimal("-50000"), null))
        );

        assertThatThrownBy(() -> simulationService.runSimulation(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("mayor que cero");
    }

    @Test
    @DisplayName("HU-045 CA-05: Rechaza evento con fecha pasada")
    void rejectsPastEventDate() {
        when(currentUser.entity()).thenReturn(plusUser);
        when(debtRepository.findByIdAndUserId(debtId, plusUser.getId())).thenReturn(Optional.of(testDebt));

        SimulationRequest request = new SimulationRequest(
                debtId,
                StrategyType.SNOWBALL,
                List.of(new SimulationEventRequest(LocalDate.now().minusDays(10), null, new BigDecimal("50000"), null))
        );

        assertThatThrownBy(() -> simulationService.runSimulation(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("no puede ser anterior");
    }

    @Test
    @DisplayName("HU-045 CA-05: Rechaza combinación incoherente de fecha y periodo")
    void rejectsIncoherentDateAndPeriod() {
        when(currentUser.entity()).thenReturn(plusUser);
        when(debtRepository.findByIdAndUserId(debtId, plusUser.getId())).thenReturn(Optional.of(testDebt));

        // Fecha en 6 meses pero periodo indicado es 1
        LocalDate futureDate = LocalDate.now().plusMonths(6);
        SimulationRequest request = new SimulationRequest(
                debtId,
                StrategyType.SNOWBALL,
                List.of(new SimulationEventRequest(futureDate, 1, new BigDecimal("100000"), null))
        );

        assertThatThrownBy(() -> simulationService.runSimulation(request))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessageContaining("no son coherentes entre sí");
    }

    @Test
    @DisplayName("HU-046 CA-01 a CA-05: Simulación exitosa con abono adicional y cuota modificada")
    void runsSuccessfulSimulationWithEvents() {
        when(currentUser.entity()).thenReturn(plusUser);
        when(debtRepository.findByIdAndUserId(debtId, plusUser.getId())).thenReturn(Optional.of(testDebt));

        SimulationRequest request = new SimulationRequest(
                debtId,
                StrategyType.SNOWBALL,
                List.of(
                        new SimulationEventRequest(null, 1, new BigDecimal("500000"), null),
                        new SimulationEventRequest(null, 2, null, new BigDecimal("300000"))
                )
        );

        SimulationResponse response = simulationService.runSimulation(request);

        assertThat(response.status()).isEqualTo("SUCCESS");
        assertThat(response.simulatedStrategy()).isEqualTo(StrategyType.SNOWBALL);
        assertThat(response.debt().name()).isEqualTo("Tarjeta Éxito");

        // Baseline vs Simulated están claramente diferenciados
        assertThat(response.baseline()).isNotNull();
        assertThat(response.simulated()).isNotNull();
        assertThat(response.baseline().estimatedMonths()).isGreaterThan(response.simulated().estimatedMonths());
        assertThat(response.baseline().totalInterest()).isGreaterThan(response.simulated().totalInterest());

        // Diferencias estimadas calculadas correctamente
        assertThat(response.differences()).isNotNull();
        assertThat(response.differences().monthsReduced()).isPositive();
        assertThat(response.differences().estimatedInterestSavings()).isPositive();

        // Periodos capturados en la proyección simulada
        assertThat(response.periods()).isNotEmpty();
        var period1 = response.periods().get(0);
        assertThat(period1.period()).isEqualTo(1);
        assertThat(period1.extraPayment()).isEqualByComparingTo(new BigDecimal("500000"));
        assertThat(period1.openingBalance()).isEqualByComparingTo(new BigDecimal("3000000"));
        assertThat(period1.closingBalance()).isLessThan(period1.openingBalance());

        // Supuestos explícitos presentes
        assertThat(response.assumptions()).isNotEmpty();
        assertThat(response.assumptions()).anyMatch(a -> a.contains("a partir de ese periodo en adelante"));
    }

    @Test
    @DisplayName("HU-046: Tasa indexada retorna INSUFFICIENT_DATA sin inventar cifras")
    void handlesIndexedRateAsInsufficientData() {
        when(currentUser.entity()).thenReturn(plusUser);

        Debt indexedDebt = new Debt();
        indexedDebt.setId(debtId);
        indexedDebt.setUser(plusUser);
        indexedDebt.setName("Hipotecario UVR");
        indexedDebt.setType(DebtType.MORTGAGE);
        indexedDebt.setCategoryLabel("Vivienda");
        indexedDebt.setCurrentBalance(new BigDecimal("120000000"));
        indexedDebt.setRateType(RateType.UVR_MARGIN);
        indexedDebt.setInterestRate(new BigDecimal("5.5"));
        indexedDebt.setMonthlyPayment(new BigDecimal("1200000"));

        when(debtRepository.findByIdAndUserId(debtId, plusUser.getId())).thenReturn(Optional.of(indexedDebt));

        SimulationRequest request = new SimulationRequest(
                debtId,
                StrategyType.AVALANCHE,
                List.of()
        );

        SimulationResponse response = simulationService.runSimulation(request);

        assertThat(response.status()).isEqualTo("INSUFFICIENT_DATA");
        assertThat(response.statusReason()).contains("Tasa indexada sin índice de referencia disponible");
        assertThat(response.baseline()).isNull();
        assertThat(response.simulated()).isNull();
        assertThat(response.differences()).isNull();
        assertThat(response.periods()).isEmpty();
    }

    @Test
    @DisplayName("HU-046: Deuda a 0% de interés (RateType.NONE) amortiza correctamente sin intereses")
    void handlesZeroInterestRateDebt() {
        when(currentUser.entity()).thenReturn(plusUser);

        Debt familyDebt = new Debt();
        familyDebt.setId(debtId);
        familyDebt.setUser(plusUser);
        familyDebt.setName("Préstamo Familiar");
        familyDebt.setType(DebtType.FAMILY_LOAN);
        familyDebt.setCategoryLabel("Otros");
        familyDebt.setCurrentBalance(new BigDecimal("1000000"));
        familyDebt.setRateType(RateType.NONE);
        familyDebt.setMonthlyPayment(new BigDecimal("200000"));

        when(debtRepository.findByIdAndUserId(debtId, plusUser.getId())).thenReturn(Optional.of(familyDebt));

        SimulationRequest request = new SimulationRequest(
                debtId,
                StrategyType.SNOWBALL,
                List.of(new SimulationEventRequest(null, 1, new BigDecimal("200000"), null))
        );

        SimulationResponse response = simulationService.runSimulation(request);

        assertThat(response.status()).isEqualTo("SUCCESS");
        assertThat(response.baseline().totalInterest()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.simulated().totalInterest()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(response.differences().monthsReduced()).isPositive();
    }
}

