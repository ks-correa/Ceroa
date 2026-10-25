package com.ceroa.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;

/** Best-effort wake-up only. Durable jobs are also polled by the synchronization workflow. */
@Component
public class DocumentLibraryDispatcher {
    private final String url,key;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    public DocumentLibraryDispatcher(@Value("${ceroa.library.ingestion-webhook-url:}")String url,@Value("${ceroa.library.worker-key:}")String key){this.url=url;this.key=key;}
    public void wake(){
        if(url.isBlank()||key.length()<32)return;
        try{http.sendAsync(HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(5)).header("X-Ceroa-Library",key).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString("{\"queueChanged\":true}")).build(),HttpResponse.BodyHandlers.discarding()).exceptionally(e->null);}
        catch(IllegalArgumentException ignored){/* Queue remains pending and visible; polling provides recovery. */}
    }
}
