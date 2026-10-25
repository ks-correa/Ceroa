package com.ceroa.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.*;
import java.util.*;

public final class DocumentContracts {
    private DocumentContracts() {}
    public enum Intent { METADATA_SEARCH, STRUCTURED_QUERY, SEMANTIC_SEARCH, HYBRID_SEARCH, COMBINED_QUERY }
    public enum Identification { CC, CE, TI, NIT, PASSPORT, OTHER }
    public enum Kind { BANK_STATEMENT, PAYMENT_RECEIPT, LOAN_AGREEMENT, OTHER }
    public record Metadata(Identification identificationType, @NotNull Kind documentType,
        @Size(max=160) String financialEntity, LocalDate periodStart, LocalDate periodEnd,
        LocalDate issuedAt, UUID debtId) {
        public void validate() {
            if (periodStart != null && periodEnd != null && !periodEnd.isAfter(periodStart))
                throw new IllegalArgumentException("El fin del periodo debe ser exclusivo y posterior al inicio");
        }
    }
    // ownerId is a requested filter, never an identity. A grant is still required by the repository.
    public record Filters(UUID ownerId, Identification identificationType, Kind documentType,
        @Size(max=160) String financialEntity, LocalDate periodFrom, LocalDate periodToExclusive) {
        public void validate() {
            if ((periodFrom == null) != (periodToExclusive == null) || periodFrom != null && !periodToExclusive.isAfter(periodFrom))
                throw new IllegalArgumentException("Selecciona un intervalo completo");
        }
        public static Filters empty() { return new Filters(null,null,null,null,null,null); }
    }
    public record Query(@NotNull Intent intent, @Size(max=2000) String question,
        @Valid Filters filters, @Min(0) @Max(10000) int offset, @Min(1) @Max(50) int limit) {}
    public record Document(UUID id, UUID ownerId, String identificationType, String documentType,
        String financialEntity, LocalDate periodStart, LocalDate periodEnd, LocalDate issuedAt,
        String status, int version, OffsetDateTime uploadedAt) {}
    public record Source(UUID documentId, UUID chunkId, Integer page, String location,
        String content, double score, int documentVersion) {}
    public record Result(String generatedText, Object verifiedData, Filters appliedFilters,
        List<Source> sources, List<Document> documents, String evidenceStatus, UUID traceId, long elapsedMs) {}
    public record Job(UUID id, UUID documentId, int version, String status, int attempts, String errorCode) {}
    public record Version(int version, String contentType, OffsetDateTime archivedAt, boolean current) {}
    public record Part(@NotBlank @Size(max=2000) String text, @Size(max=200) String location, @Min(1) Integer page) {}
    public record Work(UUID jobId, UUID documentId, int version, int attempt, String model, List<Part> chunks, Metadata metadata) {}
    public record Vector(@Min(0) int order, @NotNull @Size(min=768,max=768) List<@NotNull Double> values) {}
    public record Proposal(@NotBlank String field, @NotBlank @Size(max=160) String value,
        @NotBlank @Size(max=500) String quote, @NotBlank @Size(max=200) String location) {}
    public record Completion(@Min(1) int attempt, @NotBlank String model, @NotNull @Size(min=1,max=120) List<@Valid Vector> vectors,
        @Size(max=7) List<@Valid Proposal> proposals) {}
}
