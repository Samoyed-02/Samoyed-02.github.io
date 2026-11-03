// Stack 테마가 모든 페이지에서 자동으로 불러오는 사용자 스크립트 (layouts/_partials/footer/components/script.html)
import Lenis from 'lenis';

// Lenis가 가로채지 않고 네이티브 스크롤을 유지할 영역
// - #TableOfContents: 우측 목차 위젯 (scrollspy가 자체적으로 스크롤)
// - #main-menu: 모바일 메뉴
// - .pswp: 이미지 확대 보기(PhotoSwipe)
const NATIVE_SCROLL_SELECTOR = '#TableOfContents, #main-menu, .pswp';

function setupSmoothScroll(): void {
    // 움직임 줄이기 설정 사용자에게는 적용하지 않는다.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
        autoRaf: true,
        lerp: 0.1, // 기술블로그 가독성을 위해 약하게
        smoothWheel: true,
        syncTouch: false, // 모바일 터치는 기본 스크롤 유지
        allowNestedScroll: true,
        prevent: (node: HTMLElement) => node.closest?.(NATIVE_SCROLL_SELECTOR) != null
    });

    // 테마의 smoothAnchors.ts는 네이티브 smooth scrollTo를 사용해 Lenis와 충돌한다.
    // 캡처 단계에서 먼저 가로채 Lenis로 이동시키고, 테마 핸들러까지 이벤트가 가지 않게 한다.
    document.addEventListener(
        'click',
        (event: MouseEvent) => {
            if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            const link = (event.target as Element | null)?.closest?.('a[href^="#"]');
            if (!link) return;

            const hash = link.getAttribute('href')!;
            const id = decodeURIComponent(hash.slice(1));
            const target = id ? document.getElementById(id) : null;
            if (!target) return;

            event.preventDefault();
            event.stopPropagation();
            window.history.pushState({}, '', hash);
            lenis.scrollTo(target);
        },
        { capture: true }
    );

    // 이미지 확대 보기가 열려 있는 동안 뒤쪽 페이지 스크롤을 멈춘다.
    new MutationObserver(() => {
        if (document.querySelector('.pswp--open')) lenis.stop();
        else lenis.start();
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
}

setupSmoothScroll();
