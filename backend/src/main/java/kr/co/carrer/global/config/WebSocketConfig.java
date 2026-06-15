package kr.co.carrer.global.config;

import kr.co.carrer.user.interview.websocket.InterviewHandshakeInterceptor;
import kr.co.carrer.user.interview.websocket.InterviewStompChannelInterceptor;
import kr.co.carrer.user.resume.websocket.ResumeHandshakeInterceptor;
import kr.co.carrer.user.resume.websocket.ResumeStompChannelInterceptor;
import kr.co.carrer.user.resume.websocket.ResumeWebSocketHandlerDecoratorFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${websocket.allowed-origins}")
    private String allowedOrigins;

    private final ResumeHandshakeInterceptor resumeHandshakeInterceptor;
    private final ResumeStompChannelInterceptor resumeStompChannelInterceptor;
    private final ResumeWebSocketHandlerDecoratorFactory resumeWebSocketHandlerDecoratorFactory;
    private final InterviewHandshakeInterceptor interviewHandshakeInterceptor;
    private final InterviewStompChannelInterceptor interviewStompChannelInterceptor;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws/user/resume")
                .addInterceptors(resumeHandshakeInterceptor)
                .setAllowedOriginPatterns(allowedOrigins);
        registry.addEndpoint("/ws/user/interview")
                .addInterceptors(interviewHandshakeInterceptor)
                .setAllowedOriginPatterns(allowedOrigins);
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.addDecoratorFactory(resumeWebSocketHandlerDecoratorFactory);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(resumeStompChannelInterceptor, interviewStompChannelInterceptor);
    }
}
