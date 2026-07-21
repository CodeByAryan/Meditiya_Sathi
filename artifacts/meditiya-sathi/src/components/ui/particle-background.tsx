import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Orb {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: string;
}

interface ParticleBackgroundProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'mixed';
}

export default function ParticleBackground({ className, variant = 'mixed' }: ParticleBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let orbs: Orb[] = [];

    const colors = {
      primary: 'hsla(29, 100%, 50%, 0.15)',
      secondary: 'hsla(224, 64%, 33%, 0.12)',
      accent: 'hsla(44, 100%, 48%, 0.12)',
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.min(Math.floor((canvas.width * canvas.height) / 25000), 15);
      orbs = Array.from({ length: count }, () => {
        const colorChoices = variant === 'primary' 
          ? [colors.primary, colors.accent]
          : variant === 'secondary'
          ? [colors.secondary, colors.accent]
          : [colors.primary, colors.secondary, colors.accent];
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: Math.random() * 120 + 60,
          opacity: Math.random() * 0.3 + 0.1,
          color: colorChoices[Math.floor(Math.random() * colorChoices.length)],
        };
      });
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      orbs.forEach((orb) => {
        orb.x += orb.vx;
        orb.y += orb.vy;

        if (orb.x < -orb.radius) orb.x = canvas.width + orb.radius;
        if (orb.x > canvas.width + orb.radius) orb.x = -orb.radius;
        if (orb.y < -orb.radius) orb.y = canvas.height + orb.radius;
        if (orb.y > canvas.height + orb.radius) orb.y = -orb.radius;

        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(1, 'transparent');

        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [variant]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 pointer-events-none", className)}
      aria-hidden="true"
    />
  );
}
