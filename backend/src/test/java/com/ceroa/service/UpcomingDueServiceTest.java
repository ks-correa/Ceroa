package com.ceroa.service;

import com.ceroa.api.dto.UpcomingDueResponse;
import com.ceroa.domain.*;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UpcomingDueServiceTest {

    @Mock
    private DebtRepository debtRepository;

    @Mock
    private CurrentUserService currentUser;

    @Mock
    private DebtService debtService;

    private UpcomingDueService service;
    private final LocalDate today = LocalDate.of(2026, 9, 15);
    private final UUID userId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new UpcomingDueService(debtRepository, new DebtPaymentResolver(), currentUser, debtService);
    }

    @Test
    @DisplayName("Hitos 7, 3 y 0 días se calculan exactamente como SEVEN_DAYS, THREE_DAYS y DUE_TODAY")
    void calculatesMilestonesAccurately() {
        assertThat(service.calculateMilestone(7, DebtStatus.CURRENT)).isEqualTo(ReminderMilestone.SEVEN_DAYS);
        assertThat(service.calculateMilestone(3, DebtStatus.CURRENT)).isEqualTo(ReminderMilestone.THREE_DAYS);
        assertThat(service.calculateMilestone(0, DebtStatus.DUE_TODAY)).isEqualTo(ReminderMilestone.DUE_TODAY);
        assertThat(service.calculateMilestone(5, DebtStatus.CURRENT)).isEqualTo(ReminderMilestone.NONE);
        assertThat(service.calculateMilestone(1, DebtStatus.CURRENT)).isEqualTo(ReminderMilestone.NONE);
        assertThat(service.calculateMilestone(15, DebtStatus.CURRENT)).isEqualTo(ReminderMilestone.NONE);
    }

    @Test
    @DisplayName("Deuda con estado PAID no produce hito de vencimiento")
    void paidDebtHasNoMilestone() {
        assertThat(service.calculateMilestone(0, DebtStatus.PAID)).isEqualTo(ReminderMilestone.NONE);
        assertThat(service.calculateMilestone(3, DebtStatus.PAID)).isEqualTo(ReminderMilestone.NONE);
        assertThat(service.calculateMilestone(7, DebtStatus.PAID)).isEqualTo(ReminderMilestone.NONE);
    }

    @Test
    @DisplayName("Deudas con saldo cero o pagadas no aparecen en los vencimientos pendientes")
    void paidOrZeroBalanceDebtsExcludedFromUpcoming() {
        Debt paidDebt = createDebt("Crédito Pagado", BigDecimal.ZERO, today.plusDays(3), DebtStatus.PAID);
        Debt activeDebt = createDebt("Tarjeta Activa", new BigDecimal("500000"), today.plusDays(7), DebtStatus.CURRENT);

        when(debtRepository.findAllByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(paidDebt, activeDebt));
        when(debtService.calculateSystemStatus(activeDebt)).thenReturn(DebtStatus.CURRENT);

        List<UpcomingDueResponse> dues = service.getUpcomingDues(userId, today);

        assertThat(dues).hasSize(1);
        assertThat(dues.get(0).debtName()).isEqualTo("Tarjeta Activa");
        assertThat(dues.get(0).reminderMilestone()).isEqualTo(ReminderMilestone.SEVEN_DAYS);
    }

    @Test
    @DisplayName("Vencimientos se ordenan cronológicamente por fecha límite ascendente")
    void ordersChronologicallyAscending() {
        Debt dueIn7Days = createDebt("Préstamo 7d", new BigDecimal("300000"), today.plusDays(7), DebtStatus.CURRENT);
        Debt dueToday = createDebt("Factura Hoy", new BigDecimal("150000"), today, DebtStatus.DUE_TODAY);
        Debt dueIn3Days = createDebt("Tarjeta 3d", new BigDecimal("200000"), today.plusDays(3), DebtStatus.CURRENT);

        when(debtRepository.findAllByUserIdOrderByCreatedAtDesc(userId))
                .thenReturn(List.of(dueIn7Days, dueToday, dueIn3Days));
        when(debtService.calculateSystemStatus(any(Debt.class))).thenAnswer(invocation -> {
            Debt d = invocation.getArgument(0);
            return d.getStatus();
        });

        List<UpcomingDueResponse> dues = service.getUpcomingDues(userId, today);

        assertThat(dues).hasSize(3);
        assertThat(dues.get(0).debtName()).isEqualTo("Factura Hoy");
        assertThat(dues.get(0).reminderMilestone()).isEqualTo(ReminderMilestone.DUE_TODAY);
        assertThat(dues.get(1).debtName()).isEqualTo("Tarjeta 3d");
        assertThat(dues.get(1).reminderMilestone()).isEqualTo(ReminderMilestone.THREE_DAYS);
        assertThat(dues.get(2).debtName()).isEqualTo("Préstamo 7d");
        assertThat(dues.get(2).reminderMilestone()).isEqualTo(ReminderMilestone.SEVEN_DAYS);
    }

    @Test
    @DisplayName("getUpcomingDueForDebt devuelve información para una obligación específica")
    void returnsDueForSpecificDebt() {
        UUID debtId = UUID.randomUUID();
        Debt debt = createDebt("Hipotecario", new BigDecimal("120000000"), today.plusDays(3), DebtStatus.CURRENT);
        debt.setId(debtId);

        when(debtRepository.findByIdAndUserId(debtId, userId)).thenReturn(Optional.of(debt));
        when(debtService.calculateSystemStatus(debt)).thenReturn(DebtStatus.CURRENT);

        UpcomingDueResponse due = service.getUpcomingDueForDebt(debtId, userId, today);

        assertThat(due).isNotNull();
        assertThat(due.debtId()).isEqualTo(debtId);
        assertThat(due.reminderMilestone()).isEqualTo(ReminderMilestone.THREE_DAYS);
        assertThat(due.daysUntilDue()).isEqualTo(3);
    }

    private Debt createDebt(String name, BigDecimal balance, LocalDate nextDue, DebtStatus status) {
        Debt debt = new Debt();
        debt.setId(UUID.randomUUID());
        debt.setName(name);
        debt.setEntity("Banco Ceroa");
        debt.setType(DebtType.PERSONAL_LOAN);
        debt.setCategoryLabel("Préstamo personal");
        debt.setCurrentBalance(balance);
        debt.setOriginalAmount(balance.compareTo(BigDecimal.ZERO) > 0 ? balance.multiply(new BigDecimal("1.2")) : new BigDecimal("100000"));
        debt.setMonthlyPayment(new BigDecimal("50000"));
        debt.setNextDueDate(nextDue);
        debt.setStatus(status);
        debt.setRateType(RateType.EA);
        return debt;
    }
}

