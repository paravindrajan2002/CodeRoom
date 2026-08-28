package videoInterview.Interview.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import videoInterview.Interview.dto.execution.ExecutionRequest;
import videoInterview.Interview.dto.execution.ExecutionResponse;
import videoInterview.Interview.entity.Question;
import videoInterview.Interview.entity.TestCase;
import videoInterview.Interview.repository.QuestionRepository;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ExecutionService {

    @Value("${executor.api.url:https://api.onlinecompiler.io}")
    private String executorApiUrl;

    @Value("${executor.api.key:}")
    private String executorApiKey;

    private final RestTemplate restTemplate;
    private final QuestionRepository questionRepository;

    public ExecutionResponse execute(ExecutionRequest request) {

        if (executorApiKey.isBlank()) {
            return errorResponse("Executor API key is not configured", false);
        }

        if (request.getQuestionId() != null) {

            // Fetch test cases from DB
            Question question = questionRepository
                    .findByIdWithTestCases(request.getQuestionId())
                    .orElseThrow(() -> new RuntimeException("Question not found"));

            List<TestCase> testCases = question.getTestCases().stream()
                    .filter(tc -> request.isSubmitAll() || !tc.isHidden())
                    .limit(request.isSubmitAll() ? Long.MAX_VALUE : 3)
                    .toList();

            return executeTestCases(request, testCases);
        }

        return executeSingle(request.getCode(), request.getLanguage(), request.getStdin());
    }

    private ExecutionResponse executeTestCases(ExecutionRequest request, List<TestCase> testCases) {
        List<ExecutionResponse.TestCaseResult> results = new ArrayList<>();
        StringBuilder errors = new StringBuilder();
        int totalTimeMs = 0;
        boolean timedOut = false;

        for (TestCase testCase : testCases) {
            ExecutionResponse providerResponse = executeSingle(
                    request.getCode(), request.getLanguage(), testCase.getInput());
            boolean passed = providerResponse.isPassed()
                    && normalize(providerResponse.getStdout()).equals(normalize(testCase.getExpectedOutput()));
            totalTimeMs += providerResponse.getExecutionTimeMs() == null
                    ? 0
                    : providerResponse.getExecutionTimeMs();
                timedOut |= providerResponse.isTimedOut();

            String actualOutput = testCase.isHidden() ? "hidden" : providerResponse.getStdout();
            String expectedOutput = testCase.isHidden() ? "hidden" : testCase.getExpectedOutput();
            String input = testCase.isHidden() ? "hidden" : testCase.getInput();
            results.add(new ExecutionResponse.TestCaseResult(
                    input,
                    expectedOutput,
                    actualOutput,
                    passed,
                    providerResponse.getStderr(),
                    providerResponse.getExecutionTimeMs()));

            if (providerResponse.getStderr() != null && !providerResponse.getStderr().isBlank()) {
                errors.append(providerResponse.getStderr()).append('\n');
            }
        }

        ExecutionResponse response = new ExecutionResponse();
        response.setPassed(results.stream().allMatch(result -> result.isPassed()));
        response.setTimedOut(timedOut);
        response.setExecutionTimeMs(totalTimeMs);
        response.setResults(results);
        response.setSummary(results.stream().filter(result -> result.isPassed()).count()
                + "/" + results.size() + " passed");
        response.setStderr(errors.toString().trim());
        return response;
    }

    private ExecutionResponse executeSingle(String code, String language, String input) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("compiler", compilerFor(language));
        payload.put("code", code);
        payload.put("input", input == null ? "" : input);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set(HttpHeaders.AUTHORIZATION, executorApiKey);
            ResponseEntity<OnlineCompilerResponse> response = restTemplate.postForEntity(
                    executorApiUrl + "/api/run-code-sync/",
                    new HttpEntity<>(payload, headers),
                    OnlineCompilerResponse.class);

            OnlineCompilerResponse body = response.getBody();
            if (body == null) {
                return errorResponse("OnlineCompiler returned an empty response", false);
            }

            ExecutionResponse result = new ExecutionResponse();
            result.setStdout(body.output);
            result.setStderr(body.error);
            result.setPassed("success".equalsIgnoreCase(body.status) && body.exitCode != null && body.exitCode == 0);
            result.setTimedOut(body.exitCode != null && (body.exitCode == 124 || body.exitCode == 137));
            result.setExecutionTimeMs(toMilliseconds(body.total != null ? body.total : body.time));
            result.setResults(new ArrayList<>());
            return result;
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            return errorResponse("OnlineCompiler error: " + e.getResponseBodyAsString(), false);
        } catch (org.springframework.web.client.ResourceAccessException e) {
            return errorResponse("OnlineCompiler is unreachable: " + e.getMessage(), false);
        } catch (Exception e) {
            return errorResponse("Execution failed: " + e.getMessage(), false);
        }
    }

    private String compilerFor(String language) {
        return switch (language == null ? "" : language.toUpperCase(Locale.ROOT)) {
            case "PYTHON" -> "python-3.14";
            case "JAVA" -> "openjdk-25";
            case "CPP" -> "g++-15";
            case "GO" -> "go-1.26";
            case "JAVASCRIPT" -> "typescript-deno";
            default -> throw new IllegalArgumentException("Unsupported language: " + language);
        };
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().replace("\r\n", "\n");
    }

    private Integer toMilliseconds(String seconds) {
        if (seconds == null || seconds.isBlank()) {
            return 0;
        }
        return (int) Math.round(Double.parseDouble(seconds) * 1000);
    }

    private ExecutionResponse errorResponse(String message, boolean timedOut) {
        ExecutionResponse response = new ExecutionResponse();
        response.setStderr(message);
        response.setPassed(false);
        response.setTimedOut(timedOut);
        response.setResults(new ArrayList<>());
        return response;
    }

    private static class OnlineCompilerResponse {
        public String output;
        public String error;
        public String status;
        public Integer exitCode;
        public String time;
        public String total;
    }
}