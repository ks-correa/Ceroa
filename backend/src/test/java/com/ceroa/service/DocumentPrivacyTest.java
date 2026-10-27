package com.ceroa.service;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class DocumentPrivacyTest {
    @Test void minimizesIdentificationAccountsAndEmail(){assertThat(new DocumentPrivacy().redact("CC 12345 cuenta 1234-5678-9012 correo persona@example.com interés 28,7%","12345")).doesNotContain("12345","1234-5678-9012","persona@example.com").contains("28,7%");}
    @Test void invalidPeriodsAreRejected(){assertThatThrownBy(()->new com.ceroa.api.dto.DocumentContracts.Filters(null,null,null,null,java.time.LocalDate.of(2026,11,1),java.time.LocalDate.of(2026,9,1)).validate()).isInstanceOf(IllegalArgumentException.class);}
    @Test void retainsValidDocumentaryDatesWhileMinimizingIdentification(){assertThat(new DocumentPrivacy().redact("Periodo 2026-09-01 a 01/11/2026, CC AB1234567 cuenta 1234567890",null)).contains("2026-09-01","01/11/2026").doesNotContain("AB1234567","1234567890");}
    @Test void keepsFinancialAmountsAndRatesWhileMaskingAccountNumbers(){
        String indexed=new DocumentPrivacy().redact("Cuenta 1234-5678-9012. 23/09/2026 Pago préstamo -$100.000. Intereses 25000. Tasa 28,75%. Saldo cuenta 1234567890. Total COP 1.250.000.",null);
        assertThat(indexed).contains("23/09/2026","-$100.000","Intereses 25000","28,75%","COP 1.250.000");
        assertThat(indexed).doesNotContain("1234-5678-9012","1234567890");
    }
}
