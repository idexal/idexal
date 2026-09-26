import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { resolveAiSdkModelRetryOptions } from "./retry-policy.js";

/**
 * 重试预算决定"同模型重试多少次才放弃"，是 fallback 的第一级：预算耗尽才轮得到换模型。
 * `maxAttempts` 含首次请求，而环境变量按业界习惯配的是重试次数，这个换算最容易写错，
 * 所以在这里钉住默认值、env 换算和非法输入的退路。
 */
describe("resolveAiSdkModelRetryOptions", () => {
  it("defaults to ten retries plus the first attempt", () => {
    const options = resolveAiSdkModelRetryOptions({}, {});
    assert.equal(options.maxAttempts, 11);
    assert.equal(options.baseDelayMs, 2_000);
    assert.equal(options.backoffFactor, 2);
    assert.equal(options.maxDelayMs, 60_000);
    assert.equal(options.jitter, true);
  });

  it("converts the IDEXAL_MODEL_RETRY_MAX_RETRIES count into attempts including the first", () => {
    const options = resolveAiSdkModelRetryOptions({}, {
      IDEXAL_MODEL_RETRY_MAX_RETRIES: "3",
    });
    assert.equal(options.maxAttempts, 4);
  });

  it("lets explicit options win over the environment", () => {
    const options = resolveAiSdkModelRetryOptions(
      { baseDelayMs: 500, maxAttempts: 2 },
      { IDEXAL_MODEL_RETRY_BASE_DELAY_MS: "9000", IDEXAL_MODEL_RETRY_MAX_RETRIES: "9" },
    );
    assert.equal(options.maxAttempts, 2);
    assert.equal(options.baseDelayMs, 500);
  });

  it("ignores malformed environment values instead of collapsing the budget", () => {
    const options = resolveAiSdkModelRetryOptions({}, {
      IDEXAL_MODEL_RETRY_BASE_DELAY_MS: "  ",
      IDEXAL_MODEL_RETRY_MAX_DELAY_MS: "not-a-number",
      IDEXAL_MODEL_RETRY_BACKOFF_FACTOR: "-1",
    });
    assert.equal(options.baseDelayMs, 2_000);
    assert.equal(options.maxDelayMs, 60_000);
    assert.equal(options.backoffFactor, 2);
  });

  it("allows a zero delay so tests and local runs can retry instantly", () => {
    const options = resolveAiSdkModelRetryOptions({ baseDelayMs: 0 }, {});
    assert.equal(options.baseDelayMs, 0);
  });

  it("never lets maxAttempts drop below the single first request", () => {
    const options = resolveAiSdkModelRetryOptions({ maxAttempts: 0 }, {});
    assert.equal(options.maxAttempts, 1);
  });
});
