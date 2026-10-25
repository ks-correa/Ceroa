package com.ceroa.service;

import com.fasterxml.jackson.databind.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.net.*;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

/** Actual Supabase/PostgREST read, constrained to one non-personal configuration row. */
@Service
public class SupabaseRagConfiguration {
    private final String url,key;private final ObjectMapper json;
    public SupabaseRagConfiguration(ObjectMapper json,@Value("${ceroa.library.storage-url:}")String url,@Value("${ceroa.library.storage-key:}")String key){this.json=json;this.url=url.replaceAll("/$","");this.key=key;}
    public JsonNode definition() {
        // Describe only the row actually fetched from Supabase, for the native node's credential/schema checks.
        var row=read(Map.of()).get(0);var root=json.createObjectNode();root.put("swagger","2.0");root.putObject("info").put("title","Ceroa restricted Supabase gateway").put("version","21");
        var properties=root.putObject("definitions").putObject("ceroa_rag_configuration").putObject("properties");
        row.fields().forEachRemaining(e->properties.putObject(e.getKey()).put("type",e.getValue().isNumber()?"integer":"string"));root.putObject("paths").putObject("/ceroa_rag_configuration");return root;
    }
    public JsonNode read(Map<String,String> query) {
        if(!Set.of("select","id","limit","offset").containsAll(query.keySet())||!Set.of("financial-library-v1","eq.financial-library-v1").contains(query.getOrDefault("id","eq.financial-library-v1"))||!Set.of("*","id,embedding_model,dimensions,schema_version,max_file_bytes,max_pages,ocr_model").contains(query.getOrDefault("select","*")))
            throw new IllegalArgumentException("Consulta Supabase no autorizada");
        try {
            URI origin=URI.create(url);if(!origin.getScheme().equals("https")||!origin.getHost().endsWith(".supabase.co")||key.isBlank())throw new IllegalArgumentException();
            var req=HttpRequest.newBuilder(URI.create(url+"/rest/v1/ceroa_rag_configuration?id=eq.financial-library-v1&select=id,embedding_model,dimensions,schema_version,max_file_bytes,max_pages,ocr_model"))
                .timeout(Duration.ofSeconds(12)).header("apikey",key).header("Authorization","Bearer "+key).header("Accept-Profile","public").GET().build();
            var response=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(4)).build().send(req,HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()!=200||response.body().length()>4000)throw new IllegalStateException();
            var value=json.readTree(response.body());if(!value.isArray()||value.size()!=1||!value.get(0).path("embedding_model").asText().equals(RagEmbeddingClient.MODEL)||value.get(0).path("dimensions").asInt()!=768||value.get(0).path("schema_version").asInt()!=21)throw new IllegalStateException();
            return value;
        }catch(InterruptedException e){Thread.currentThread().interrupt();throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Configuración Supabase no disponible");}
        catch(Exception e){throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,"Configuración Supabase no disponible o incompatible");}
    }
}
