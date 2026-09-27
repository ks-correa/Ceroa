import java.nio.file.*;import java.sql.*;import java.util.*;
/** Administrative immediate revocation, including publication, without touching financial data. */
class RevokeRagSource {
    public static void main(String[]args)throws Exception{
        if(args.length!=1||!args[0].startsWith("docs/")||args[0].contains(".."))throw new IllegalArgumentException("Provide a source path, not a URL");
        var env=new HashMap<String,String>();for(String envFile:List.of(".env",".env.rag-admin"))for(String line:Files.readAllLines(Path.of(envFile))){int i=line.indexOf('=');if(i>0)env.put(line.substring(0,i),line.substring(i+1));}
        try(var c=DriverManager.getConnection(env.get("RAG_DB_URL"),env.get("RAG_INDEX_USERNAME"),env.get("RAG_INDEX_PASSWORD"))){c.setAutoCommit(false);
            try(var p=c.prepareStatement("DELETE FROM n8n_aux.rag_publication WHERE snapshot IN (SELECT snapshot FROM n8n_aux.rag_chunks WHERE source=?)")){p.setString(1,args[0]);p.executeUpdate();}
            try(var p=c.prepareStatement("UPDATE n8n_aux.rag_chunks SET approved=false WHERE source=?")){p.setString(1,args[0]);p.executeUpdate();}c.commit();
        }
        System.out.println("Source revoked and affected snapshots unpublished. Remove its approval from sources.json before rebuilding and recalibrating. No financial writes.");
    }
}
