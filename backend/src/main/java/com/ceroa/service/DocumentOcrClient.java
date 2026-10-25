package com.ceroa.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

/** Authorized n8n/Gemini PDF transcription adapter. Original bytes are sent only after upload consent. */
@Component
public class DocumentOcrClient {
    private final String url,key;private final ObjectMapper json;
    public DocumentOcrClient(ObjectMapper json,@Value("${ceroa.library.ocr-url:}")String url,@Value("${ceroa.library.ocr-key:}")String key){this.json=json;this.url=url;this.key=key;}
    public boolean configured(){return !url.isBlank()&&key.length()>=32;}
    public DocumentTextExtractor.Source extract(byte[] pdf)throws Exception {
        if(!configured()||pdf.length>DocumentTextExtractor.MAX_BYTES)throw new IllegalArgumentException("OCR no configurado");
        int expectedPages;try(var document=org.apache.pdfbox.Loader.loadPDF(pdf)){expectedPages=document.getNumberOfPages();if(document.isEncrypted()||expectedPages<1||expectedPages>25)throw new IllegalArgumentException();}
        String body=json.writeValueAsString(Map.of("pdf",Base64.getEncoder().encodeToString(pdf),"pageCount",expectedPages));
        var request=HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(100)).header("X-Ceroa-Ocr",key).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build();
        var response=HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(5)).build().send(request,HttpResponse.BodyHandlers.ofInputStream());
        try(var stream=response.body()) {
            if(response.statusCode()!=200)throw new IllegalArgumentException("OCR no disponible");byte[] bytes=stream.readNBytes(400001);if(bytes.length>400000)throw new IllegalArgumentException();
            var root=json.readTree(bytes);if(root.path("uncertain").asBoolean(true))throw new IllegalArgumentException("Lectura OCR incierta; requiere revisión");
            var raw=root.path("segments");if(!raw.isArray()||raw.size()!=expectedPages)throw new IllegalArgumentException();
            var parts=new ArrayList<DocumentTextExtractor.Segment>();var pages=new HashSet<Integer>();int size=0;
            for(var p:raw){int page=p.path("page").asInt();String text=p.path("text").asText();size+=text.length();if(page<1||page>expectedPages||!pages.add(page)||text.isBlank()||size>DocumentTextExtractor.MAX_TEXT)throw new IllegalArgumentException();parts.add(new DocumentTextExtractor.Segment("Página "+page,text));}
            parts.sort(Comparator.comparingInt(p->Integer.parseInt(p.location().substring(7))));
            return new DocumentTextExtractor.Source("PDF",List.of(),parts,List.of("Texto extraído mediante OCR; verificar el original."));
        }
    }
}
