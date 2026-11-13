package com.campusconnect.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class MlClient {
    private static final Logger log = LoggerFactory.getLogger(MlClient.class);
    private final HttpClient client;
    private final ObjectMapper mapper;
    private final String baseUrl;
    private final Duration requestTimeout;
    private final boolean enabled;

    public MlClient(
            ObjectMapper mapper,
            @Value("${campusconnect.ml-service-url:http://localhost:5100}") String baseUrl,
            @Value("${campusconnect.ml-request-timeout-ms:1200}") long requestTimeoutMs,
            @Value("${campusconnect.ml-enabled:true}") boolean enabled
    ) {
        this.mapper = mapper;
        this.baseUrl = baseUrl.replaceAll("/+$", "");
        this.requestTimeout = Duration.ofMillis(Math.max(100, Math.min(requestTimeoutMs, 5000)));
        this.enabled = enabled;
        this.client = HttpClient.newBuilder().connectTimeout(Duration.ofMillis(300)).build();
    }

    public Map<String, Object> post(String path, Object body) {
        if (!enabled) return Map.of();
        try {
            String json = mapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + path))
                    .timeout(requestTimeout)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                // Failures degrade to heuristic fallbacks; make them observable in logs.
                log.warn("ML service returned HTTP {} for {}", response.statusCode(), path);
                return Map.of();
            }
            return mapper.readValue(response.body(), new TypeReference<>() {});
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            return Map.of();
        } catch (Exception exception) {
            log.warn("ML service call to {} failed: {}", path, exception.getMessage());
            return Map.of();
        }
    }
}
