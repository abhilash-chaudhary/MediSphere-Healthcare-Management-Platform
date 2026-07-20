package com.infosys.medisphere.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger / OpenAPI 3.0 configuration for AI Prediction Service.
 */
@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI predictionServiceOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("MediSphere AI Prediction Service API")
                        .description("AI-powered risk prediction engine for Cardiovascular Disease and Diabetes complications. Part of MediSphere Milestone 2.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("Infosys MediSphere Team")
                                .email("medisphere@infosys.com"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("https://www.apache.org/licenses/LICENSE-2.0")));
    }
}
