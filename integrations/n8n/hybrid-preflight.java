import java.nio.file.*;
import java.sql.*;
import java.util.*;

/** Read-only deployment preflight. Reports no credentials, identifiers or financial values. */
class HybridPreflight {
    public static void main(String[] args)throws Exception {
        var env=new HashMap<String,String>();
        for(String line:Files.readAllLines(Path.of(".env"))){int i=line.indexOf('=');if(i>0&&!line.startsWith("#"))env.put(line.substring(0,i),line.substring(i+1));}
        String schema=env.getOrDefault("DB_SCHEMA","ceroa");if(!schema.matches("[a-z_][a-z0-9_]*"))throw new IllegalArgumentException();
        try(var c=DriverManager.getConnection(env.get("DB_URL"),env.get("DB_USERNAME"),env.get("DB_PASSWORD"));var s=c.createStatement()) {
            c.setReadOnly(true);
            try(var r=s.executeQuery("SHOW server_version")){r.next();System.out.println("postgres_version="+r.getString(1));}
            try(var r=s.executeQuery("SELECT extnamespace::regnamespace::text FROM pg_extension WHERE extname='vector'")){System.out.println("vector_schema="+(r.next()?r.getString(1):"MISSING"));}
            try(var r=s.executeQuery("SELECT version FROM "+schema+".flyway_schema_history WHERE success=true ORDER BY installed_rank DESC LIMIT 1")){r.next();System.out.println("migration_version="+r.getString(1));}
            for(String table:List.of("financial_documents","document_chunks","document_processing_jobs","rag_query_audit")){
                try(var p=c.prepareStatement("SELECT to_regclass(?) IS NOT NULL")){p.setString(1,schema+"."+table);try(var r=p.executeQuery()){r.next();System.out.println(table+"_exists="+r.getBoolean(1));}}
            }
            try(var r=s.executeQuery("SELECT count(*) FROM storage.buckets WHERE id='financial-documents' AND public=false")){r.next();System.out.println("private_bucket_exists="+(r.getInt(1)==1));}
            try(var p=c.prepareStatement("SELECT count(*) FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname=? AND t.relname IN ('financial_documents','document_chunks','document_processing_jobs','rag_query_audit','document_access_grants','document_source_connectors') AND t.relrowsecurity")){p.setString(1,schema);try(var r=p.executeQuery()){r.next();System.out.println("document_tables_with_rls="+r.getInt(1));}}
            try(var r=s.executeQuery("SELECT count(*) FROM "+schema+".users WHERE email LIKE 'hybrid-test-%@example.invalid'")){r.next();System.out.println("temporary_test_accounts_remaining="+r.getInt(1));}
            for(String role:List.of("anon","authenticated","ceroa_rag_reader","ceroa_rag_indexer")){
                try(var p=c.prepareStatement("SELECT count(*) FROM pg_policies WHERE schemaname=? AND tablename IN ('financial_documents','document_chunks') AND (roles @> ARRAY[?]::name[] OR roles @> ARRAY['public']::name[])")){p.setString(1,schema);p.setString(2,role);try(var r=p.executeQuery()){r.next();System.out.println(role+"_document_policies="+r.getInt(1));}}
            }
        }catch(SQLException e){System.err.println("preflight_sqlstate="+e.getSQLState());System.exit(1);}
    }
}
