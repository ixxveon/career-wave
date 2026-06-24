package kr.co.carrer.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

import java.time.Clock;
import java.time.ZoneId;

/**
 * 스케줄링 관련 빈 등록 설정.
 * - TaskScheduler: WebSocket Grace Period 타이머 등 비동기 스케줄링
 * - Clock: 테스트 가능한 KST 시간 기준 제공 (빌링 스케줄러 등에서 사용)
 */
@Configuration
public class TaskSchedulerConfig {

    @Bean
    public Clock clock() {
        return Clock.system(ZoneId.of("Asia/Seoul"));
    }

    @Bean
    public TaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(4);
        scheduler.setThreadNamePrefix("ws-grace-");
        scheduler.setWaitForTasksToCompleteOnShutdown(false);
        scheduler.initialize();
        return scheduler;
    }
}
