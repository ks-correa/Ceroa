package com.ceroa.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

/** n8n owns the Gemini credential; this client receives vectors, never provider keys. */
@Component
public class RagEmbeddingClient {
    public static final String MODEL="gemini-embedding-001";
    public static final int DIMENSIONS=768;
    private final ObjectMapper json;
    private final String url,key;
    public RagEmbeddingClient(ObjectMapper json,@Value("${ceroa.rag.embedding-webhook-url:}") String url,
        @Value("${ceroa.rag.worker-key:}") String key){this.json=json;this.url=url;this.key=key;}
    public String embed(String question) throws Exception {
        if(url.isBlank()||key.length()<32||question==null||question.isBlank()||question.length()>4000)throw new IllegalArgumentException();
        var body=json.writeValueAsString(Map.of("text",question,"task","RETRIEVAL_QUERY"));
        var request=HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(20)).header("Content-Type","application/json")
            .header("X-Ceroa-Rag",key).POST(HttpRequest.BodyPublishers.ofString(body)).build();
        var response=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(5)).build()
            .send(request,HttpResponse.BodyHandlers.ofString());
        if(response.statusCode()!=200||response.body().length()>50000)throw new IllegalStateException("Embedding no disponible");
        var raw=json.readTree(response.body());
        if(!MODEL.equals(raw.path("model").asText()))throw new IllegalArgumentException("Modelo incompatible");
        var values=raw.path("values");if(!values.isArray()||values.size()!=DIMENSIONS)throw new IllegalArgumentException("Dimensión incompatible");
        double[] vector=new double[DIMENSIONS];for(int i=0;i<DIMENSIONS;i++){if(!values.get(i).isNumber())throw new IllegalArgumentException();vector[i]=values.get(i).doubleValue();}
        return normalized(vector);
    }
    static String normalized(double[] vector) {
        if(vector.length!=DIMENSIONS)throw new IllegalArgumentException();double norm=0;
        for(double value:vector){if(!Double.isFinite(value))throw new IllegalArgumentException();norm+=value*value;}
        norm=Math.sqrt(norm);if(!Double.isFinite(norm)||norm<=0)throw new IllegalArgumentException();
        var output=new ArrayList<String>();for(double value:vector)output.add(Double.toString(value/norm));
        return "["+String.join(",",output)+"]";
    }
}
