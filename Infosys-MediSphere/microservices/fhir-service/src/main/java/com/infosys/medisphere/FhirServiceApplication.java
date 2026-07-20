package com.infosys.medisphere;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class FhirServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(FhirServiceApplication.class, args);
    }
}
