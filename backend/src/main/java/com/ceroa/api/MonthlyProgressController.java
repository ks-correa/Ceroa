package com.ceroa.api;

import com.ceroa.api.dto.MonthlyProgressResponse;
import com.ceroa.service.MonthlyProgressService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/monthly-progress")
public class MonthlyProgressController {
    private final MonthlyProgressService service;
    public MonthlyProgressController(MonthlyProgressService service) { this.service = service; }
    @GetMapping
    public MonthlyProgressResponse get(@RequestParam int year, @RequestParam int month) {
        return service.get(year, month);
    }
}
