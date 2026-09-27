import java.nio.file.*;
import java.sql.*;
import java.util.*;
import java.security.MessageDigest;
import com.fasterxml.jackson.databind.*;

class CalibrateRag {
    public static void main(String[]args)throws Exception{
        var json=new ObjectMapper();var env=new HashMap<String,String>();for(String line:Files.readAllLines(Path.of(".env"))){int i=line.indexOf('=');if(i>0)env.put(line.substring(0,i),line.substring(i+1));}
        byte[] bytes=Files.readAllBytes(Path.of("tmp/rag/approved-chunks.json"));var chunks=json.readTree(bytes);
        // Same canonical JSON serialization as build-rag-workflows.mjs.
        String snapshot=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(chunks)));
        var inputs=json.readTree(Files.readString(Path.of(args[0])));var report=json.createObjectNode();report.put("snapshot",snapshot);report.put("model","gemini-embedding-001");report.put("dimensions",768);var results=report.putArray("cases");double maxNegative=0,minRequired=1;
        try(var c=DriverManager.getConnection(env.get("RAG_DB_URL"),env.get("RAG_DB_USERNAME"),env.get("RAG_DB_PASSWORD"))){
            c.setReadOnly(true);
            try(var s=c.prepareStatement("SELECT COUNT(*) FROM n8n_aux.rag_chunks WHERE snapshot=? AND approved=true")){s.setString(1,snapshot);try(var r=s.executeQuery()){r.next();if(r.getInt(1)!=chunks.size())throw new IllegalStateException("Incomplete index");}}
            for(int i=0;i<inputs.size();i++){
                var input=inputs.get(i);String vector=input.path("vector").toString();double score=-1,expectedScore=-1;String source="";
                try(var s=c.prepareStatement("SELECT source,1-(embedding OPERATOR(extensions.<=>) CAST(? AS extensions.vector)) AS score FROM n8n_aux.rag_chunks WHERE snapshot=? AND approved=true ORDER BY embedding OPERATOR(extensions.<=>) CAST(? AS extensions.vector) LIMIT 4")){
                    s.setString(1,vector);s.setString(2,snapshot);s.setString(3,vector);try(var r=s.executeQuery()){while(r.next()){if(score<0){source=r.getString(1);score=r.getDouble(2);}if(r.getString(1).equals(input.path("source").asText()))expectedScore=Math.max(expectedScore,r.getDouble(2));}}
                }
                boolean positive=input.path("positive").asBoolean();var result=results.addObject();result.put("question",input.path("question").asText());result.put("positive",positive);result.put("source",source);result.put("score",score);result.put("expectedSource",input.path("source").asText());
                if(!positive)maxNegative=Math.max(maxNegative,score);
                if(positive){minRequired=Math.min(minRequired,expectedScore);result.put("expectedSourceScore",expectedScore);}
            }
        }
        double threshold=maxNegative+0.01;report.put("threshold",threshold);report.put("maxNegative",maxNegative);report.put("minRequiredPositive",minRequired);report.put("ready",threshold<=minRequired&&threshold<=1);
        for(var result:results)((com.fasterxml.jackson.databind.node.ObjectNode)result).put("accepted",(result.path("positive").asBoolean()?result.path("expectedSourceScore"):result.path("score")).asDouble()>=threshold);
        Files.writeString(Path.of("integrations/n8n/rag/calibration.json"),json.writerWithDefaultPrettyPrinter().writeValueAsString(report)+"\n");
        System.out.println("Calibration: "+results.size()+" cases; threshold="+threshold+"; required positive minimum="+minRequired+"; ready="+report.path("ready").asBoolean());
        if(!report.path("ready").asBoolean())System.exit(1);
    }
}
