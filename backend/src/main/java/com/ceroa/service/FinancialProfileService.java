package com.ceroa.service;

import com.ceroa.api.dto.FinancialProfileRequest;
import com.ceroa.api.dto.FinancialProfileResponse;
import com.ceroa.domain.FinancialProfile;
import com.ceroa.exception.ResourceNotFoundException;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.repository.DebtRepository;
import com.ceroa.repository.FinancialProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class FinancialProfileService {
    private final FinancialProfileRepository profileRepository;
    private final DebtRepository debtRepository;
    private final CurrentUserService currentUser;

    public FinancialProfileService(
            FinancialProfileRepository profileRepository,
            DebtRepository debtRepository,
            CurrentUserService currentUser) {
        this.profileRepository = profileRepository;
        this.debtRepository = debtRepository;
        this.currentUser = currentUser;
    }

    @Transactional(readOnly = true)
    public FinancialProfileResponse get() {
        return toResponse(findProfile());
    }

    @Transactional
    public FinancialProfileResponse update(FinancialProfileRequest request) {
        validateBudget(request);
        FinancialProfile profile = findProfile();
        profile.setMonthlyIncome(request.monthlyIncome());
        profile.setEssentialExpenses(request.fixedExpenses());
        profile.setAvailableForDebts(request.availableMoney());
        profile.setTotalDeclaredDebts(request.totalDeclaredDebts());
        profile.setActiveStrategy(request.activeStrategy());
        return toResponse(profileRepository.save(profile));
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

    private FinancialProfile findProfile() {
        return profileRepository.findByUserId(currentUser.id())
                .orElseThrow(() -> new ResourceNotFoundException("Perfil financiero no encontrado"));
    }

    private FinancialProfileResponse toResponse(FinancialProfile profile) {
        long registered = debtRepository.countByUserId(currentUser.id());
        BigDecimal available = profile.getAvailableForDebts();
        int usage = available.signum() == 0 ? 0 : available
                .divide(profile.getMonthlyIncome(), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .min(BigDecimal.valueOf(100))
                .intValue();
        return new FinancialProfileResponse(
                profile.getMonthlyIncome(),
                profile.getEssentialExpenses(),
                available,
                available,
                usage,
                profile.getTotalDeclaredDebts(),
                registered,
                profile.getTotalDeclaredDebts() > registered,
                profile.getActiveStrategy());
    }
}
