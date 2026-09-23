# Progetto Kotlin Hello API

Un semplice progetto Kotlin con Spring Boot che implementa un endpoint REST che restituisce "hello".

## Struttura del Progetto

```
study/
├── build.gradle.kts                    # Configurazione Gradle
├── settings.gradle.kts                 # Impostazioni progetto
├── gradle/wrapper/                     # Gradle wrapper
├── gradlew                            # Script Gradle (Unix)
├── src/
│   ├── main/
│   │   ├── kotlin/
│   │   │   └── com/example/hello/
│   │   │       ├── HelloApplication.kt    # Classe principale
│   │   │       └── HelloController.kt     # Controller REST
│   │   └── resources/
│   │       └── application.properties     # Configurazione app
│   └── test/
│       └── kotlin/
│           └── com/example/hello/
│               └── HelloControllerTest.kt # Test endpoint
└── README.md
```

## Tecnologie Utilizzate

- **Kotlin 2.0.21** - Linguaggio di programmazione
- **Spring Boot 3.3.5** - Framework per applicazioni Java/Kotlin
- **Spring Web** - Per creare API REST
- **JUnit 5** - Framework per test
- **Gradle 9.0** - Build tool
- **Java 17** - Runtime environment

## Configurazione Iniziale

### 1. Build Configuration (build.gradle.kts)

```kotlin
plugins {
    id("org.springframework.boot") version "3.3.5"
    id("io.spring.dependency-management") version "1.1.6"
    kotlin("jvm") version "2.0.21"
    kotlin("plugin.spring") version "2.0.21"
}

group = "com.example"
version = "0.0.1-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_17
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("org.jetbrains.kotlin:kotlin-reflect")
    
    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.junit.jupiter:junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    kotlinOptions {
        freeCompilerArgs += "-Xjsr305=strict"
        jvmTarget = "17"
    }
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

### 2. Settings Configuration (settings.gradle.kts)

```kotlin
rootProject.name = "hello-kotlin-api"
```

### 3. Application Configuration (src/main/resources/application.properties)

```properties
server.port=8081
```

## Implementazione

### 1. Classe Principale (HelloApplication.kt)

```kotlin
package com.example.hello

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication 
class HelloApplication

fun main(args: Array<String>) {
    runApplication<HelloApplication>(*args)
}
```

### 2. Controller REST (HelloController.kt)

```kotlin
package com.example.hello

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HelloController {

    @GetMapping("/hello")
    fun hello(): String {
        return "hello"
    }
}
```

### 3. Test (HelloControllerTest.kt)

```kotlin
package com.example.hello

import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.content
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@WebMvcTest(HelloController::class)
class HelloControllerTest {

    @Autowired private lateinit var mockMvc: MockMvc

    @Test
    fun `should return hello when calling GET hello endpoint`() {
        mockMvc.perform(get("/hello"))
               .andExpect(status().isOk)
               .andExpect(content().string("hello"))
    }
}
```

## Come Eseguire il Progetto

### Prerequisiti

1. **Java 17** installato
2. **Gradle** (verrà scaricato automaticamente tramite wrapper)

### Comandi Base

#### 1. Generare il Gradle Wrapper
```bash
gradle wrapper
```

#### 2. Compilare il progetto
```bash
./gradlew build
```

#### 3. Eseguire i test
```bash
./gradlew test
```

#### 4. Avviare l'applicazione
```bash
./gradlew bootRun
```

#### 5. Testare l'endpoint
```bash
curl http://localhost:8081/hello
```

Dovrebbe restituire:
```
hello
```

## Risoluzione Problemi Comuni

### 1. Conflitti di Porta
Se la porta 8080 è occupata, l'applicazione usa la porta 8081 (configurata in `application.properties`).

Per verificare quale processo usa una porta:
```bash
lsof -i :8080
```

### 2. Problemi con Gradle Wrapper
Se il wrapper non funziona, installare Gradle globalmente:
```bash
brew install gradle  # su macOS
```

### 3. Problemi di Compatibilità Java
Il progetto richiede Java 17. Verificare la versione:
```bash
java -version
```

### 4. Problemi di Build
Pulire e ricostruire:
```bash
./gradlew clean build
```

## Struttura delle Annotazioni

- `@SpringBootApplication`: Combina `@Configuration`, `@EnableAutoConfiguration`, e `@ComponentScan`
- `@RestController`: Indica che la classe è un controller REST
- `@GetMapping("/hello")`: Mappa le richieste GET su `/hello` al metodo
- `@WebMvcTest`: Test slice per testare solo il layer web

## Prossimi Passi

Per estendere questo progetto potresti aggiungere:

1. **Più endpoint** (POST, PUT, DELETE)
2. **Database integration** (JPA/Hibernate)
3. **Validation** dei parametri
4. **Error handling** personalizzato
5. **Logging** configurato
6. **Documentazione API** (Swagger/OpenAPI)
7. **Security** (Spring Security)
8. **Docker** per containerizzazione

## Dipendenze Principali

- `spring-boot-starter-web`: Include Tomcat embedded e Spring MVC
- `jackson-module-kotlin`: Supporto JSON per Kotlin
- `kotlin-reflect`: Libreria reflection per Kotlin
- `spring-boot-starter-test`: Include JUnit, Mockito, AssertJ

Questo setup fornisce una base solida per sviluppare API REST con Kotlin e Spring Boot!# voyage
