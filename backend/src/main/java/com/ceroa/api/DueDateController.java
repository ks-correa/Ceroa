package com.ceroa.api;

import com.ceroa.api.dto.UpcomingDueResponse;
import com.ceroa.exception.ResourceNotFoundException;
import com.ceroa.service.UpcomingDueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/due-dates")
@Tag(name = "Due Dates", description = "Consulta autoritativa de próximos vencimientos e hitos (EP-12)")
public class DueDateController {

    private final UpcomingDueService service;

    public DueDateController(UpcomingDueService service) {
        this.service = service;
    }

    @GetMapping("/upcoming")
    @Operation(summary = "Consultar próximos vencimientos del usuario autenticado con cálculo de hitos 7/3/0 (HU-048)")
    public List<UpcomingDueResponse> getUpcomingDues() {
        return service.getUpcomingDues();
    }

    @GetMapping("/upcoming/{debtId}")
    @Operation(summary = "Consultar próximo vencimiento para una obligación específica (HU-048 detalle)")
    public UpcomingDueResponse getUpcomingDueForDebt(@PathVariable UUID debtId) {
        UpcomingDueResponse response = service.getUpcomingDueForDebt(debtId);
        if (response == null) {
            throw new ResourceNotFoundException("No se encontró información de vencimiento para la deuda solicitada.");
        }
        return response;
    }
}

