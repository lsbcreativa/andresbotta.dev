/* ================================================================
   ANDRÉS BOTTA — Desarrollador Web Premium
   main.js — Main Application Script
   ================================================================
   Dependencies: GSAP 3.12+, ScrollTrigger, ScrollToPlugin
   ================================================================ */

'use strict';

/* ========== LOADER ========== */
(function initLoader() {
    const loader         = document.querySelector('.loader');
    const loaderWrapper  = document.querySelector('.loader-logo-wrapper');
    const loaderProgress = document.querySelector('.loader-progress');
    const loaderPercent  = document.querySelector('.loader-percent');
    const devLetters     = document.querySelectorAll('.loader-dev span');

    if (!loader || !loaderWrapper || !loaderProgress || !loaderPercent) {
        // Landing pages without loader — init animations directly
        initScrollAnimations();
        return;
    }

    gsap.set([loaderWrapper, loaderPercent], { opacity: 0, y: 20 });
    gsap.set(devLetters, { opacity: 0, y: 15 });

    const loaderTl = gsap.timeline();

    loaderTl
        .to(loaderWrapper, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' })
        .to(devLetters, {
            opacity: 1,
            y: 0,
            duration: 0.25,
            stagger: 0.08,
            ease: 'back.out(1.7)'
        }, '-=0.1')
        .to(loaderPercent, { opacity: 1, y: 0, duration: 0.2, ease: 'power3.out' }, '-=0.15')
        .to(loaderProgress, {
            width: '100%',
            duration: 0.8,
            ease: 'power2.inOut',
            onUpdate: function () {
                const progress = Math.round(this.progress() * 100);
                loaderPercent.textContent = progress + '%';
            }
        })
        .call(() => {
            gsap.set('.hero-eyebrow', { opacity: 0, y: 30 });
            gsap.set('.hero-title-line span', { yPercent: 100 });
            gsap.set('.hero-description', { opacity: 0, y: 30 });
            gsap.set('.hero-cta', { opacity: 0, y: 30 });
            gsap.set('.hero-scroll', { opacity: 0 });
        })
        .to(loader, {
            yPercent: -100,
            duration: 0.5,
            ease: 'power4.inOut',
            delay: 0.15
        })
        .call(() => {
            loader.style.display = 'none';
            initScrollAnimations();
            initCodeTyping();
        });
})();


/* ========== CODE TYPING EFFECT ========== */
(function() {
    window.initCodeTyping = function() {
        const codeLines = document.querySelectorAll('.code-line');
        if (!codeLines.length) return;

        const posEl = document.querySelector('.code-status-pos');

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const staticData = [
                '// Deploy web profesional',
                'async function deploy(config) {',
                '  const site = await build({',
                '    nombre: "Tu Empresa",',
                '    tipo: "web premium",',
                '    rendimiento: "99/100",',
                '  });',
                '  await site.optimize("SEO");',
                '  console.log("\u2713 Deploy exitoso");',
                '  return site.url;',
                '}'
            ];
            codeLines.forEach((line, i) => {
                if (staticData[i]) {
                    line.classList.add('visible');
                    const textSpan = line.querySelector('.code-text');
                    if (textSpan) textSpan.textContent = staticData[i];
                }
            });
            if (posEl) posEl.textContent = 'Ln 11, Col 2';
            return;
        }

        const codeData = [
            '<span class="cm">// Deploy web profesional</span>',
            '<span class="kw">async function</span> <span class="fn">deploy</span>(config) {',
            '  <span class="kw">const</span> <span class="prop">site</span> <span class="op">=</span> <span class="kw">await</span> <span class="fn">build</span>({',
            '    <span class="prop">nombre</span>: <span class="str">"Tu Empresa"</span>,',
            '    <span class="prop">tipo</span>: <span class="str">"web premium"</span>,',
            '    <span class="prop">rendimiento</span>: <span class="str">"99/100"</span>,',
            '  });',
            '  <span class="kw">await</span> site.<span class="fn">optimize</span>(<span class="str">"SEO"</span>);',
            '  <span class="fn">console</span>.<span class="fn">log</span>(<span class="str">"\u2713 Deploy exitoso"</span>);',
            '  <span class="kw">return</span> site.<span class="prop">url</span>;',
            '}'
        ];

        let currentLine = 0;
        let currentChar = 0;
        let isTyping = false;
        const cursor = document.createElement('span');
        cursor.className = 'code-cursor';

        function updateStatusPos() {
            if (posEl) posEl.textContent = 'Ln ' + (currentLine + 1) + ', Col ' + (currentChar + 1);
        }

        function typeNextChar() {
            if (typingPaused) { needsResume = true; return; }
            if (currentLine >= codeData.length) {
                showTerminal(function() {
                    setTimeout(function() {
                        hideTerminal();
                        setTimeout(function() {
                            resetTyping();
                            startTyping();
                        }, 500);
                    }, 3000);
                });
                return;
            }

            if (currentLine >= codeLines.length) return;

            var line = codeLines[currentLine];
            var textSpan = line.querySelector('.code-text');
            if (!textSpan) return;

            var fullText = codeData[currentLine];

            if (!isTyping) {
                isTyping = true;
                line.classList.add('visible', 'typing');
                textSpan.parentNode.appendChild(cursor);
            }

            if (currentChar < fullText.length) {
                if (fullText[currentChar] === '<') {
                    var tagEnd = fullText.indexOf('>', currentChar);
                    if (tagEnd !== -1) {
                        textSpan.innerHTML = fullText.substring(0, tagEnd + 1);
                        currentChar = tagEnd + 1;
                    }
                } else {
                    textSpan.innerHTML = fullText.substring(0, currentChar + 1);
                    currentChar++;
                }

                updateStatusPos();
                var speed = Math.random() * 30 + 20;
                setTimeout(typeNextChar, speed);
            } else {
                line.classList.remove('typing');
                currentLine++;
                currentChar = 0;
                isTyping = false;
                updateStatusPos();
                setTimeout(typeNextChar, 150);
            }
        }

        function showTerminal(onComplete) {
            var terminal = document.querySelector('.code-terminal');
            if (!terminal) { if (onComplete) onComplete(); return; }

            terminal.style.display = '';
            terminal.offsetHeight;
            terminal.classList.add('visible');

            var lines = terminal.querySelectorAll('.code-terminal-line');
            var totalDelay = 400;

            for (var i = 0; i < lines.length; i++) {
                (function(line, delay) {
                    totalDelay += delay;
                    setTimeout(function() {
                        line.classList.add('visible');
                    }, totalDelay);
                })(lines[i], parseInt(lines[i].getAttribute('data-delay')) || 400);
            }

            totalDelay += 500;
            setTimeout(function() {
                if (onComplete) onComplete();
            }, totalDelay);
        }

        function hideTerminal() {
            var terminal = document.querySelector('.code-terminal');
            if (!terminal) return;
            terminal.classList.remove('visible');
            var lines = terminal.querySelectorAll('.code-terminal-line');
            for (var i = 0; i < lines.length; i++) {
                lines[i].classList.remove('visible');
            }
            setTimeout(function() {
                terminal.style.display = 'none';
            }, 400);
        }

        function resetTyping() {
            currentLine = 0;
            currentChar = 0;
            isTyping = false;
            codeLines.forEach(function(line) {
                line.classList.remove('visible', 'typing');
                var textSpan = line.querySelector('.code-text');
                if (textSpan) textSpan.textContent = '';
            });
            if (cursor.parentNode) cursor.remove();
            if (posEl) posEl.textContent = 'Ln 1, Col 1';
            hideTerminal();
        }

        function startTyping() {
            setTimeout(typeNextChar, 800);
        }

        var heroCode = document.querySelector('.hero-code');
        var typingPaused = false;
        var needsResume = false;

        if (heroCode && 'IntersectionObserver' in window) {
            var observer = new IntersectionObserver(function(entries) {
                var visible = entries[0].isIntersecting;
                typingPaused = !visible;
                if (visible && needsResume) {
                    needsResume = false;
                    typeNextChar();
                }
            }, { threshold: 0 });
            observer.observe(heroCode);
            setTimeout(startTyping, 2000);
        } else if (heroCode) {
            setTimeout(startTyping, 2000);
        }
    };
})();


/* ========== CUSTOM CURSOR (dot + ring) ========== */
/* Cursor desactivado — se usa cursor nativo del sistema */


/* ========== MOBILE MENU ========== */
(function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileNav  = document.querySelector('.mobile-nav');
    const closeBtn   = document.querySelector('.mobile-nav-close');

    if (!menuToggle || !mobileNav) return;

    var navLinks = mobileNav.querySelectorAll('.mobile-nav-links a');
    var navFooter = mobileNav.querySelector('.mobile-nav-footer');
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function openMenu() {
        menuToggle.classList.add('active');
        mobileNav.classList.add('open');
        menuToggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';

        if (!prefersReducedMotion && typeof gsap !== 'undefined') {
            gsap.fromTo(navLinks,
                { opacity: 0, x: -30 },
                { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out', stagger: 0.06, delay: 0.15 }
            );
            if (navFooter) {
                gsap.fromTo(navFooter,
                    { opacity: 0, y: 20 },
                    { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', delay: 0.4 }
                );
            }
        }
    }

    function closeMenu() {
        menuToggle.classList.remove('active');
        mobileNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';

        gsap.set(navLinks, { clearProps: 'opacity,x' });
        if (navFooter) gsap.set(navFooter, { clearProps: 'opacity,y' });
    }

    menuToggle.addEventListener('click', () => {
        mobileNav.classList.contains('open') ? closeMenu() : openMenu();
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', closeMenu);
    }

    mobileNav.querySelectorAll('.mobile-nav-links a, .mobile-nav-cta').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
            closeMenu();
        }
    });
})();


/* ========== FAQ ACCORDION ========== */
(function initFaqAccordion() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    const faqItems = document.querySelectorAll('.faq-item');
    if (!faqQuestions.length) return;

    faqQuestions.forEach(btn => {
        btn.addEventListener('click', () => {
            const item     = btn.parentElement;
            const isActive = item.classList.contains('active');

            // Close all items
            faqItems.forEach(i => i.classList.remove('active'));
            faqQuestions.forEach(b => b.setAttribute('aria-expanded', 'false'));

            // Toggle current
            if (!isActive) {
                item.classList.add('active');
                btn.setAttribute('aria-expanded', 'true');
            }
        });
    });
})();


/* ========== MAGNETIC BUTTONS ========== */
(function initMagneticButtons() {
    if (window.matchMedia('(hover: none)').matches) return;

    const magneticBtns = document.querySelectorAll('.magnetic-btn');
    if (!magneticBtns.length) return;

    magneticBtns.forEach(btn => {
        const span = btn.querySelector('span');
        let ticking = false;

        btn.addEventListener('mousemove', (e) => {
            if (ticking) return;
            ticking = true;

            requestAnimationFrame(() => {
                const rect = btn.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top  - rect.height / 2;

                gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.3, ease: 'power2.out' });
                if (span) {
                    gsap.to(span, { x: x * 0.1, y: y * 0.1, duration: 0.3, ease: 'power2.out' });
                }
                ticking = false;
            });
        }, { passive: true });

        btn.addEventListener('mouseleave', () => {
            gsap.to(btn, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
            if (span) {
                gsap.to(span, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
            }
        });
    });
})();


/* ========== GSAP SCROLL ANIMATIONS ========== */
function initScrollAnimations() {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // — Hero entrance
    const heroTl = gsap.timeline();
    heroTl
        .fromTo('.hero-eyebrow',
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' })
        .fromTo('.hero-title-line span',
            { yPercent: 100 },
            { yPercent: 0, duration: 1, ease: 'power4.out', stagger: 0.1 }, '-=0.4')
        .fromTo('.hero-description',
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.6')
        .fromTo('.hero-cta',
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5')
        .fromTo('.hero-scroll',
            { opacity: 0 },
            { opacity: 1, duration: 0.6 }, '-=0.3')
        .fromTo('.hero-code',
            { opacity: 0, y: window.innerWidth <= 1200 ? 30 : 0, x: window.innerWidth > 1200 ? 50 : 0, scale: 0.95 },
            { opacity: 1, y: 0, x: 0, scale: 1, duration: 1, ease: 'power3.out' },
            '-=1');

    // — Section headers
    gsap.utils.toArray('.section-header').forEach(header => {
        gsap.from(header.children, {
            scrollTrigger: { trigger: header, start: 'top 80%' },
            opacity: 0, y: 50, duration: 0.8, ease: 'power3.out', stagger: 0.15
        });
    });

    // — Service cards
    gsap.from('.service-card', {
        scrollTrigger: { trigger: '.services-grid', start: 'top 70%' },
        opacity: 0, y: 60, duration: 0.8, ease: 'power3.out',
        stagger: { amount: 0.6, grid: [2, 3], from: 'start' }
    });

    // — Process steps
    gsap.from('.process-step', {
        scrollTrigger: { trigger: '.process-grid', start: 'top 70%' },
        opacity: 0, y: 40, duration: 0.7, ease: 'power3.out', stagger: 0.15
    });

    // — Project items
    gsap.utils.toArray('.project-item').forEach(item => {
        const image = item.querySelector('.project-image');
        const info  = item.querySelector('.project-info');

        gsap.from(image, {
            scrollTrigger: { trigger: item, start: 'top 70%' },
            opacity: 0, x: -60, duration: 1, ease: 'power3.out'
        });

        gsap.from(info.children, {
            scrollTrigger: { trigger: item, start: 'top 70%' },
            opacity: 0, y: 40, duration: 0.8, ease: 'power3.out', stagger: 0.1, delay: 0.2
        });
    });

    // — Certifications
    gsap.fromTo('.certification-card',
        { opacity: 0, y: 40 },
        {
            scrollTrigger: { trigger: '.certifications-grid', start: 'top 85%', toggleActions: 'play none none none' },
            opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.1
        }
    );

    // — Testimonials
    gsap.from('.testimonial-card', {
        scrollTrigger: { trigger: '.testimonials-grid', start: 'top 70%' },
        opacity: 0, y: 50, duration: 0.8, ease: 'power3.out', stagger: 0.15
    });

    // — FAQ
    gsap.from('.faq-item', {
        scrollTrigger: { trigger: '.faq-container', start: 'top 75%' },
        opacity: 0, y: 30, duration: 0.6, ease: 'power3.out', stagger: 0.1
    });

    // — About section
    gsap.from('.about-image-wrapper', {
        scrollTrigger: { trigger: '.about', start: 'top 70%' },
        opacity: 0, x: -80, duration: 1, ease: 'power3.out'
    });

    gsap.from('.about-content .section-label, .about-title, .about-subtitle, .about-description, .about-stats, .about-cta', {
        scrollTrigger: { trigger: '.about', start: 'top 70%' },
        opacity: 0, y: 40, duration: 0.8, ease: 'power3.out', stagger: 0.1, delay: 0.2
    });

    // — CTA
    gsap.from('.cta-title, .cta-description, .cta-buttons', {
        scrollTrigger: { trigger: '.cta', start: 'top 70%' },
        opacity: 0, y: 50, duration: 0.8, ease: 'power3.out', stagger: 0.15
    });

    // — Hero parallax
    gsap.to('.hero-gradient-1', {
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
        y: 200, ease: 'none'
    });

    gsap.to('.hero-gradient-2', {
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 },
        y: -150, ease: 'none'
    });
}


/* ========== SMOOTH SCROLL ========== */
(function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetEl = document.querySelector(this.getAttribute('href'));
            if (targetEl) {
                gsap.to(window, {
                    duration: 0.4,
                    scrollTo: { y: targetEl, offsetY: 80 },
                    ease: 'power1.out'
                });
            }
        });
    });
})();


/* ========== STICKY HEADER + FLOATING BUTTONS ========== */
(function initScrollUI() {
    var header = document.querySelector('.header');
    var whatsappBtn = document.querySelector('.whatsapp-float');
    var backToTopBtn = document.querySelector('.back-to-top');

    var ticking = false;
    window.addEventListener('scroll', function () {
        if (!ticking) {
            requestAnimationFrame(function () {
                var scrollY = window.scrollY;
                if (header) {
                    if (scrollY > 100) {
                        header.classList.add('header-scrolled');
                    } else {
                        header.classList.remove('header-scrolled');
                    }
                }
                var scrolled = scrollY > 500;
                if (whatsappBtn) whatsappBtn.classList.toggle('visible', scrolled);
                if (backToTopBtn) backToTopBtn.classList.toggle('visible', scrolled);
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function () {
            gsap.to(window, { scrollTo: 0, duration: 0.4, ease: 'power1.out' });
        });
    }
})();


/* ========== ACTIVE NAV HIGHLIGHT ========== */
(function initActiveNav() {
    var sections = document.querySelectorAll('section[id]');
    var navLinks = document.querySelectorAll('.header-nav .nav-link[href^="#"]');
    if (!sections.length || !navLinks.length) return;

    sections.forEach(function (section) {
        ScrollTrigger.create({
            trigger: section,
            start: 'top 40%',
            end: 'bottom 40%',
            onToggle: function (self) {
                if (self.isActive) {
                    navLinks.forEach(function (link) {
                        link.classList.remove('active');
                        if (link.getAttribute('href') === '#' + section.id) {
                            link.classList.add('active');
                        }
                    });
                }
            }
        });
    });
})();
