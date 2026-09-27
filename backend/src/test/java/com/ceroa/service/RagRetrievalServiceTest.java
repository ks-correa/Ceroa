package com.ceroa.service;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class RagRetrievalServiceTest {
    final RagVectorStore store=mock(RagVectorStore.class);
    final RagEmbeddingClient embeddings=mock(RagEmbeddingClient.class);
    final RagRetrievalService service=new RagRetrievalService(store,embeddings,true);
    RagVectorStore.Publication publication(Double threshold){return new RagVectorStore.Publication("a".repeat(64),RagEmbeddingClient.MODEL,768,threshold);}
    RagVectorStore.Chunk chunk(double score){return new RagVectorStore.Chunk("b".repeat(64),"docs/approved.md","Approved test source","1","c".repeat(64),"Synthetic documentation, no personal data.",score);}
    @Test void emptyCorpusAndUncalibratedCollectionNeverCallProvider()throws Exception{
        assertEquals("empty",service.search("query").status());verifyNoInteractions(embeddings);
        when(store.publication()).thenReturn(publication(null));assertEquals("uncalibrated",service.search("query").status());verifyNoInteractions(embeddings);
    }
    @Test void filtersLowRelevanceUsingPublishedCalibrationAndChecksRevocation()throws Exception{
        when(store.publication()).thenReturn(publication(0.7));when(embeddings.embed("query")).thenReturn("vector");
        when(store.search(any(),eq("vector"))).thenReturn(List.of(chunk(0.8),chunk(0.3)));
        var result=service.search("query");assertEquals(1,result.chunks().size());assertFalse(service.current(result,List.of("b".repeat(64))));
        when(store.stillPublished(result.snapshot(),List.of("b".repeat(64)))).thenReturn(true);assertTrue(service.current(result,List.of("b".repeat(64))));
    }
    @Test void incompatibleModelAndFailedStoreAbstain()throws Exception{
        when(store.publication()).thenReturn(new RagVectorStore.Publication("a".repeat(64),"other",3072,0.7));assertEquals("incompatible",service.search("query").status());verifyNoInteractions(embeddings);
        when(store.publication()).thenThrow(new java.sql.SQLException());assertEquals("unavailable",service.search("query").status());
    }
    @Test void vectorsRequireActualDimensionsFiniteValuesAndNonzeroNorm(){
        assertThrows(IllegalArgumentException.class,()->RagEmbeddingClient.normalized(new double[768]));
        assertThrows(IllegalArgumentException.class,()->RagEmbeddingClient.normalized(new double[1]));
        double[] values=new double[768];values[0]=Double.NaN;assertThrows(IllegalArgumentException.class,()->RagEmbeddingClient.normalized(values));
        values[0]=3;values[1]=4;assertTrue(RagEmbeddingClient.normalized(values).startsWith("[0.6,0.8,"));
    }
}
