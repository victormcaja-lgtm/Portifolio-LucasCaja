import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Reveal } from "@/components/ui/Reveal";
import {
  getObservedTargets,
  getObserverInstances,
  isObserved,
  triggerIntersection,
  uninstallIntersectionObserver,
} from "@/test/intersection-observer";
import { mockReducedMotion } from "@/test/match-media";

function renderReveal(props: { className?: string; delayMs?: number } = {}) {
  const utils = render(
    <Reveal {...props}>
      <p>Conteúdo revelado</p>
    </Reveal>,
  );
  const child = screen.getByText("Conteúdo revelado");
  const wrapper = child.closest<HTMLElement>("[data-revealed]");
  expect(wrapper).not.toBeNull();
  return { ...utils, child, wrapper: wrapper! };
}

describe("Reveal", () => {
  it("CA-09: renderiza os filhos dentro de wrapper com data-revealed=\"false\"", () => {
    const { wrapper } = renderReveal();
    expect(wrapper).toHaveAttribute("data-revealed", "false");
  });

  it("CA-09: observa o wrapper (ou um elemento dele) com IntersectionObserver", () => {
    const { wrapper } = renderReveal();
    const targets = getObservedTargets();
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.some((t) => t === wrapper || wrapper.contains(t))).toBe(true);
  });

  it("CA-09: continua oculto se a entrada não está intersectando", () => {
    const { wrapper } = renderReveal();
    triggerIntersection(undefined, false);
    expect(wrapper).toHaveAttribute("data-revealed", "false");
  });

  it('CA-09: ao entrar na viewport passa a data-revealed="true" e deixa de observar', () => {
    const { wrapper } = renderReveal();
    const [target] = getObservedTargets();
    triggerIntersection();
    expect(wrapper).toHaveAttribute("data-revealed", "true");
    expect(isObserved(target)).toBe(false);
  });

  it("CA-09: desconecta o observer ao desmontar", () => {
    const { unmount } = renderReveal();
    const instances = getObserverInstances();
    expect(instances.length).toBeGreaterThan(0);
    unmount();
    for (const io of instances) {
      expect(io.disconnect).toHaveBeenCalled();
    }
    expect(getObservedTargets()).toHaveLength(0);
  });

  it("CA-09: com prefers-reduced-motion: reduce já inicia revelado", () => {
    mockReducedMotion(true);
    const { wrapper } = renderReveal();
    expect(wrapper).toHaveAttribute("data-revealed", "true");
  });

  it("CA-09: sem preferência de movimento reduzido, aguarda a interseção", () => {
    mockReducedMotion(false);
    const { wrapper } = renderReveal();
    expect(wrapper).toHaveAttribute("data-revealed", "false");
  });

  it("CA-09: sem suporte a IntersectionObserver já inicia revelado", () => {
    uninstallIntersectionObserver();
    const { wrapper } = renderReveal();
    expect(wrapper).toHaveAttribute("data-revealed", "true");
  });

  it("aplica className ao wrapper", () => {
    const { wrapper } = renderReveal({ className: "minha-classe" });
    expect(wrapper).toHaveClass("minha-classe");
  });

  it("aceita delayMs sem quebrar a renderização", () => {
    const { wrapper } = renderReveal({ delayMs: 200 });
    expect(wrapper).toHaveTextContent("Conteúdo revelado");
    triggerIntersection();
    expect(wrapper).toHaveAttribute("data-revealed", "true");
  });
});
