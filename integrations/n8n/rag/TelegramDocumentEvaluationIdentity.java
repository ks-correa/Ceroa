import java.nio.file.*;
import java.sql.*;
import java.util.*;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Adds a fake binding only to an explicitly journaled synthetic account; never contacts Telegram. */
class TelegramDocumentEvaluationIdentity {
    public static void main(String[] args)throws Exception {
        var path=Path.of("tmp/rag-v21/telegram-document-identity.json");var json=new ObjectMapper();var test=json.readTree(Files.readString(path));
        UUID id=UUID.fromString(test.path("id").asText());String email=test.path("email").asText();long sender=test.path("senderId").asLong();
        if(!email.matches("hybrid-test-[a-f0-9-]{36}@example\\.invalid")||sender<8_000_000_000_000_000L||sender>8_000_000_999_999_999L)throw new IllegalArgumentException();
        var env=new HashMap<String,String>();for(String line:Files.readAllLines(Path.of(".env"))){int i=line.indexOf('=');if(i>0&&!line.startsWith("#"))env.put(line.substring(0,i),line.substring(i+1));}
        String schema=env.getOrDefault("DB_SCHEMA","ceroa");if(!schema.matches("[a-z_][a-z0-9_]*"))throw new IllegalArgumentException();
        try(var connection=DriverManager.getConnection(env.get("DB_URL"),env.get("DB_USERNAME"),env.get("DB_PASSWORD"))){connection.setAutoCommit(false);
            try(var p=connection.prepareStatement("SELECT count(*) FROM "+schema+".users WHERE id=? AND email=?")){p.setObject(1,id);p.setString(2,email);try(var r=p.executeQuery()){r.next();if(r.getInt(1)!=1)throw new IllegalArgumentException();}}
            try(var p=connection.prepareStatement("INSERT INTO "+schema+".telegram_links(user_id,sender_id,chat_id,linked_at) VALUES(?,?,?,now())")){p.setObject(1,id);p.setLong(2,sender);p.setLong(3,sender);p.executeUpdate();}
            connection.commit();System.out.println("Synthetic Telegram binding prepared. No external message sent.");
        }
    }
}
