package com.attendance.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.setCharacterEncoding("UTF-8");
                    response.getWriter().write("{\"timestamp\":\"" + java.time.LocalDateTime.now() + "\",\"status\":401,\"error\":\"Unauthorized\",\"message\":\"Authentication required to access this resource\"}");
                })
            )
            .authorizeHttpRequests(auth -> auth
                // 1. Static Web Resources (Same-Origin Frontend)
                .requestMatchers("/", "/index.html", "/app.js", "/style.css", "/synapse_data.js", "/Assets/**", "/favicon.ico", "/*.html", "/*.js", "/*.css").permitAll()

                // 2. Public Authentication endpoints
                .requestMatchers("/api/auth/**").permitAll()

                // 3. Read-only Academic Discovery (Public Curriculum, Timetable, Faculty Directory)
                .requestMatchers(HttpMethod.GET, "/api/subjects/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/timetable/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/faculty/**").permitAll()

                // 4. Sensitive Student and Attendance Data (Authentication Required)
                .requestMatchers(HttpMethod.GET, "/api/students/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/sessions/**").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/attendance/**").authenticated()

                // 5. Student Roster Management (HOD only)
                .requestMatchers(HttpMethod.POST, "/api/students/**").hasRole("HOD")
                .requestMatchers(HttpMethod.PUT, "/api/students/**").hasRole("HOD")
                .requestMatchers(HttpMethod.DELETE, "/api/students/**").hasRole("HOD")

                // 6. Session Operations (FACULTY and HOD)
                .requestMatchers(HttpMethod.POST, "/api/sessions/**").hasAnyRole("FACULTY", "HOD")

                // 7. Default
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
