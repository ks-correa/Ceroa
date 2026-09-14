package com.ceroa.service.validation;

import com.ceroa.api.dto.DebtRequest;
import com.ceroa.domain.DebtType;
import com.ceroa.domain.RateType;
import com.ceroa.exception.BusinessRuleException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DebtValidatorTest {

    private DebtValidator validator;

    @BeforeEach
    void setUp() {
        validator = new DebtValidator();
    }

    @Nested
    @DisplayName("HU-023: Seleccionar tipo y validaciones comunes")
    class CommonValidations {

        @Test
        void rejectsNullType() {
            DebtRequest request = new DebtRequest(
                    "Mi Deuda", "Banco", null, null,
                    BigDecimal.valueOf(100), BigDecimal.valueOf(100), BigDecimal.TEN,
                    RateType.EA, BigDecimal.TEN, BigDecimal.TEN, 15,
                    LocalDate.now().plusDays(10), null, 12, null, null, null, Map.of());

            assertThatThrownBy(() -> validator.validate(request))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("tipo de deuda");
        }

        @Test
        void rejectsBlankName() {
            DebtRequest request = new DebtRequest(
                    "   ", "Banco", DebtType.PERSONAL_LOAN, null,
                    BigDecimal.valueOf(100), BigDecimal.valueOf(100), BigDecimal.TEN,
                    RateType.EA, BigDecimal.TEN, BigDecimal.TEN, 15,
                    LocalDate.now().plusDays(10), LocalDate.now(), 12, null, null, null, Map.of());

            assertThatThrownBy(() -> validator.validate(request))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("nombre personalizado");
        }

        @Test
        void rejectsNegativeOrZeroBalanceForNonCard() {
            DebtRequest request = new DebtRequest(
                    "Préstamo", "Banco", DebtType.PERSONAL_LOAN, null,
                    BigDecimal.valueOf(100), BigDecimal.ZERO, BigDecimal.TEN,
                    RateType.EA, BigDecimal.TEN, BigDecimal.TEN, 15,
                    LocalDate.now().plusDays(10), LocalDate.now(), 12, null, null, null, Map.of());

            assertThatThrownBy(() -> validator.validate(request))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("saldo actual");
        }

        @Test
        void rejectsNonZeroRateWhenRateTypeIsNone() {
            DebtRequest request = new DebtRequest(
                    "Deuda familiar", null, DebtType.FAMILY_LOAN, null,
                    null, BigDecimal.valueOf(500_000), BigDecimal.valueOf(5),
                    RateType.NONE, null, null, null,
                    null, null, null, null, null, null, Map.of());

            assertThatThrownBy(() -> validator.validate(request))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("sin intereses");
        }
    }

    @Nested
    @DisplayName("HU-024: Tarjeta de crédito")
    class CreditCardValidations {

        @Test
        void acceptsValidCreditCard() {
            DebtRequest request = new DebtRequest(
                    "Visa Platinum", "Bancolombia", DebtType.CREDIT_CARD, null,
                    BigDecimal.valueOf(10_000_000), BigDecimal.valueOf(2_500_000), BigDecimal.valueOf(28.5),
                    RateType.EA, BigDecimal.ZERO, BigDecimal.valueOf(150_000), 18,
                    LocalDate.now().plusDays(15), null, null, null, null, null,
                    Map.of(
                            "creditLimit", 10_000_000,
                            "availableCredit", 7_500_000,
                            "statementDay", 18,
                            "paymentDueDate", LocalDate.now().plusDays(15).toString(),
                            "managementFee", 25_000
                    ));

            assertThatCode(() -> validator.validate(request)).doesNotThrowAnyException();
        }

        @Test
        void rejectsZeroOrMissingCreditLimit() {
            DebtRequest request = new DebtRequest(
                    "Visa Platinum", "Bancolombia", DebtType.CREDIT_CARD, null,
                    null, BigDecimal.valueOf(2_500_000), BigDecimal.valueOf(28.5),
                    RateType.EA, BigDecimal.ZERO, BigDecimal.valueOf(150_000), 18,
                    LocalDate.now().plusDays(15), null, null, null, null, null,
                    Map.of("statementDay", 18));

            assertThatThrownBy(() -> validator.validate(request))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("cupo total");
        }

        @Test
        void rejectsAvailableCreditGreaterThanCreditLimit() {
            DebtRequest request = new DebtRequest(
                    "Visa Platinum", "Bancolombia", DebtType.CREDIT_CARD, null,
                    BigDecimal.valueOf(5_000_000), BigDecimal.valueOf(1_000_000), BigDecimal.valueOf(28.5),
                    RateType.EA, BigDecimal.ZERO, BigDecimal.valueOf(100_000), 18,
                    LocalDate.now().plusDays(15), null, null, null, null, null,
                    Map.of("creditLimit", 5_000_000, "availableCredit", 6_000_000, "statementDay", 18));

            assertThatThrownBy(() -> validator.validate(request))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("cupo disponible");
        }

        @Test
        void allowsStatementDateAndDueDateSameDayWithoutArtificialDifferenceConstraint() {
            LocalDate sameDay = LocalDate.now().plusDays(10);
            DebtRequest request = new DebtRequest(
                    "MasterCard", "Nu", DebtType.CREDIT_CARD, null,
                    BigDecimal.valueOf(2_000_000), BigDecimal.valueOf(500_000), BigDecimal.valueOf(24),
                    RateType.EA, BigDecimal.ZERO, BigDecimal.valueOf(50_000), sameDay.getDayOfMonth(),
                    sameDay, null, null, null, null, null,
                    Map.of("statementDate", sameDay.toString(), "paymentDueDate", sameDay.toString()));

            assertThatCode(() -> validator.validate(request)).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("HU-025: Préstamo personal / libre inversión")
    class PersonalLoanValidations {

        @Test
        void acceptsValidPersonalLoan() {
            DebtRequest request = new DebtRequest(
                    "Libre Inversión", "Banco de Bogotá", DebtType.PERSONAL_LOAN, null,
                    BigDecimal.valueOf(15_000_000), BigDecimal.valueOf(12_000_000), BigDecimal.valueOf(19.2),
                    RateType.EA, BigDecimal.valueOf(450_000), BigDecimal.valueOf(450_000), 10,
                    LocalDate.now().plusDays(10), LocalDate.now().minusMonths(6), 24, null, null, null,
                    Map.of("totalInstallments", 36, "contractualEndDate", LocalDate.now().plusMonths(24).toString()));

            assertThatCode(() -> validator.validate(request)).doesNotThrowAnyException();
        }

        @Test
        void rejectsBalanceGreaterThanDisbursedAmount() {
            DebtRequest request = new DebtRequest(
                    "Libre Inversión", "Banco de Bogotá", DebtType.PERSONAL_LOAN, null,
                    BigDecimal.valueOf(10_000_000), BigDecimal.valueOf(10_500_000), BigDecimal.valueOf(19.2),
                    RateType.EA, BigDecimal.valueOf(450_000), BigDecimal.valueOf(450_000), 10,
                    LocalDate.now().plusDays(10), LocalDate.now().minusMonths(6), 24, null, null, null, Map.of());

            assertThatThrownBy(() -> validator.validate(request))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("saldo actual");
        }
    }

    @Nested
    @DisplayName("HU-026: Crédito hipotecario / vivienda")
    class MortgageValidations {

        @Test
        void acceptsPesosAndUvrModalities() {
            DebtRequest pesos = new DebtRequest(
                    "Apto 502", "Davivienda", DebtType.MORTGAGE, null,
                    BigDecimal.valueOf(180_000_000), BigDecimal.valueOf(170_000_000), BigDecimal.valueOf(14.5),
                    RateType.EA, BigDecimal.valueOf(1_800_000), BigDecimal.ZERO, 5,
                    LocalDate.now().plusDays(12), null, 180, null, null, null,
                    Map.of("modality", "PESOS", "insuranceAmount", 85_000));

            assertThatCode(() -> validator.validate(pesos)).doesNotThrowAnyException();

            DebtRequest uvr = new DebtRequest(
                    "Casa Chía", "Bancolombia", DebtType.MORTGAGE, null,
                    BigDecimal.valueOf(220_000_000), BigDecimal.valueOf(215_000_000), BigDecimal.valueOf(4.2),
                    RateType.UVR_MARGIN, BigDecimal.valueOf(1_950_000), BigDecimal.ZERO, 15,
                    LocalDate.now().plusDays(15), null, 240, null, null, null,
                    Map.of("modality", "UVR", "referenceIndex", "UVR", "interestMargin", 4.2));

            assertThatCode(() -> validator.validate(uvr)).doesNotThrowAnyException();
        }

        @Test
        void rejectsMissingModality() {
            DebtRequest request = new DebtRequest(
                    "Apto", "Davivienda", DebtType.MORTGAGE, null,
                    BigDecimal.valueOf(100_000_000), BigDecimal.valueOf(95_000_000), BigDecimal.valueOf(12),
                    RateType.EA, BigDecimal.valueOf(1_200_000), BigDecimal.ZERO, 5,
                    LocalDate.now().plusDays(5), null, 120, null, null, null, Map.of());

            assertThatThrownBy(() -> validator.validate(request))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("modalidad");
        }
    }

    @Nested
    @DisplayName("HU-027: Crédito de vehículo")
    class AutoLoanValidations {

        @Test
        void acceptsVehicleLoanWithResidualValue() {
            DebtRequest request = new DebtRequest(
                    "Carro Mazda", "Finandina", DebtType.AUTO_LOAN, null,
                    BigDecimal.valueOf(60_000_000), BigDecimal.valueOf(45_000_000), BigDecimal.valueOf(16.8),
                    RateType.EA, BigDecimal.valueOf(1_100_000), BigDecimal.ZERO, 20,
                    LocalDate.now().plusDays(10), null, 36, null, null, null,
                    Map.of("residualValue", 12_000_000));

            assertThatCode(() -> validator.validate(request)).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("HU-028: Crédito educativo")
    class StudentLoanValidations {

        @Test
        void acceptsStudyStageWithoutPeriodicPayment() {
            DebtRequest request = new DebtRequest(
                    "Icetex Pregrado", "Icetex", DebtType.STUDENT_LOAN, null,
                    BigDecimal.valueOf(30_000_000), BigDecimal.valueOf(30_000_000), BigDecimal.valueOf(11.5),
                    RateType.IPC_MARGIN, BigDecimal.ZERO, BigDecimal.ZERO, null,
                    null, null, null, null, null, null,
                    Map.of("stage", "ESTUDIO", "hasPaymentObligation", false));

            assertThatCode(() -> validator.validate(request)).doesNotThrowAnyException();
        }

        @Test
        void requiresPaymentAndDueDateWhenPaymentExigible() {
            DebtRequest request = new DebtRequest(
                    "Icetex Amortización", "Icetex", DebtType.STUDENT_LOAN, null,
                    BigDecimal.valueOf(30_000_000), BigDecimal.valueOf(25_000_000), BigDecimal.valueOf(11.5),
                    RateType.EA, null, BigDecimal.ZERO, null,
                    null, null, null, null, null, null,
                    Map.of("stage", "AMORTIZACION", "hasPaymentObligation", true));

            assertThatThrownBy(() -> validator.validate(request))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("cuota");
        }
    }

    @Nested
    @DisplayName("HU-029 & HU-030: Crédito comercial y Compra a cuotas")
    class RetailAndInstallmentValidations {

        @Test
        void acceptsRetailCreditWithFixedFinancialCostInsteadOfRate() {
            DebtRequest request = new DebtRequest(
                    "Electrodomésticos", "Alkosto", DebtType.RETAIL_CREDIT, null,
                    BigDecimal.valueOf(2_000_000), BigDecimal.valueOf(1_500_000), BigDecimal.ZERO,
                    RateType.NONE, BigDecimal.valueOf(250_000), BigDecimal.ZERO, 15,
                    LocalDate.now().plusDays(10), null, 6, null, null, null,
                    Map.of("costType", "FEE", "financialCost", 45_000, "totalInstallments", 12));

            assertThatCode(() -> validator.validate(request)).doesNotThrowAnyException();
        }

        @Test
        void acceptsInstallmentPurchaseWithFixedFee() {
            DebtRequest request = new DebtRequest(
                    "Celular Addi", "Addi", DebtType.INSTALLMENT_PURCHASE, null,
                    BigDecimal.valueOf(1_200_000), BigDecimal.valueOf(800_000), BigDecimal.ZERO,
                    RateType.NONE, BigDecimal.valueOf(200_000), BigDecimal.ZERO, 5,
                    LocalDate.now().plusDays(8), null, 4, null, null, null,
                    Map.of("costType", "FIXED_FEE", "fixedFee", 15_000, "totalInstallments", 6));

            assertThatCode(() -> validator.validate(request)).doesNotThrowAnyException();
        }
    }

    @Nested
    @DisplayName("HU-031: Factura u obligación vencida")
    class OverdueBillValidations {

        @Test
        void acceptsOverdueBillWithAgreement() {
            DebtRequest request = new DebtRequest(
                    "Factura gas atrasada", "Vanti", DebtType.OVERDUE_BILL, null,
                    BigDecimal.valueOf(320_000), BigDecimal.valueOf(320_000), BigDecimal.ZERO,
                    RateType.NONE, BigDecimal.ZERO, BigDecimal.ZERO, null,
                    null, null, null, null, null, null,
                    Map.of(
                            "originalDueDate", LocalDate.now().minusDays(45).toString(),
                            "hasPaymentAgreement", true,
                            "agreedPaymentAmount", 80_000,
                            "paymentPeriodicity", "MENSUAL"
                    ));

            assertThatCode(() -> validator.validate(request)).doesNotThrowAnyException();
        }

        @Test
        void rejectsMissingOriginalDueDate() {
            DebtRequest request = new DebtRequest(
                    "Factura luz", "Enel", DebtType.OVERDUE_BILL, null,
                    BigDecimal.valueOf(120_000), BigDecimal.valueOf(120_000), BigDecimal.ZERO,
                    RateType.NONE, BigDecimal.ZERO, BigDecimal.ZERO, null,
                    null, null, null, null, null, null, Map.of());

            assertThatThrownBy(() -> validator.validate(request))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("fecha original de vencimiento");
        }
    }

    @Nested
    @DisplayName("HU-032 & HU-033: Deuda familiar y Otra obligación")
    class FamilyAndOtherValidations {

        @Test
        void acceptsFamilyLoanWithoutInterestAndWithoutInitialAmount() {
            DebtRequest request = new DebtRequest(
                    "Préstamo tío Carlos", "Tío Carlos", DebtType.FAMILY_LOAN, null,
                    null, BigDecimal.valueOf(2_000_000), BigDecimal.ZERO,
                    RateType.NONE, null, null, null,
                    null, null, null, null, null, null, Map.of());

            assertThatCode(() -> validator.validate(request)).doesNotThrowAnyException();
        }

        @Test
        void acceptsOtherObligationMinimalData() {
            DebtRequest request = new DebtRequest(
                    "Deuda acuerdo privado", null, DebtType.OTHER, null,
                    null, BigDecimal.valueOf(1_500_000), BigDecimal.ZERO,
                    RateType.NONE, null, null, null,
                    null, null, null, null, null, null, Map.of());

            assertThatCode(() -> validator.validate(request)).doesNotThrowAnyException();
        }

        @Test
        void requiresInterestRateWhenFamilyLoanHasInterest() {
            DebtRequest request = new DebtRequest(
                    "Préstamo con interés", "Hermano", DebtType.FAMILY_LOAN, null,
                    null, BigDecimal.valueOf(3_000_000), BigDecimal.ZERO,
                    RateType.EA, null, null, null,
                    null, null, null, null, null, null, Map.of());

            assertThatThrownBy(() -> validator.validate(request))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("tasa");
        }
    }
}

