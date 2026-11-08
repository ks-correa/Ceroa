package com.ceroa.api;
import com.ceroa.service.SupportBookingService;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
@RestController @RequestMapping("/api/v1/support/bookings")
public class SupportBookingController {
 @ModelAttribute public void privateResponse(jakarta.servlet.http.HttpServletResponse response){response.setHeader("Cache-Control","no-store");}
 private final SupportBookingService service;public SupportBookingController(SupportBookingService service){this.service=service;}
 public record Slot(OffsetDateTime start){} public record Confirmation(String confirmation){}
 @GetMapping("/availability") public Object availability(@RequestParam OffsetDateTime start){return service.availability(start);}
 @PostMapping public Object propose(@RequestBody Slot slot){return service.propose(slot.start());}
 @PostMapping("/{code}/confirm") public Object confirm(@PathVariable String code){return service.confirm(code);}
 @GetMapping("/{code}") public Object get(@PathVariable String code){return service.get(code);}
 @PostMapping("/{code}/cancel") public Object cancel(@PathVariable String code){return service.proposeCancellation(code);}
 @PostMapping("/{code}/cancel/confirm") public Object cancelConfirm(@PathVariable String code,@RequestBody Confirmation confirmation){return service.confirmCancellation(code,confirmation.confirmation());}
}
