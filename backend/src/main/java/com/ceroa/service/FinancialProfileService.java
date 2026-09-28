package com.ceroa.service;

import com.ceroa.api.dto.FinancialProfileRequest;
import com.ceroa.api.dto.FinancialProfileResponse;
import com.ceroa.api.dto.UserResponse;
import com.ceroa.domain.FinancialProfile;
import com.ceroa.domain.StrategyType;
import com.ceroa.domain.User;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.FinancialProfileRepository;
import com.ceroa.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class FinancialProfileService {
    @org.springframework.beans.factory.annotation.Autowired(required = false) private SentinelVersionService sentinelVersions;
    private final FinancialProfileRepository profileRepository;
    private final DebtRepository debtRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUser;
    private final AuthService authService;

    public FinancialProfileService(
            FinancialProfileRepository profileRepository,
            DebtRepository debtRepository,
            UserRepository userRepository,
            CurrentUserService currentUser,
            AuthService authService) {
        this.profileRepository = profileRepository;
        this.debtRepository = debtRepository;
        this.userRepository = userRepository;
        this.currentUser = currentUser;
        this.authService = authService;
    }

    @Transactional(readOnly = true)
    public FinancialProfileResponse get() {
        return profileRepository.findByUserId(currentUser.id())
                .map(this::toResponse)
                .orElseGet(this::defaultResponse);
    }

    @Transactional
    public FinancialProfileResponse update(FinancialProfileRequest request) {
        currentUser.entityForUpdate();
        validateBudget(request);
        FinancialProfile profile = profileRepository.findByUserId(currentUser.id())
                .orElseGet(() -> {
                    FinancialProfile p = new FinancialProfile();
                    p.setUser(currentUser.entity());
                    return p;
                });
        profile.setMonthlyIncome(request.monthlyIncome());
        profile.setEssentialExpenses(request.fixedExpenses());
        profile.setAvailableForDebts(request.availableMoney());
        profile.setTotalDeclaredDebts(request.totalDeclaredDebts());
        profile.setActiveStrategy(request.activeStrategy());
        var saved=profileRepository.save(profile);
        if(sentinelVersions!=null)sentinelVersions.mark(currentUser.id());
        return toResponse(saved);
    }

    @Transactional
    public FinancialProfileResponse updateStrategy(StrategyType strategy) {
        currentUser.entityForUpdate();
        if (strategy == null) {
            throw new BusinessRuleException("INVALID_STRATEGY", "Debe seleccionar una estrategia de pago válida.");
        }
        if (debtRepository.countByUserId(currentUser.id()) < 1) {
            throw new BusinessRuleException("NO_DEBTS_REGISTERED", "Debe tener al menos una deuda registrada para cambiar o aplicar una estrategia.");
        }
        FinancialProfile profile = profileRepository.findByUserId(currentUser.id())
                .orElseGet(() -> {
                    FinancialProfile p = new FinancialProfile();
                    p.setUser(currentUser.entity());
                    p.setMonthlyIncome(BigDecimal.ZERO);
                    p.setEssentialExpenses(BigDecimal.ZERO);
                    p.setAvailableForDebts(BigDecimal.ZERO);
                    p.setTotalDeclaredDebts(1);
                    return p;
                });
        profile.setActiveStrategy(strategy);
        var saved=profileRepository.save(profile);
        if(sentinelVersions!=null)sentinelVersions.mark(currentUser.id());
        return toResponse(saved);
    }

    @Transactional
    public UserResponse completeInitialSetup() {
        FinancialProfile profile = profileRepository.findByUserId(currentUser.id())
                .orElseThrow(() -> new BusinessRuleException(
                        "INCOMPLETE_SETUP",
                        "Debe registrar su situación financiera inicial antes de finalizar."));

        if (profile.getMonthlyIncome() == null || profile.getMonthlyIncome().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BusinessRuleException("INVALID_INCOME", "Los ingresos mensuales deben ser mayores a cero.");
        }
        if (profile.getEssentialExpenses() == null || profile.getEssentialExpenses().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessRuleException("INVALID_EXPENSES", "Los gastos esenciales deben ser mayores o iguales a cero.");
        }
        if (profile.getAvailableForDebts() == null || profile.getAvailableForDebts().compareTo(BigDecimal.ZERO) < 0) {
            throw new BusinessRuleException("INVALID_AVAILABLE_MONEY", "El dinero disponible para deudas no puede ser negativo.");
        }
        if (profile.getTotalDeclaredDebts() == null || profile.getTotalDeclaredDebts() < 1) {
            throw new BusinessRuleException("INVALID_DECLARED_DEBTS", "La cantidad total de deudas declaradas debe ser un entero mayor o igual a 1.");
        }

        long registeredDebts = debtRepository.countByUserId(currentUser.id());
        if (registeredDebts < 1) {
            throw new BusinessRuleException("NO_DEBTS_REGISTERED", "Debe registrar al menos una deuda antes de finalizar la configuración inicial.");
        }

        if (profile.getActiveStrategy() == null) {
            throw new BusinessRuleException("NO_STRATEGY_SELECTED", "Debe seleccionar una estrategia de pago (Bola de Nieve o Avalancha) antes de finalizar.");
        }

        User user = currentUser.entityForUpdate();
        user.setInitialSetupComplete(true);
        userRepository.save(user);

        return authService.toResponse(user);
    }

    private void validateBudget(FinancialProfileRequest request) {
        if (request.fixedExpenses().compareTo(request.monthlyIncome()) > 0) {
            throw new BusinessRuleException(
                    "EXPENSES_EXCEED_INCOME",
                    "Los gastos fijos no pueden superar los ingresos mensuales.");
        }
        BigDecimal availableAfterExpenses = request.monthlyIncome().subtract(request.fixedExpenses());
        if (request.availableMoney().compareTo(availableAfterExpenses) > 0) {
            throw new BusinessRuleException(
                    "INVALID_AVAILABLE_MONEY",
                    "El dinero disponible para deudas no puede superar el ingreso restante después de gastos.");
        }
    }

    private FinancialProfileResponse defaultResponse() {
        long registered = debtRepository.countByUserId(currentUser.id());
        return new FinancialProfileResponse(
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                BigDecimal.ZERO,
                0,
                1,
                registered,
                true,
                StrategyType.SNOWBALL);
    }

    private FinancialProfileResponse toResponse(FinancialProfile profile) {
        long registered = debtRepository.countByUserId(currentUser.id());
        BigDecimal available = profile.getAvailableForDebts();
        int usage = (profile.getMonthlyIncome() == null || profile.getMonthlyIncome().compareTo(BigDecimal.ZERO) == 0 || available == null || available.compareTo(BigDecimal.ZERO) == 0)
                ? 0
                : available
                .divide(profile.getMonthlyIncome(), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .min(BigDecimal.valueOf(100))
                .intValue();
        return new FinancialProfileResponse(
                profile.getMonthlyIncome() == null ? BigDecimal.ZERO : profile.getMonthlyIncome(),
                profile.getEssentialExpenses() == null ? BigDecimal.ZERO : profile.getEssentialExpenses(),
                available == null ? BigDecimal.ZERO : available,
                available == null ? BigDecimal.ZERO : available,
                usage,
                profile.getTotalDeclaredDebts() == null ? 1 : profile.getTotalDeclaredDebts(),
                registered,
                (profile.getTotalDeclaredDebts() == null ? 1 : profile.getTotalDeclaredDebts()) > registered,
                profile.getActiveStrategy() == null ? StrategyType.SNOWBALL : profile.getActiveStrategy());
    }
}

