package com.ceroa.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

public final class DocumentFactContracts {
    private DocumentFactContracts() {}
    public enum Kind { BALANCE, MINIMUM_PAYMENT, INSTALLMENT, RATE, CUTOFF_DATE, DUE_DATE, PERIOD_START, PERIOD_END, ENTITY, MOVEMENT }
    public record Fact(UUID id,UUID documentId,int documentVersion,UUID chunkId,Kind kind,String valueType,
        BigDecimal numericValue,LocalDate dateValue,String textValue,String unit,String currency,String rateMode,
        String transactionReference,LocalDate effectiveDate,String validationStatus,String quote,int quoteStart,int quoteEnd,int extractorVersion) {}
    public record Difference(UUID previousDocument,UUID currentDocument,UUID obligationId,Kind kind,String unit,String currency,String rateMode,
        LocalDate previousPeriod,LocalDate currentPeriod,BigDecimal previousValue,BigDecimal currentValue,BigDecimal delta,List<UUID> evidence) {}
    public record MovementTotal(UUID obligationId,List<UUID> documentIds,String entity,String currency,LocalDate periodStart,LocalDate periodEnd,BigDecimal signedSubtotal,int uniqueMovements,List<UUID> evidence,String coverage) {}
    public record Analysis(List<Fact> facts,List<Difference> comparisons,List<MovementTotal> movementTotals,boolean complete,List<String> limitations) {}
}
