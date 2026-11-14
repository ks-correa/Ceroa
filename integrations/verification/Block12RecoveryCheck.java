import java.nio.file.*;
import java.sql.*;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.hibernate.cfg.Configuration;

public class Block12RecoveryCheck {
 static final String URL="jdbc:postgresql://127.0.0.1:5432/migration_v31_verified?currentSchema=ceroa";
 static void check(boolean x,String name){if(!x)throw new IllegalStateException(name);}
 static long scalar(Connection c,String sql)throws Exception{try(var s=c.createStatement();var r=s.executeQuery(sql)){r.next();return r.getLong(1);}}
 public static void main(String[] args)throws Exception{
  var result=new LinkedHashMap<String,Object>();
  try(var c=DriverManager.getConnection("jdbc:postgresql://127.0.0.1:5432/postgres","postgres","");var s=c.createStatement()) {s.execute("CREATE DATABASE migration_v31_verified TEMPLATE reference_v30");}
  var f=Flyway.configure().dataSource(URL,"postgres","").defaultSchema("ceroa").schemas("ceroa").locations("filesystem:/private/block12c/candidate/BOOT-INF/classes/db/migration").target("31").ignoreMigrationPatterns("*:pending").load();
  check(f.info().current().getVersion().toString().equals("30"),"initialVersion");result.put("flywayBefore","30");check(f.info().pending().length==1,"pendingV31");f.validate();result.put("validateBefore",true);
  var migration=f.migrate();check(migration.migrationsExecuted==1,"oneMigration");f.validate();check(f.info().current().getVersion().toString().equals("31"),"version31");check(f.migrate().migrationsExecuted==0,"secondMigrate");result.put("flywayAfter","31");result.put("validateAfter",true);result.put("secondMigrateExecuted",0);
  try(var c=DriverManager.getConnection(URL,"postgres","")){
   check(scalar(c,"SELECT count(*) FROM ceroa.subscription_charges")==0,"noHistoricalReceipts");
   check(scalar(c,"SELECT count(*) FROM pg_constraint WHERE conrelid='ceroa.subscription_charges'::regclass AND contype='p'")==1,"pk");
   check(scalar(c,"SELECT count(*) FROM pg_constraint WHERE conrelid='ceroa.subscription_charges'::regclass AND contype='f' AND confrelid='ceroa.plus_subscriptions'::regclass")==1,"fk");
   check(scalar(c,"SELECT count(*) FROM pg_indexes WHERE schemaname='ceroa' AND tablename='subscription_charges' AND indexname='subscription_charges_subscription'")==1,"index");
   result.put("tablePkFkIndex",true);result.put("historicalReceiptsCreated",0);
   check(scalar(c,"SELECT count(*) FROM information_schema.role_table_grants WHERE table_schema='ceroa' AND table_name='subscription_charges' AND grantee IN ('anon','authenticated','service_role','PUBLIC')")==0,"apiGrants");result.put("newTablePublicApiGrants",0);
  }
  var cfg=new Configuration();cfg.setProperty("hibernate.connection.url",URL);cfg.setProperty("hibernate.connection.username","postgres");cfg.setProperty("hibernate.connection.password","");cfg.setProperty("hibernate.connection.driver_class","org.postgresql.Driver");cfg.setProperty("hibernate.default_schema","ceroa");cfg.setProperty("hibernate.hbm2ddl.auto","validate");cfg.setProperty("hibernate.show_sql","false");
  int count=0;var root=Path.of("/private/block12c/candidate/BOOT-INF/classes/com/ceroa/domain");
  try(var paths=Files.walk(root)){for(var p:paths.filter(p->p.toString().endsWith(".class")&&!p.toString().contains("$")).toList()){
   String name="com.ceroa.domain."+root.relativize(p).toString().replace('/','.').replace(".class","");var type=Class.forName(name);if(type.isAnnotationPresent(jakarta.persistence.Entity.class)){cfg.addAnnotatedClass(type);count++;}
  }}
  try(var sf=cfg.buildSessionFactory()){result.put("hibernateSchemaValidation",true);result.put("mappedEntities",count);}
  Files.writeString(Path.of("/private/block12c/v31-results.json"),new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(result));
  System.out.println("BLOCK12C_FLYWAY_AND_HIBERNATE_VERIFIED");
 }
}


