package com.ceroa.service;

import com.ceroa.domain.Debt;
import com.ceroa.domain.RateType;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class RateNormalizationService {

    public record NormalizedRate(
            RateType originalType,
            BigDecimal originalRate,
            BigDecimal comparableAnnualRate,
            BigDecimal monthlyFractionalRate,
            boolean comparable,
            String reason
    ) {}

    public NormalizedRate normalize(Debt debt) {
        if (debt == null) {
            return new NormalizedRate(null, null, null, null, false, "Obligación no especificada.");
        }
        return normalize(debt.getRateType(), debt.getInterestRate());
    }

    public NormalizedRate normalize(RateType type, BigDecimal rate) {
        if (type == null) {
            return new NormalizedRate(null, rate, null, null, false, "Tipo de tasa no especificado.");
        }

        if (type == RateType.NONE) {
            return new NormalizedRate(
                    type,
                    BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP),
                    BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP),
                    BigDecimal.ZERO.setScale(10, RoundingMode.HALF_UP),
                    true,
                    null
            );
        }

        // Tasas indexadas no tienen índice de referencia externo garantizado
        if (type == RateType.INDEXED || type == RateType.IBR_MARGIN
                || type == RateType.IPC_MARGIN || type == RateType.UVR_MARGIN) {
            return new NormalizedRate(
                    type,
                    rate,
                    null,
                    null,
                    false,
                    "Tasa indexada sin índice de referencia disponible (IBR/IPC/UVR)."
            );
        }

        if (rate == null || rate.compareTo(BigDecimal.ZERO) < 0) {
            return new NormalizedRate(type, rate, null, null, false, "Tasa no registrada o inválida.");
        }

        switch (type) {
            case EA -> {
                BigDecimal comparableEA = rate.setScale(4, RoundingMode.HALF_UP);
                double eaDecimal = rate.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP).doubleValue();
                double monthlyFraction = Math.pow(1.0 + eaDecimal, 1.0 / 12.0) - 1.0;
                BigDecimal monthlyRate = BigDecimal.valueOf(monthlyFraction).setScale(10, RoundingMode.HALF_UP);
                return new NormalizedRate(type, rate, comparableEA, monthlyRate, true, null);
            }
            case MV -> {
                double mvDecimal = rate.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP).doubleValue();
                double eaDecimal = Math.pow(1.0 + mvDecimal, 12.0) - 1.0;
                BigDecimal comparableEA = BigDecimal.valueOf(eaDecimal * 100.0).setScale(4, RoundingMode.HALF_UP);
                BigDecimal monthlyRate = BigDecimal.valueOf(mvDecimal).setScale(10, RoundingMode.HALF_UP);
                return new NormalizedRate(type, rate, comparableEA, monthlyRate, true, null);
            }
            case NAMV -> {
                BigDecimal monthlyPct = rate.divide(BigDecimal.valueOf(12), 10, RoundingMode.HALF_UP);
                double mvDecimal = monthlyPct.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP).doubleValue();
                double eaDecimal = Math.pow(1.0 + mvDecimal, 12.0) - 1.0;
                BigDecimal comparableEA = BigDecimal.valueOf(eaDecimal * 100.0).setScale(4, RoundingMode.HALF_UP);
                BigDecimal monthlyRate = BigDecimal.valueOf(mvDecimal).setScale(10, RoundingMode.HALF_UP);
                return new NormalizedRate(type, rate, comparableEA, monthlyRate, true, null);
            }
            default -> {
                return new NormalizedRate(type, rate, null, null, false, "Tipo de tasa no soportado para conversión.");
            }
        }
    }
}

