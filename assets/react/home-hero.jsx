import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Aurora from './components/Aurora.jsx';
import BlurText from './components/BlurText.jsx';

const AURORA_COLORS = {
  dark: ['#3A29FF', '#22D3EE', '#A855F7'],
  light: ['#6366F1', '#38BDF8', '#C084FC']
};

// Stack 테마는 <html data-scheme="dark|light">를 설정하고 onColorSchemeChange 이벤트를 보낸다.
const readScheme = () => (document.documentElement.dataset.scheme === 'dark' ? 'dark' : 'light');

function useColorScheme() {
  const [scheme, setScheme] = useState(readScheme);
  useEffect(() => {
    const onChange = () => setScheme(readScheme());
    window.addEventListener('onColorSchemeChange', onChange);
    return () => window.removeEventListener('onColorSchemeChange', onChange);
  }, []);
  return scheme;
}

function HomeHero({ title, subtitle }) {
  const scheme = useColorScheme();
  const isLight = scheme === 'light';

  return (
    <>
      <div className="home-hero__bg" aria-hidden="true">
        <Aurora
          colorStops={AURORA_COLORS[scheme]}
          amplitude={1.1}
          blend={0.55}
          speed={0.6}
          height={0.6}
          lightMode={isLight}
        />
      </div>
      <div className="home-hero__content">
        {/* BlurText는 <p>를 렌더링하므로 제목 의미를 role로 유지한다. */}
        <div role="heading" aria-level={1}>
          <BlurText
            text={title}
            className="home-hero__title"
            animateBy="letters"
            direction="top"
            delay={60}
            trigger="load"
          />
        </div>
        {subtitle && (
          <BlurText
            text={subtitle}
            className="home-hero__subtitle"
            animateBy="words"
            direction="bottom"
            delay={120}
            trigger="load"
          />
        )}
      </div>
    </>
  );
}

const el = document.getElementById('home-hero');
if (el) {
  const { title = '', subtitle = '' } = el.dataset;
  el.classList.add('is-hydrated');
  // 서버에서 렌더링된 정적 fallback(h1/p)을 React 화면으로 교체한다.
  createRoot(el).render(<HomeHero title={title} subtitle={subtitle} />);
}
