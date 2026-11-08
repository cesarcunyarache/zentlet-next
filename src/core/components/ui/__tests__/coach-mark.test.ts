// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CoachMark } from "../coach-mark";

const baseProps = { target: '[data-tour="demo"]', title: "Título", body: "Cuerpo", dismissLabel: "Entendido" };

function mark(overrides: { isOpen?: boolean; onDismiss?: () => void } = {}) {
  return createElement(CoachMark, { isOpen: true, onDismiss: vi.fn(), ...baseProps, ...overrides });
}

function addTarget() {
  const element = document.createElement("div");
  element.setAttribute("data-tour", "demo");
  document.body.append(element);
  return element;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("CoachMark", () => {
  it("muestra el mensaje junto al elemento señalado", () => {
    addTarget();
    render(mark());
    act(() => vi.advanceTimersByTime(50));

    expect(screen.getByRole("dialog", { name: "Título" })).toBeTruthy();
    expect(screen.getByText("Cuerpo")).toBeTruthy();
  });

  it("no muestra nada si el elemento señalado no existe", () => {
    render(mark());
    act(() => vi.advanceTimersByTime(50));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("cerrado no muestra nada aunque el elemento exista", () => {
    addTarget();
    render(mark({ isOpen: false }));
    act(() => vi.advanceTimersByTime(50));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("el botón y Escape lo descartan", () => {
    addTarget();
    const onDismiss = vi.fn();
    render(mark({ onDismiss }));
    act(() => vi.advanceTimersByTime(50));

    fireEvent.click(screen.getByRole("button", { name: "Entendido" }));
    fireEvent.keyDown(document, { key: "Escape" });

    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it("aparece si el elemento llega después de abrirse", () => {
    render(mark());
    act(() => vi.advanceTimersByTime(50));
    expect(screen.queryByRole("dialog")).toBeNull();

    addTarget();
    act(() => vi.advanceTimersByTime(600));

    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
