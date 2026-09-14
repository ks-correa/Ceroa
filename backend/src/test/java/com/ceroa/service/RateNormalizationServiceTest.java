package com.ceroa.service;

import com.ceroa.domain.RateType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class RateNormalizationServiceTest {

    private RateNormalizationService rateService;

    @BeforeEach
    void setUp() {
        rateService = new RateNormalizationService();
    }

    @Test
    void normalizesEACorrectly() {
        RateNormalizationService.NormalizedRate res = rateService.normalize(RateType.EA, new BigDecimal("26.5"));

        assertThat(res.comparable()).isTrue();
        assertThat(res.comparableAnnualRate()).isEqualByComparingTo(new BigDecimal("26.5000"));
        // (1 + 0.265)^(1/12) - 1 ≈ 0.0197724227
        assertThat(res.monthlyFractionalRate()).isBetween(new BigDecimal("0.0197"), new BigDecimal("0.0198"));
    }

    @Test
    void normalizesMVToEACorrectly() {
        // 2% monthly -> (1.02)^12 - 1 ≈ 26.8242% EA
        RateNormalizationService.NormalizedRate res = rateService.normalize(RateType.MV, new BigDecimal("2.0"));

        assertThat(res.comparable()).isTrue();
        assertThat(res.comparableAnnualRate()).isBetween(new BigDecimal("26.8200"), new BigDecimal("26.8300"));
        assertThat(res.monthlyFractionalRate()).isEqualByComparingTo(new BigDecimal("0.0200000000"));
    }

    @Test
    void normalizesNAMVToEACorrectly() {
        // 24% NAMV -> 2% monthly -> 26.8242% EA
        RateNormalizationService.NormalizedRate res = rateService.normalize(RateType.NAMV, new BigDecimal("24.0"));

        assertThat(res.comparable()).isTrue();
        assertThat(res.comparableAnnualRate()).isBetween(new BigDecimal("26.8200"), new BigDecimal("26.8300"));
        assertThat(res.monthlyFractionalRate()).isEqualByComparingTo(new BigDecimal("0.0200000000"));
    }

    @Test
    void comparesNAMVVsEACorrectly() {
        // 24% NAMV (26.82% EA) is higher than 26.0% EA
        RateNormalizationService.NormalizedRate namv = rateService.normalize(RateType.NAMV, new BigDecimal("24.0"));
        RateNormalizationService.NormalizedRate ea = rateService.normalize(RateType.EA, new BigDecimal("26.0"));

        assertThat(namv.comparableAnnualRate()).isGreaterThan(ea.comparableAnnualRate());
    }

    @Test
    void normalizesNONEAsZeroRate() {
        RateNormalizationService.NormalizedRate res = rateService.normalize(RateType.NONE, null);

        assertThat(res.comparable()).isTrue();
        assertThat(res.comparableAnnualRate()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(res.monthlyFractionalRate()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void marksIndexedRatesAsNonComparableWithoutExternalIndex() {
        RateNormalizationService.NormalizedRate res = rateService.normalize(RateType.IBR_MARGIN, new BigDecimal("5.0"));

        assertThat(res.comparable()).isFalse();
        assertThat(res.comparableAnnualRate()).isNull();
        assertThat(res.monthlyFractionalRate()).isNull();
        assertThat(res.reason()).contains("sin índice de referencia");
    }

    @Test
    void marksNullOrMissingRateAsNonComparable() {
        RateNormalizationService.NormalizedRate res = rateService.normalize(RateType.EA, null);

        assertThat(res.comparable()).isFalse();
        assertThat(res.comparableAnnualRate()).isNull();
        assertThat(res.reason()).contains("no registrada");
    }
}

