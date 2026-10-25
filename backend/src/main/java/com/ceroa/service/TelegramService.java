package com.ceroa.service;

import com.ceroa.domain.*;
import com.ceroa.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.time.*;
import java.util.*;

/** Telegram identities are accepted only from the authenticated n8n worker, never from the model. */
@Service
public class TelegramService {
    @org.springframework.beans.factory.annotation.Autowired(required=false) private com.ceroa.repository.ScheduledDeliveryRepository scheduledDeliveries;
    public record Status(boolean enabled, boolean linked, String botUsername, OffsetDateTime linkedAt) {}
    public record Invitation(String url, OffsetDateTime expiresAt) {}
    public record Attachment(String fileName,String mime,String data) {}
    public record Update(long updateId,long senderId,long chatId,boolean privateChat,String text,String audio,String mime,Attachment document) {
        public Update(long updateId,long senderId,long chatId,boolean privateChat,String text,String audio,String mime){this(updateId,senderId,chatId,privateChat,text,audio,mime,null);}
    }
    public record Reply(boolean send,long chatId,String answer,String deliveryToken,Attachment attachment) {
        public Reply(boolean send,long chatId,String answer) { this(send,chatId,answer,null,null); }
        public Reply(boolean send,long chatId,String answer,String deliveryToken) { this(send,chatId,answer,deliveryToken,null); }
    }
    private record Delivery(UUID user,long sender,OffsetDateTime linkedAt,Reply reply,TelegramDocumentService.Download download,Instant expires) {}
    private final Map<String,Delivery> deliveries=new HashMap<>();
    public record Authorization(boolean allowed,long chatId,String answer) {}
    private final TelegramLinkRepository links;
    private final TelegramReceiptRepository receipts;
    private final UserRepository users;
    private final CurrentUserService current;
    private final SessionTokenService tokens;
    private final AssistantService assistant;
    private final TelegramDocumentService documents;
    private final TransactionTemplate tx;
    private final String bot;
    private final Map<Long,List<Instant>> attempts=new HashMap<>();
    public TelegramService(TelegramLinkRepository links,TelegramReceiptRepository receipts,UserRepository users,
        CurrentUserService current,SessionTokenService tokens,AssistantService assistant,TelegramDocumentService documents,PlatformTransactionManager manager,
        @Value("${ceroa.telegram.bot-username:}") String bot) {
        this.links=links; this.receipts=receipts; this.users=users; this.current=current; this.tokens=tokens;
        this.assistant=assistant; this.documents=documents; this.tx=new TransactionTemplate(manager); this.bot=bot;
    }
    public Status status() {
        var link=links.findById(current.id()).orElse(null);
        return new Status(!bot.isBlank(),link!=null && link.senderId!=null,bot,link==null?null:link.linkedAt);
    }
    public Invitation issue(boolean consent) {
        if(!consent || !bot.matches("[A-Za-z0-9_]{5,32}")) throw new IllegalArgumentException();
        return tx.execute(s->{
            var user=current.entityForUpdate();
            if(!user.isActive()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            var link=links.findById(user.getId()).orElseGet(TelegramLink::new);
            if(link.senderId!=null) throw new ResponseStatusException(HttpStatus.CONFLICT);
            if(link.codeExpiresAt!=null && link.codeExpiresAt.isAfter(OffsetDateTime.now().plusSeconds(270)))
                throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS);
            String raw=tokens.createRawToken(); link.userId=user.getId(); link.codeHash=tokens.hash(raw);
            link.codeExpiresAt=OffsetDateTime.now().plusMinutes(5); links.saveAndFlush(link);
            return new Invitation("https://t.me/"+bot+"?start="+raw,link.codeExpiresAt);
        });
    }
    public void unlink() {
        tx.executeWithoutResult(s->{ current.entityForUpdate(); links.deleteById(current.id()); if(scheduledDeliveries!=null)scheduledDeliveries.invalidateUser(current.id()); });
    }
    private boolean privateIdentity(Update u) { return u.privateChat && u.senderId>0 && u.chatId==u.senderId && u.updateId>=0; }
    private TelegramLink binding(Update u) {
        if(!privateIdentity(u)) return null;
        var link=links.findBySenderId(u.senderId).orElse(null);
        return link!=null && Objects.equals(link.chatId,u.chatId) && users.findById(link.userId).map(User::isActive).orElse(false)?link:null;
    }
    public Authorization authorize(Update u) {
        boolean valid=privateIdentity(u);
        var link=valid?binding(u):null;
        if(link!=null&&u.document()!=null&&!documentConsent(link))return new Authorization(false,u.chatId,TelegramDocumentService.CONSENT);
        return new Authorization(link!=null,valid?u.chatId:0,"Vincula tu cuenta desde Perfil → Telegram en Ceroa para consultar tus finanzas.");
    }
    private boolean documentConsent(TelegramLink link){return link.documentConsentAt!=null&&link.linkedAt!=null&&!link.documentConsentAt.isBefore(link.linkedAt);}
    private synchronized Reply hold(TelegramLink link,String answer) {
        return hold(link,answer,null);
    }
    private synchronized Reply hold(TelegramLink link,String answer,TelegramDocumentService.Download download) {
        deliveries.values().removeIf(d->d.expires.isBefore(Instant.now()));
        if(deliveries.size()>=1000) return new Reply(false,0,"");
        String token=tokens.createRawToken();
        var reply=new Reply(true,link.chatId,answer,token);
        deliveries.put(tokens.hash(token),new Delivery(link.userId,link.senderId,link.linkedAt,reply,download,Instant.now().plusSeconds(60)));
        return reply;
    }
    public synchronized Reply deliver(String token) {
        if(token==null || !token.matches("[A-Za-z0-9_-]{43}")) return new Reply(false,0,"");
        var delivery=deliveries.remove(tokens.hash(token));
        if(delivery==null || delivery.expires.isBefore(Instant.now())) return new Reply(false,0,"");
        var link=links.findById(delivery.user).orElse(null);
        if(link==null || !Objects.equals(link.senderId,delivery.sender) || !Objects.equals(link.linkedAt,delivery.linkedAt)
            || !users.findById(delivery.user).map(User::isActive).orElse(false)) return new Reply(false,0,"");
        if(delivery.download!=null) {
            var previous=SecurityContextHolder.getContext();var context=SecurityContextHolder.createEmptyContext();
            context.setAuthentication(new UsernamePasswordAuthenticationToken(link.userId.toString(),null,List.of()));SecurityContextHolder.setContext(context);
            try {
                var file=documents.download(delivery.download);
                var fresh=links.findById(delivery.user).orElse(null);
                if(fresh==null||!Objects.equals(fresh.senderId,delivery.sender)||!Objects.equals(fresh.linkedAt,delivery.linkedAt)||!users.findById(delivery.user).map(User::isActive).orElse(false))return new Reply(false,0,"");
                return new Reply(true,link.chatId,delivery.reply.answer,null,file);
            } finally {SecurityContextHolder.setContext(previous);}
        }
        return new Reply(true,link.chatId,delivery.reply.answer);
    }
    private synchronized boolean attempt(long sender) {
        Instant now=Instant.now();
        attempts.values().forEach(v->v.removeIf(t->t.isBefore(now.minusSeconds(60))));
        attempts.entrySet().removeIf(e->e.getValue().isEmpty());
        if(attempts.size()>=1000 && !attempts.containsKey(sender)) return false;
        var times=attempts.computeIfAbsent(sender,k->new ArrayList<>());
        if(times.size()>=5) return false; times.add(now); return true;
    }
    private String redeem(Update u,String raw) {
        if(!attempt(u.senderId)) return "Espera un minuto antes de intentar vincular de nuevo.";
        if(!raw.matches("[A-Za-z0-9_-]{43}")) return "El enlace no es válido. Genera uno nuevo desde tu perfil en Ceroa.";
        try { return tx.execute(s->{
            var candidate=links.findUserIdByCodeHash(tokens.hash(raw)).orElse(null);
            if(candidate==null) return "El enlace venció o ya fue usado. Genera uno nuevo desde Ceroa.";
            var user=users.findByIdForUpdate(candidate).orElseThrow();
            var link=links.findById(user.getId()).orElseThrow();
            if(!user.isActive() || !Objects.equals(link.codeHash,tokens.hash(raw)) || link.codeExpiresAt==null || !link.codeExpiresAt.isAfter(OffsetDateTime.now()))
                return "El enlace venció o ya fue usado. Genera uno nuevo desde Ceroa.";
            if(link.senderId!=null || links.findBySenderId(u.senderId).isPresent())
                return "Ya existe una vinculación. Desvincúlala desde Ceroa antes de cambiar de cuenta.";
            link.senderId=u.senderId; link.chatId=u.chatId; link.linkedAt=OffsetDateTime.now();
            link.codeHash=null; link.codeExpiresAt=null;link.documentConsentAt=null; links.saveAndFlush(link);
            return "Tu cuenta de Ceroa quedó vinculada. Puedes preguntar por texto o nota de voz. Usa /documentos para abrir tu biblioteca y /ayuda para ver las opciones. Usa /desvincular para desconectarla.";
        }); } catch(DataIntegrityViolationException e) { return "Ya existe una vinculación. Revisa tu perfil en Ceroa."; }
    }
    private boolean claim(long id) {
        try { return Boolean.TRUE.equals(tx.execute(s->{
            if(receipts.existsById(id)) return false;
            receipts.deleteByCreatedAtBefore(OffsetDateTime.now().minusDays(7));
            var receipt=new TelegramReceipt(); receipt.id=id; receipt.createdAt=OffsetDateTime.now();
            receipts.saveAndFlush(receipt); return true;
        })); } catch(DataIntegrityViolationException e) { return false; }
    }
    public Reply update(Update u) {
        if(!privateIdentity(u) || !claim(u.updateId)) return new Reply(false,0,"");
        String text=u.text==null?"":u.text.trim();
        if(text.startsWith("/start ")) return new Reply(true,u.chatId,redeem(u,text.substring(7).trim()));
        var link=binding(u);
        if(link==null) return new Reply(true,u.chatId,authorize(u).answer);
        if(text.equals("/desvincular")) {
            tx.executeWithoutResult(s->{ users.findByIdForUpdate(link.userId);
                var fresh=links.findById(link.userId).orElse(null);
                if(fresh!=null && Objects.equals(fresh.senderId,u.senderId) && Objects.equals(fresh.linkedAt,link.linkedAt)){links.deleteById(link.userId);if(scheduledDeliveries!=null)scheduledDeliveries.invalidateUser(link.userId);}
            });
            return new Reply(true,u.chatId,"Cuenta desvinculada. Ya no puedo consultar tus datos desde Telegram.");
        }
        if(text.equals("/start") || text.equals("/ayuda")) return hold(link,"Puedes consultar tus finanzas por texto o nota de voz.\n\n"+TelegramDocumentService.HELP+"\n/nuevo reinicia la conversación.\n/desvincular desconecta tu cuenta.");
        if(text.equals("/autorizar_documentos")||text.equals("/revocar_documentos")) {
            boolean enable=text.equals("/autorizar_documentos");
            var fresh=tx.execute(s->{users.findByIdForUpdate(link.userId);var bound=links.findById(link.userId).orElse(null);if(bound==null||!Objects.equals(bound.senderId,link.senderId)||!Objects.equals(bound.linkedAt,link.linkedAt))return null;bound.documentConsentAt=enable?OffsetDateTime.now():null;return links.saveAndFlush(bound);});
            return fresh==null?new Reply(false,0,""):hold(fresh,enable?"Autorizaste guardar tus documentos en la biblioteca privada y analizarlos con IA. Gemini recibe el PDF completo cuando necesita OCR. Envía un PDF, DOCX o XLSX de hasta 8 MB. Aparecerá también en la web. Puedes revocar con /revocar_documentos.":"Autorización de nuevas cargas revocada. Tus documentos existentes siguen en la biblioteca; puedes consultarlos o eliminarlos.");
        }
        var previous=SecurityContextHolder.getContext(); var context=SecurityContextHolder.createEmptyContext();
        context.setAuthentication(new UsernamePasswordAuthenticationToken(link.userId.toString(),null,List.of()));
        SecurityContextHolder.setContext(context);
        try {
            if(u.document()!=null&&!documentConsent(link))return hold(link,TelegramDocumentService.CONSENT);
            var documentReply=documents.handle(u,link);
            if(documentReply!=null){var fresh=binding(u);if(fresh==null||!fresh.userId.equals(link.userId)||!fresh.linkedAt.equals(link.linkedAt))return new Reply(false,0,"");return hold(fresh,documentReply.answer(),documentReply.download());}
            if(text.equals("/nuevo")){assistant.forget(AssistantService.Channel.telegram);return hold(link,"Conversación reiniciada. Puedes enviar tu nueva consulta.");}
            var result=assistant.message(text,u.audio,u.mime,AssistantService.Channel.telegram);
            String answer=result.answer();
            if(result.documents()!=null&&!result.documents().isEmpty())answer+="\n\nDocumentos de referencia:\n"+documents.references(result.documents());
            var fresh=binding(u);
            if(fresh==null || !fresh.userId.equals(link.userId) || !fresh.linkedAt.equals(link.linkedAt)) return new Reply(false,0,"");
            return hold(fresh,answer);
        } catch(ResponseStatusException e) {
            return new Reply(true,u.chatId,e.getStatusCode().value()==429?"Espera un momento antes de enviar otra consulta.":"No pude completar el análisis. Inténtalo de nuevo en un momento.");
        } catch(com.ceroa.exception.ResourceNotFoundException e) {return hold(link,"Documento no encontrado o sin acceso. Consulta /documentos.");
        } catch(IllegalArgumentException e) { return hold(link,documents.isDocumentRequest(u)?"No pude procesar esa solicitud documental. Revisa el formato, los identificadores y las fechas. Usa /ayuda para ver los comandos.":"Envía un texto de hasta 2.000 caracteres o una nota de voz de hasta 60 segundos y 4 MB.");
        } finally { SecurityContextHolder.setContext(previous); }
    }
}
