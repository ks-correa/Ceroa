package com.ceroa.api;

import com.ceroa.api.dto.DebtRequest;
import com.ceroa.api.dto.DebtResponse;
import com.ceroa.service.DebtService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/debts")
public class DebtController {
    private final DebtService service;

    public DebtController(DebtService service) {
        this.service = service;
    }

    @GetMapping
    public List<DebtResponse> findAll() { return service.findAll(); }

    @GetMapping("/{id}")
    public DebtResponse findById(@PathVariable UUID id) { return service.findById(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public DebtResponse create(@Valid @RequestBody DebtRequest request) { return service.create(request); }

    @PutMapping("/{id}")
    public DebtResponse update(@PathVariable UUID id, @Valid @RequestBody DebtRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }
}
