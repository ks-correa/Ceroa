import com.ceroa.repository.FinancialDocumentRepository;
import com.ceroa.api.dto.DocumentContracts.*;
import org.postgresql.ds.PGSimpleDataSource;
import java.util.*;

/** Read-only actual repository retrieval, bounded to the one synthetic Drive test file. */
class Block6DriveRepositoryCheck {
 public static void main(String[] args)throws Exception{
  var ds=new PGSimpleDataSource();ds.setURL(System.getenv("DB_URL"));ds.setUser(System.getenv("DB_USERNAME"));ds.setPassword(System.getenv("DB_PASSWORD"));ds.setCurrentSchema(System.getenv().getOrDefault("DB_SCHEMA","ceroa"));ds.setDefaultRowFetchSize(10);
  UUID owner,document;
  try(var c=ds.getConnection()){c.setReadOnly(true);try(var q=c.prepareStatement("SELECT d.id,d.owner_id FROM drive_sync_files f JOIN financial_documents d ON d.id=f.document_id JOIN approved_drive_sources s ON s.id=f.source_id WHERE f.file_id=? AND s.active AND s.owner_id=d.owner_id AND d.source_type='CONNECTOR'")){q.setString(1,System.getenv("BLOCK5_FILE_ID"));try(var r=q.executeQuery()){if(!r.next())throw new IllegalStateException("Approved test document required");document=r.getObject(1,UUID.class);owner=r.getObject(2,UUID.class);if(r.next())throw new IllegalStateException("Ambiguous test mapping");}}}
  var repo=new FinancialDocumentRepository(ds);var query=new Query(Intent.HYBRID_SEARCH,"CEROABLOCK6VALIDATION TURQUESA",new Filters(owner,null,null,null,null,null,document),0,10);
  var found=repo.retrieve(owner,query,null,"gemini-embedding-001");
  if(found.isEmpty()||found.stream().anyMatch(s->s.documentVersion()!=2||!s.content().contains("TURQUESA")||s.content().contains("AMATISTA")))throw new AssertionError("Current indexed test evidence missing");
  if(!repo.retrieve(UUID.randomUUID(),query,null,"gemini-embedding-001").isEmpty())throw new AssertionError("Unauthorized repository access");
  String paraphrase="What is the current verification code of this synthetic private support reference?";
  String vector=new com.ceroa.service.RagEmbeddingClient(new com.fasterxml.jackson.databind.ObjectMapper(),System.getenv("RAG_EMBEDDING_WEBHOOK_URL"),System.getenv("RAG_WORKER_KEY")).embed(paraphrase);
  var semantic=new Query(Intent.SEMANTIC_SEARCH,paraphrase,new Filters(owner,null,null,null,null,null),0,10);
  var lexical=repo.retrieve(owner,semantic,null,"gemini-embedding-001");
  var ranked=repo.retrieve(owner,semantic,vector,"gemini-embedding-001");
  var match=ranked.stream().filter(v->v.documentId().equals(document)).findFirst();
  boolean distinguished=lexical.stream().noneMatch(v->v.documentId().equals(document))&&match.isPresent()&&match.get().score()>=0.55;
  if(!repo.retrieve(UUID.randomUUID(),semantic,vector,"gemini-embedding-001").isEmpty())throw new AssertionError("Unauthorized semantic access");
  System.out.println("semanticDistinguished="+distinguished+" lexicalTarget="+lexical.stream().anyMatch(v->v.documentId().equals(document))+" semanticTarget="+match.isPresent()+" score="+(match.isPresent()?match.get().score():null));
  System.out.println("{\"repository\":\"REAL_POSTGRESQL\",\"currentVersionRetrieved\":true,\"wrongOwnerRejected\":true,\"fragments\":"+found.size()+",\"semanticVectorQueryTested\":true,\"browserConversationTested\":false}");
 }
}
