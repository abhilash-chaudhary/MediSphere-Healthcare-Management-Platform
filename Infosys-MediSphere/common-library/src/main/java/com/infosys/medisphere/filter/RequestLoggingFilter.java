package com.infosys.medisphere.filter;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.UUID;

@Slf4j
@Component
public class RequestLoggingFilter implements Filter {

    private static final String CORRELATION_HEADER = "X-Correlation-ID";

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {
        
        if (servletRequest instanceof HttpServletRequest httpServletRequest) {
            String correlationId = httpServletRequest.getHeader(CORRELATION_HEADER);
            if (correlationId == null || correlationId.isBlank()) {
                correlationId = UUID.randomUUID().toString();
            }
            MDC.put("correlationId", correlationId);

            String path = httpServletRequest.getRequestURI();
            String method = httpServletRequest.getMethod();
            String user = httpServletRequest.getHeader("X-Auth-User");

            log.info("Incoming Request: Method={} Path={} User={} CorrelationId={}", method, path, user != null ? user : "anonymous", correlationId);
            
            try {
                if (servletResponse instanceof HttpServletResponse httpServletResponse) {
                    httpServletResponse.setHeader(CORRELATION_HEADER, correlationId);
                }
                filterChain.doFilter(servletRequest, servletResponse);
            } finally {
                MDC.clear();
            }
        } else {
            filterChain.doFilter(servletRequest, servletResponse);
        }
    }
}
