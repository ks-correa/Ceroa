package com.ceroa.service;

import com.ceroa.api.dto.DocumentContracts.*;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import java.util.*;
import static org.assertj.core.api.Assertions.assertThat;

class DocumentMetadataInferenceTest {
    private Metadata empty(){return new Metadata(null,Kind.OTHER,null,null,null,null,null);}
    private Proposal p(String field,String value){return new Proposal(field,value,"evidence checked by service","Página 1");}
    @Test void fillsSearchableFieldsWithoutHumanEntry(){
        var m=DocumentMetadataInference.merge(empty(),List.of(p("identificationType","CC"),p("documentType","BANK_STATEMENT"),p("financialEntity","Banco Prueba"),p("periodStart","2026-09-01"),p("periodEnd","2026-10-01")));
        assertThat(m.identificationType()).isEqualTo(Identification.CC);assertThat(m.documentType()).isEqualTo(Kind.BANK_STATEMENT);assertThat(m.financialEntity()).isEqualTo("Banco Prueba");assertThat(m.periodEnd()).isEqualTo(LocalDate.of(2026,10,1));
    }
    @Test void ignoresInvalidDatesEnumsAndConflictingFields(){
        var m=DocumentMetadataInference.merge(empty(),List.of(p("identificationType","invented"),p("documentType","invented"),p("financialEntity","Uno"),p("financialEntity","Dos"),p("periodStart","2026-09-10"),p("periodEnd","2026-09-01"),p("issuedAt","2026-02-30")));
        assertThat(m).isEqualTo(empty());
    }
    @Test void neverOverwritesCorrectionsOrChangesDebtAssociation(){
        var current=new Metadata(Identification.CE,Kind.PAYMENT_RECEIPT,"Entidad corregida",null,null,null,UUID.randomUUID());
        var m=DocumentMetadataInference.merge(current,List.of(p("identificationType","CC"),p("documentType","BANK_STATEMENT"),p("financialEntity","Otra entidad")));
        assertThat(m).isEqualTo(current);
    }
}
