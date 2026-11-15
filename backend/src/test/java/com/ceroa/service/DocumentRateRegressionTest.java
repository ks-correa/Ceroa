package com.ceroa.service;

import com.ceroa.api.dto.DocumentContracts.Document;
import com.ceroa.api.dto.DocumentContracts.Source;
import com.ceroa.api.dto.DocumentFactContracts.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class DocumentRateRegressionTest {
    final UUID id=UUID.randomUUID(),owner=UUID.randomUUID();
    final Document document=new Document(id,owner,"OTHER","BANK_STATEMENT","Synthetic bank",LocalDate.of(2026,11,1),LocalDate.of(2026,12,1),null,"INDEXED",1,OffsetDateTime.now());
    List<Fact> extract(String text){return DocumentFactExtractor.extract(new Source(id,UUID.randomUUID(),1,"page 1","\n"+text+"\n",0,1));}
    @ParameterizedTest
    @CsvSource(delimiter='|',value={
        "Tasa de interés efectiva anual: 28,70% EM|false|NONE",
        "TASA EFECTIVA MENSUAL: 2.5% EA|false|NONE",
        "Tasa de interés efectiva anual: 28,70% EA|true|EA",
        "Tasa efectiva mensual: 2,5% EM|true|EM",
        "Tasa de interés efectiva anual: 28,70%|true|EA",
        "Tasa: 2.5% EM|true|EM",
        "Tasa de interés: 28,70%|false|NONE",
        "Tasa efectiva anual: 28.7% e. a.|true|EA",
        "Tasa   efectiva   mensual: 2.5 % e. m.|true|EM",
        "Tasa efectiva mensual: 2.5% MV|true|MV",
        "Tasa nominal anual: 12% NAMV|true|NAMV",
        "Tasa nominal mensual: 1% NMV|true|NMV"
    })
    void extractionAndCoverageRequireCoherentModalities(String text,boolean verified,String mode){
        var facts=extract(text);assertEquals(1,facts.size());var rate=facts.getFirst();
        assertEquals(verified,rate.validationStatus().equals("VERIFIED"));assertEquals(mode.equals("NONE")?null:mode,rate.rateMode());
        assertEquals(verified,DocumentFactAnalysis.analyze(List.of(document),facts,Map.of(),Kind.RATE).complete());
        assertEquals(text,rate.quote());
    }
    Map<String,AssistantAnalysisService.Fact> evidence(List<Fact> facts){
        var mapper=new ObjectMapper().findAndRegisterModules();var map=new LinkedHashMap<String,AssistantAnalysisService.Fact>();
        new AssistantAnalysisService(mapper,null,null,null,null,null,null,null,null).evidence(map,mapper.valueToTree(Map.of("verifiedData",Map.of("analysis",Map.of("facts",facts)))),"financialDocuments/trace");return map;
    }
    @ParameterizedTest @CsvSource({"EM,EA","EA,EM"})
    void rendererCannotConvertModalityWithoutDeterministicEvidence(String mode,String other){
        var map=evidence(extract("Tasa: 2,5% "+mode));var ref=map.entrySet().stream().filter(e->e.getValue().source().endsWith("/numericValue")).findFirst().orElseThrow().getKey();
        var renderer=new AssistantAnalysisService(new ObjectMapper(),null,null,null,null,null,null,null,null);
        assertThrows(IllegalArgumentException.class,()->renderer.resolve(map,"Tasa: {{"+ref+"}}% "+other+"."));
        assertEquals("Tasa: 2,5% "+mode+".",renderer.resolve(map,"Tasa: {{"+ref+"}}% "+mode+"."));
    }
    @Test void previouslyVerifiedContradictoryRateIsBlockedDefensivelyInAnalysisAndRenderer(){
        var parsed=extract("Tasa efectiva anual: 28,70% EM").getFirst();
        var legacy=new Fact(parsed.id(),id,1,parsed.chunkId(),Kind.RATE,"NUMBER",parsed.numericValue(),null,null,"PERCENT",null,"EM",null,null,"VERIFIED",parsed.quote(),parsed.quoteStart(),parsed.quoteEnd(),1);
        var result=DocumentFactAnalysis.analyze(List.of(document),List.of(legacy),Map.of(),Kind.RATE);
        assertFalse(result.complete());assertEquals("NEEDS_REVIEW",result.facts().getFirst().validationStatus());assertNull(result.facts().getFirst().rateMode());
        var map=evidence(List.of(legacy));var ref=map.entrySet().stream().filter(e->e.getValue().source().endsWith("/numericValue")).findFirst().orElseThrow().getKey();
        var renderer=new AssistantAnalysisService(new ObjectMapper(),null,null,null,null,null,null,null,null);
        for(String mode:List.of("EA","EM"))assertThrows(IllegalArgumentException.class,()->renderer.resolve(map,"Tasa: {{"+ref+"}}% "+mode+"."));
        assertFalse(renderer.resolveConservatively(map,"Tasa: {{"+ref+"}}% EA.").contains("28,7"));
    }
    @Test void validBalanceRemainsUsableButContradictoryRateKeepsGeneralAnalysisPartial(){
        var facts=extract("Saldo: COP 1000\nTasa efectiva anual: 28,70% EM");
        var result=DocumentFactAnalysis.analyze(List.of(document),facts,Map.of(),DocumentFactAnalysis.requestedKinds("Identifica inconsistencias en mi extracto financiero"));
        assertFalse(result.complete());assertTrue(result.limitations().contains("CONTRADICTORY_RATE_MODALITY"));
        assertTrue(result.facts().stream().anyMatch(f->f.kind()==Kind.BALANCE&&f.validationStatus().equals("VERIFIED")));
    }
    @Test void manipulatingQuoteWithBothAbbreviationsCannotAuthorizeAlternativeMode(){
        var mapper=new ObjectMapper();var renderer=new AssistantAnalysisService(mapper,null,null,null,null,null,null,null,null);
        var map=new LinkedHashMap<String,AssistantAnalysisService.Fact>();
        renderer.evidence(map,mapper.valueToTree(Map.of("literal","2,5%","context","Tasa: 2,5% EM EA")),"financialDocuments/trace/documentValues/0");
        assertThrows(IllegalArgumentException.class,()->renderer.resolve(map,"Tasa: {{f1}} EA."));
    }
}
