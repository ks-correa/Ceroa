package com.ceroa.service;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.font.*;
import java.nio.file.*;
/** Synthetic documents only, for an opt-in real-provider smoke test; never persisted as debts. */
public class DocumentFixtureWriter {
    public static void main(String[] args)throws Exception{
        Path directory=Path.of(args[0]);Files.createDirectories(directory);
        String[] lines={"Documento financiero ficticio de prueba","Tipo: Prestamo personal de libre inversion","Entidad: Banco de prueba","Monto original: 3000000 COP","Saldo actual: 2500000 COP","Tasa efectiva anual EA: 19,5%","Cuota mensual: 300000 COP","Proximo vencimiento: 2026-10-15","Fecha de desembolso: 2026-01-15"};
        try(var pdf=new PDDocument()){var page=new PDPage();pdf.addPage(page);try(var text=new PDPageContentStream(pdf,page)){text.beginText();text.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA),12);text.setLeading(20);text.newLineAtOffset(50,740);for(String line:lines){text.showText(line);text.newLine();}text.endText();}pdf.save(directory.resolve("documento-ficticio.pdf").toFile());}
        try(var doc=new XWPFDocument();var out=Files.newOutputStream(directory.resolve("documento-parcial.docx"))){doc.createParagraph().createRun().setText("Documento ficticio. Saldo actual: 2500000 COP. No contiene la tasa de interes ni su modalidad.");doc.write(out);}
        try(var book=new XSSFWorkbook();var out=Files.newOutputStream(directory.resolve("documento-ficticio.xlsx"))){var sheet=book.createSheet("Obligacion de prueba");for(int i=0;i<lines.length;i++){var row=sheet.createRow(i);String[] parts=lines[i].split(":",2);row.createCell(0).setCellValue(parts[0]);if(parts.length>1)row.createCell(1).setCellValue(parts[1].trim());}book.createSheet("No analizar").createRow(0).createCell(0).setCellValue("Saldo actual: 9999999 COP");book.write(out);}
        try(var pdf=new PDDocument()){pdf.addPage(new PDPage());pdf.save(directory.resolve("sin-texto.pdf").toFile());}
        System.out.println("Fixtures ficticios PDF, DOCX, XLSX y PDF sin texto generados.");
    }
}
