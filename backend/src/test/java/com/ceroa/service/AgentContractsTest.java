package com.ceroa.service;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
class AgentContractsTest {
    @Test void budgetsAreBoundedAndSelectedDocumentsCannotAcquireFinanceTools(){
        var context=AgentContracts.context(UUID.randomUUID(),"compara mis extractos",true);
        assertFalse(context.tools().containsKey(AgentContracts.Role.FINANCIAL));
        assertEquals(AgentContracts.Intent.DOCUMENT_SINGLE,context.intent());
        assertEquals(context.requestId(),context.correlationId());
        assertTrue(AgentContracts.budget(AgentContracts.Intent.DOCUMENT_COMPARISON).maxIterations()>AgentContracts.budget(AgentContracts.Intent.FINANCIAL).maxIterations());
        for(var intent:AgentContracts.Intent.values()){var b=AgentContracts.budget(intent);assertTrue(b.maxIterations()<=12);assertTrue(b.maxToolCalls()<=16);assertTrue(b.maxLibraryCalls()<=6);}
    }
    @Test void traceKeepsUnknownModelMeasurementsUnknownAndDeduplicatesWorkerReports(){
        var trace=new AssistantTrace(UUID.randomUUID());var observation=new AssistantTrace.WorkerObservation("123",25,1,null,2);
        trace.worker(observation);trace.worker(observation);trace.cached();
        var values=trace.snapshot("DOCUMENT_SINGLE");assertNull(values.get("llmCalls"));assertNull(values.get("modelDurationMs"));
        assertEquals(1,((List<?>)values.get("workerObservations")).size());assertEquals(1,values.get("cacheHits"));
        assertThrows(IllegalArgumentException.class,()->trace.worker(new AssistantTrace.WorkerObservation("https://secret.invalid",25,1,null,0)));
    }
}
