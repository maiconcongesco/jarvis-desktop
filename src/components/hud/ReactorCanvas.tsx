import { useEffect, useRef } from 'react';

export type HudEstado = 'ocioso' | 'ouvindo' | 'pensando' | 'falando' | 'erro';

const COR = {
  holo: '127, 231, 255',
  tenue: '42, 111, 134',
  falha: '255, 90, 95',
};

interface Props {
  estado: HudEstado;
  nivel: number;
  className?: string;
}

/** Reator em canvas (portado de `hud.js`), respeita prefers-reduced-motion. */
export function ReactorCanvas({ estado, nivel, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const estadoRef = useRef(estado);
  const nivelRef = useRef(nivel);
  estadoRef.current = estado;
  nivelRef.current = nivel;

  useEffect(() => {
    const tela = canvasRef.current;
    if (!tela) return;
    const ctx = tela.getContext('2d');
    if (!ctx) return;

    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');
    let lado = 0;
    let giro = 0;
    let suave = 0;
    let erroAte = 0;
    let raf = 0;
    let alive = true;

    const medir = () => {
      const caixa = tela.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      lado = Math.round(caixa.width * dpr);
      tela.width = lado;
      tela.height = lado;
    };
    medir();
    window.addEventListener('resize', medir);

    const desenhar = (t: number) => {
      if (!alive) return;
      raf = requestAnimationFrame(desenhar);
      if (!lado) return;
      const quieto = semMovimento.matches;
      const est = estadoRef.current;
      const niv = nivelRef.current;
      if (est === 'erro') erroAte = performance.now() + 100;
      const c = lado / 2;
      const r = lado * 0.46;
      suave += (niv - suave) * 0.25;
      const respiro = quieto ? 0.5 : 0.5 + 0.5 * Math.sin(t / 1400);
      const cor = performance.now() < erroAte || est === 'erro' ? COR.falha : COR.holo;
      const energia =
        est === 'ouvindo' || est === 'falando'
          ? 0.35 + suave * 0.65
          : 0.18 + respiro * 0.12;
      if (!quieto) giro += est === 'pensando' ? 0.045 : 0.004 + suave * 0.03;

      ctx.clearRect(0, 0, lado, lado);
      ctx.save();
      ctx.translate(c, c);

      const bobinas = 10;
      for (let i = 0; i < bobinas; i++) {
        const ini = (i / bobinas) * Math.PI * 2 + giro * 0.3;
        const fim = ini + (Math.PI * 2) / bobinas - 0.07;
        const acesa = est === 'ouvindo' ? (i / bobinas < suave * 1.4 ? 1 : 0.25) : energia;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.92, ini, fim);
        ctx.lineWidth = r * 0.085;
        ctx.strokeStyle = `rgba(${cor}, ${0.15 + acesa * 0.75})`;
        ctx.stroke();
      }

      ctx.save();
      ctx.rotate(-giro);
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * Math.PI * 2;
        const longo = i % 5 === 0;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74);
        ctx.lineTo(
          Math.cos(a) * r * (longo ? 0.68 : 0.71),
          Math.sin(a) * r * (longo ? 0.68 : 0.71),
        );
        ctx.lineWidth = Math.max(1, r * 0.008);
        ctx.strokeStyle = `rgba(${COR.tenue}, ${longo ? 0.9 : 0.55})`;
        ctx.stroke();
      }
      ctx.restore();

      if (est === 'pensando') {
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.6, giro * 2, giro * 2 + Math.PI * 0.6);
        ctx.lineWidth = r * 0.03;
        ctx.strokeStyle = `rgba(${cor}, 0.9)`;
        ctx.stroke();
      }

      const nucleo = r * (0.3 + energia * 0.12);
      const luz = ctx.createRadialGradient(0, 0, 0, 0, 0, nucleo * 1.9);
      luz.addColorStop(0, `rgba(235, 252, 255, ${0.55 + energia * 0.45})`);
      luz.addColorStop(0.35, `rgba(${cor}, ${0.35 + energia * 0.5})`);
      luz.addColorStop(1, `rgba(${cor}, 0)`);
      ctx.fillStyle = luz;
      ctx.beginPath();
      ctx.arc(0, 0, nucleo * 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, nucleo, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(1.5, r * 0.012);
      ctx.strokeStyle = `rgba(${cor}, 0.95)`;
      ctx.stroke();
      ctx.restore();
    };
    raf = requestAnimationFrame(desenhar);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', medir);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
