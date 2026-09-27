package com.ceroa.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class RagRetrievalService {
    public static final String ABSTENTION="No tengo información aprobada suficiente para responder esa pregunta.";
    public record Retrieval(String status,String snapshot,List<RagVectorStore.Chunk> chunks) {}
    private final RagVectorStore store;
    private final RagEmbeddingClient embeddings;
    private final boolean enabled;
    public RagRetrievalService(RagVectorStore store,RagEmbeddingClient embeddings,@Value("${ceroa.rag.enabled:false}") boolean enabled){this.store=store;this.embeddings=embeddings;this.enabled=enabled;}
    public boolean enabled(){return enabled;}
    public Retrieval search(String question) {
        if(!enabled)return empty("disabled");
        try {
            var publication=store.publication();if(publication==null)return empty("empty");
            if(!RagEmbeddingClient.MODEL.equals(publication.model())||publication.dimensions()!=RagEmbeddingClient.DIMENSIONS)return empty("incompatible");
            if(publication.minScore()==null||!Double.isFinite(publication.minScore())||publication.minScore()<0||publication.minScore()>1)return empty("uncalibrated");
            String vector=embeddings.embed(question);
            var chunks=store.search(publication,vector).stream().filter(c->Double.isFinite(c.score())&&c.score()>=publication.minScore())
                .filter(c->c.chunkId().matches("[a-f0-9]{64}")&&c.sourceHash().matches("[a-f0-9]{64}")&&c.content().length()<=1200&&c.title().length()<=180)
                .toList();
            return new Retrieval(chunks.isEmpty()?"irrelevant":"ok",publication.snapshot(),chunks);
        }catch(InterruptedException e){Thread.currentThread().interrupt();return empty("unavailable");}
        catch(Exception e){return empty("unavailable");}
    }
    public boolean current(Retrieval result,Collection<String> ids){try{return result!=null&&result.snapshot()!=null&&store.stillPublished(result.snapshot(),ids);}catch(Exception e){return false;}}
    private Retrieval empty(String status){return new Retrieval(status,null,List.of());}
}
