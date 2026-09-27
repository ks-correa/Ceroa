import java.nio.file.*;
import java.sql.*;
import java.security.SecureRandom;
import java.util.*;

/** Administrative auxiliary-schema provisioning. Never part of financial Flyway. No secret output. */
class SupabaseRagAdmin {
    static final String READER="ceroa_rag_reader",INDEXER="ceroa_rag_indexer";
    public static void main(String[] args) {
        try { provision(); }
        catch(Exception e){System.err.println("RAG provisioning failed ("+e.getClass().getSimpleName()+"). No credentials printed; publication unchanged.");System.exit(1);}
    }
    static void provision() throws Exception {
        Path privateFile=Path.of(".env");String text=Files.readString(privateFile);var env=new HashMap<String,String>();
        for(String line:text.split("\\R")){int i=line.indexOf('=');if(i>0&&!line.startsWith("#"))env.put(line.substring(0,i),line.substring(i+1));}
        Path adminFile=Path.of(".env.rag-admin");
        if(Files.exists(adminFile))for(String line:Files.readAllLines(adminFile)){int i=line.indexOf('=');if(i>0)env.put(line.substring(0,i),line.substring(i+1));}
        String url=env.get("DB_URL"),admin=env.get("DB_USERNAME");
        if(url==null||!url.contains("supabase.com")||admin==null)throw new IllegalArgumentException();
        String readerPassword=savedOrSecret(env,"RAG_DB_PASSWORD"),indexPassword=savedOrSecret(env,"RAG_INDEX_PASSWORD");
        if(!readerPassword.matches("[a-f0-9]{64}")||!indexPassword.matches("[a-f0-9]{64}"))throw new IllegalArgumentException();
        String suffix=admin.contains(".")?admin.substring(admin.indexOf('.')):"";
        String readerUser=READER+suffix,indexUser=INDEXER+suffix;
        String auxiliaryUrl=url.replaceAll("currentSchema=[^&]*","currentSchema=n8n_aux");
        try(var c=DriverManager.getConnection(url,admin,env.get("DB_PASSWORD"));var s=c.createStatement()){
            c.setAutoCommit(false);
            s.execute("CREATE SCHEMA IF NOT EXISTS extensions");
            s.execute("CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions");
            try(var r=s.executeQuery("SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE e.extname='vector'")){if(!r.next()||!r.getString(1).equals("extensions"))throw new IllegalStateException();}
            role(c,s,READER,readerPassword,env.containsKey("RAG_DB_PASSWORD")&&!env.get("RAG_DB_PASSWORD").isBlank());role(c,s,INDEXER,indexPassword,env.containsKey("RAG_INDEX_PASSWORD")&&!env.get("RAG_INDEX_PASSWORD").isBlank());
            s.execute("CREATE SCHEMA IF NOT EXISTS n8n_aux");
            s.execute("REVOKE ALL ON SCHEMA n8n_aux FROM PUBLIC");
            s.execute("CREATE TABLE IF NOT EXISTS n8n_aux.rag_chunks (snapshot text NOT NULL CHECK(snapshot ~ '^[a-f0-9]{64}$'),chunk_id text NOT NULL CHECK(chunk_id ~ '^[a-f0-9]{64}$'),source text NOT NULL,title text NOT NULL CHECK(length(title)<=180),version text NOT NULL,source_hash text NOT NULL CHECK(source_hash ~ '^[a-f0-9]{64}$'),content text NOT NULL CHECK(length(content)<=1200),approved boolean NOT NULL,embedding extensions.vector(768) NOT NULL,PRIMARY KEY(snapshot,chunk_id))");
            s.execute("CREATE TABLE IF NOT EXISTS n8n_aux.rag_publication (singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),snapshot text NOT NULL CHECK(snapshot ~ '^[a-f0-9]{64}$'),model text NOT NULL,dimensions integer NOT NULL CHECK(dimensions=768),min_score double precision CHECK(min_score>=0 AND min_score<=1),published_at timestamptz NOT NULL DEFAULT now())");
            s.execute("REVOKE ALL ON n8n_aux.rag_chunks,n8n_aux.rag_publication FROM PUBLIC,"+READER+","+INDEXER);
            s.execute("GRANT USAGE ON SCHEMA n8n_aux,extensions TO "+READER+","+INDEXER);
            s.execute("GRANT SELECT ON n8n_aux.rag_chunks,n8n_aux.rag_publication TO "+READER);
            s.execute("GRANT SELECT,INSERT,UPDATE,DELETE ON n8n_aux.rag_chunks,n8n_aux.rag_publication TO "+INDEXER);
            for(String role:List.of(READER,INDEXER)){
                try(var p=c.prepareStatement("SELECT has_schema_privilege(?, 'ceroa', 'USAGE') OR has_schema_privilege(?, 'n8n_aux', 'CREATE')")){p.setString(1,role);p.setString(2,role);try(var r=p.executeQuery()){r.next();if(r.getBoolean(1))throw new IllegalStateException();}}
                try(var p=c.prepareStatement("SELECT COUNT(*) FROM pg_class t JOIN pg_namespace n ON t.relnamespace=n.oid WHERE n.nspname='ceroa' AND t.relkind IN ('r','p') AND has_table_privilege(?,t.oid,'SELECT,INSERT,UPDATE,DELETE')")){p.setString(1,role);try(var r=p.executeQuery()){r.next();if(r.getInt(1)!=0)throw new IllegalStateException();}}
            }
            c.commit();
        }
        var updates=new LinkedHashMap<String,String>();updates.put("RAG_ENABLED",env.getOrDefault("RAG_ENABLED","false"));updates.put("RAG_DB_URL",auxiliaryUrl);updates.put("RAG_DB_USERNAME",readerUser);updates.put("RAG_DB_PASSWORD",readerPassword);
        updates.put("RAG_WORKER_KEY",savedOrSecret(env,"RAG_WORKER_KEY"));
        updates.put("RAG_EMBEDDING_WEBHOOK_URL","http://n8n:5678/webhook/ceroa-rag-embedding-v1");
        for(var e:updates.entrySet()){String pattern="(?m)^"+e.getKey()+"=[^\\r\\n]*";if(java.util.regex.Pattern.compile(pattern).matcher(text).find())text=text.replaceAll(pattern,java.util.regex.Matcher.quoteReplacement(e.getKey()+"="+e.getValue()));else text+="\n"+e.getKey()+"="+e.getValue()+"\n";}
        Files.writeString(privateFile,text);
        Files.writeString(adminFile,"RAG_INDEX_USERNAME="+indexUser+"\nRAG_INDEX_PASSWORD="+indexPassword+"\n");
        for(String user:List.of(readerUser,indexUser))try(var c=DriverManager.getConnection(auxiliaryUrl,user,user.equals(readerUser)?readerPassword:indexPassword);var s=c.createStatement()){
            try(var r=s.executeQuery("SELECT COUNT(*) FROM n8n_aux.rag_chunks")){r.next();}
        }
        System.out.println("Auxiliary pgvector schema provisioned in Supabase. Reader/indexer logins verified; no financial access; activation unchanged; no corpus indexed or published.");
    }
    static void role(Connection c,Statement s,String name,String password,boolean hasSavedPassword)throws SQLException{
        try(var p=c.prepareStatement("SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=?)")){p.setString(1,name);try(var r=p.executeQuery()){r.next();if(r.getBoolean(1)){if(!hasSavedPassword)throw new IllegalStateException();return;}}}
        s.execute("CREATE ROLE "+name+" LOGIN NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '"+password+"'");
    }
    static String secret(){byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);return HexFormat.of().formatHex(bytes);}
    static String savedOrSecret(Map<String,String> env,String key){String value=env.get(key);return value==null||value.isBlank()?secret():value;}
}
