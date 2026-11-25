package com.ceroa.service;

import com.ceroa.domain.User;
import com.ceroa.api.dto.DocumentContracts;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import java.time.*;
import java.util.*;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;

class AssistantConversationRoutingTest {
    @Test void extraPaymentCannotChooseItsObligationOrTimingForTheUser(){
        assertTrue(AssistantService.simulationClarification("Compara mis estrategias con un abono adicional de $200.000 a mis deudas","Tarjeta Nu").contains("qué obligación"));
        assertTrue(AssistantService.simulationClarification("Simula un abono adicional de $200.000 a Tarjeta Nu","Tarjeta Nu").contains("primer período"));
        assertNull(AssistantService.simulationClarification("Simula un abono único de $200.000 a Tarjeta Nu","Tarjeta Nu"));
        assertTrue(AssistantService.simulationClarification("Simula $200.000 cada mes para Tarjeta Nu","Tarjeta Nu").contains("recurrentes"));
        assertTrue(AssistantService.simulationClarification("Simula $200.000 cada mes desde el primer período para Tarjeta Nu","Tarjeta Nu").contains("recurrentes"));
    }
    CurrentUserService current=mock(CurrentUserService.class);
    SupportBookingService bookings=mock(SupportBookingService.class);
    WorkspaceActionService actions=mock(WorkspaceActionService.class);
    DocumentLibraryService library=mock(DocumentLibraryService.class);
    AssistantService assistant;
    String code="ABCDEFGHIJKLMNOPQRST";
    @BeforeEach void setup(){
        var user=new User();user.setId(UUID.randomUUID());user.setActive(true);user.setEmail("owner@example.invalid");
        when(current.entity()).thenReturn(user);when(current.id()).thenReturn(user.getId());
        assistant=new AssistantService(current,mock(DebtService.class),mock(PaymentService.class),mock(UpcomingDueService.class),mock(StrategyService.class),mock(MonthlyProgressService.class),mock(DashboardService.class),new ObjectMapper(),mock(RateNormalizationService.class),mock(AssistantAnalysisService.class),mock(RagRetrievalService.class),library,mock(SimulationService.class),mock(SentinelService.class),actions,bookings,true,"http://unused.invalid","a".repeat(32));
    }
    SupportBookingService.View booking(String instruction){
        var start=OffsetDateTime.parse("2026-11-25T14:00:00Z");
        return new SupportBookingService.View(code,"CONFIRMED",start,start.plusMinutes(30),start,null,instruction);
    }
    @Test void remembersConfirmedReservationAndRequestsCancellationWithoutExecutingIt(){
        when(bookings.confirm(code)).thenReturn(booking(""));
        when(bookings.proposeCancellation(code)).thenReturn(booking("Confirmar cancelacion "+code+" "+"Z".repeat(20)));
        var confirmed=assistant.message("Confirmar asesoria "+code,null,null);
        assertTrue(confirmed.answer().contains("09:00"));assertTrue(confirmed.answer().contains(code));
        var proposed=assistant.message("Quiero cancelar mi asesoría",null,null);
        assertTrue(proposed.answer().contains("Confirmar cancelacion"));
        verify(bookings).proposeCancellation(code);verify(bookings,never()).confirmCancellation(any(),any());
    }
    @Test void ambiguousConsultOrCancelAsksInsteadOfChoosingAnAction(){
        when(bookings.confirm(code)).thenReturn(booking(""));assistant.message("Confirmar asesoria "+code,null,null);
        var result=assistant.message("Consulta o solicita la cancelación usando el código de esa reserva.",null,null);
        assertTrue(result.answer().contains("¿Quieres consultar"));verify(bookings,never()).proposeCancellation(any());
    }
    @Test void reservationContextDoesNotCrossUsersChannelsOrNewConversations(){
        when(bookings.confirm(code)).thenReturn(booking(""));assistant.message("Confirmar asesoria "+code,null,null);
        assertTrue(assistant.message("Quiero cancelar mi asesoría",null,null,AssistantService.Channel.telegram).answer().contains("Indica el código"));
        var other=new User();other.setId(UUID.randomUUID());other.setActive(true);when(current.entity()).thenReturn(other);
        assertTrue(assistant.message("Quiero cancelar mi asesoría",null,null).answer().contains("Indica el código"));
    }
    @Test void forgettingConversationClearsReservationReference(){
        when(bookings.confirm(code)).thenReturn(booking(""));assistant.message("Confirmar asesoria "+code,null,null);assistant.forget(AssistantService.Channel.web);
        assertTrue(assistant.message("Quiero cancelar mi asesoría",null,null).answer().contains("Indica el código"));
    }
    @Test void availabilityQuestionsAreNotMistakenForReservationStatus(){
        when(bookings.availableSlots(any())).thenReturn(new SupportBookingService.Availability("AVAILABLE","Horarios consultados","America/Bogota",LocalDate.now(),LocalDate.now().plusDays(14),List.of()));
        assertTrue(assistant.message("Consulta los horarios disponibles para una asesoría mañana",null,null).answer().contains("Horarios consultados"));
        verify(bookings,never()).get(any());
    }
    @Test void explicitEmailCreatesOnlyProposalAndForeignRecipientIsRejected(){
        when(actions.propose(any())).thenReturn(new WorkspaceActionService.Proposal(UUID.randomUUID(),"Z".repeat(20),"PROPOSED",OffsetDateTime.now().plusMinutes(10),"Confirmar envío "+"Z".repeat(20)));
        assertNotNull(assistant.message("Envíame un resumen financiero a owner@example.invalid",null,null).mailProposal());
        assertTrue(assistant.message("Envíame un resumen financiero a other@example.invalid",null,null).answer().contains("no coincide"));
        verify(actions,times(1)).propose(any());verify(actions,never()).confirmMail(any());
    }
    @Test void ambiguousAttachedStatementReturnsDocumentSelectionInsteadOfMixingEvidence(){
        var a=new DocumentContracts.Document(UUID.randomUUID(),current.id(),"CC","BANK_STATEMENT","A",null,null,null,"INDEXED",1,OffsetDateTime.now());
        var b=new DocumentContracts.Document(UUID.randomUUID(),current.id(),"CC","BANK_STATEMENT","B",null,null,null,"INDEXED",1,OffsetDateTime.now());
        when(library.query(any())).thenReturn(new DocumentContracts.Result("",Map.of(),DocumentContracts.Filters.empty(),List.of(),List.of(a,b),"AVAILABLE",UUID.randomUUID(),0));
        var result=assistant.message("¿Qué tasa de interés aparece en el extracto que adjunté?",null,null);
        assertEquals("PARTIAL",result.functionalStatus());assertEquals(2,result.documents().size());assertTrue(result.answer().contains("Selecciona el extracto"));
    }
}
