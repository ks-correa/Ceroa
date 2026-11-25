package com.ceroa.service;

import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import org.springframework.web.server.ResponseStatusException;

class AgentRuntimeTest {
    @Test void financialBudgetIncludesFinalAnswerAndReportsExhaustionAccurately(){
        var budget=AgentContracts.budget(AgentContracts.Intent.FINANCIAL);
        var roles=Set.of(AgentContracts.Role.FINANCIAL);
        var runtime=new AgentRuntime(UUID.randomUUID(),budget,List.of(),AssistantProviderGate.reservation(budget,roles),1);
        var grant=runtime.begin(AgentContracts.Role.FINANCIAL,new AgentRuntime.Task("Analizar cuotas",List.of()),false);
        assertEquals(6,grant.maxIterations());
        var result=runtime.fail(runtime.scope(grant.scopeToken()),"ITERATION_LIMIT");
        assertEquals("ITERATION_LIMIT",result.errorCode());assertTrue(runtime.iterationLimitReached());
        assertEquals("FAILED",runtime.functionalStatus(roles));
    }
    @Test void failuresCannotBeReportedAsFunctionalSuccess(){var r=runtime();var g=r.begin(AgentContracts.Role.SUPPORT,new AgentRuntime.Task("Ayuda",List.of()),false);r.fail(r.scope(g.scopeToken()),"PARSER_ERROR");assertTrue(r.noUsableResult());assertEquals("FAILED",r.functionalStatus(Set.of(AgentContracts.Role.SUPPORT)));assertThrows(IllegalArgumentException.class,()->runtime().fail(new AgentRuntime.Scope(AgentContracts.Role.SUPPORT,"Ayuda",3,List.of()),"private prompt"));}
    AgentRuntime runtime(){return new AgentRuntime(UUID.randomUUID(),AgentContracts.budget(AgentContracts.Intent.COMPOSITE),List.of("f1"));}
    AgentRuntime.Result result(AgentContracts.Role role,String coverage,List<String> refs){return new AgentRuntime.Result("1.1",role,"OK","Evidencia {{f1}}",refs,List.of(),coverage,List.of(),false);}
    @Test void rolesCannotEscalateToolsOrDelegate(){
        var r=runtime();var g=r.begin(AgentContracts.Role.SUPPORT,new AgentRuntime.Task("Ayuda",List.of()),false);var s=r.scope(g.scopeToken());
        r.authorize(s,"knowledge.approved");assertThrows(ResponseStatusException.class,()->r.authorize(s,"finance.read"));assertThrows(ResponseStatusException.class,()->r.authorize(s,"delegate.financial"));
        assertThrows(ResponseStatusException.class,()->r.begin(AgentContracts.Role.ORCHESTRATOR,new AgentRuntime.Task("Ciclo",List.of()),false));
    }
    @Test void selectedDocumentCannotReadOtherCapabilities(){
        var r=runtime();assertThrows(ResponseStatusException.class,()->r.begin(AgentContracts.Role.FINANCIAL,new AgentRuntime.Task("Finanzas",List.of()),true));
        assertNotNull(r.begin(AgentContracts.Role.RAG,new AgentRuntime.Task("Archivo",List.of()),true));
    }
    @Test void resultsAreCachedOnlyAfterValidationAndDoNotRunTwice(){
        var r=runtime();var task=new AgentRuntime.Task("Saldo",List.of("f1"));var g=r.begin(AgentContracts.Role.FINANCIAL,task,false);
        assertThrows(ResponseStatusException.class,()->r.begin(AgentContracts.Role.FINANCIAL,task,false));
        r.complete(r.scope(g.scopeToken()),result(AgentContracts.Role.FINANCIAL,"COMPLETE",List.of("f1")));
        var hit=r.begin(AgentContracts.Role.FINANCIAL,task,false);assertNotNull(hit.cached());assertEquals(g.scopeToken(),hit.scopeToken());assertEquals(1,r.metrics().get("delegations"));
    }
    @Test void unknownEvidenceAndCrossRequestTokensAreRejected(){
        var r=runtime();assertThrows(ResponseStatusException.class,()->r.begin(AgentContracts.Role.RAG,new AgentRuntime.Task("Datos",List.of("f999")),false));
        var g=r.begin(AgentContracts.Role.FINANCIAL,new AgentRuntime.Task("Saldo",List.of()),false);
        assertThrows(ResponseStatusException.class,()->runtime().scope(g.scopeToken()));
        assertThrows(ResponseStatusException.class,()->r.complete(r.scope(g.scopeToken()),result(AgentContracts.Role.FINANCIAL,"COMPLETE",List.of("f999"))));
    }
    @Test void partialCoverageCannotBecomeComplete(){var r=runtime();var g=r.begin(AgentContracts.Role.RAG,new AgentRuntime.Task("Archivo",List.of()),false);var s=r.scope(g.scopeToken());s.partial=true;assertThrows(IllegalArgumentException.class,()->r.complete(s,result(AgentContracts.Role.RAG,"COMPLETE",List.of("f1"))));}
    @Test void globalDelegationsAndToolCallsAreBounded(){
        var r=runtime();var g=r.begin(AgentContracts.Role.RAG,new AgentRuntime.Task("Una",List.of()),false);var s=r.scope(g.scopeToken());for(int i=0;i<8;i++)r.authorize(s,"documents.retrieve");assertThrows(ResponseStatusException.class,()->r.authorize(s,"documents.retrieve"));
        for(int i=0;i<3;i++)r.begin(AgentContracts.Role.RAG,new AgentRuntime.Task("Otra "+i,List.of()),false);
        assertThrows(ResponseStatusException.class,()->r.begin(AgentContracts.Role.RAG,new AgentRuntime.Task("Quinta",List.of()),false));
    }
    @Test void safeFailureIsReusableAndDoesNotShareUnreturnedEvidence(){var r=runtime();var task=new AgentRuntime.Task("Archivo",List.of());var g=r.begin(AgentContracts.Role.RAG,task,false);var s=r.scope(g.scopeToken());s.issued.add("f2");r.fail(s);assertEquals("FAILED",r.begin(AgentContracts.Role.RAG,task,false).cached().status());assertThrows(ResponseStatusException.class,()->r.validateShared("{{f2}}",List.of()));}
    @Test void advisoryCannotClaimCalendarWrites(){var r=runtime();var g=r.begin(AgentContracts.Role.SUPPORT,new AgentRuntime.Task("Asesoría",List.of()),false);assertThrows(IllegalArgumentException.class,()->r.complete(r.scope(g.scopeToken()),new AgentRuntime.Result("1.1",AgentContracts.Role.SUPPORT,"OK","Cita confirmada",List.of(),List.of(),"NONE",List.of(),true)));}
    @Test void supportCannotReceivePrivateFinancialReferences(){assertThrows(ResponseStatusException.class,()->runtime().begin(AgentContracts.Role.SUPPORT,new AgentRuntime.Task("Ayuda",List.of("f1")),false));}
    @Test void partialReferencesRetainCoverageAcrossDelegations(){var r=runtime();var g=r.begin(AgentContracts.Role.RAG,new AgentRuntime.Task("Recuperar",List.of()),false);r.complete(r.scope(g.scopeToken()),result(AgentContracts.Role.RAG,"PARTIAL",List.of("f1")));var next=r.begin(AgentContracts.Role.FINANCIAL,new AgentRuntime.Task("Interpretar",List.of("f1")),false);assertThrows(IllegalArgumentException.class,()->r.complete(r.scope(next.scopeToken()),result(AgentContracts.Role.FINANCIAL,"COMPLETE",List.of("f1"))));}
    @Test void contextBudgetIsSharedAcrossSpecialists(){var r=runtime();var g=r.begin(AgentContracts.Role.RAG,new AgentRuntime.Task("Recuperar",List.of()),false);r.delivered(r.scope(g.scopeToken()),80000);var next=r.begin(AgentContracts.Role.FINANCIAL,new AgentRuntime.Task("Interpretar",List.of()),false);assertThrows(ResponseStatusException.class,()->r.delivered(r.scope(next.scopeToken()),10001));}
    @Test void metricsDoNotInventProviderCallsOrIterations(){var r=runtime();var g=r.begin(AgentContracts.Role.FINANCIAL,new AgentRuntime.Task("Leer",List.of()),false);r.authorize(r.scope(g.scopeToken()),"finance.read");var agents=(List<?>)r.metrics().get("agents");var values=(Map<?,?>)agents.getFirst();assertNull(values.get("llmCalls"));assertNull(values.get("iterations"));assertNull(values.get("providerRetries"));}
    @Test void threeSpecialistCompositeRuntimeStaysWithinReservedFifteenCallBudget(){
        var roles=Set.of(AgentContracts.Role.FINANCIAL,AgentContracts.Role.RAG,AgentContracts.Role.SUPPORT);
        var budget=AgentContracts.budget(AgentContracts.Intent.COMPOSITE);
        int reservation=AssistantProviderGate.reservation(budget,roles);
        assertEquals(15,reservation);
        var r=new AgentRuntime(UUID.randomUUID(),budget,List.of("f1"),reservation,roles.size());
        var gRag=r.begin(AgentContracts.Role.RAG,new AgentRuntime.Task("Extracto",List.of("f1")),false);
        var gFin=r.begin(AgentContracts.Role.FINANCIAL,new AgentRuntime.Task("Obligaciones",List.of("f1")),false);
        var gSup=r.begin(AgentContracts.Role.SUPPORT,new AgentRuntime.Task("Pagos",List.of()),false);
        assertEquals(3,gRag.maxIterations());
        assertEquals(3,gFin.maxIterations());
        assertEquals(3,gSup.maxIterations());
        assertEquals(15,r.metrics().get("reservedIterations"));
        assertThrows(ResponseStatusException.class,()->r.begin(AgentContracts.Role.RAG,new AgentRuntime.Task("Extra",List.of("f1")),false));
    }
}
