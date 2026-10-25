package com.ceroa.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.*;
import java.net.InetSocketAddress;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class DocumentOcrClientTest {
    HttpServer server;String response;DocumentOcrClient client;
    @BeforeEach void start()throws Exception {
        server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);server.createContext("/ocr",exchange->{try{
            assertThat(exchange.getRequestHeaders().getFirst("X-Ceroa-Ocr")).isEqualTo("test-ocr-key-with-at-least-32-characters");
            var request=new ObjectMapper().readTree(exchange.getRequestBody());assertThat(request.path("pageCount").asInt()).isEqualTo(2);assertThat(Base64.getDecoder().decode(request.path("pdf").asText())).startsWith("%PDF-".getBytes());
            byte[] body=response.getBytes(java.nio.charset.StandardCharsets.UTF_8);exchange.sendResponseHeaders(200,body.length);exchange.getResponseBody().write(body);
        }finally{exchange.close();}});server.start();client=new DocumentOcrClient(new ObjectMapper(),"http://127.0.0.1:"+server.getAddress().getPort()+"/ocr","test-ocr-key-with-at-least-32-characters");
    }
    @AfterEach void stop(){server.stop(0);}
    byte[] scanned()throws Exception{var output=new java.io.ByteArrayOutputStream();try(var pdf=new org.apache.pdfbox.pdmodel.PDDocument()){pdf.addPage(new org.apache.pdfbox.pdmodel.PDPage());pdf.addPage(new org.apache.pdfbox.pdmodel.PDPage());pdf.save(output);}return output.toByteArray();}
    @Test void validatesPageCoverageAndReturnsOriginalPageOrder()throws Exception{response="{\"uncertain\":false,\"segments\":[{\"page\":2,\"text\":\"Segunda página\"},{\"page\":1,\"text\":\"Primera página\"}]}";assertThat(client.extract(scanned()).segments()).extracting(DocumentTextExtractor.Segment::location).containsExactly("Página 1","Página 2");}
    @Test void rejectsUncertainOrMissingPages()throws Exception{response="{\"uncertain\":true,\"segments\":[{\"page\":1,\"text\":\"Texto\"},{\"page\":2,\"text\":\"Dudoso\"}]}";assertThatThrownBy(()->client.extract(scanned())).isInstanceOf(IllegalArgumentException.class);response="{\"uncertain\":false,\"segments\":[{\"page\":1,\"text\":\"Texto\"}]}";assertThatThrownBy(()->client.extract(scanned())).isInstanceOf(IllegalArgumentException.class);}
    @Test void rejectsDuplicatePagesAndUnknownConfidence()throws Exception{response="{\"segments\":[{\"page\":1,\"text\":\"Texto\"},{\"page\":2,\"text\":\"Texto\"}]}";assertThatThrownBy(()->client.extract(scanned())).isInstanceOf(IllegalArgumentException.class);response="{\"uncertain\":false,\"segments\":[{\"page\":1,\"text\":\"Texto\"},{\"page\":1,\"text\":\"Texto\"}]}";assertThatThrownBy(()->client.extract(scanned())).isInstanceOf(IllegalArgumentException.class);}
}
