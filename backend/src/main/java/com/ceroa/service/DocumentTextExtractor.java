package com.ceroa.service;

import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import java.io.*;
import java.util.*;
import java.util.zip.*;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.*;

/** In-memory extraction. No macros, formula evaluation, URLs, or uploaded files on disk. */
@Component
public class DocumentTextExtractor {
    public record Segment(String location,String text) {}
    public record Source(String format,List<String> sheets,List<Segment> segments,List<String> warnings) {}
    public static final int MAX_BYTES=8*1024*1024, MAX_TEXT=80000;
    private static final String DOCX="application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    private static final String XLSX="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    public Source extract(MultipartFile file,String chosenSheet) {
        if(file==null||file.isEmpty()||file.getSize()>MAX_BYTES) throw invalid("El archivo debe tener contenido y pesar como máximo 8 MB.");
        String name=Optional.ofNullable(file.getOriginalFilename()).orElse("").toLowerCase(Locale.ROOT);
        String mime=Optional.ofNullable(file.getContentType()).orElse("");
        try {
            byte[] bytes=file.getBytes();
            if(name.endsWith(".pdf") && (mime.equals("application/pdf")||mime.equals("application/octet-stream")) && bytes.length>5 && new String(bytes,0,5,java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-"))
                return pdf(bytes);
            boolean docx=name.endsWith(".docx")&&(mime.equals(DOCX)||mime.equals("application/octet-stream"));
            boolean xlsx=name.endsWith(".xlsx")&&(mime.equals(XLSX)||mime.equals("application/octet-stream"));
            if(!docx&&!xlsx) throw invalid("Usa un PDF, DOCX o XLSX válido; no se admiten archivos con macros.");
            checkZip(bytes,docx);
            return docx?word(bytes):excel(bytes,chosenSheet);
        } catch(IllegalArgumentException e) { throw e; }
        catch(Exception e) { throw invalid("No pude leer el archivo. Puede estar protegido, dañado o ser incompatible. Puedes continuar manualmente."); }
    }
    private Source pdf(byte[] bytes) throws IOException {
        try(var document=Loader.loadPDF(bytes)) {
            if(document.isEncrypted()||!document.getCurrentAccessPermission().canExtractContent()) throw invalid("El PDF está protegido. Usa una copia sin protección o registra los datos manualmente.");
            if(document.getNumberOfPages()>25) throw invalid("El PDF supera el límite de 25 páginas. Separa la obligación en un documento más pequeño.");
            var segments=new ArrayList<Segment>(); var stripper=new PDFTextStripper(); stripper.setSortByPosition(true);
            for(int page=1;page<=document.getNumberOfPages();page++) {
                stripper.setStartPage(page);stripper.setEndPage(page);String text=stripper.getText(document).trim();
                if(text.isBlank()) throw invalid("El PDF contiene páginas escaneadas o sin texto. Esta versión requiere un PDF con texto; puedes continuar manualmente.");
                add(segments,"Página "+page,text);
            }
            return new Source("PDF",List.of(),segments,List.of());
        }
    }
    private Source word(byte[] bytes) throws IOException {
        try(var document=new XWPFDocument(new ByteArrayInputStream(bytes))) {
            var segments=new ArrayList<Segment>(); int index=0;
            for(var element:document.getBodyElements()) {
                index++;
                if(element instanceof XWPFParagraph p) add(segments,"Párrafo "+index,p.getText());
                if(element instanceof XWPFTable table) {
                    int row=0; for(var r:table.getRows()){row++;int cell=0;for(var c:r.getTableCells())add(segments,"Tabla "+index+", fila "+row+", celda "+(++cell),c.getText());}
                }
            }
            int header=0;for(var h:document.getHeaderList())add(segments,"Encabezado "+(++header),h.getText());
            int footer=0;for(var f:document.getFooterList())add(segments,"Pie "+(++footer),f.getText());
            if(segments.isEmpty()) throw invalid("El DOCX no contiene texto legible. Las imágenes requieren lectura manual.");
            return new Source("DOCX",List.of(),segments,List.of("Se extraen texto y tablas. Las imágenes y objetos incrustados del Word no se interpretan."));
        }
    }
    private Source excel(byte[] bytes,String chosen) throws IOException {
        try(var book=new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            if(book.getNumberOfSheets()>10) throw invalid("El Excel supera el límite de 10 hojas.");
            var sheets=new ArrayList<String>(); for(int i=0;i<book.getNumberOfSheets();i++)if(!book.isSheetHidden(i)&&!book.isSheetVeryHidden(i))sheets.add(book.getSheetName(i));
            if(sheets.isEmpty()) throw invalid("El Excel no contiene hojas visibles.");
            if(chosen==null||chosen.isBlank()) return new Source("XLSX",sheets,List.of(),List.of("Selecciona la hoja que contiene una sola obligación. No se combinan varias hojas."));
            if(!sheets.contains(chosen)) throw invalid("Selecciona una de las hojas visibles del archivo.");
            var sheet=book.getSheet(chosen); var segments=new ArrayList<Segment>();var formatter=new DataFormatter(Locale.forLanguageTag("es-CO"));boolean formula=false;
            int cells=0;
            for(var row:sheet) for(var cell:row) {
                if(++cells>5000) throw invalid("La hoja supera el límite de 5.000 celdas. Usa un documento más pequeño.");
                if(cell.getCellType()==CellType.FORMULA){formula=true;continue;}
                String value;
                if(cell.getCellType()==CellType.NUMERIC&&DateUtil.isCellDateFormatted(cell))value=cell.getLocalDateTimeCellValue().toLocalDate().toString();
                else if(cell.getCellType()==CellType.NUMERIC)value=java.math.BigDecimal.valueOf(cell.getNumericCellValue()).stripTrailingZeros().toPlainString();
                else value=formatter.formatCellValue(cell);
                // Row context retains labels while every source location identifies the original cell.
                StringBuilder context=new StringBuilder();for(var sibling:row){if(sibling.getCellType()!=CellType.FORMULA&&sibling.getColumnIndex()!=cell.getColumnIndex()){String label=formatter.formatCellValue(sibling);if(!label.isBlank())context.append(label).append(" | ");}}
                if(!value.isBlank())add(segments,chosen+"!"+cell.getAddress(),context+value);
            }
            if(segments.isEmpty())throw invalid("La hoja no contiene valores legibles. No se calculan fórmulas.");
            var warnings=new ArrayList<String>();warnings.add("Solo se analizó la hoja seleccionada. Revisa que corresponda a una sola obligación.");
            if(formula)warnings.add("Hay celdas con fórmulas: se omitieron sus resultados, sin recalcularlos. Completa esos datos manualmente.");
            return new Source("XLSX",sheets,segments,warnings);
        }
    }
    private void add(List<Segment> segments,String location,String text) {
        String clean=text.replace('\u0000',' ').trim();if(clean.isBlank())return;
        if(clean.length()>MAX_TEXT||segments.size()>=2000||segments.stream().mapToInt(s->s.text.length()).sum()+clean.length()>MAX_TEXT)
            throw invalid("El documento supera el límite de contenido (80.000 caracteres). No se truncó: usa un archivo más pequeño.");
        segments.add(new Segment(location,clean));
    }
    private void checkZip(byte[] bytes,boolean word) throws Exception {
        Map<String,byte[]> xml=new HashMap<>();Set<String> names=new HashSet<>();long total=0;int count=0;
        try(var zip=new ZipInputStream(new ByteArrayInputStream(bytes))) {
            ZipEntry entry;while((entry=zip.getNextEntry())!=null){
                String name=entry.getName();if(++count>500||!names.add(name)||name.startsWith("/")||name.contains("..")||name.toLowerCase(Locale.ROOT).contains("vbaproject"))throw invalid("El archivo Office contiene entradas incompatibles o macros.");
                var output=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int read;
                while((read=zip.read(buffer))!=-1){total+=read;if(total>32*1024*1024||output.size()+read>8*1024*1024)throw invalid("El archivo Office supera los límites de expansión segura.");output.write(buffer,0,read);}
                if(name.endsWith(".rels")||name.equals("[Content_Types].xml"))xml.put(name,output.toByteArray());
            }
        }
        if(!names.contains("[Content_Types].xml")||!names.contains(word?"word/document.xml":"xl/workbook.xml"))throw invalid("El contenido no coincide con el formato del archivo.");
        var factory=DocumentBuilderFactory.newInstance();factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);factory.setFeature("http://xml.org/sax/features/external-general-entities",false);factory.setFeature("http://xml.org/sax/features/external-parameter-entities",false);factory.setXIncludeAware(false);factory.setExpandEntityReferences(false);
        factory.setAttribute(javax.xml.XMLConstants.ACCESS_EXTERNAL_DTD,"");factory.setAttribute(javax.xml.XMLConstants.ACCESS_EXTERNAL_SCHEMA,"");
        for(var content:xml.entrySet()) {
            var doc=factory.newDocumentBuilder().parse(new ByteArrayInputStream(content.getValue()));
            var all=doc.getElementsByTagName("*");for(int i=0;i<all.getLength();i++){var e=(Element)all.item(i);String target=e.getAttribute("Target");
                if(e.getAttribute("ContentType").toLowerCase(Locale.ROOT).contains("macroenabled")||e.getAttribute("TargetMode").equalsIgnoreCase("External")||target.matches("(?i)^[a-z][a-z0-9+.-]*:.*"))throw invalid("El documento contiene macros o enlaces externos. Usa una copia sin estos elementos.");
            }
        }
    }
    private IllegalArgumentException invalid(String message){return new IllegalArgumentException(message);}
}
