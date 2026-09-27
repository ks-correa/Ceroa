import java.nio.file.*;
import java.sql.*;
import java.util.*;
/** Read-only inventory before V17. Never prints credentials or notification contents. */
class ReminderPreflight {
    public static void main(String[] args) throws Exception {
        Properties env=new Properties();try(var reader=Files.newBufferedReader(Path.of(".env"))){env.load(reader);}
        String url=env.getProperty("DB_URL");String host=java.net.URI.create(url.substring(5)).getHost();
        if(!host.endsWith(".supabase.com")&&!host.endsWith(".supabase.co"))throw new IllegalStateException("Supabase requerido");
        try(var connection=DriverManager.getConnection(url,env.getProperty("DB_USERNAME"),env.getProperty("DB_PASSWORD"))){
            connection.setReadOnly(true);
            try(var statement=connection.createStatement();var rows=statement.executeQuery("SELECT count(*) FROM (SELECT user_id,event_key FROM ceroa.notifications WHERE event_key IS NOT NULL GROUP BY user_id,event_key HAVING count(*)>1) duplicate_keys")){
                rows.next();System.out.println("Claves duplicadas de notificaciones: "+rows.getLong(1));
            }
            try(var statement=connection.createStatement();var rows=statement.executeQuery("SELECT max(version::integer) FROM ceroa.flyway_schema_history WHERE success=true AND version IS NOT NULL")){
                rows.next();System.out.println("Versión Flyway actual: "+rows.getInt(1));
            }
        }
    }
}
