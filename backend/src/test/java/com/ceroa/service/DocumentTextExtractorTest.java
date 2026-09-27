package com.ceroa.service;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.font.*;
import java.io.*;
import static org.junit.jupiter.api.Assertions.*;
public class DocumentTextExtractorTest {
    final DocumentTextExtractor extractor=new DocumentTextExtractor();
    static final String WORD="application/vnd.openxmlformats-officedocument.wordprocessingml.document",EXCEL="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    public static byte[] word(String text)throws Exception{try(var document=new XWPFDocument();var out=new ByteArrayOutputStream()){document.createParagraph().createRun().setText(text);document.write(out);return out.toByteArray();}}
    @Test void readsPdfWithPageEvidenceAndRejectsScanInsteadOfInventingOcr()throws Exception{
        try(var document=new PDDocument();var out=new ByteArrayOutputStream()){
            var page=new PDPage();document.addPage(page);try(var text=new PDPageContentStream(document,page)){text.beginText();text.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA),12);text.newLineAtOffset(50,700);text.showText("Saldo actual: 2500000 COP");text.endText();}document.save(out);
            var result=extractor.extract(new MockMultipartFile("file","test.pdf","application/pdf",out.toByteArray()),null);assertEquals("Página 1",result.segments().getFirst().location());assertTrue(result.segments().getFirst().text().contains("2500000"));
        }
        try(var document=new PDDocument();var out=new ByteArrayOutputStream()){document.addPage(new PDPage());document.save(out);assertThrows(IllegalArgumentException.class,()->extractor.extract(new MockMultipartFile("file","scan.pdf","application/pdf",out.toByteArray()),null));}
    }
    @Test void wordRetainsParagraphAndTableLocationsAndRejectsMismatch()throws Exception{
        var result=extractor.extract(new MockMultipartFile("file","test.docx",WORD,word("Saldo actual: 2500000")),null);assertEquals("Párrafo 1",result.segments().getFirst().location());
        assertThrows(IllegalArgumentException.class,()->extractor.extract(new MockMultipartFile("file","test.xlsx",EXCEL,word("test")),null));
        assertThrows(IllegalArgumentException.class,()->extractor.extract(new MockMultipartFile("file","test.docx","application/pdf",word("test")),null));
    }
    @Test void excelRequiresExplicitSheetAndDoesNotUseFormulaOrOtherSheet()throws Exception{
        try(var book=new XSSFWorkbook();var out=new ByteArrayOutputStream()){
            var row=book.createSheet("Una obligación").createRow(0);row.createCell(0).setCellValue("Saldo actual");row.createCell(1).setCellValue(2500000);row.createCell(2).setCellFormula("B1*2");book.createSheet("Otra obligación").createRow(0).createCell(0).setCellValue("9999999");book.write(out);
            var file=new MockMultipartFile("file","test.xlsx",EXCEL,out.toByteArray());var selection=extractor.extract(file,null);assertEquals(2,selection.sheets().size());assertTrue(selection.segments().isEmpty());
            var result=extractor.extract(file,"Una obligación");assertTrue(result.segments().stream().anyMatch(s->s.location().endsWith("!B1")&&s.text().contains("2500000")));assertTrue(result.segments().stream().noneMatch(s->s.text().contains("9999999")||s.text().contains("5000000")));assertTrue(result.warnings().stream().anyMatch(w->w.contains("fórmulas")));
        }
    }
    @Test void rejectsCorruptOversizedAndExternalLinkedOffice()throws Exception{
        assertThrows(IllegalArgumentException.class,()->extractor.extract(new MockMultipartFile("file","broken.pdf","application/pdf","%PDF-corrupt".getBytes()),null));
        assertThrows(IllegalArgumentException.class,()->extractor.extract(new MockMultipartFile("file","large.docx",WORD,new byte[DocumentTextExtractor.MAX_BYTES+1]),null));
        try(var document=new XWPFDocument();var out=new ByteArrayOutputStream()){document.createParagraph().createHyperlinkRun("https://example.com/private").setText("external");document.write(out);assertThrows(IllegalArgumentException.class,()->extractor.extract(new MockMultipartFile("file","external.docx",WORD,out.toByteArray()),null));}
    }
}
