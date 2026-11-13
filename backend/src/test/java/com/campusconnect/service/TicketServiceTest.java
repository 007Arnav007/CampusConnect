package com.campusconnect.service;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.campusconnect.dto.TicketDtos;
import com.campusconnect.entity.Ticket;
import com.campusconnect.repository.NotificationRepository;
import com.campusconnect.repository.TicketRepository;

@ExtendWith(MockitoExtension.class)
class TicketServiceTest {
    @Mock private TicketRepository tickets;
    @Mock private NotificationRepository notifications;
    @Mock private OutboxService outbox;
    @Mock private IncidentService incidents;
    @InjectMocks private TicketService service;

    @Test
    void createsTicketAndFlushesBeforeIncidentLinkage() {
        UUID owner = UUID.randomUUID();
        when(tickets.saveAndFlush(any(Ticket.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.create(owner, new TicketDtos.CreateTicketRequest("Wi-Fi", "No network access", "it_network", "medium", null));

        verify(tickets).saveAndFlush(any(Ticket.class));
        verify(notifications).save(any());
        verify(outbox).enqueueTicketCreated(any(), any());
        verify(incidents).correlateTicket(any());
    }

    @Test
    void rejectsUnknownCategoriesBeforeSaving() {
        assertThrows(IllegalArgumentException.class, () ->
                service.create(UUID.randomUUID(), new TicketDtos.CreateTicketRequest("Issue", "Description", "UNKNOWN", "MEDIUM", null)));
        verify(tickets, never()).save(any());
        verify(tickets, never()).saveAndFlush(any());
    }

    @Test
    void ticketOwnerCannotAssignStaffWorkflowStatuses() {
        UUID owner = UUID.randomUUID();
        UUID ticketId = UUID.randomUUID();
        Ticket ticket = new Ticket("Wi-Fi", "No network access", "IT_NETWORK", "MEDIUM", null, owner);
        when(tickets.findById(ticketId)).thenReturn(Optional.of(ticket));

        assertThrows(SecurityException.class, () ->
                service.update(owner, ticketId, new TicketDtos.UpdateTicketRequest("IN_PROGRESS"), false));
        verify(tickets, never()).save(any());
    }

    @Test
    void staffCanUpdateTicketStatus() {
        UUID owner = UUID.randomUUID();
        UUID ticketId = UUID.randomUUID();
        Ticket ticket = new Ticket("Wi-Fi", "No network access", "IT_NETWORK", "MEDIUM", null, owner);
        when(tickets.findById(ticketId)).thenReturn(Optional.of(ticket));
        when(tickets.save(ticket)).thenReturn(ticket);

        service.update(UUID.randomUUID(), ticketId, new TicketDtos.UpdateTicketRequest("in_progress"), true);

        verify(tickets).save(ticket);
    }
}
