/* ================================================================
   ANDRÉS BOTTA — Desarrollador Web Premium
   main.js — Main Application Script (vanilla JS, no dependencies)
   ================================================================ */

'use strict';

/* ========== LOADER ========== */
(function initLoader() {
    var loader         = document.querySelector('.loader');
    var loaderWrapper  = document.querySelector('.loader-logo-wrapper');
    var loaderProgress = document.querySelector('.loader-progress');
    var loaderPercent  = document.querySelector('.loader-percent');
    var devLetters     = document.querySelectorAll('.loader-dev span');

    if (!loader || !loaderWrapper || !loaderProgress || !loaderPercent) {
        initScrollAnimations();
        return;
    }

    // Hide hero elements until loader finishes
    var heroHiddenEls = document.querySelectorAll('.hero-eyebrow, .hero-title-line span, .hero-description, .hero-cta, .hero-scroll, .hero-code');
    heroHiddenEls.forEach(function(el) { el.style.opacity = '0'; });

    // Loader entrance
    loaderWrapper.classList.add('loader-enter');
    devLetters.forEach(function(letter, i) {
        letter.style.animationDelay = (0.2 + i * 0.08) + 's';
        letter.classList.add('loader-letter-enter');
    });
    loaderPercent.style.animationDelay = '0.15s';
    loaderPercent.classList.add('loader-enter');

    // Progress bar animation
    var startTime = performance.now();
    var duration = 400;
    var delay = 200; // Wait for letters to appear

    function animateProgress(now) {
        var elapsed = now - startTime - delay;
        if (elapsed < 0) {
            requestAnimationFrame(animateProgress);
            return;
        }
        var t = Math.min(elapsed / duration, 1);
        // ease inOut (power2)
        t = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        loaderProgress.style.width = (t * 100) + '%';
        loaderPercent.textContent = Math.round(t * 100) + '%';

        if (t < 1) {
            requestAnimationFrame(animateProgress);
        } else {
            // Progress done — slide loader up
            setTimeout(function() {
                loader.classList.add('loader-exit');
                loader.addEventListener('animationend', function() {
                    loader.style.display = 'none';
                    heroHiddenEls.forEach(function(el) { el.style.opacity = ''; });
                    initScrollAnimations();
                    initCodeTyping();
                }, { once: true });
            }, 150);
        }
    }

    requestAnimationFrame(animateProgress);
})();


/* ========== CODE TYPING EFFECT ========== */
(function() {
    window.initCodeTyping = function() {
        var codeLines = document.querySelectorAll('.code-line');
        if (!codeLines.length) return;

        var posEl = document.querySelector('.code-status-pos');

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            var staticData = [
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
            codeLines.forEach(function(line, i) {
                if (staticData[i]) {
                    line.classList.add('visible');
                    var textSpan = line.querySelector('.code-text');
                    if (textSpan) textSpan.textContent = staticData[i];
                }
            });
            if (posEl) posEl.textContent = 'Ln 11, Col 2';
            return;
        }

        var codeData = [
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

        var currentLine = 0;
        var currentChar = 0;
        var isTyping = false;
        var cursor = document.createElement('span');
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


/* ========== MOBILE MENU ========== */
(function initMobileMenu() {
    var menuToggle = document.querySelector('.menu-toggle');
    var mobileNav  = document.querySelector('.mobile-nav');
    var closeBtn   = document.querySelector('.mobile-nav-close');

    if (!menuToggle || !mobileNav) return;

    var navLinks = mobileNav.querySelectorAll('.mobile-nav-links a');
    var navFooter = mobileNav.querySelector('.mobile-nav-footer');

    function openMenu() {
        menuToggle.classList.add('active');
        mobileNav.classList.add('open');
        menuToggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';

        // Stagger nav links with CSS transition-delay
        navLinks.forEach(function(link, i) {
            link.style.transitionDelay = (0.15 + i * 0.06) + 's';
        });
        if (navFooter) navFooter.style.transitionDelay = '0.4s';
    }

    function closeMenu() {
        menuToggle.classList.remove('active');
        mobileNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';

        // Reset delays
        navLinks.forEach(function(link) { link.style.transitionDelay = ''; });
        if (navFooter) navFooter.style.transitionDelay = '';
    }

    menuToggle.addEventListener('click', function() {
        mobileNav.classList.contains('open') ? closeMenu() : openMenu();
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', closeMenu);
    }

    mobileNav.querySelectorAll('.mobile-nav-links a, .mobile-nav-cta').forEach(function(link) {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
            closeMenu();
        }
    });
})();


/* ========== FAQ ACCORDION ========== */
(function initFaqAccordion() {
    var faqQuestions = document.querySelectorAll('.faq-question');
    var faqItems = document.querySelectorAll('.faq-item');
    if (!faqQuestions.length) return;

    faqQuestions.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var item     = btn.parentElement;
            var isActive = item.classList.contains('active');

            faqItems.forEach(function(i) { i.classList.remove('active'); });
            faqQuestions.forEach(function(b) { b.setAttribute('aria-expanded', 'false'); });

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
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var magneticBtns = document.querySelectorAll('.magnetic-btn');
    if (!magneticBtns.length) return;

    magneticBtns.forEach(function(btn) {
        var span = btn.querySelector('span');
        var btnX = 0, btnY = 0, targetX = 0, targetY = 0;
        var spanX = 0, spanY = 0, spanTargetX = 0, spanTargetY = 0;
        var isHovering = false;
        var rafId = null;
        var cachedRect = null;

        function lerp(current, target, factor) {
            return current + (target - current) * factor;
        }

        function animate() {
            if (isHovering) {
                btnX = lerp(btnX, targetX, 0.15);
                btnY = lerp(btnY, targetY, 0.15);
                spanX = lerp(spanX, spanTargetX, 0.15);
                spanY = lerp(spanY, spanTargetY, 0.15);
            } else {
                btnX = lerp(btnX, 0, 0.12);
                btnY = lerp(btnY, 0, 0.12);
                spanX = lerp(spanX, 0, 0.12);
                spanY = lerp(spanY, 0, 0.12);
            }

            btn.style.transform = 'translate(' + btnX.toFixed(1) + 'px,' + btnY.toFixed(1) + 'px)';
            if (span) span.style.transform = 'translate(' + spanX.toFixed(1) + 'px,' + spanY.toFixed(1) + 'px)';

            if (isHovering || Math.abs(btnX) > 0.1 || Math.abs(btnY) > 0.1) {
                rafId = requestAnimationFrame(animate);
            } else {
                btn.style.transform = '';
                if (span) span.style.transform = '';
                rafId = null;
            }
        }

        btn.addEventListener('mouseenter', function() {
            cachedRect = btn.getBoundingClientRect();
        });

        btn.addEventListener('mousemove', function(e) {
            if (!cachedRect) cachedRect = btn.getBoundingClientRect();
            var x = e.clientX - cachedRect.left - cachedRect.width / 2;
            var y = e.clientY - cachedRect.top  - cachedRect.height / 2;

            targetX = x * 0.3;
            targetY = y * 0.3;
            spanTargetX = x * 0.1;
            spanTargetY = y * 0.1;

            isHovering = true;
            if (!rafId) rafId = requestAnimationFrame(animate);
        }, { passive: true });

        btn.addEventListener('mouseleave', function() {
            isHovering = false;
            cachedRect = null;
            if (!rafId) rafId = requestAnimationFrame(animate);
        });
    });
})();


/* ========== SCROLL ANIMATIONS ========== */
function initScrollAnimations() {
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // — Hero entrance (CSS animation classes)
    var heroEyebrow = document.querySelector('.hero-eyebrow');
    var heroTitleSpans = document.querySelectorAll('.hero-title-line span');
    var heroDesc = document.querySelector('.hero-description');
    var heroCta = document.querySelector('.hero-cta');
    var heroScroll = document.querySelector('.hero-scroll');
    var heroCode = document.querySelector('.hero-code');

    if (heroEyebrow) heroEyebrow.classList.add('hero-anim-fade');
    heroTitleSpans.forEach(function(span, i) {
        span.style.animationDelay = (0.4 + i * 0.1) + 's';
        span.classList.add('hero-anim-slide-up');
    });
    if (heroDesc) { heroDesc.style.animationDelay = '0.4s'; heroDesc.classList.add('hero-anim-fade'); }
    if (heroCta) { heroCta.style.animationDelay = '0.5s'; heroCta.classList.add('hero-anim-fade'); }
    if (heroScroll) { heroScroll.style.animationDelay = '0.7s'; heroScroll.classList.add('hero-anim-fade'); }
    if (heroCode) {
        heroCode.style.animationDelay = '0.3s';
        heroCode.classList.add(window.innerWidth > 1200 ? 'hero-anim-code-desktop' : 'hero-anim-code-mobile');
    }

    // — Scroll-triggered reveals (IntersectionObserver)
    var revealConfigs = [
        { selector: '.section-header', children: true, stagger: 0.15, y: 50 },
        { selector: '.service-card', stagger: 0.1, y: 60 },
        { selector: '.process-step', stagger: 0.15, y: 40 },
        { selector: '.project-image', x: -60, y: 0 },
        { selector: '.project-info', children: true, stagger: 0.1, delay: 0.2, y: 40 },
        { selector: '.certification-card', stagger: 0.1, y: 40 },
        { selector: '.testimonial-card', stagger: 0.15, y: 50 },
        { selector: '.faq-item', stagger: 0.1, y: 30 },
        { selector: '.about-image-wrapper', x: -80, y: 0 },
        { selector: '.about-content .section-label, .about-title, .about-subtitle, .about-description, .about-stats, .about-cta', stagger: 0.1, delay: 0.2, y: 40 },
        { selector: '.cta-title, .cta-description, .cta-buttons', stagger: 0.15, y: 50 },
        { selector: '.coverage-subtitle', y: 30 },
        { selector: '.coverage-card', stagger: 0.08, y: 30 },
        { selector: '.blog-home .blog-card', stagger: 0.12, y: 40 },
        { selector: '.blog-home-cta', y: 30 }
    ];

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0, rootMargin: '0px 0px -20% 0px' });

    revealConfigs.forEach(function(config) {
        var elements = document.querySelectorAll(config.selector);
        if (!elements.length) return;

        elements.forEach(function(el) {
            var targets = config.children ? Array.from(el.children) : [el];

            targets.forEach(function(target, i) {
                // Set initial transform direction
                if (config.x) {
                    target.classList.add('reveal', 'reveal-left');
                    target.style.setProperty('--reveal-x', config.x + 'px');
                } else {
                    target.classList.add('reveal');
                    target.style.setProperty('--reveal-y', (config.y || 50) + 'px');
                }

                // Calculate stagger delay
                var delay = (config.delay || 0) + (config.stagger ? i * config.stagger : 0);
                if (delay > 0) target.style.transitionDelay = delay + 's';

                observer.observe(target);
            });
        });
    });

    // — Hero parallax (scroll-linked, desktop only)
    var heroGrad1 = document.querySelector('.hero-gradient-1');
    var heroGrad2 = document.querySelector('.hero-gradient-2');
    var heroSection = document.querySelector('.hero');

    if (heroGrad1 && heroGrad2 && heroSection && window.innerWidth > 768
        && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        var grad1Y = 0, grad1Target = 0;
        var grad2Y = 0, grad2Target = 0;
        var parallaxRaf = null;
        var cachedHeroH = heroSection.offsetHeight;
        var scrollDirty = true;

        window.addEventListener('resize', function() {
            cachedHeroH = heroSection.offsetHeight;
        }, { passive: true });

        window.addEventListener('scroll', function() {
            scrollDirty = true;
            if (!parallaxRaf) parallaxRaf = requestAnimationFrame(updateParallax);
        }, { passive: true });

        function updateParallax() {
            var rect = heroSection.getBoundingClientRect();
            if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
                parallaxRaf = null;
                return;
            }
            if (scrollDirty) {
                var progress = Math.max(0, Math.min(1, -rect.top / cachedHeroH));
                grad1Target = progress * 200;
                grad2Target = progress * -150;
                scrollDirty = false;
            }
            grad1Y += (grad1Target - grad1Y) * 0.1;
            grad2Y += (grad2Target - grad2Y) * 0.1;

            if (Math.abs(grad1Target - grad1Y) < 0.1 && Math.abs(grad2Target - grad2Y) < 0.1) {
                grad1Y = grad1Target;
                grad2Y = grad2Target;
                heroGrad1.style.transform = 'translateY(' + grad1Y.toFixed(1) + 'px)';
                heroGrad2.style.transform = 'translateY(' + grad2Y.toFixed(1) + 'px)';
                parallaxRaf = null;
                return;
            }
            heroGrad1.style.transform = 'translateY(' + grad1Y.toFixed(1) + 'px)';
            heroGrad2.style.transform = 'translateY(' + grad2Y.toFixed(1) + 'px)';
            parallaxRaf = requestAnimationFrame(updateParallax);
        }

        parallaxRaf = requestAnimationFrame(updateParallax);
    }
}


/* ========== SMOOTH SCROLL ========== */
(function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
        anchor.addEventListener('click', function(e) {
            var href = this.getAttribute('href');
            if (href === '#') return;
            var targetEl = document.querySelector(href);
            if (targetEl) {
                e.preventDefault();
                var top = targetEl.getBoundingClientRect().top + window.scrollY - 80;
                window.scrollTo({ top: top, behavior: 'smooth' });
                if (!targetEl.hasAttribute('tabindex')) targetEl.setAttribute('tabindex', '-1');
                targetEl.focus({ preventScroll: true });
            }
        });
    });
})();


/* ========== STICKY HEADER + FLOATING BUTTONS + SCROLL PROGRESS ========== */
(function initScrollUI() {
    var header = document.querySelector('.header');
    var whatsappBtn = document.querySelector('.whatsapp-float');
    var backToTopBtn = document.querySelector('.back-to-top');
    var progressBar = document.querySelector('.scroll-progress-bar');

    var ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(function() {
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
                if (progressBar) {
                    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
                    var progress = docHeight > 0 ? scrollY / docHeight : 0;
                    progressBar.style.transform = 'scaleX(' + Math.min(progress, 1) + ')';
                }
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
})();


/* ========== ACTIVE NAV HIGHLIGHT ========== */
(function initActiveNav() {
    var sections = document.querySelectorAll('section[id]');
    var navLinks = document.querySelectorAll('.header-nav .nav-link[href^="#"]');
    if (!sections.length || !navLinks.length) return;

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                var id = entry.target.id;
                navLinks.forEach(function(link) {
                    var isActive = link.getAttribute('href') === '#' + id;
                    link.classList.toggle('active', isActive);
                    if (isActive) {
                        link.setAttribute('aria-current', 'true');
                    } else {
                        link.removeAttribute('aria-current');
                    }
                });
            }
        });
    }, { rootMargin: '-40% 0px -60% 0px' });

    sections.forEach(function(section) {
        observer.observe(section);
    });
})();


/* ========== THEME TOGGLE ========== */
(function initThemeToggle() {
    var toggle = document.querySelector('.theme-toggle');
    if (!toggle) return;

    var meta = document.querySelector('meta[name="theme-color"]');
    var root = document.documentElement;

    function applyTheme(theme) {
        root.setAttribute('data-theme', theme);
        if (meta) meta.setAttribute('content', theme === 'light' ? '#ebedf2' : '#06080f');

        // Swap logo images (dark version for light theme, original for dark)
        var suffix = theme === 'light' ? '-dark' : '';
        var logos = document.querySelectorAll('.header-logo-img, .footer-logo-img');
        for (var i = 0; i < logos.length; i++) {
            var img = logos[i];
            var pic = img.closest('picture');
            var src = pic ? pic.querySelector('source[type="image/webp"]') : null;
            img.src = img.src.replace(/logo-andres-botta(-dark)?\.png/, 'logo-andres-botta' + suffix + '.png');
            if (src) src.srcset = src.srcset.replace(/logo-andres-botta(-dark)?\.webp/, 'logo-andres-botta' + suffix + '.webp');
        }
    }

    // Read stored or OS preference (anti-FOUC script already set data-theme,
    // but we re-apply here to sync meta theme-color)
    var stored = localStorage.getItem('theme');
    if (!stored) {
        stored = 'dark';
    }
    applyTheme(stored);

    toggle.addEventListener('click', function() {
        var current = root.getAttribute('data-theme') || 'dark';
        var next = current === 'dark' ? 'light' : 'dark';

        // Enable coordinated transition on ALL elements
        root.classList.add('theme-transitioning');

        // Fade out logos before swap, then fade in after
        var logos = document.querySelectorAll('.header-logo-img, .footer-logo-img');
        for (var i = 0; i < logos.length; i++) logos[i].style.opacity = '0';

        setTimeout(function() {
            applyTheme(next);
            localStorage.setItem('theme', next);
            for (var i = 0; i < logos.length; i++) logos[i].style.opacity = '';
        }, 150);

        // Remove transition class after animation completes
        setTimeout(function() {
            root.classList.remove('theme-transitioning');
        }, 350);
    });
})();


/* ========== ANIMATED COUNTERS ========== */
(function initCounters() {
    var statNumbers = document.querySelectorAll('.about-stat-number');
    if (!statNumbers.length) return;

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            observer.unobserve(el);

            var text = el.textContent.trim();
            var prefix = '';
            var suffix = '';
            var endValue = 0;

            // Parse formats like "50+", "5+", "100%", "99/100"
            if (text.indexOf('/') !== -1) {
                var parts = text.split('/');
                endValue = parseInt(parts[0]);
                suffix = '/' + parts[1];
            } else {
                var match = text.match(/^([^\d]*)(\d+)(.*)$/);
                if (match) {
                    prefix = match[1];
                    endValue = parseInt(match[2]);
                    suffix = match[3];
                } else {
                    return;
                }
            }

            if (prefersReducedMotion) return; // Keep original text

            var duration = 1200;
            var startTime = null;
            el.textContent = prefix + '0' + suffix;

            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                var progress = Math.min((timestamp - startTime) / duration, 1);
                // Ease out cubic
                var eased = 1 - Math.pow(1 - progress, 3);
                var current = Math.round(endValue * eased);
                el.textContent = prefix + current + suffix;
                if (progress < 1) requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        });
    }, { threshold: 0.5 });

    statNumbers.forEach(function(el) { observer.observe(el); });
})();


/* ========== SERVICE WORKER REGISTRATION ========== */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').catch(function() {});
    });
}
