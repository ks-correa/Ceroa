package com.ceroa.service;

import com.zaxxer.hikari.*;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.sql.*;
import java.util.*;

/** A separate, restricted Supabase connection; never the financial datasource. */
@Component
public class RagVectorStore {
    public record Publication(String snapshot,String model,int dimensions,Double minScore) {}
    public record Chunk(String chunkId,String source,String title,String version,String sourceHash,String content,double score) {}
    private final boolean enabled;
    private final String url,user,password;
    private volatile HikariDataSource pool;
    public RagVectorStore(@Value("${ceroa.rag.enabled:false}") boolean enabled,
        @Value("${ceroa.rag.db-url:}") String url,@Value("${ceroa.rag.db-username:}") String user,
        @Value("${ceroa.rag.db-password:}") String password) {this.enabled=enabled;this.url=url;this.user=user;this.password=password;}
    private synchronized HikariDataSource pool() {
        if(pool==null){
            if(!enabled||url.isBlank()||user.isBlank()||password.isBlank())throw new IllegalStateException("RAG no configurado");
            var config=new HikariConfig();config.setJdbcUrl(url);config.setUsername(user);config.setPassword(password);
            config.setPoolName("ceroa-rag-reader");config.setReadOnly(true);config.setMaximumPoolSize(2);config.setMinimumIdle(0);
            config.setConnectionTimeout(5000);config.setInitializationFailTimeout(-1);pool=new HikariDataSource(config);
        }
        return pool;
    }
    public Publication publication() throws SQLException {
        try(var c=pool().getConnection();var s=c.prepareStatement("SELECT snapshot,model,dimensions,min_score FROM n8n_aux.rag_publication WHERE singleton=true")){
            s.setQueryTimeout(3);try(var r=s.executeQuery()){if(!r.next())return null;return new Publication(r.getString(1),r.getString(2),r.getInt(3),(Double)r.getObject(4));}
        }
    }
    public List<Chunk> search(Publication publication,String vector) throws SQLException {
        String sql="SELECT chunk_id,source,title,version,source_hash,content,1-(embedding OPERATOR(extensions.<=>) CAST(? AS extensions.vector)) AS score "
            +"FROM n8n_aux.rag_chunks WHERE snapshot=? AND approved=true "
            +"ORDER BY embedding OPERATOR(extensions.<=>) CAST(? AS extensions.vector) LIMIT 4";
        try(var c=pool().getConnection();var s=c.prepareStatement(sql)) {
            s.setString(1,vector);s.setString(2,publication.snapshot());s.setString(3,vector);s.setQueryTimeout(3);
            var result=new ArrayList<Chunk>();try(var r=s.executeQuery()){while(r.next())result.add(new Chunk(r.getString(1),r.getString(2),r.getString(3),r.getString(4),r.getString(5),r.getString(6),r.getDouble(7)));}
            return List.copyOf(result);
        }
    }
    public boolean stillPublished(String snapshot,Collection<String> ids) throws SQLException {
        if(ids.isEmpty())return true;
        String placeholders=String.join(",",Collections.nCopies(ids.size(),"?"));
        String sql="SELECT COUNT(*) FROM n8n_aux.rag_chunks c JOIN n8n_aux.rag_publication p ON p.snapshot=c.snapshot AND p.singleton=true "
            +"WHERE c.snapshot=? AND c.approved=true AND c.chunk_id IN ("+placeholders+")";
        try(var c=pool().getConnection();var s=c.prepareStatement(sql)){
            s.setString(1,snapshot);int i=2;for(String id:ids)s.setString(i++,id);s.setQueryTimeout(3);
            try(var r=s.executeQuery()){r.next();return r.getInt(1)==ids.size();}
        }
    }
    @PreDestroy public void close(){if(pool!=null)pool.close();}
}
