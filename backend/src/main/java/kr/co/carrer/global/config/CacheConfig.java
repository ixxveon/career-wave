package kr.co.carrer.global.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import kr.co.carrer.user.jobnotice.dto.JobNoticeDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.Cache;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.lang.Nullable;

import java.time.Duration;
import java.util.Map;

@Slf4j
@Configuration
@EnableCaching
public class CacheConfig implements CachingConfigurer {

    public static final String JOB_NOTICE_FILTER_OPTIONS = "jobNoticeFilterOptions";
    public static final String JOB_NOTICE_STATS = "jobNoticeStats";
    public static final String JOB_NOTICE_LIST_COUNT = "jobNoticeListCount";
    public static final String JOB_NOTICE_LIST = "jobNoticeList";

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        ObjectMapper objectMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        RedisSerializationContext.SerializationPair<String> keySerializer =
                RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer());

        RedisCacheConfiguration defaults = RedisCacheConfiguration.defaultCacheConfig()
                .serializeKeysWith(keySerializer)
                .disableCachingNullValues()
                .entryTtl(Duration.ofMinutes(30));

        Map<String, RedisCacheConfiguration> cacheConfigs = Map.of(
                JOB_NOTICE_FILTER_OPTIONS, defaults
                        .serializeValuesWith(typedSerializer(objectMapper, JobNoticeDTO.ResponseFilterOptions.class))
                        .entryTtl(Duration.ofMinutes(5)),
                JOB_NOTICE_STATS, defaults
                        .serializeValuesWith(typedSerializer(objectMapper, JobNoticeDTO.ResponseListStats.class))
                        .entryTtl(Duration.ofMinutes(10)),
                JOB_NOTICE_LIST_COUNT, defaults
                        .serializeValuesWith(typedSerializer(objectMapper, Long.class))
                        .entryTtl(Duration.ofSeconds(30)),
                JOB_NOTICE_LIST, defaults
                        .serializeValuesWith(typedSerializer(objectMapper, JobNoticeDTO.ResponseList.class))
                        .entryTtl(Duration.ofMinutes(1))
        );

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaults)
                .withInitialCacheConfigurations(cacheConfigs)
                .build();
    }

    private static <T> RedisSerializationContext.SerializationPair<T> typedSerializer(
            ObjectMapper objectMapper, Class<T> type) {
        return RedisSerializationContext.SerializationPair
                .fromSerializer(new Jackson2JsonRedisSerializer<>(objectMapper, type));
    }

    @Override
    @Nullable
    public CacheErrorHandler errorHandler() {
        return new LoggingCacheErrorHandler();
    }

    private static class LoggingCacheErrorHandler implements CacheErrorHandler {

        @Override
        public void handleCacheGetError(RuntimeException e, Cache cache, Object key) {
            log.warn("Cache GET failed [cache={}, key={}]", cache.getName(), key, e);
        }

        @Override
        public void handleCachePutError(RuntimeException e, Cache cache, Object key, Object value) {
            log.warn("Cache PUT failed [cache={}, key={}]", cache.getName(), key, e);
        }

        // GET/PUT 실패는 DB 조회로 자연 폴백되지만, EVICT/CLEAR 실패는 stale 데이터가 TTL까지 캐시에 남을 수 있어 error로 구분한다.
        @Override
        public void handleCacheEvictError(RuntimeException e, Cache cache, Object key) {
            log.error("Cache EVICT failed — stale data may persist until TTL expires [cache={}, key={}]", cache.getName(), key, e);
        }

        @Override
        public void handleCacheClearError(RuntimeException e, Cache cache) {
            log.error("Cache CLEAR failed — stale data may persist until TTL expires [cache={}]", cache.getName(), e);
        }
    }
}
