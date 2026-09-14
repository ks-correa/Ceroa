package com.ceroa.service;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailChangeMailService {
    private final ObjectProvider<JavaMailSender> sender;
    private final String from;
    private final String host;
    private final String username;
    private final String password;
    private final boolean authentication;

    public EmailChangeMailService(ObjectProvider<JavaMailSender> sender,
            @Value("${ceroa.recovery.mail-from:}") String from,
            @Value("${spring.mail.host:}") String host,
            @Value("${spring.mail.username:}") String username,
            @Value("${spring.mail.password:}") String password,
            @Value("${spring.mail.properties.mail.smtp.auth:true}") boolean authentication) {
        this.sender = sender;
        this.from = from;
        this.host = host;
        this.username = username;
        this.password = password;
        this.authentication = authentication;
    }

    public boolean available() {
        return sender.getIfAvailable() != null && !host.isBlank() && !from.isBlank()
            && (!authentication || (!username.isBlank() && !password.isBlank()));
    }

    public void sendEmailChangeCode(String newEmail, String code) {
        if (!available()) throw new IllegalStateException("Email change mail unavailable");
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(newEmail);
        message.setSubject("Ceroa: código de verificación de nuevo correo");
        message.setText("Para confirmar el cambio de correo en Ceroa, ingresa este código: " + code
            + "\nVence en 10 minutos. No lo compartas."
            + " Si no solicitaste este cambio, ignora este mensaje.");
        sender.getObject().send(message);
    }
}
