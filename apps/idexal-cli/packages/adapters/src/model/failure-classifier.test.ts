import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { classifyModelFailure } from "./failure-classifier.js";
import { ModelFailureReason, ModelRetryReason } from "@idexal/contracts";

/**
 * 失败分类是模型 fallback 的判定入口：换不换模型只读 `reason` 与 `retryable`，
 * 绝不读错误文本。这些用例把"哪类失败对应哪个 reason"钉住，这样以后调整分类时
 * fallback 触发矩阵会立刻在这里暴露出来，而不是等到线上换错模型。
 */

interface HttpFailureFixture {
  status?: number;
  code?: string;
  message?: string;
  responseHeaders?: Record<string, string>;
}

function httpFailure({
  status,
  code,
  message = "provider request failed",
  responseHeaders,
}: HttpFailureFixture): Error {
  return Object.assign(new Error(message), {
    name: "AI_APICallError",
    ...(status === undefined ? {} : { status }),
    ...(code === undefined ? {} : { code }),
    ...(responseHeaders === undefined ? {} : { responseHeaders }),
  });
}

describe("classifyModelFailure: reasons used by the fallback trigger matrix", () => {
  it("maps 429 to rate_limited and keeps it retryable", () => {
    const failure = classifyModelFailure(httpFailure({ status: 429 }));
    assert.equal(failure.reason, ModelFailureReason.RateLimited);
    assert.equal(failure.retryReason, ModelRetryReason.RateLimited);
    assert.equal(failure.retryable, true);
  });

  it("carries retry-after seconds so the caller can wait instead of hammering", () => {
    const failure = classifyModelFailure(
      httpFailure({ status: 429, responseHeaders: { "retry-after": "3" } }),
    );
    assert.equal(failure.retryAfterMs, 3_000);
  });

  it("maps 529 to provider_overloaded", () => {
    const failure = classifyModelFailure(httpFailure({ status: 529 }));
    assert.equal(failure.reason, ModelFailureReason.ProviderOverloaded);
    assert.equal(failure.retryable, true);
  });

  it("maps 5xx to server_error", () => {
    const failure = classifyModelFailure(httpFailure({ status: 500 }));
    assert.equal(failure.reason, ModelFailureReason.ServerError);
    assert.equal(failure.retryable, true);
  });

  it("maps 401 and 403 to auth_failed and refuses retry", () => {
    for (const status of [401, 403]) {
      const failure = classifyModelFailure(httpFailure({ status }));
      assert.equal(failure.reason, ModelFailureReason.AuthFailed, `status ${status}`);
      assert.equal(failure.retryable, false, `status ${status}`);
    }
  });

  it("maps 400 to invalid_request and refuses retry", () => {
    const failure = classifyModelFailure(httpFailure({ status: 400 }));
    assert.equal(failure.reason, ModelFailureReason.InvalidRequest);
    assert.equal(failure.retryable, false);
  });

  it("maps context window codes to context_exceeded", () => {
    const failure = classifyModelFailure(
      httpFailure({ status: 400, code: "context_length_exceeded" }),
    );
    assert.equal(failure.reason, ModelFailureReason.ContextExceeded);
  });

  it("maps 408 to timeout", () => {
    const failure = classifyModelFailure(httpFailure({ status: 408 }));
    assert.equal(failure.reason, ModelFailureReason.Timeout);
  });

  it("maps a model stream stall to stream_idle_timeout", () => {
    const failure = classifyModelFailure(
      Object.assign(new Error("Model stream stalled: no event received for 90000ms."), {
        name: "ModelStreamIdleTimeoutError",
        code: "MODEL_STREAM_IDLE_TIMEOUT",
      }),
    );
    assert.equal(failure.reason, ModelFailureReason.StreamIdleTimeout);
  });

  it("maps user cancellation to cancelled and never marks it retryable", () => {
    const controller = new AbortController();
    controller.abort();
    const failure = classifyModelFailure(httpFailure({ status: 200 }), controller.signal);
    assert.equal(failure.reason, ModelFailureReason.Cancelled);
    assert.equal(failure.retryable, false);
  });

  it("maps an unrecognisable failure to unknown", () => {
    const failure = classifyModelFailure(new Error("something else entirely"));
    assert.equal(failure.reason, ModelFailureReason.Unknown);
  });
});
