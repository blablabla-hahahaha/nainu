package nainu.top.agi.configuration;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.r2dbc.postgresql.codec.Json;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.convert.ReadingConverter;
import org.springframework.data.convert.WritingConverter;
import org.springframework.data.r2dbc.convert.R2dbcCustomConversions;
import org.springframework.data.r2dbc.dialect.PostgresDialect;

import java.util.Arrays;
import java.util.List;

@Configuration
@RequiredArgsConstructor
public class R2dbcConfiguration {

    private final ObjectMapper objectMapper ;

    @Bean
    public R2dbcCustomConversions r2dbcCustomConversions() {

        List<Converter<?, ?>> converters = Arrays.asList(
                new JsonNodeToJsonConverter(objectMapper),
                new JsonToJsonNodeConverter(objectMapper)
        );

        return R2dbcCustomConversions.of(new PostgresDialect(), converters);
    }

    @WritingConverter
    static class JsonNodeToJsonConverter implements Converter<JsonNode, Json>{
        private final ObjectMapper objectMapper;

        public JsonNodeToJsonConverter(ObjectMapper objectMapper) {
            this.objectMapper = objectMapper;
        }

        @Override
        public Json convert(JsonNode source) {
            try {
                return Json.of(objectMapper.writeValueAsString(source));
            } catch (JsonProcessingException e) {
                throw new RuntimeException(e);
            }
        }
    }

    @ReadingConverter
    static class JsonToJsonNodeConverter implements Converter<Json, JsonNode> {

        private final ObjectMapper objectMapper;

        public JsonToJsonNodeConverter(ObjectMapper objectMapper) {
            this.objectMapper = objectMapper;
        }

        @Override
        public JsonNode convert(Json source) {
            try {
                return objectMapper.readTree(source.asString());
            } catch (JsonProcessingException e) {
                throw new RuntimeException(e);
            }
        }
    }
}
