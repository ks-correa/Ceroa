import java.nio.file.*;
import java.sql.*;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Removes only the explicitly journaled temporary verification identity, after its documents were deleted. */
class HybridCleanTest {
    public static void main(String[] args)throws Exception {
        Path journal=args.length==0?Path.of("tmp/hybrid-activation/test-identity.json"):Path.of(args[0]);
        if(!journal.toAbsolutePath().normalize().startsWith(Path.of("tmp").toAbsolutePath().normalize()))throw new IllegalArgumentException("Local test journal required");
        var json=new ObjectMapper();var test=json.readTree(Files.readString(journal));
        if(!test.path("email").asText().matches("hybrid-test-[a-f0-9-]{36}@example\\.invalid"))throw new IllegalArgumentException("Synthetic identity required");
        UUID id=UUID.fromString(test.path("id").asText());var env=new HashMap<String,String>();
        for(String line:Files.readAllLines(Path.of(".env"))){int p=line.indexOf('=');if(p>0&&!line.startsWith("#"))env.put(line.substring(0,p),line.substring(p+1));}
        String schema=env.getOrDefault("DB_SCHEMA","ceroa");if(!schema.matches("[a-z_][a-z0-9_]*"))throw new IllegalArgumentException();
        try(var c=DriverManager.getConnection(env.get("DB_URL"),env.get("DB_USERNAME"),env.get("DB_PASSWORD"))) {
            c.setAutoCommit(false);
            try(var s=c.createStatement()){s.execute("SET search_path TO "+schema);}
            if(!test.path("documentDeleted").asBoolean()) {
                try(var p=c.prepareStatement("SELECT storage_path FROM financial_documents WHERE id=? AND owner_id=? AND processing_status='DELETING'")) {
                    p.setObject(1,UUID.fromString(test.path("documentId").asText()));p.setObject(2,id);
                    try(var r=p.executeQuery()) {
                        if(!r.next())throw new IllegalStateException("Expected synthetic tombstone missing");String path=r.getString(1);
                        var req=java.net.http.HttpRequest.newBuilder(java.net.URI.create(env.get("DOCUMENT_LIBRARY_STORAGE_URL")+"/storage/v1/object/authenticated/financial-documents/"+path+"?verification="+UUID.randomUUID()))
                            .header("apikey",env.get("DOCUMENT_LIBRARY_STORAGE_KEY")).header("Authorization","Bearer "+env.get("DOCUMENT_LIBRARY_STORAGE_KEY")).GET().build();
                        var response=java.net.http.HttpClient.newBuilder().version(java.net.http.HttpClient.Version.HTTP_1_1).build().send(req,java.net.http.HttpResponse.BodyHandlers.ofString());
                        if(response.statusCode()!=404 && !(response.statusCode()==400&&json.readTree(response.body()).path("statusCode").asText().equals("404")))throw new IllegalStateException("Original still present; refusing cleanup");
                    }
                }
                try(var p=c.prepareStatement("DELETE FROM financial_documents WHERE id=? AND owner_id=? AND processing_status='DELETING'")){p.setObject(1,UUID.fromString(test.path("documentId").asText()));p.setObject(2,id);p.executeUpdate();}
            }
            try(var p=c.prepareStatement("SELECT count(*) FROM financial_documents WHERE owner_id=?")){p.setObject(1,id);try(var r=p.executeQuery()){r.next();if(r.getInt(1)!=0)throw new IllegalStateException("Documents remain");}}
            for(String table:List.of("debts","financial_profiles")){try(var p=c.prepareStatement("SELECT count(*) FROM "+table+" WHERE user_id=?")){p.setObject(1,id);try(var r=p.executeQuery()){r.next();if(r.getInt(1)!=0)throw new IllegalStateException("Financial records present; refusing deletion");}}}
            try(var p=c.prepareStatement("DELETE FROM rag_query_audit WHERE actor_id=?")){p.setObject(1,id);p.executeUpdate();}
            try(var p=c.prepareStatement("DELETE FROM users WHERE id=? AND email=?")){p.setObject(1,id);p.setString(2,test.path("email").asText());if(p.executeUpdate()!=1)throw new IllegalStateException("Synthetic user mismatch");}
            try(var p=c.prepareStatement("DELETE FROM telegram_receipts WHERE id=?")){for(var receipt:test.path("receipts")){long value=receipt.asLong();if(value<1_000_000_000_000_000L)throw new IllegalArgumentException();p.setLong(1,value);p.executeUpdate();}}
            c.commit();System.out.println("Temporary synthetic identity, its audit rows, sessions and synthetic Telegram receipts removed; no financial records affected.");
        }
    }
}
