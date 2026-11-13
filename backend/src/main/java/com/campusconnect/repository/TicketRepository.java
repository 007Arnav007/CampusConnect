package com.campusconnect.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.campusconnect.entity.Ticket;

public interface TicketRepository extends JpaRepository<Ticket, UUID> {
    List<Ticket> findByCreatedByOrderByCreatedAtDesc(UUID createdBy);
    List<Ticket> findAllByOrderByCreatedAtDesc();
}
