package com.ceroa.repository;

import com.ceroa.api.dto.DocumentContracts.*;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.sql.*;
import java.time.*;
import java.util.*;

@Repository
public class FinancialDocumentRepository {
    private final NamedParameterJdbcTemplate db;
    public FinancialDocumentRepository(javax.sql.DataSource source) { db=new NamedParameterJdbcTemplate(source); }
    private static final RowMapper<Document> DOCUMENT=(r,n)->new Document(r.getObject("id",UUID.class),r.getObject("owner_id",UUID.class),
        r.getString("identification_type"),r.getString("document_type"),r.getString("financial_entity"),
        r.getObject("period_start",LocalDate.class),r.getObject("period_end",LocalDate.class),r.getObject("issued_at",LocalDate.class),
        r.getString("processing_status"),r.getInt("document_version"),r.getObject("uploaded_at",OffsetDateTime.class));
    private static final RowMapper<Job> JOB=(r,n)->new Job(r.getObject("id",UUID.class),r.getObject("document_id",UUID.class),r.getInt("document_version"),r.getString("status"),r.getInt("attempts"),r.getString("error_code"));
    public static final String READ_SCOPE="(d.owner_id=:actor OR EXISTS (SELECT 1 FROM document_access_grants g WHERE g.actor_id=:actor AND g.owner_id=d.owner_id AND g.expires_at>now() AND g.permission IN ('DOCUMENT_READ','DOCUMENT_MANAGE')))";
    private String scope(boolean manage) { return manage?READ_SCOPE.replace("IN ('DOCUMENT_READ','DOCUMENT_MANAGE')","= 'DOCUMENT_MANAGE'"):READ_SCOPE; }
    public Document get(UUID actor,UUID id,boolean manage,boolean lock) {
        var rows=db.query("SELECT d.* FROM financial_documents d WHERE d.id=:id AND "+scope(manage)+(lock?" FOR UPDATE":""),Map.of("actor",actor,"id",id),DOCUMENT);
        if(rows.isEmpty()) throw new com.ceroa.exception.ResourceNotFoundException("Documento no encontrado");
        return rows.getFirst();
    }
    public Optional<Document> duplicate(UUID owner,String hash) {
        return db.query("SELECT * FROM financial_documents WHERE owner_id=:owner AND content_hash=:hash",Map.of("owner",owner,"hash",hash),DOCUMENT).stream().findFirst();
    }
    public void insert(UUID id,UUID owner,Metadata m,String path,String type,String hash) {
        var p=metadata(m).addValue("id",id).addValue("owner",owner).addValue("path",path).addValue("type",type).addValue("hash",hash);
        db.update("INSERT INTO financial_documents(id,owner_id,identification_type,document_type,financial_entity,period_start,period_end,issued_at,debt_id,storage_path,content_type,content_hash,processing_status) VALUES (:id,:owner,:identification,:kind,:entity,:start,:end,:issued,:debt,:path,:type,:hash,'PENDING')",p);
        enqueue(id,1);
    }
    private MapSqlParameterSource metadata(Metadata m) {
        return new MapSqlParameterSource().addValue("identification",m.identificationType()==null?null:m.identificationType().name())
            .addValue("kind",m.documentType().name()).addValue("entity",m.financialEntity()).addValue("start",m.periodStart())
            .addValue("end",m.periodEnd()).addValue("issued",m.issuedAt()).addValue("debt",m.debtId());
    }
    public void update(UUID id,Metadata m,int version) {
        db.update("UPDATE financial_documents SET identification_type=:identification,document_type=:kind,financial_entity=:entity,period_start=:start,period_end=:end,issued_at=:issued,debt_id=:debt,document_version=:version,processing_status='PENDING' WHERE id=:id",metadata(m).addValue("version",version).addValue("id",id));
        db.update("DELETE FROM document_chunks WHERE document_id=:id",Map.of("id",id));
        db.update("UPDATE document_processing_jobs SET status='SUPERSEDED',payload=NULL,lease_until=NULL WHERE document_id=:id AND status IN ('PENDING','PROCESSING')",Map.of("id",id));
        enqueue(id,version);
    }
    private void enqueue(UUID id,int version) { db.update("INSERT INTO document_processing_jobs(id,document_id,document_version,status) VALUES (:job,:id,:version,'PENDING')",Map.of("job",UUID.randomUUID(),"id",id,"version",version)); }
    public List<Document> search(UUID actor,Filters f,int offset,int limit) {
        var p=parameters(actor,f).addValue("offset",offset).addValue("limit",limit);
        return db.query("SELECT d.* FROM financial_documents d WHERE "+where(f)+" ORDER BY d.uploaded_at DESC,d.id LIMIT :limit OFFSET :offset",p,DOCUMENT);
    }
    private MapSqlParameterSource parameters(UUID actor,Filters f) {
        return new MapSqlParameterSource("actor",actor).addValue("owner",f.ownerId()).addValue("identification",f.identificationType()==null?null:f.identificationType().name())
            .addValue("kind",f.documentType()==null?null:f.documentType().name()).addValue("entity",f.financialEntity()).addValue("from",f.periodFrom()).addValue("to",f.periodToExclusive()).addValue("document",f.documentId());
    }
    private String where(Filters f) {
        return READ_SCOPE+" AND d.processing_status<>'DELETING'"+(f.ownerId()!=null?" AND d.owner_id=:owner":"")+(f.documentId()!=null?" AND d.id=:document":"")
            +(f.identificationType()!=null?" AND d.identification_type=:identification":"")+(f.documentType()!=null?" AND d.document_type=:kind":"")
            +(f.financialEntity()!=null?" AND d.financial_entity=:entity":"")
            +(f.periodFrom()!=null?" AND d.period_start < :to AND d.period_end > :from":"");
    }
    public List<Source> retrieve(UUID actor,Query q,String vector,String model) {
        Filters f=q.filters()==null?Filters.empty():q.filters();
        var p=parameters(actor,f).addValue("text",q.question()).addValue("vector",vector).addValue("model",model).addValue("limit",q.limit()).addValue("offset",q.offset());
        // MATERIALIZED forces ownership, metadata, version and model filtering BEFORE ranking/limit.
        String similarity=vector==null?"0.0":"1-(c.embedding OPERATOR(extensions.<=>) CAST(:vector AS extensions.vector))";
        String lexical="ts_rank_cd(c.search_text,plainto_tsquery('spanish',:text))";
        String score=q.intent()==Intent.SEMANTIC_SEARCH?similarity:"(0.65*("+similarity+")+0.35*LEAST(1.0,"+lexical+"))";
        String matches=f.documentId()!=null?"true":vector==null?"c.search_text @@ plainto_tsquery('spanish',:text)":"("+similarity+") >= 0.55"+(q.intent()==Intent.SEMANTIC_SEARCH?"":" OR c.search_text @@ plainto_tsquery('spanish',:text)");
        return db.query("WITH authorized AS MATERIALIZED (SELECT c.* FROM document_chunks c JOIN financial_documents d ON d.id=c.document_id WHERE "+where(f)+" AND d.processing_status='INDEXED' AND c.document_version=d.document_version AND c.embedding_model=:model) SELECT c.*, "+score+" AS score FROM authorized c WHERE ("+matches+") ORDER BY score DESC,c.id LIMIT :limit OFFSET :offset",p,
            (r,n)->new Source(r.getObject("document_id",UUID.class),r.getObject("id",UUID.class),(Integer)r.getObject("page"),r.getString("location"),r.getString("content"),r.getDouble("score"),r.getInt("document_version")));
    }
    public List<String> indexedContent(UUID actor, UUID id) {
        return db.query("SELECT c.content FROM document_chunks c JOIN financial_documents d ON d.id=c.document_id WHERE d.id=:id AND "+READ_SCOPE+" AND d.processing_status='INDEXED' AND c.document_version=d.document_version ORDER BY c.chunk_order",
            Map.of("actor",actor,"id",id),(r,n)->r.getString(1));
    }
    public String storage(UUID id) { return db.queryForObject("SELECT storage_path FROM financial_documents WHERE id=:id",Map.of("id",id),String.class); }
    public String hash(UUID id){return db.queryForObject("SELECT content_hash FROM financial_documents WHERE id=:id",Map.of("id",id),String.class);}
    public void archive(UUID id){db.update("INSERT INTO financial_document_versions(document_id,document_version,storage_path,content_hash,content_type,metadata_snapshot) SELECT id,document_version,storage_path,content_hash,content_type,jsonb_build_object('identificationType',identification_type,'documentType',document_type,'financialEntity',financial_entity,'periodStart',period_start,'periodEnd',period_end,'issuedAt',issued_at,'metadata',metadata) FROM financial_documents WHERE id=:id",Map.of("id",id));}
    public void replacePointer(UUID id,String path,String mime,String hash,String sheet){db.update("UPDATE financial_documents SET storage_path=:path,content_type=:mime,content_hash=:hash,metadata=(metadata-'sheet'-'proposals'-'extractionMethod')||CASE WHEN :sheet IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('sheet',CAST(:sheet AS text)) END WHERE id=:id",new MapSqlParameterSource("id",id).addValue("path",path).addValue("mime",mime).addValue("hash",hash).addValue("sheet",sheet,java.sql.Types.VARCHAR));}
    public List<String> paths(UUID id){return db.queryForList("SELECT storage_path FROM financial_documents WHERE id=:id UNION SELECT storage_path FROM financial_document_versions WHERE document_id=:id",Map.of("id",id),String.class);}
    public List<com.ceroa.api.dto.DocumentContracts.Version> versions(UUID id){return db.query("SELECT document_version,content_type,uploaded_at AS archived_at,true AS current FROM financial_documents WHERE id=:id UNION ALL SELECT document_version,content_type,archived_at,false AS current FROM financial_document_versions WHERE document_id=:id ORDER BY document_version DESC",Map.of("id",id),(r,n)->new com.ceroa.api.dto.DocumentContracts.Version(r.getInt(1),r.getString(2),r.getObject(3,OffsetDateTime.class),r.getBoolean(4)));}
    public record Original(String path,String mime) {}
    public Original original(UUID id,int version){var rows=db.query("SELECT storage_path,content_type FROM financial_documents WHERE id=:id AND document_version=:version UNION ALL SELECT storage_path,content_type FROM financial_document_versions WHERE document_id=:id AND document_version=:version",Map.of("id",id,"version",version),(r,n)->new Original(r.getString(1),r.getString(2)));return rows.stream().findFirst().orElseThrow(()->new com.ceroa.exception.ResourceNotFoundException("Versión no encontrada"));}
    public void extraction(UUID id,String method){db.update("UPDATE financial_documents SET metadata=metadata||jsonb_build_object('extractionMethod',CAST(:method AS text)) WHERE id=:id",Map.of("id",id,"method",method));}
    public String mime(UUID id) { return db.queryForObject("SELECT content_type FROM financial_documents WHERE id=:id",Map.of("id",id),String.class); }
    public void connectorSource(UUID id,UUID owner){db.update("UPDATE financial_documents SET source_type='CONNECTOR' WHERE id=:id AND owner_id=:owner",Map.of("id",id,"owner",owner));}
    public List<Job> jobs(UUID id) { return db.query("SELECT * FROM document_processing_jobs WHERE document_id=:id ORDER BY created_at DESC",Map.of("id",id),JOB); }
    public Optional<Job> claim() {
        var jobs=db.query("SELECT j.* FROM document_processing_jobs j JOIN financial_documents d ON d.id=j.document_id JOIN users u ON u.id=d.owner_id WHERE u.active=true AND d.processing_status IN ('PENDING','PROCESSING') AND j.document_version=d.document_version AND (j.status='PENDING' OR j.status='PROCESSING' AND j.lease_until<now()) ORDER BY j.created_at LIMIT 1 FOR UPDATE OF d SKIP LOCKED",Map.of(),JOB);
        if(jobs.isEmpty())return Optional.empty();var j=jobs.getFirst();
        if(j.attempts()>=3){finish(j,"FAILED","RETRY_LIMIT");return Optional.empty();}
        db.update("UPDATE document_processing_jobs SET status='PROCESSING',attempts=attempts+1,lease_until=now()+interval '5 minutes',updated_at=now() WHERE id=:id",Map.of("id",j.id()));
        status(j.documentId(),"PROCESSING");return Optional.of(new Job(j.id(),j.documentId(),j.version(),"PROCESSING",j.attempts()+1,null));
    }
    public Job lockJob(UUID id) { return db.query("SELECT * FROM document_processing_jobs WHERE id=:id FOR UPDATE",Map.of("id",id),JOB).stream().findFirst().orElseThrow(()->new com.ceroa.exception.ResourceNotFoundException("Trabajo no encontrado")); }
    public Job job(UUID id) {return db.query("SELECT * FROM document_processing_jobs WHERE id=:id",Map.of("id",id),JOB).stream().findFirst().orElseThrow(()->new com.ceroa.exception.ResourceNotFoundException("Trabajo no encontrado"));}
    public UUID debt(UUID id){return db.queryForObject("SELECT debt_id FROM financial_documents WHERE id=:id",Map.of("id",id),UUID.class);}
    public boolean leaseValid(UUID id) { return Boolean.TRUE.equals(db.queryForObject("SELECT status='PROCESSING' AND lease_until>now() FROM document_processing_jobs WHERE id=:id",Map.of("id",id),Boolean.class)); }
    public Document forJob(Job j) { return db.queryForObject("SELECT * FROM financial_documents WHERE id=:id FOR UPDATE",Map.of("id",j.documentId()),DOCUMENT); }
    public void payload(UUID job,String payload) { db.update("UPDATE document_processing_jobs SET payload=CAST(:payload AS jsonb) WHERE id=:id",Map.of("id",job,"payload",payload)); }
    public void proposals(UUID id,String proposals){db.update("UPDATE financial_documents SET metadata=metadata||jsonb_build_object('proposals',CAST(:proposals AS jsonb)) WHERE id=:id",Map.of("id",id,"proposals",proposals));}
    public void automaticMetadata(UUID id,boolean enabled){db.update("UPDATE financial_documents SET metadata=metadata||jsonb_build_object('automaticMetadata',CAST(:enabled AS boolean)) WHERE id=:id",Map.of("id",id,"enabled",enabled));}
    public boolean automaticMetadata(UUID id){return Boolean.TRUE.equals(db.queryForObject("SELECT COALESCE((metadata->>'automaticMetadata')::boolean,false) FROM financial_documents WHERE id=:id",Map.of("id",id),Boolean.class));}
    public void inferredMetadata(UUID id,Metadata m){db.update("UPDATE financial_documents SET identification_type=:identification,document_type=:kind,financial_entity=:entity,period_start=:start,period_end=:end,issued_at=:issued WHERE id=:id",metadata(m).addValue("id",id));}
    public void sheet(UUID id,String sheet){if(sheet!=null)db.update("UPDATE financial_documents SET metadata=metadata||jsonb_build_object('sheet',CAST(:sheet AS text)) WHERE id=:id",Map.of("id",id,"sheet",sheet));}
    public String sheet(UUID id){return db.queryForObject("SELECT metadata->>'sheet' FROM financial_documents WHERE id=:id",Map.of("id",id),String.class);}
    public String proposals(UUID id){return db.queryForObject("SELECT metadata::text FROM financial_documents WHERE id=:id",Map.of("id",id),String.class);}
    public String payload(UUID job) { return db.queryForObject("SELECT payload::text FROM document_processing_jobs WHERE id=:id",Map.of("id",job),String.class); }
    public void insertChunk(UUID doc,int version,UUID id,int order,Part part,String vector,String model) {
        db.update("INSERT INTO document_chunks(id,document_id,chunk_order,page,location,content,embedding,embedding_model,document_version) VALUES(:id,:doc,:order,:page,:location,:text,CAST(:vector AS extensions.vector),:model,:version)",
            new MapSqlParameterSource("id",id).addValue("doc",doc).addValue("order",order).addValue("page",part.page()).addValue("location",part.location()).addValue("text",part.text()).addValue("vector",vector).addValue("model",model).addValue("version",version));
    }
    public void finish(Job j,String status,String error) {
        db.update("UPDATE document_processing_jobs SET status=:status,error_code=:error,payload=NULL,lease_until=NULL,updated_at=now() WHERE id=:id",new MapSqlParameterSource("id",j.id()).addValue("status",status).addValue("error",error));status(j.documentId(),status);
    }
    public void status(UUID id,String status) { db.update("UPDATE financial_documents SET processing_status=:status WHERE id=:id",Map.of("id",id,"status",status)); }
    public void tombstone(UUID id) {status(id,"DELETING");db.update("DELETE FROM document_chunks WHERE document_id=:id",Map.of("id",id));db.update("DELETE FROM document_processing_jobs WHERE document_id=:id",Map.of("id",id));}
    public void delete(UUID id) {db.update("DELETE FROM financial_documents WHERE id=:id",Map.of("id",id));}
    public void audit(UUID trace,UUID actor,Intent intent,String filters,int count,long elapsed) {
        db.update("INSERT INTO rag_query_audit(id,actor_id,intent,filters,result_count,elapsed_ms) VALUES(:id,:actor,:intent,CAST(:filters AS jsonb),:count,:elapsed)",Map.of("id",trace,"actor",actor,"intent",intent.name(),"filters",filters,"count",count,"elapsed",elapsed));
    }
    public List<Map<String,Object>> audit(UUID actor,int offset) {
        // Audit is limited to the authenticated actor; operational DB administrators can review all records.
        return db.queryForList("SELECT id,intent,filters,result_count,elapsed_ms,created_at FROM rag_query_audit WHERE actor_id=:actor ORDER BY created_at DESC LIMIT 50 OFFSET :offset",Map.of("actor",actor,"offset",offset));
    }
}
