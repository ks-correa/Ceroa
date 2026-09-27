import java.nio.file.*;import java.sql.*;import java.util.*;import java.security.MessageDigest;import com.fasterxml.jackson.databind.*;
/** Publish a fully indexed, approved snapshot only after its recorded calibration passes. */
class PublishRag {
    public static void main(String[]args){try{publish();}catch(Exception e){System.err.println("RAG publication failed ("+e.getClass().getSimpleName()+"); no credential output.");System.exit(1);}}
    static void publish()throws Exception{
        var json=new ObjectMapper();var chunks=json.readTree(Files.readString(Path.of("tmp/rag/approved-chunks.json")));String snapshot=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(chunks)));
        var manifest=json.readTree(Files.readString(Path.of("integrations/n8n/rag/sources.json")));var approved=new HashMap<String,List<String>>();
        for(var source:manifest.path("sources")){
            Path file=Path.of(source.path("path").asText()).toAbsolutePath().normalize();
            if(!source.path("approved").asBoolean()||source.path("approvedBy").asText().isBlank()||!file.startsWith(Path.of("").toAbsolutePath()))throw new IllegalArgumentException();
            String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(Files.readAllBytes(file)));
            if(!hash.equals(source.path("sha256").asText()))throw new IllegalArgumentException();approved.put(source.path("path").asText(),List.of(hash,source.path("title").asText(),source.path("version").asText()));
        }
        if(approved.isEmpty())throw new IllegalArgumentException();
        for(var chunk:chunks){var m=chunk.path("metadata");if(!List.of(m.path("sourceHash").asText(),m.path("title").asText(),m.path("version").asText()).equals(approved.get(m.path("source").asText())))throw new IllegalArgumentException();}
        var report=json.readTree(Files.readString(Path.of("integrations/n8n/rag/calibration.json")));
        if(!report.path("ready").asBoolean()||!snapshot.equals(report.path("snapshot").asText())||!report.path("model").asText().equals("gemini-embedding-001")||report.path("dimensions").asInt()!=768||report.path("cases").size()<12)throw new IllegalArgumentException();
        double threshold=report.path("threshold").asDouble();if(!Double.isFinite(threshold)||threshold<0||threshold>1)throw new IllegalArgumentException();
        for(var test:report.path("cases")){boolean positive=test.path("positive").asBoolean();double score=test.path(positive?"expectedSourceScore":"score").asDouble();if(positive?score<threshold:score>=threshold)throw new IllegalArgumentException();}
        var env=new HashMap<String,String>();for(String envFile:List.of(".env",".env.rag-admin"))for(String line:Files.readAllLines(Path.of(envFile))){int i=line.indexOf('=');if(i>0)env.put(line.substring(0,i),line.substring(i+1));}
        try(var c=DriverManager.getConnection(env.get("RAG_DB_URL"),env.get("RAG_INDEX_USERNAME"),env.get("RAG_INDEX_PASSWORD"))){c.setAutoCommit(false);
            try(var p=c.prepareStatement("SELECT chunk_id,source_hash,content,source,title,version FROM n8n_aux.rag_chunks WHERE snapshot=? AND approved=true FOR SHARE")){p.setString(1,snapshot);try(var r=p.executeQuery()){var actual=new HashMap<String,List<String>>();while(r.next())actual.put(r.getString(1),List.of(r.getString(2),r.getString(3),r.getString(4),r.getString(5),r.getString(6)));if(actual.size()!=chunks.size())throw new IllegalStateException();for(var chunk:chunks){var m=chunk.path("metadata");if(!List.of(m.path("sourceHash").asText(),chunk.path("pageContent").asText(),m.path("source").asText(),m.path("title").asText(),m.path("version").asText()).equals(actual.get(m.path("chunkId").asText())))throw new IllegalStateException();}}}
            try(var p=c.prepareStatement("INSERT INTO n8n_aux.rag_publication(singleton,snapshot,model,dimensions,min_score) VALUES(true,?,'gemini-embedding-001',768,?) ON CONFLICT(singleton) DO UPDATE SET snapshot=excluded.snapshot,model=excluded.model,dimensions=excluded.dimensions,min_score=excluded.min_score,published_at=now()")){p.setString(1,snapshot);p.setDouble(2,threshold);p.executeUpdate();}c.commit();
        }
        System.out.println("Approved calibrated snapshot published: "+chunks.size()+" chunks. No financial writes.");
    }
}
