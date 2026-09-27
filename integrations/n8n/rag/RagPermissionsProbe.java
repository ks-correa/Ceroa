import java.nio.file.*;import java.sql.*;import java.util.*;
class RagPermissionsProbe {
    public static void main(String[]args)throws Exception{
        var env=new HashMap<String,String>();for(String envFile:List.of(".env",".env.rag-admin"))for(String line:Files.readAllLines(Path.of(envFile))){int i=line.indexOf('=');if(i>0)env.put(line.substring(0,i),line.substring(i+1));}
        for(String role:List.of("reader","indexer"))try(var c=DriverManager.getConnection(env.get("RAG_DB_URL"),env.get(role.equals("reader")?"RAG_DB_USERNAME":"RAG_INDEX_USERNAME"),env.get(role.equals("reader")?"RAG_DB_PASSWORD":"RAG_INDEX_PASSWORD"))){
            c.setAutoCommit(false);
            try(var s=c.createStatement();var r=s.executeQuery("SELECT COUNT(*) FROM n8n_aux.rag_chunks WHERE approved=true")){r.next();System.out.println(role+": auxiliary chunks readable="+r.getInt(1));}c.rollback();
            denied(c,"SELECT id FROM ceroa.users WHERE false");denied(c,"CREATE TABLE n8n_aux.rag_forbidden_probe(id int)");
            if(role.equals("reader"))denied(c,"DELETE FROM n8n_aux.rag_chunks WHERE false");
            System.out.println(role+": financial access and auxiliary DDL denied"+(role.equals("reader")?"; auxiliary writes denied":""));
        }
    }
    static void denied(Connection c,String sql)throws SQLException{
        boolean denied=false;try(var s=c.createStatement()){s.execute(sql);}catch(SQLException e){denied="42501".equals(e.getSQLState());}finally{c.rollback();}
        if(!denied)throw new IllegalStateException("Unexpected permissions");
    }
}
