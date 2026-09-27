package com.ceroa.config;

import com.ceroa.repository.DebtRepository;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Opt-in only: Flyway creates/migrates the supplied disposable database/schema. */
@EnabledIfEnvironmentVariable(named = "PG_MIGRATION_TEST", matches = "true")
@SpringBootTest(properties = {
    "spring.config.location=file:src/main/resources/application.yml",
    "CEROA_ENV_FILE=optional:file:./target/migration-test-no-env.properties",
    "debug=false",
    "spring.profiles.active=supabase",
    "spring.datasource.url=${PG_TEST_URL}",
    "spring.datasource.username=${PG_TEST_USERNAME}",
    "spring.datasource.password=${PG_TEST_PASSWORD}",
    "spring.datasource.hikari.data-source-properties.sslmode=${PG_TEST_SSLMODE:require}",
    "spring.datasource.hikari.data-source-properties.currentSchema=${PG_TEST_SCHEMA:migration_verification}",
    "spring.jpa.properties.hibernate.default_schema=${PG_TEST_SCHEMA:migration_verification}",
    "spring.flyway.default-schema=${PG_TEST_SCHEMA:migration_verification}",
    "spring.flyway.schemas=${PG_TEST_SCHEMA:migration_verification}",
    "ceroa.recovery.delivery-enabled=false"
})
@AutoConfigureMockMvc
class PostgresMigrationIntegrationTest {
    @Autowired Flyway flyway;
    @Autowired MockMvc mvc;
    @Autowired DebtRepository debts;
    @Autowired PlatformTransactionManager transactionManager;
    @Autowired jakarta.persistence.EntityManager entityManager;
    @Autowired com.ceroa.service.MonthlyHistoryService history;

    @Test void migrationsValidateAndRemainIdempotent() {
        assertThat(flyway.validateWithResult().validationSuccessful).isTrue();
        assertThat(flyway.info().pending()).isEmpty();
        assertThat(flyway.info().current().getVersion().getVersion()).isEqualTo("15");
        assertThat(flyway.migrate().migrationsExecuted).isZero();
    }

    @Test void apiAuthenticatesAndReadsMigratedFinancialData() throws Exception {
        var login = mvc.perform(post("/api/v1/auth/login").with(csrf())
                .contentType("application/json")
                .content("{\"email\":\"demo@ceroa.local\",\"password\":\"Demo123!\"}"))
            .andExpect(status().isOk()).andReturn().getResponse();
        mvc.perform(get("/api/v1/debts").cookie(login.getCookies()))
            .andExpect(status().isOk());
        mvc.perform(get("/api/v1/financial-profile").cookie(login.getCookies()))
            .andExpect(status().isOk());
        mvc.perform(post("/api/v1/auth/logout").cookie(login.getCookies()).with(csrf()))
            .andExpect(status().isNoContent());
    }

    @Test void hibernatePersistsJsonbAndOptimisticVersionInSelectedSchema() {
        new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
            var debt = debts.findById(UUID.fromString("10000000-0000-0000-0000-000000000001")).orElseThrow();
            long version = ((Number) entityManager.createNativeQuery("select version from "
                + flyway.getConfiguration().getDefaultSchema() + ".debts where id = :id")
                .setParameter("id", debt.getId()).getSingleResult()).longValue();
            debt.getDetails().put("migrationVerification", true);
            debts.saveAndFlush(debt);
            long updatedVersion = ((Number) entityManager.createNativeQuery("select version from "
                + flyway.getConfiguration().getDefaultSchema() + ".debts where id = :id")
                .setParameter("id", debt.getId()).getSingleResult()).longValue();
            assertThat(updatedVersion).isGreaterThan(version);
            entityManager.clear();
            assertThat(debts.findById(debt.getId()).orElseThrow().getDetails())
                .containsEntry("migrationVerification", true);
            history.baseline(debt.getUser().getId());
            assertThat(history.rows(debt.getUser().getId(), java.time.Instant.now().plusSeconds(1)))
                .isNotEmpty();
            status.setRollbackOnly();
        });
    }
}
