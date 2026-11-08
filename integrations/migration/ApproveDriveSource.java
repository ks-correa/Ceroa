import java.sql.*;import java.util.*;import java.nio.charset.StandardCharsets;import java.io.*;
/** Local operator setup only. Reuses the backend JDBC configuration and never reads financial records. */
class ApproveDriveSource {
 static String value(Properties p,String name){return new String(Base64.getDecoder().decode(p.getProperty(name)),StandardCharsets.UTF_8);}
 public static void main(String[] args){try{
  var p=new Properties();p.load(new InputStreamReader(System.in,StandardCharsets.UTF_8));String schema=value(p,"schema"),email=value(p,"email"),folder=value(p,"folder");if(!schema.matches("[A-Za-z_][A-Za-z0-9_]{0,62}")||!folder.matches("[A-Za-z0-9_-]{10,100}")||!"APPROVED_TEST_FOLDER".equals(value(p,"approval")))throw new IllegalArgumentException();
  try(var db=DriverManager.getConnection(value(p,"url"),value(p,"username"),value(p,"password"))){db.setAutoCommit(false);try(var s=db.createStatement()){s.execute("SET LOCAL search_path TO \""+schema+"\"");}
   UUID owner;try(var q=db.prepareStatement("SELECT id,active FROM users WHERE lower(email)=lower(?)")){q.setString(1,email);try(var rs=q.executeQuery()){if(!rs.next()||!rs.getBoolean("active")){db.rollback();System.out.println("{\"status\":\"OWNER_MAPPING_REQUIRED\"}");return;}owner=rs.getObject("id",UUID.class);if(rs.next())throw new IllegalStateException();}}
   try(var q=db.prepareStatement("SELECT pg_advisory_xact_lock(hashtext(?))")){q.setString(1,"ceroa-approved-drive:"+owner+":"+folder);q.execute();}
   UUID source=null;try(var q=db.prepareStatement("SELECT id,active,approved_at FROM approved_drive_sources WHERE owner_id=? AND folder_id=? FOR UPDATE")){q.setObject(1,owner);q.setString(2,folder);try(var rs=q.executeQuery()){if(rs.next()){if(!rs.getBoolean("active")||rs.getObject("approved_at")==null)throw new IllegalStateException();source=rs.getObject("id",UUID.class);if(rs.next())throw new IllegalStateException();}}}
   if(source==null){source=UUID.randomUUID();try(var q=db.prepareStatement("INSERT INTO approved_drive_sources(id,owner_id,folder_id,active,approved_at) VALUES(?,?,?,true,now())")){q.setObject(1,source);q.setObject(2,owner);q.setString(3,folder);q.executeUpdate();}}
   db.commit();System.out.println("{\"status\":\"APPROVED_TEST_SOURCE\",\"sourceId\":\""+source+"\",\"ownerMatchedVerifiedEmail\":true,\"financialDataRead\":false}");
  }
 }catch(Exception e){System.out.println("{\"status\":\"SOURCE_SETUP_FAILED\",\"noSecretOutput\":true}");System.exit(1);}}
}
