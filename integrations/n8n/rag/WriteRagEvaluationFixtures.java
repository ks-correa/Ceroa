import java.awt.*;
import java.awt.image.BufferedImage;
import java.nio.file.*;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.*;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;

/** Synthetic evaluation corpus only. The OCR fixture has images and no text layer. */
class WriteRagEvaluationFixtures {
    public static void main(String[] args)throws Exception {
        Path dir=Path.of("tmp/rag-v21");Files.createDirectories(dir);
        try(var pdf=new PDDocument()) {
            for(var lines:new String[][]{
                {"PRUEBA SINTETICA CEROA","Documento ficticio sin datos personales","Banco: Entidad de Prueba OCR","Tipo de identificacion: CC","Periodo: 2026-09-01 a 2026-10-01","Concepto AZAFRANRAG: cuota de manejo.","Importe de ejemplo: 123,45","Documento sin validez financiera"},
                {"PAGINA DOS - DETALLE CONTROLADO","La palabra de control es COBREZULRAG.","La cuota de manejo corresponde al servicio mensual.","No existen deudas ni pagos reales en esta prueba."}}) {
                var image=new BufferedImage(1654,2339,BufferedImage.TYPE_INT_RGB);var g=image.createGraphics();g.setColor(Color.WHITE);g.fillRect(0,0,image.getWidth(),image.getHeight());g.setColor(Color.BLACK);g.setFont(new Font("SansSerif",Font.PLAIN,36));g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING,RenderingHints.VALUE_TEXT_ANTIALIAS_ON);int y=180;for(String text:lines){g.drawString(text,90,y);y+=90;}g.dispose();
                var page=new PDPage(PDRectangle.A4);pdf.addPage(page);try(var stream=new PDPageContentStream(pdf,page)){stream.drawImage(LosslessFactory.createFromImage(pdf,image),0,0,PDRectangle.A4.getWidth(),PDRectangle.A4.getHeight());}
            }
            if(!new org.apache.pdfbox.text.PDFTextStripper().getText(pdf).isBlank())throw new IllegalStateException("OCR fixture must not contain native text");pdf.save(dir.resolve("scanned.pdf").toFile());
        }
        nativePdf(dir.resolve("replacement.pdf"),"PRUEBA SINTETICA ACTUALIZADA","Concepto PLATINORAG: abono a capital.","Periodo: 2026-09-01 a 2026-10-01","El documento anterior AZAFRAN ya no esta vigente.");
        nativePdf(dir.resolve("ce-oct.pdf"),"PRUEBA SINTETICA CE","Concepto VIOLETARAG: pago de seguro.","Periodo: 2026-10-01 a 2026-11-01");
        nativePdf(dir.resolve("cc-aug.pdf"),"PRUEBA SINTETICA AGOSTO","Concepto TURQUESARAG: intereses de agosto.","Periodo: 2026-08-01 a 2026-09-01");
        nativePdf(dir.resolve("auto-extract.pdf"),"DOCUMENTO SINTETICO - SOLO PRUEBAS","EXTRACTO BANCARIO","Entidad financiera: Banco Sintetico Automatico","Tipo de identificacion: CC","Periodo del 01/09/2026 al 30/09/2026 inclusive","Fecha de emision: 01/10/2026","Cuota de manejo: COP 15000","Codigo de control: AUTOAZAFRANRAG","Sin validez financiera");
        System.out.println("Four synthetic PDF fixtures prepared; scanned.pdf has two image-only pages.");
    }
    static void nativePdf(Path path,String... lines)throws Exception{try(var pdf=new PDDocument()){var page=new PDPage(PDRectangle.A4);pdf.addPage(page);try(var stream=new PDPageContentStream(pdf,page)){stream.beginText();stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA),12);stream.newLineAtOffset(40,780);for(String line:lines){stream.showText(line);stream.newLineAtOffset(0,-25);}stream.endText();}pdf.save(path.toFile());}}
}
