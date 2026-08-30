package com.ceroa.api;

import com.ceroa.api.dto.PaymentRequest;
import com.ceroa.api.dto.PaymentResponse;
import com.ceroa.service.PaymentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payments")
public class PaymentController {
    private final PaymentService service;

    public PaymentController(PaymentService service) {
        this.service = service;
    }

    @GetMapping
    public List<PaymentResponse> findAll(@RequestParam(required = false) UUID debtId) {
        return service.findAll(debtId);
    }

    @GetMapping("/{id}")
    public PaymentResponse findById(@PathVariable UUID id) { return service.findById(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse create(@Valid @RequestBody PaymentRequest request) { return service.create(request); }

    @PutMapping("/{id}")
    public PaymentResponse update(@PathVariable UUID id, @Valid @RequestBody PaymentRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }
}
