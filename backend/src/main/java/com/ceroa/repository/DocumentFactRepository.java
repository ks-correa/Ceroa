package com.ceroa.repository;

import com.ceroa.api.dto.DocumentContracts.Source;
import com.ceroa.api.dto.DocumentFactContracts.*;
import com.ceroa.service.DocumentFactExtractor;
import org.springframework.jdbc.core.namedparam.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.LocalDate;
import java.util.*;

public class DocumentFactRepository {
    private final NamedParameterJdbcTemplate db;
    public DocumentFactRepository(javax.sql.DataSource source){db=new NamedParameterJdbcTemplate(source);}
    public void persist(Source source){
        for(var f:DocumentFactExtractor.extract(source)){
            var p=new MapSqlParameterSource("id",f.id()).addValue("document",f.documentId()).addValue("version",f.documentVersion()).addValue("chunk",f.chunkId())
                .addValue("kind",f.kind().name()).addValue("type",f.valueType()).addValue("number",f.numericValue()).addValue("date",f.dateValue()).addValue("text",f.textValue())
                .addValue("unit",f.unit()).addValue("currency",f.currency()).addValue("mode",f.rateMode()).addValue("reference",f.transactionReference()).addValue("effective",f.effectiveDate())
                .addValue("status",f.validationStatus()).addValue("quote",f.quote()).addValue("start",f.quoteStart()).addValue("end",f.quoteEnd()).addValue("extractor",f.extractorVersion())
                .addValue("fingerprint",fingerprint(f.kind()+"|"+f.quote().replaceAll("\\s+"," ")));
            db.update("INSERT INTO document_financial_facts(id,document_id,document_version,chunk_id,kind,value_type,numeric_value,date_value,text_value,unit,currency,rate_mode,transaction_reference,effective_date,validation_status,quote,quote_start,quote_end,fingerprint,extractor_version) VALUES(:id,:document,:version,:chunk,:kind,:type,:number,:date,:text,:unit,:currency,:mode,:reference,:effective,:status,:quote,:start,:end,:fingerprint,:extractor) ON CONFLICT(document_id,document_version,fingerprint) DO NOTHING",p);
        }
    }
    public List<Fact> read(UUID actor,List<UUID> ids){
        if(ids.isEmpty())return List.of();if(ids.size()>50)throw new IllegalArgumentException();
        return db.query("SELECT f.* FROM document_financial_facts f JOIN financial_documents d ON d.id=f.document_id JOIN document_chunks c ON c.id=f.chunk_id WHERE d.id IN (:ids) AND "+FinancialDocumentRepository.READ_SCOPE+" AND d.processing_status='INDEXED' AND f.document_version=d.document_version AND c.document_version=d.document_version AND c.document_id=f.document_id AND f.extractor_version=:extractor AND substring(c.content from f.quote_start+1 for f.quote_end-f.quote_start)=f.quote ORDER BY f.document_id,f.kind,f.id LIMIT 1001",
            Map.of("actor",actor,"ids",ids,"extractor",DocumentFactExtractor.VERSION),(r,n)->new Fact(r.getObject("id",UUID.class),r.getObject("document_id",UUID.class),r.getInt("document_version"),r.getObject("chunk_id",UUID.class),Kind.valueOf(r.getString("kind")),r.getString("value_type"),r.getBigDecimal("numeric_value"),r.getObject("date_value",LocalDate.class),r.getString("text_value"),r.getString("unit"),r.getString("currency"),r.getString("rate_mode"),r.getString("transaction_reference"),r.getObject("effective_date",LocalDate.class),r.getString("validation_status"),r.getString("quote"),r.getInt("quote_start"),r.getInt("quote_end"),r.getInt("extractor_version")));
    }
    public static String fingerprint(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
}
