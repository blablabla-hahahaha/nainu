package nainu.top.agi.model.converter;

import org.springframework.http.codec.ServerSentEvent;

public class SSEConverter {

    public static <T> ServerSentEvent<T> convert(String type, T data) {
        return ServerSentEvent.<T>builder()
                .event(type)
                .data(data)
                .build();
    }
}
