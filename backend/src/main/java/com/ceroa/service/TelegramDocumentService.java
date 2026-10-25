package com.ceroa.service;

import com.ceroa.api.dto.DocumentContracts.*;
import com.ceroa.domain.TelegramLink;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/** Deterministic document operations; identity comes only from the verified Telegram binding. */
@Service
public class TelegramDocumentService {
    public static final String CONSENT="Para guardar y analizar documentos con IA, envía /autorizar_documentos. El original se guarda en tu biblioteca privada; Gemini recibe el PDF completo si requiere OCR. Después vuelve a enviar el archivo. Revoca nuevas cargas con /revocar_documentos.";
    public static final String HELP="Biblioteca documental (la misma de la web):\n"
        +"/autorizar_documentos — autorizar cargas con IA\n"
        +"Envía un PDF, DOCX o XLSX de hasta 8 MB. Para XLSX escribe /hoja Nombre exacto en la leyenda.\n"
        +"/documentos [página] — listar documentos\n"
        +"/buscar_documentos identificacion=CC desde=2026-09-01 hasta=2026-10-01 — filtrar (hasta exclusivo)\n"
        +"También admite tipo=BANK_STATEMENT, entidad=\"Banco Ejemplo\", texto=\"cuota de manejo\" y pagina=1.\n"
        +"/documento ID — estado y metadatos\n"
        +"/versiones ID — historial de originales\n"
        +"/descargar ID [versión] — recibir el archivo\n"
        +"/reemplazar ID VERSION_ACTUAL — preparar reemplazo; después envía el nuevo archivo\n"
        +"/metadatos ID identificacion=CC tipo=BANK_STATEMENT entidad=\"Banco Ejemplo\" inicio=2026-09-01 fin=2026-10-01 emision=2026-10-01 — corregir; usa - para borrar un campo opcional\n"
        +"/reprocesar ID — volver a analizar\n"
        +"/eliminar_documento ID — solicitar eliminación con confirmación\n"
        +"/cancelar_documento — cancelar reemplazo o eliminación\n"
        +"/revocar_documentos — desautorizar nuevas cargas\n"
        +"También puedes preguntar por tus documentos con lenguaje natural.";
    public record Download(UUID id,int version) {}
    public record Response(String answer,Download download){Response(String answer){this(answer,null);}}
    private record Audience(UUID user,OffsetDateTime linkedAt) {}
    private record Replacement(UUID document,int version,Instant expires) {}
    private record Deletion(UUID document,int version,String token,Instant expires) {}
    private final Map<Audience,Replacement> replacements=new ConcurrentHashMap<>();
    private final Map<Audience,Deletion> deletions=new ConcurrentHashMap<>();
    private final DocumentLibraryService library;
    public TelegramDocumentService(DocumentLibraryService library){this.library=library;}
    public boolean isDocumentRequest(TelegramService.Update u){String text=u.text()==null?"":u.text().trim();return u.document()!=null||text.matches("(?s)^/(documentos|buscar_documentos|documento|estado|versiones|descargar|reemplazar|metadatos|reprocesar|eliminar_documento|confirmar_eliminacion|cancelar_documento|hoja)(?:\\s.*)?$");}
    public Response handle(TelegramService.Update u,TelegramLink link) {
        if(!isDocumentRequest(u))return null;
        prune();var audience=new Audience(link.userId,link.linkedAt);
        String text=u.text()==null?"":u.text().trim();if(text.length()>2000)throw new IllegalArgumentException();
        if(u.document()!=null)return upload(u.document(),text,audience);
        String[] args=text.split("\\s+",3);String command=args[0];
        return switch(command) {
            case "/documentos" -> list(Map.of(),args.length==1?1:Integer.parseInt(args[1]));
            case "/buscar_documentos" -> {var fields=fields(text.substring(command.length()),Set.of("identificacion","tipo","entidad","desde","hasta","texto","pagina"));yield list(fields,Integer.parseInt(fields.getOrDefault("pagina","1")));}
            case "/documento","/estado" -> new Response(describe(library.get(id(args))));
            case "/versiones" -> {
                UUID id=id(args);var versions=library.versions(id);StringBuilder out=new StringBuilder("Originales del documento "+id+":\n");
                for(var version:versions)out.append("Versión ").append(version.version()).append(version.current()?" · Actual":" · Histórico").append("\n/descargar ").append(id).append(' ').append(version.version()).append('\n');
                yield new Response(out.toString());
            }
            case "/descargar" -> {var document=library.get(id(args));int version=args.length>2?Integer.parseInt(args[2]):document.version();if(library.versions(document.id()).stream().noneMatch(v->v.version()==version))throw new IllegalArgumentException();yield new Response("Original privado · documento "+document.id()+" · versión "+version,new Download(document.id(),version));}
            case "/reemplazar" -> {
                if(args.length<3)throw new IllegalArgumentException();
                var document=library.get(id(args));int version=Integer.parseInt(args[2]);if(document.version()!=version)yield new Response("El documento cambió. Consulta /documento "+document.id()+" y utiliza su versión actual.");
                if(replacements.size()>=1000)throw new IllegalArgumentException();
                replacements.put(audience,new Replacement(document.id(),version,Instant.now().plusSeconds(300)));
                yield new Response("Reemplazo preparado durante 5 minutos. Envía ahora el nuevo archivo. Conservaremos los metadatos actuales: "+describe(document)+"\nSi cambian, corrígelos con /metadatos después del reemplazo. El original anterior quedará en el historial privado. /cancelar_documento cancela esta operación.");
            }
            case "/cancelar_documento" -> {replacements.remove(audience);deletions.remove(audience);yield new Response("Reemplazo y eliminación pendientes cancelados.");}
            case "/reprocesar" -> new Response("Reanálisis solicitado. "+describe(library.reprocess(id(args))));
            case "/metadatos" -> correct(args);
            case "/eliminar_documento" -> {
                var document=library.get(id(args));String token=UUID.randomUUID().toString().replace("-","");if(deletions.size()>=1000)throw new IllegalArgumentException();
                deletions.put(audience,new Deletion(document.id(),document.version(),token,Instant.now().plusSeconds(300)));
                yield new Response("Se eliminarán el documento "+document.id()+", sus originales históricos y su índice, también de la web. Confirma en 5 minutos con:\n/confirmar_eliminacion "+token+"\nO usa /cancelar_documento.");
            }
            case "/confirmar_eliminacion" -> {
                var pending=deletions.get(audience);if(pending==null||args.length!=2||!pending.token.equals(args[1]))yield new Response("Confirmación inexistente o vencida. Solicita /eliminar_documento ID otra vez.");
                if(library.get(pending.document).version()!=pending.version){deletions.remove(audience,pending);yield new Response("El documento cambió. Solicita la eliminación otra vez para revisar su versión actual.");}
                library.delete(pending.document);deletions.remove(audience,pending);replacements.remove(audience);yield new Response("Documento, historial de originales y fragmentos eliminados de tu biblioteca.");
            }
            default -> new Response(HELP);
        };
    }
    private Response upload(TelegramService.Attachment attachment,String caption,Audience audience) {
        String name=attachment.fileName();if(name==null||name.length()>160||attachment.data()==null||attachment.data().length()>11_184_812)throw new IllegalArgumentException();
        byte[] bytes;try{bytes=Base64.getDecoder().decode(attachment.data());}catch(IllegalArgumentException e){throw new IllegalArgumentException("Archivo inválido");}
        if(bytes.length==0||bytes.length>DocumentTextExtractor.MAX_BYTES)throw new IllegalArgumentException();
        String lower=name.toLowerCase(Locale.ROOT);String mime=lower.endsWith(".pdf")?"application/pdf":lower.endsWith(".docx")?"application/vnd.openxmlformats-officedocument.wordprocessingml.document":lower.endsWith(".xlsx")?"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":null;
        if(mime==null)throw new IllegalArgumentException();
        String sheet=null;
        if(caption.startsWith("/hoja "))sheet=caption.substring(6).trim();
        else if(caption.startsWith("/reemplazar ")){String[] args=caption.split("\\s+",4);if(args.length<3)throw new IllegalArgumentException();var doc=library.get(id(args));int version=Integer.parseInt(args[2]);if(doc.version()!=version)throw new IllegalArgumentException();if(args.length==4){if(!args[3].startsWith("/hoja "))throw new IllegalArgumentException();sheet=args[3].substring(6).trim();}if(replacements.size()>=1000)throw new IllegalArgumentException();replacements.put(audience,new Replacement(doc.id(),version,Instant.now().plusSeconds(300)));}
        else if(caption.startsWith("/"))throw new IllegalArgumentException();
        if(sheet!=null&&(sheet.isBlank()||sheet.length()>31))throw new IllegalArgumentException();
        final byte[] content=bytes;final String type=mime;
        MultipartFile file=new MultipartFile(){public String getName(){return "file";}public String getOriginalFilename(){return name;}public String getContentType(){return type;}public boolean isEmpty(){return content.length==0;}public long getSize(){return content.length;}public byte[] getBytes(){return content;}public InputStream getInputStream(){return new ByteArrayInputStream(content);}public void transferTo(File dest)throws IOException{throw new IOException("No disk transfer");}};
        var pending=replacements.get(audience);
        Document document;
        if(pending!=null){document=library.replace(pending.document,pending.version,file,true,sheet);replacements.remove(audience,pending);}
        else document=library.upload(file,null,true,sheet);
        return new Response((pending==null?"Documento recibido en tu biblioteca privada. La IA extraerá los metadatos.":"Original reemplazado. El anterior permanece en el historial privado.")+"\n"+describe(document)+"\nConsulta /documento "+document.id()+" para ver el estado y los datos extraídos. También está disponible en Mis documentos de la web.");
    }
    private Response correct(String[] args) {
        var document=library.get(id(args));if(args.length<3)throw new IllegalArgumentException();
        var f=fields(args[2],Set.of("identificacion","tipo","entidad","inicio","fin","emision"));
        var m=new Metadata(f.containsKey("identificacion")?(f.get("identificacion").equals("-")?null:Identification.valueOf(f.get("identificacion"))):document.identificationType()==null?null:Identification.valueOf(document.identificationType()),f.containsKey("tipo")?Kind.valueOf(f.get("tipo")):Kind.valueOf(document.documentType()),optional(f,"entidad",document.financialEntity()),date(f,"inicio",document.periodStart()),date(f,"fin",document.periodEnd()),date(f,"emision",document.issuedAt()),null);
        return new Response("Correcciones guardadas. Se volverá a indexar.\n"+describe(library.update(document.id(),m)));
    }
    private Response list(Map<String,String> fields,int page) {
        if(page<1||page>1001)throw new IllegalArgumentException();
        var filters=new Filters(null,fields.containsKey("identificacion")?Identification.valueOf(fields.get("identificacion")):null,fields.containsKey("tipo")?Kind.valueOf(fields.get("tipo")):null,fields.get("entidad"),date(fields,"desde",null),date(fields,"hasta",null));
        String question=fields.getOrDefault("texto","");var result=library.query(new Query(question.isBlank()?Intent.METADATA_SEARCH:Intent.HYBRID_SEARCH,question,filters,(page-1)*10,10));
        String out=result.documents().isEmpty()?"No se encontraron documentos con esos filtros.":"Tus documentos · página "+page+"\n"+references(result.documents());
        for(var source:result.sources().stream().limit(3).toList())out+="\nEvidencia · "+source.documentId()+" · "+source.location()+":\n"+source.content().substring(0,Math.min(450,source.content().length()))+"\n";
        if(result.documents().size()==10)out+="\nPuede haber más resultados. Usa /documentos "+(page+1)+" o repite /buscar_documentos con pagina="+(page+1)+" conservando tus filtros.";
        return new Response(out);
    }
    public String references(List<Document> documents){StringBuilder out=new StringBuilder();for(var document:documents.stream().limit(10).toList())out.append(describe(document)).append("\n/versiones ").append(document.id()).append("\n/descargar ").append(document.id()).append("\n\n");return out.toString();}
    private String describe(Document d){return "ID: "+d.id()+"\nVersión: "+d.version()+" · Estado: "+d.status()+"\nTipo: "+d.documentType()+" · Identificación: "+Objects.toString(d.identificationType(),"No encontrada")+"\nEntidad: "+Objects.toString(d.financialEntity(),"No encontrada")+"\nPeriodo: "+Objects.toString(d.periodStart(),"Sin identificar")+" / "+Objects.toString(d.periodEnd(),"Sin identificar")+" (fin exclusivo)\nEmisión: "+Objects.toString(d.issuedAt(),"Sin identificar");}
    public TelegramService.Attachment download(Download request) {
        String url=library.downloadVersion(request.id,request.version);UUID ticket=UUID.fromString(url.substring(url.indexOf("ticket=")+7));
        var content=library.content(request.id,ticket);String suffix=content.contentType().equals("application/pdf")?"pdf":content.contentType().contains("wordprocessingml")?"docx":"xlsx";
        return new TelegramService.Attachment("documento-"+request.id+"-v"+request.version+"."+suffix,content.contentType(),Base64.getEncoder().encodeToString(content.bytes()));
    }
    private UUID id(String[] args){if(args.length<2)throw new IllegalArgumentException();return UUID.fromString(args[1]);}
    private static final Pattern FIELD=Pattern.compile("([a-z]+)=(?:\"([^\"]*)\"|(\\S+))");
    private Map<String,String> fields(String text,Set<String> allowed) {
        var found=new LinkedHashMap<String,String>();var matcher=FIELD.matcher(text);int last=0;
        while(matcher.find()){if(!text.substring(last,matcher.start()).isBlank()||!allowed.contains(matcher.group(1))||found.containsKey(matcher.group(1)))throw new IllegalArgumentException();String value=matcher.group(2)!=null?matcher.group(2):matcher.group(3);if(value.isBlank())throw new IllegalArgumentException();found.put(matcher.group(1),value);last=matcher.end();}
        if(!text.substring(last).isBlank())throw new IllegalArgumentException();return found;
    }
    private String optional(Map<String,String> fields,String key,String original){return !fields.containsKey(key)?original:fields.get(key).equals("-")?null:fields.get(key);}
    private LocalDate date(Map<String,String> fields,String key,LocalDate original){String value=optional(fields,key,original==null?null:original.toString());try{return value==null?null:LocalDate.parse(value);}catch(java.time.DateTimeException e){throw new IllegalArgumentException("Fecha inválida");}}
    private void prune(){Instant now=Instant.now();replacements.values().removeIf(p->!p.expires.isAfter(now));deletions.values().removeIf(p->!p.expires.isAfter(now));}
}
