FROM eclipse-temurin:21-jdk AS builder

WORKDIR /app
COPY . .

RUN chmod +x ./gradlew
RUN ./gradlew clean bootJar -x test

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar

RUN addgroup --system app && adduser --system --ingroup app app
USER app

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
