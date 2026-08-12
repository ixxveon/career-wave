package kr.co.carrer.global.s3;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

// mock-upload=true 시 클래스 전체 로드 건너뜀 — AWS 키 없이 로컬 기동 가능
@Configuration
@ConditionalOnProperty(name = "aws.s3.mock-upload", havingValue = "false", matchIfMissing = true)
public class S3Config {

    @Value("${aws.s3.region}")
    private String region;

    @Value("${aws.s3.endpoint:}")
    private String endpoint;

    @Value("${aws.s3.force-path-style:true}")
    private boolean forcePathStyle;

    @Value("${aws.access-key}")
    private String accessKey;

    @Value("${aws.secret-key}")
    private String secretKey;

    private AwsBasicCredentials credentials() {
        return AwsBasicCredentials.create(accessKey, secretKey);
    }

    private S3Configuration serviceConfiguration() {
        return S3Configuration.builder()
                .pathStyleAccessEnabled(forcePathStyle)
                .build();
    }

    private S3Client.Builder clientBuilder() {
        S3Client.Builder builder = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(credentials()))
                .serviceConfiguration(serviceConfiguration());
        if (!endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }
        return builder;
    }

    @Bean
    public S3Client s3Client() {
        return clientBuilder().build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        S3Presigner.Builder builder = S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(credentials()))
                .serviceConfiguration(serviceConfiguration());
        if (!endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }
        return builder.build();
    }
}
