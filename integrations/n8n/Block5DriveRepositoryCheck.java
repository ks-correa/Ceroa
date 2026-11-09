import com.ceroa.repository.FinancialDocumentRepository;
import com.ceroa.api.dto.DocumentContracts.*;
import org.postgresql.ds.PGSimpleDataSource;
import java.util.*;

/** Read-only actual repository retrieval, bounded to the one synthetic Drive test file. */
class Block5DriveRepositoryCheck {
 public static void main(String[] args)throws Exception{
  var ds=new PGSimpleDataSource();ds.setURL(System.getenv("DB_URL"));ds.setUser(System.getenv("DB_USERNAME"));ds.setPassword(System.getenv("DB_PASSWORD"));ds.setCurrentSchema(System.getenv().getOrDefault("DB_SCHEMA","ceroa"));ds.setDefaultRowFetchSize(10);
  UUID owner,document;
  try(var c=ds.getConnection()){c.setReadOnly(true);try(var q=c.prepareStatement("SELECT d.id,d.owner_id FROM drive_sync_files f JOIN financial_documents d ON d.id=f.document_id JOIN approved_drive_sources s ON s.id=f.source_id WHERE f.file_id=? AND s.active AND s.owner_id=d.owner_id AND d.source_type='CONNECTOR'")){q.setString(1,System.getenv("BLOCK5_FILE_ID"));try(var r=q.executeQuery()){if(!r.next())throw new IllegalStateException("Approved test document required");document=r.getObject(1,UUID.class);owner=r.getObject(2,UUID.class);if(r.next())throw new IllegalStateException("Ambiguous test mapping");}}}
  var repo=new FinancialDocumentRepository(ds);var query=new Query(Intent.HYBRID_SEARCH,"CEROABLOCK5VALIDATION ESMERALDA",new Filters(owner,null,null,null,null,null,document),0,10);
  var found=repo.retrieve(owner,query,null,"gemini-embedding-001");
  if(found.isEmpty()||found.stream().anyMatch(s->s.documentVersion()!=2||!s.content().contains("ESMERALDA")||s.content().contains("COBALTO")))throw new AssertionError("Current indexed test evidence missing");
  if(!repo.retrieve(UUID.randomUUID(),query,null,"gemini-embedding-001").isEmpty())throw new AssertionError("Unauthorized repository access");
  System.out.println("{\"repository\":\"REAL_POSTGRESQL\",\"currentVersionRetrieved\":true,\"wrongOwnerRejected\":true,\"fragments\":"+found.size()+",\"semanticVectorQueryTested\":false,\"browserConversationTested\":false}");
 }
}
