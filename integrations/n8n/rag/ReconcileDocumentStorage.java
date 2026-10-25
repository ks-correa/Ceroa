import java.nio.file.*;
import java.sql.*;
import java.net.*;
import java.net.http.*;
import java.time.*;
import java.util.*;
import com.fasterxml.jackson.databind.*;

/** Read-only reconciliation. Never deletes an object or invents a financial retention policy. */
class ReconcileDocumentStorage {
    public static void main(String[] args)throws Exception {
        var env=new HashMap<String,String>();for(String line:Files.readAllLines(Path.of(".env"))){int p=line.indexOf('=');if(p>0&&!line.startsWith("#"))env.put(line.substring(0,p),line.substring(p+1));}
        String schema=env.getOrDefault("DB_SCHEMA","ceroa"),bucket=env.getOrDefault("DOCUMENT_LIBRARY_BUCKET","financial-documents"),url=env.get("DOCUMENT_LIBRARY_STORAGE_URL");
        if(!schema.matches("[a-z_][a-z0-9_]*")||!bucket.matches("[a-z0-9-]+")||!URI.create(url).getHost().equals(env.get("DB_USERNAME").substring(env.get("DB_USERNAME").lastIndexOf('.')+1)+".supabase.co"))throw new IllegalArgumentException();
        var references=new HashSet<String>();
        try(var c=DriverManager.getConnection(env.get("DB_URL"),env.get("DB_USERNAME"),env.get("DB_PASSWORD"));var s=c.createStatement()){
            c.setReadOnly(true);try(var r=s.executeQuery("SELECT storage_path FROM "+schema+".financial_documents UNION SELECT storage_path FROM "+schema+".financial_document_versions")){while(r.next())references.add(r.getString(1));}
        }
        var json=new ObjectMapper();var http=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(5)).build();var objects=new HashSet<String>();var prefixes=new ArrayDeque<String>();prefixes.add("");int folders=0;
        while(!prefixes.isEmpty()){
            String prefix=prefixes.remove();if(++folders>10000)throw new IllegalStateException("Folder limit reached; report incomplete");
            for(int offset=0;;offset+=1000){
                var req=HttpRequest.newBuilder(URI.create(url.replaceAll("/$","")+"/storage/v1/object/list/"+bucket)).timeout(Duration.ofSeconds(30)).header("apikey",env.get("DOCUMENT_LIBRARY_STORAGE_KEY")).header("Authorization","Bearer "+env.get("DOCUMENT_LIBRARY_STORAGE_KEY")).header("Content-Type","application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of("prefix",prefix,"limit",1000,"offset",offset)))).build();
                var response=http.send(req,HttpResponse.BodyHandlers.ofString());if(response.statusCode()!=200||response.body().length()>4_000_000)throw new IllegalStateException("Storage inventory unavailable");var rows=json.readTree(response.body());if(!rows.isArray())throw new IllegalStateException();
                for(var row:rows){String name=row.path("name").asText();if(name.isBlank())throw new IllegalStateException();String path=prefix+name;if(row.path("id").isNull()||row.path("id").isMissingNode())prefixes.add(path+"/");else objects.add(path);if(objects.size()>100000)throw new IllegalStateException("Object limit reached; report incomplete");}
                if(rows.size()<1000)break;
            }
        }
        var orphaned=new TreeSet<>(objects);orphaned.removeAll(references);var missing=new TreeSet<>(references);missing.removeAll(objects);
        var report=Map.of("checkedAt",Instant.now().toString(),"readOnly",true,"referencedOriginals",references.size(),"storedObjects",objects.size(),"unreferencedObjects",orphaned,"missingOriginals",missing,"retentionAction","NONE: review concurrent uploads and approved retention rules before deletion");
        Path output=Path.of("tmp/rag-v21/storage-reconciliation.json");Files.createDirectories(output.getParent());Files.writeString(output,json.writerWithDefaultPrettyPrinter().writeValueAsString(report));
        System.out.println("Storage reconciliation: references="+references.size()+", objects="+objects.size()+", unreferenced="+orphaned.size()+", missing="+missing.size()+". No deletion performed.");
    }
}
