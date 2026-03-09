"use client";

import { useEffect, useRef } from "react";

/**
 * ThreatMesh — A WebGL-like canvas that renders a 3D-looking
 * rotating icosphere wireframe with pulsing "threat nodes".
 * Pure canvas, zero dependencies beyond React.
 */
export default function ThreatMesh() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0;
    let H = 0;
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      W = canvas!.clientWidth;
      H = canvas!.clientHeight;
      canvas!.width = W * dpr;
      canvas!.height = H * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // Generate icosphere vertices
    const PHI = (1 + Math.sqrt(5)) / 2;
    const baseVerts: [number, number, number][] = [
      [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
      [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
      [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1],
    ];

    // Normalize to unit sphere
    const vertices = baseVerts.map(([x, y, z]) => {
      const l = Math.sqrt(x * x + y * y + z * z);
      return [x / l, y / l, z / l] as [number, number, number];
    });

    // Subdivide once for more detail
    const faces: [number, number, number][] = [
      [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
      [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
      [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
      [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
    ];

    const midpointCache: Record<string, number> = {};
    function getMidpoint(a: number, b: number): number {
      const key = Math.min(a, b) + "-" + Math.max(a, b);
      if (midpointCache[key] !== undefined) return midpointCache[key];
      const [ax, ay, az] = vertices[a];
      const [bx, by, bz] = vertices[b];
      let mx = (ax + bx) / 2, my = (ay + by) / 2, mz = (az + bz) / 2;
      const l = Math.sqrt(mx * mx + my * my + mz * mz);
      mx /= l; my /= l; mz /= l;
      vertices.push([mx, my, mz]);
      midpointCache[key] = vertices.length - 1;
      return vertices.length - 1;
    }

    // Subdivide twice
    let currentFaces = [...faces];
    for (let sub = 0; sub < 2; sub++) {
      const newFaces: [number, number, number][] = [];
      for (const [a, b, c] of currentFaces) {
        const ab = getMidpoint(a, b);
        const bc = getMidpoint(b, c);
        const ca = getMidpoint(c, a);
        newFaces.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
      }
      currentFaces = newFaces;
    }

    // Collect unique edges
    const edgeSet = new Set<string>();
    const edges: [number, number][] = [];
    for (const [a, b, c] of currentFaces) {
      for (const [p, q] of [[a, b], [b, c], [c, a]]) {
        const key = Math.min(p, q) + "-" + Math.max(p, q);
        if (!edgeSet.has(key)) {
          edgeSet.add(key);
          edges.push([p, q]);
        }
      }
    }

    // Random "threat nodes" — vertices that pulse red
    const threatNodes = new Set<number>();
    for (let i = 0; i < 12; i++) {
      threatNodes.add(Math.floor(Math.random() * vertices.length));
    }

    let time = 0;
    const mouse = { x: 0.5, y: 0.5 };

    const onMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX / W;
      mouse.y = e.clientY / H;
    };
    window.addEventListener("mousemove", onMouseMove);

    function project(x: number, y: number, z: number): [number, number, number] {
      const perspective = 3.5;
      const scale = Math.min(W, H) * 0.35;
      const factor = perspective / (perspective + z);
      return [
        W / 2 + x * scale * factor,
        H / 2 + y * scale * factor,
        factor,
      ];
    }

    function rotateY(x: number, y: number, z: number, a: number): [number, number, number] {
      const c = Math.cos(a), s = Math.sin(a);
      return [x * c + z * s, y, -x * s + z * c];
    }

    function rotateX(x: number, y: number, z: number, a: number): [number, number, number] {
      const c = Math.cos(a), s = Math.sin(a);
      return [x, y * c - z * s, y * s + z * c];
    }

    function draw() {
      time += 0.003;
      ctx!.clearRect(0, 0, W, H);

      const rotYAngle = time + (mouse.x - 0.5) * 0.5;
      const rotXAngle = 0.3 + (mouse.y - 0.5) * 0.3;

      // Transform vertices
      const projected = vertices.map(([vx, vy, vz]) => {
        let [x, y, z] = rotateY(vx, vy, vz, rotYAngle);
        [x, y, z] = rotateX(x, y, z, rotXAngle);
        return project(x, y, z);
      });

      // Draw edges
      for (const [a, b] of edges) {
        const [ax, ay, af] = projected[a];
        const [bx, by, bf] = projected[b];
        const avgDepth = (af + bf) / 2;
        const alpha = 0.03 + avgDepth * 0.08;

        ctx!.beginPath();
        ctx!.moveTo(ax, ay);
        ctx!.lineTo(bx, by);
        ctx!.strokeStyle = `rgba(255, 60, 60, ${alpha})`;
        ctx!.lineWidth = 0.5;
        ctx!.stroke();
      }

      // Draw vertices
      for (let i = 0; i < vertices.length; i++) {
        const [px, py, pf] = projected[i];
        const isThreat = threatNodes.has(i);
        const pulse = isThreat ? 0.5 + 0.5 * Math.sin(time * 3 + i) : 0;

        if (isThreat) {
          // Glow
          const grad = ctx!.createRadialGradient(px, py, 0, px, py, 12 * pf);
          grad.addColorStop(0, `rgba(255, 60, 60, ${0.4 * pulse})`);
          grad.addColorStop(1, "transparent");
          ctx!.fillStyle = grad;
          ctx!.beginPath();
          ctx!.arc(px, py, 12 * pf, 0, Math.PI * 2);
          ctx!.fill();

          // Core dot
          ctx!.fillStyle = `rgba(255, 80, 80, ${0.6 + pulse * 0.4})`;
          ctx!.beginPath();
          ctx!.arc(px, py, 2.5 * pf, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          const alpha = 0.05 + pf * 0.1;
          ctx!.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx!.beginPath();
          ctx!.arc(px, py, 1 * pf, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // Draw subtle ring around sphere
      const ringAlpha = 0.03 + 0.02 * Math.sin(time * 2);
      ctx!.beginPath();
      ctx!.arc(W / 2, H / 2, Math.min(W, H) * 0.36, 0, Math.PI * 2);
      ctx!.strokeStyle = `rgba(255, 60, 60, ${ringAlpha})`;
      ctx!.lineWidth = 1;
      ctx!.stroke();

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.7 }}
      aria-hidden="true"
    />
  );
}
