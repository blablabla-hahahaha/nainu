package nainu.top.agi.sandbox.local;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import nainu.top.agi.common.exception.ErrorCategory;
import nainu.top.agi.sandbox.SandboxErrorCodes;
import nainu.top.agi.sandbox.SandboxExecuteRequest;
import nainu.top.agi.sandbox.SandboxExecuteResponse;
import nainu.top.agi.sandbox.SandboxLanguage;
import nainu.top.agi.sandbox.SandboxLimits;
import nainu.top.agi.sandbox.SandboxStrategy;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * 本地沙箱策略：在主机起全新子解释器执行（{@code python3} / {@code node}），每次执行全新的临时工作目录
 * 与全新进程，无跨执行状态残留。用于开发与 clone 即跑，隔离最弱（无 OS 级隔离），非生产定位——
 * 需要「禁危险操作 + 强隔离 + 扩缩容」时必须上 {@code kubernetes} 策略。
 */
public class LocalSandboxStrategy implements SandboxStrategy {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    @Override
    public String type() {
        return "local";
    }

    @Override
    public SandboxExecuteResponse execute(SandboxExecuteRequest request) {
        if (request.language() == null) {
            return SandboxExecuteResponse.failure(ErrorCategory.PLATFORM, SandboxErrorCodes.SANDBOX_UNSUPPORTED_LANGUAGE,
                    "缺少脚本语言");
        }
        SandboxLimits limits = request.limitsOrDefault();
        long startedAt = System.currentTimeMillis();
        Path workDir = null;
        try {
            workDir = Files.createTempDirectory("nainu-sandbox-");
            Path paramsFile = workDir.resolve("params.json");
            Path scriptFile = workDir.resolve("script." + extension(request.language()));
            Path outFile = workDir.resolve("out.json");
            MAPPER.writeValue(paramsFile.toFile(), request.params() == null ? Map.of() : request.params());
            Files.writeString(scriptFile, request.script(), StandardCharsets.UTF_8);

            Process process = startProcess(request.language(), workDir, paramsFile, scriptFile, outFile);
            ProcessOutput output = await(process, limits.timeoutMsOrDefault());
            long durationMs = System.currentTimeMillis() - startedAt;
            if (output.timedOut()) {
                return SandboxExecuteResponse.failure(ErrorCategory.PLATFORM, SandboxErrorCodes.SANDBOX_TIMEOUT,
                        "脚本执行超时（> " + limits.timeoutMsOrDefault() + "ms）");
            }
            if (output.exitCode() != 0) {
                return SandboxExecuteResponse.failure(ErrorCategory.AUTHORING, SandboxErrorCodes.SANDBOX_EXECUTION_FAILED,
                        tail(stderrOrStdout(output), 500));
            }
            return SandboxExecuteResponse.success(parseResult(outFile), output.stdout(), output.stderr(), durationMs);
        } catch (IOException e) {
            return SandboxExecuteResponse.failure(ErrorCategory.PLATFORM, SandboxErrorCodes.SANDBOX_INTERNAL,
                    "本地沙箱执行失败: " + e.getMessage());
        } finally {
            delete(workDir);
        }
    }

    private static Process startProcess(SandboxLanguage language, Path workDir, Path paramsFile, Path scriptFile, Path outFile)
            throws IOException {
        ProcessBuilder pb;
        if (language == SandboxLanguage.PYTHON) {
            Path runner = workDir.resolve("run.py");
            Files.writeString(runner, PY_RUNNER, StandardCharsets.UTF_8);
            pb = new ProcessBuilder("python3", runner.toString());
        } else if (language == SandboxLanguage.JAVASCRIPT) {
            Path runner = workDir.resolve("run.js");
            Files.writeString(runner, JS_RUNNER, StandardCharsets.UTF_8);
            pb = new ProcessBuilder("node", runner.toString());
        } else {
            throw new IllegalArgumentException("不支持的沙箱语言: " + language);
        }
        pb.environment().put("SANDBOX_PARAMS_FILE", paramsFile.toString());
        pb.environment().put("SANDBOX_SCRIPT_FILE", scriptFile.toString());
        pb.environment().put("SANDBOX_OUT_FILE", outFile.toString());
        pb.redirectErrorStream(false);
        return pb.start();
    }

    private static ProcessOutput await(Process process, long timeoutMs) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ByteArrayOutputStream err = new ByteArrayOutputStream();
        Thread outThread = consume(process.getInputStream(), out);
        Thread errThread = consume(process.getErrorStream(), err);
        boolean finished;
        try {
            finished = process.waitFor(timeoutMs, TimeUnit.MILLISECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            process.destroyForcibly();
            return ProcessOutput.timedOutResult();
        }
        if (!finished) {
            process.destroyForcibly();
            joinQuietly(outThread);
            joinQuietly(errThread);
            return ProcessOutput.timedOutResult();
        }
        joinQuietly(outThread);
        joinQuietly(errThread);
        return new ProcessOutput(process.exitValue(), out.toString(StandardCharsets.UTF_8), err.toString(StandardCharsets.UTF_8));
    }

    private static Thread consume(InputStream input, ByteArrayOutputStream buffer) {
        Thread t = new Thread(() -> {
            byte[] chunk = new byte[8192];
            int n;
            try {
                while ((n = input.read(chunk)) != -1) {
                    buffer.write(chunk, 0, n);
                }
            } catch (IOException ignored) {
                // 进程被强制结束或流关闭，停止读取。
            }
        });
        t.setDaemon(true);
        t.start();
        return t;
    }

    private static Map<String, Object> parseResult(Path outFile) throws IOException {
        if (!Files.exists(outFile)) {
            return Map.of();
        }
        String json = Files.readString(outFile, StandardCharsets.UTF_8);
        if (json == null || json.isBlank()) {
            return Map.of();
        }
        Map<String, Object> map = MAPPER.readValue(json, new TypeReference<Map<String, Object>>() {
        });
        return map == null ? Map.of() : map;
    }

    private static String extension(SandboxLanguage language) {
        return language == SandboxLanguage.PYTHON ? "py" : "js";
    }

    private static String stderrOrStdout(ProcessOutput output) {
        return output.stderr() != null && !output.stderr().isBlank() ? output.stderr() : output.stdout();
    }

    private static String tail(String s, int max) {
        if (s == null) {
            return "脚本执行失败";
        }
        s = s.trim();
        if (s.isEmpty()) {
            return "脚本执行失败";
        }
        return s.length() <= max ? s : s.substring(s.length() - max);
    }

    private static void joinQuietly(Thread t) {
        try {
            t.join(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private static void delete(Path workDir) {
        if (workDir == null) {
            return;
        }
        try {
            Files.walk(workDir).sorted(java.util.Comparator.reverseOrder()).forEach(p -> {
                try {
                    Files.deleteIfExists(p);
                } catch (IOException ignored) {
                    // 清理尽力而为，不因残留文件失败。
                }
            });
        } catch (IOException ignored) {
            // 清理尽力而为。
        }
    }

    private record ProcessOutput(int exitCode, String stdout, String stderr) {

        static ProcessOutput timedOutResult() {
            return new ProcessOutput(-1, "", "");
        }

        boolean timedOut() {
            return exitCode == -1;
        }
    }

    private static final String PY_RUNNER = """
            import json, os, sys
            with open(os.environ['SANDBOX_PARAMS_FILE'], 'r', encoding='utf-8') as f:
                params = json.load(f)
            g = {'params': params}
            with open(os.environ['SANDBOX_SCRIPT_FILE'], 'r', encoding='utf-8') as f:
                src = f.read()
            exec(compile(src, 'script.py', 'exec'), g)
            main = g.get('main')
            if main is None:
                print('main() 未定义', file=sys.stderr)
                sys.exit(3)
            result = main()
            with open(os.environ['SANDBOX_OUT_FILE'], 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False)
            """;

    private static final String JS_RUNNER = """
            const fs = require('fs');
            const vm = require('vm');
            const params = JSON.parse(fs.readFileSync(process.env.SANDBOX_PARAMS_FILE, 'utf8'));
            const src = fs.readFileSync(process.env.SANDBOX_SCRIPT_FILE, 'utf8');
            const sandbox = { params, console };
            vm.createContext(sandbox);
            vm.runInContext(src, sandbox, { filename: 'script.js' });
            if (typeof sandbox.main !== 'function') {
                console.error('main() 未定义');
                process.exit(3);
            }
            const result = sandbox.main();
            fs.writeFileSync(process.env.SANDBOX_OUT_FILE, JSON.stringify(result));
            """;
}
