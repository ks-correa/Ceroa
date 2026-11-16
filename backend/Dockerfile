FROM maven:3.9.11-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -B package -DskipTests
COPY Healthcheck.java /health/Healthcheck.java
RUN javac /health/Healthcheck.java

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/ceroa-backend-*.jar app.jar
COPY --from=build /health/Healthcheck.class /health/Healthcheck.class
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
