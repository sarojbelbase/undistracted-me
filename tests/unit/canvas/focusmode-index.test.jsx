/**
 * Tests for FocusMode/index.jsx (the main focus mode view).
 *
 * The Focus Mode was redesigned into zones (TopZone/CenterZone/BottomZone/
 * LeftZone/RightZone/BottomRightZone). This suite mocks the zones and the heavy
 * hooks so we can smoke-test the FocusMode shell: it renders, wires onExit to
 * the Escape key, and renders a full-screen overlay.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// ── Mock heavy dependencies ────────────────────────────────────────────────

vi.mock("../../../app/store", () => ({
  useSettingsStore: vi.fn((selector) => {
    const state = { cardStyle: "glass", accent: "Matte Black" };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("../../../app/utilities/unsplash", () => ({
  getBgSource: vi.fn(() => "default"),
  setBgSource: vi.fn(),
}));

vi.mock("../../../app/components/FocusMode/hooks", () => ({
  useFocusPhoto: vi.fn(() => ({
    photo: null, slotA: null, slotB: null, activeSlot: "a", rotate: vi.fn(),
  })),
  useFocusTasks: vi.fn(() => ({ tasks: [], loading: false })),
  useWakeLock: vi.fn(),
  useCenterOnDark: vi.fn(() => ({ clock: false, search: false, greet: false })),
}));

vi.mock("../../../app/components/FocusMode/theme", () => ({
  getFMCardVars: vi.fn(() => ({})),
  FM_ORB_BG: "#000",
}));

vi.mock("../../../app/constants/accents", () => ({
  getFMAccentVars: vi.fn(() => ({})),
}));

vi.mock("../../../app/constants/orbPalettes", () => ({
  getOrbRgbById: vi.fn(() => "255,255,255"),
}));

vi.mock("../../../app/components/ui/OrbBackground", () => ({
  OrbBackground: () => <div data-testid="orb-background" />,
}));

vi.mock("../../../app/components/FocusMode/config", () => ({
  ZONES: {
    top: { enable: true },
    center: { enable: true },
    bottom: { enable: true },
    left: { enable: true },
    right: { enable: true },
    bottomRight: { enable: true },
  },
}));

vi.mock("../../../app/components/FocusMode/zones/TopZone", () => ({
  TopZone: ({ onExit }) => (
    <div data-testid="top-zone">
      <button data-testid="exit-btn" onClick={onExit}>Exit</button>
    </div>
  ),
}));
vi.mock("../../../app/components/FocusMode/zones/CenterZone", () => ({
  CenterZone: () => <div data-testid="center-zone" />,
}));
vi.mock("../../../app/components/FocusMode/zones/BottomZone", () => ({
  BottomZone: () => <div data-testid="bottom-zone" />,
}));
vi.mock("../../../app/components/FocusMode/zones/LeftZone", () => ({
  LeftZone: () => <div data-testid="left-zone" />,
}));
vi.mock("../../../app/components/FocusMode/zones/RightZone", () => ({
  RightZone: () => <div data-testid="right-zone" />,
}));
vi.mock("../../../app/components/FocusMode/zones/BottomRightZone", () => ({
  BottomRightZone: () => <div data-testid="bottom-right-zone" />,
}));

import { FocusMode } from "../../../app/components/FocusMode/index";

describe("FocusMode", () => {
  let onExit;

  beforeEach(() => {
    onExit = vi.fn();
    Object.defineProperty(document, "fullscreenElement", {
      value: null,
      configurable: true,
      writable: true,
    });
  });

  it("renders without crashing", () => {
    expect(() => render(<FocusMode onExit={onExit} />)).not.toThrow();
  });

  it("renders the zone layout", () => {
    render(<FocusMode onExit={onExit} />);
    expect(screen.getByTestId("top-zone")).toBeTruthy();
    expect(screen.getByTestId("center-zone")).toBeTruthy();
    expect(screen.getByTestId("bottom-zone")).toBeTruthy();
    expect(screen.getByTestId("left-zone")).toBeTruthy();
    expect(screen.getByTestId("right-zone")).toBeTruthy();
    expect(screen.getByTestId("bottom-right-zone")).toBeTruthy();
  });

  it("calls onExit when Escape key is pressed", () => {
    render(<FocusMode onExit={onExit} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onExit).toHaveBeenCalledOnce();
  });

  it("renders a full-screen overlay container", () => {
    const { container } = render(<FocusMode onExit={onExit} />);
    const root = container.firstChild;
    expect(root).toBeTruthy();
    expect(root.className).toContain("fixed");
  });
});
