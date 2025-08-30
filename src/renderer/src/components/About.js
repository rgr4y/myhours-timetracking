import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Text } from './ui';

const Page = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: auto;
  background: #1a1a1a;
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 28px 24px;
  border-bottom: 1px solid #2f2f2f;
  position: relative;
`;

const AppIcon = styled.img`
  width: 96px;
  height: 96px;
  border-radius: 22%;
  box-shadow: 0 6px 24px rgba(0,0,0,0.45);
  margin-bottom: 14px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #ffffff;
  margin: 0 0 6px 0;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #b0b0b0;
  margin: 0 0 2px 0;
`;

const Small = styled.p`
  font-size: 13px;
  color: #8f8f8f;
  margin: 2px 0 0 0;
`;

const Content = styled.div`
  padding: 28px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  max-width: 920px;
  margin: 0 auto;

  @media (min-width: 920px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Card = styled.div`
  background: #232323;
  border: 1px solid #333333;
  border-radius: 12px;
  padding: 20px;
`;

const CardTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
  margin: 0 0 10px 0;
`;

const Link = styled.a`
  color: #7ab4ff;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;

const Footer = styled.div`
  padding: 10px 28px 24px;
  color: #8a8a8a;
  font-size: 12px;
`;

// Lightweight confetti animation. Plays for exactly 2 cycles on mount and whenever the
// document becomes visible while this page is active.
function useConfetti(ref) {
  useEffect(() => {
    if (!ref.current) return;

    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let rafId;
    let running = false;

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * DPR;
      canvas.height = height * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    const colors = ['#ff6b6b', '#ffd166', '#4dccbd', '#7ab4ff', '#c792ea'];

    const createPieces = () => {
      const pieces = [];
      const count = 140;
      for (let i = 0; i < count; i++) {
        pieces.push({
          x: Math.random() * canvas.clientWidth,
          y: -20 - Math.random() * 80,
          w: 6 + Math.random() * 6,
          h: 10 + Math.random() * 10,
          r: Math.random() * Math.PI,
          rv: (Math.random() - 0.5) * 0.2,
          vx: (Math.random() - 0.5) * 1.2,
          vy: 1.8 + Math.random() * 1.4,
          color: colors[(Math.random() * colors.length) | 0],
        });
      }
      return pieces;
    };

    const play = () => {
      if (running) return; // avoid overlapping runs
      running = true;
      const pieces = createPieces();
      const start = performance.now();

      const draw = (t) => {
        const elapsed = t - start;
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        for (const p of pieces) {
          p.x += p.vx; p.y += p.vy; p.r += p.rv;
          p.vy += 0.02; // gravity
          if (p.y > canvas.clientHeight + 20) {
            p.y = -20; p.x = Math.random() * canvas.clientWidth; p.vy = 1.5 + Math.random();
          }
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.r);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
          ctx.restore();
        }
        if (elapsed < 2400 && running) { // ~2 complete cycles
          rafId = requestAnimationFrame(draw);
        } else {
          running = false;
          ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        }
      };

      rafId = requestAnimationFrame(draw);
    };

    // Run on mount
    play();

    // Run again when tab/window becomes visible
    const onVisibility = () => {
      if (document.visibilityState === 'visible') play();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [ref]);
}

const ConfettiCanvas = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

export default function About() {
  const canvasRef = useRef(null);
  const [version, setVersion] = useState('');
  useConfetti(canvasRef);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (window.electronAPI?.invoke) {
          const v = await window.electronAPI.invoke('app:getVersion');
          if (mounted) setVersion(v);
        }
      } catch (_) {}
    })();
    return () => { mounted = false; };
  }, []);

  // Compute icon path for dev (web) vs packaged (file) builds
  const iconSrc = window.location.protocol.startsWith('http')
    ? '/logo512.png'
    : '../../../assets/icon.png';
  return (
    <Page>
      <Header>
        <ConfettiCanvas ref={canvasRef} />
        <AppIcon src={iconSrc} alt="myHours icon" />
        <Title>myHours</Title>
        <Subtitle>Rob Vella</Subtitle>
        {version ? <Small>Version {version}</Small> : null}
      </Header>
      <Content>
        <Card>
          <CardTitle>Project</CardTitle>
          <Text>
            myHours is a lightweight, privacy‑friendly time tracker built with Electron and React. It keeps your data local and helps you turn time into clean, professional invoices.
          </Text>
        </Card>

        <Card>
          <CardTitle>Author</CardTitle>
          <Text>Rob Vella</Text>
          <Text>
            GitHub: {' '}
            <Link
              href="https://github.com/rgr4y/myhours-timetracking"
              onClick={(e) => {
                e.preventDefault();
                const url = 'https://github.com/rgr4y/myhours-timetracking';
                if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
                else window.open(url, '_blank', 'noopener');
              }}
              rel="noreferrer"
            >
              github.com/rgr4y/myhours-timetracking
            </Link>
          </Text>
        </Card>

        <Card>
          <CardTitle>Feedback & Issues</CardTitle>
          <Text>
            Please open issues on GitHub for bugs or suggestions:{' '}
            <Link
              href="https://github.com/rgr4y/myhours-timetracking/issues"
              onClick={(e) => {
                e.preventDefault();
                const url = 'https://github.com/rgr4y/myhours-timetracking/issues';
                if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url);
                else window.open(url, '_blank', 'noopener');
              }}
              rel="noreferrer"
            >
              github.com/rgr4y/myhours-timetracking/issues
            </Link>. I review them as time permits; responses and fixes are best‑effort.
          </Text>
          <Text>
            This software is provided “as is,” without any warranty of any kind. There is no guaranteed support, and use is at your own risk.
          </Text>
        </Card>

        <Card>
          <CardTitle>License</CardTitle>
          <Text>
            GPLv3. You are free to use, study, share, and modify the software under the terms of the GNU General Public License version 3.
          </Text>
        </Card>
      </Content>
      <Footer>
        © 2025 Rob Vella
      </Footer>
    </Page>
  );
}
