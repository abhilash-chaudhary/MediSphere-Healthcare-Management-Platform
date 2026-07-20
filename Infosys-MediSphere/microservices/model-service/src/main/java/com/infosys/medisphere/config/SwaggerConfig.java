package com.infosys.medisphere.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI modelServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("MediSphere Model Management Service API")
                        .description("AI model version management and accuracy tracking for MediSphere Milestone 2")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Infosys MediSphere Team")
                                .email("medisphere@infosys.com")));
    }
}
