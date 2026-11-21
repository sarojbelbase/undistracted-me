/**
 * Tests for the pomodoro presence hook used by the Note Mode ambient strip.
 * Verifies it surfaces a running session from localStorage and hides itself
 * otherwise (paused / elapsed / no session).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import { usePomodoroPresence } from "../../../app/hooks/usePomodoroPresence";

const Harness = () => {
  const p = usePomodoroPresence();
  return (
    <div data-testid="presence">
      {p ? `${p.sessionType}:${p.remaining}` : "none"}
    </div>
  );
};

const seed = (overrides = {}) => {
  localStorage.setItem(
    "fm_pomodoro",
    JSON.stringify({
      running: true,
      remaining: 300,
      endTime: Date.now() + 300_000,
      total: 1500,
      preset: "25 min",
      sessionType: "focus",
      soundEnabled: true,
      ...overrides,
    })
  );
};

const read = () => document.querySelector('[data-testid="presence"]')?.textContent;

describe("usePomodoroPresence", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("chrome", { runtime: { id: "test", sendMessage: vi.fn() } });
  });
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("returns null when no session is running", () => {
    render(<Harness />);
    expect(read()).toBe("none");
  });

  it("returns the running session (focus)", () => {
    seed({ endTime: Date.now() + 300_000 });
    render(<Harness />);
    expect(read()).toBe("focus:300");
  });

  it("returns the running session (break)", () => {
    seed({ sessionType: "break", endTime: Date.now() + 300_000 });
    render(<Harness />);
    expect(read()).toBe("break:300");
  });

  it("returns null when the session is not running", () => {
    seed({ running: false });
    render(<Harness />);
    expect(read()).toBe("none");
  });

  it("returns null when the session has elapsed", () => {
    seed({ endTime: Date.now() - 1000 });
    render(<Harness />);
    expect(read()).toBe("none");
  });
});
