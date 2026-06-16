package kr.co.carrer;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CareerWaveApplication {

    public static void main(String[] args) {
        SpringApplication.run(CareerWaveApplication.class, args);
    }
}
