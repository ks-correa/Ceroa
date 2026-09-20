package com.ceroa.service;

import com.ceroa.api.dto.SimulationRequest;
import com.ceroa.api.dto.SimulationResponse;
import com.ceroa.domain.Debt;
import com.ceroa.domain.User;
import com.ceroa.domain.UserPlan;
import com.ceroa.exception.BusinessRuleException;
import com.ceroa.exception.ResourceNotFoundException;
import com.ceroa.repository.DebtRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SimulationService {
    @org.springframework.beans.factory.annotation.Autowired(required = false) private PlanAccessService planAccess;

    private final DebtRepository debtRepository;
    private final CurrentUserService currentUser;
    private final SimulationEngine simulationEngine;

    public SimulationService(
            DebtRepository debtRepository,
            CurrentUserService currentUser,
            SimulationEngine simulationEngine
    ) {
        this.debtRepository = debtRepository;
        this.currentUser = currentUser;
        this.simulationEngine = simulationEngine;
    }

    @Transactional(readOnly = true)
    public SimulationResponse runSimulation(SimulationRequest request) {
        User user = currentUser.entity();

        // Verificación autoritativa de Plan Plus activo
        if (!(planAccess == null ? PlanAccessService.plusActive(user) : planAccess.entitled(user))) {
            throw new BusinessRuleException(
                    "PLAN_RESTRICTED",
                    "La simulación de pagos es una funcionalidad exclusiva de Ceroa Plus."
            );
        }

        if (request.strategy() == null) {
            throw new BusinessRuleException(
                    "INVALID_STRATEGY",
                    "Debe seleccionar una estrategia de simulación válida (Bola de Nieve o Avalancha)."
            );
        }

        if (request.debtId() == null) {
            throw new BusinessRuleException(
                    "INVALID_DEBT",
                    "Debe seleccionar una obligación válida para simular."
            );
        }

        // Obtener la deuda garantizando pertenencia al usuario autenticado
        Debt debt = debtRepository.findByIdAndUserId(request.debtId(), user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Obligación no encontrada o no autorizada."));

        // Ejecutar motor de simulación completamente desacoplado y de sólo lectura
        return simulationEngine.simulate(debt, request.strategy(), request.safeEvents(), null);
    }
}
