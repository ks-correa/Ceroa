package com.ceroa.api;

import com.ceroa.api.dto.DashboardSummaryResponse;
import com.ceroa.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@Tag(name = "Dashboard", description = "Panel financiero principal y agregados del usuario autenticado")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping("/summary")
    @Operation(summary = "Obtener resumen financiero consolidado para Inicio (EP-08)")
    public DashboardSummaryResponse getSummary() {
        return service.getSummary();
    }

    @GetMapping
    @Operation(summary = "Obtener resumen financiero consolidado (alias)")
    public DashboardSummaryResponse getSummaryDefault() {
        return service.getSummary();
    }
}

