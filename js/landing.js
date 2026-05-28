// ========================================
// WIZE INVOICE - LANDING PAGE
// Animations, Microinteractions, Skeleton Loaders
// ========================================

document.addEventListener('DOMContentLoaded', function() {

    // 1. SCROLL REVEAL ANIMATION (Intersection Observer)
    const revealElements = document.querySelectorAll('section, .feature-card, .pricing-card, .testimonial-card');

    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(el => observer.observe(el));

    // 2. SMOOTH SCROLLING for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });

                // Update URL without jumping
                history.pushState(null, null, targetId);
            }
        });
    });

    // 3. SCROLL TO TOP BUTTON
    const scrollBtn = document.createElement('button');
    scrollBtn.innerHTML = '↑';
    scrollBtn.className = 'scroll-top';
    scrollBtn.setAttribute('aria-label', 'Scroll to top');
    document.body.appendChild(scrollBtn);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 500) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    });

    scrollBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // 4. FEATURE CARD CLICK FEEDBACK
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('click', () => {
            // Add ripple/click feedback
            card.style.transform = 'scale(0.98)';
            setTimeout(() => {
                card.style.transform = '';
            }, 150);
        });
    });

    // 5. PRICING CARD SELECTION (Microinteraction)
    const pricingCards = document.querySelectorAll('.pricing-card');
    pricingCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            // Optional: Add sound or haptic feedback in future
            console.log('Hovering on pricing card');
        });
    });

    // 6. BUTTON RIPPLE EFFECT (already in CSS, but JS fallback)
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const ripple = document.createElement('span');
            ripple.style.position = 'absolute';
            ripple.style.top = `${y}px`;
            ripple.style.left = `${x}px`;
            ripple.style.width = '0';
            ripple.style.height = '0';
            ripple.style.borderRadius = '50%';
            ripple.style.backgroundColor = 'rgba(255,255,255,0.5)';
            ripple.style.transform = 'translate(-50%, -50%)';
            ripple.style.transition = 'width 0.3s, height 0.3s';
            ripple.style.pointerEvents = 'none';

            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);

            setTimeout(() => {
                ripple.style.width = '200px';
                ripple.style.height = '200px';
            }, 10);

            setTimeout(() => {
                ripple.remove();
            }, 300);
        });
    });

    // 7. PARALLAX EFFECT on hero section
    window.addEventListener('scroll', () => {
        const hero = document.querySelector('.hero');
        if (hero) {
            const scrolled = window.scrollY;
            hero.style.backgroundPositionY = `${scrolled * 0.5}px`;
        }
    });

    // 8. LOADING SKELETON (for dynamic content - demo)
    // If you have dynamic testimonials or features loaded from API
    function showSkeleton(containerId, count = 3) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Store original content
        const originalContent = container.innerHTML;

        // Show skeletons
        let skeletons = '';
        for (let i = 0; i < count; i++) {
            skeletons += `
                <div class="skeleton-card">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-text"></div>
                    <div class="skeleton skeleton-text" style="width: 80%;"></div>
                </div>
            `;
        }
        container.innerHTML = skeletons;

        // Simulate loading (remove after 2 seconds)
        setTimeout(() => {
            container.innerHTML = originalContent;
            // Re-observe new elements
            document.querySelectorAll('.testimonial-card').forEach(el => observer.observe(el));
        }, 2000);
    }

    // Uncomment to test skeleton loader on testimonials
    // showSkeleton('testimonials-grid', 3);

    // 9. NAVBAR SCROLL EFFECT
    const navbar = document.querySelector('.navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;

        if (currentScroll > 100) {
            navbar.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
            navbar.style.backdropFilter = 'blur(10px)';
            navbar.style.backgroundColor = 'rgba(255,255,255,0.95)';
        } else {
            navbar.style.boxShadow = 'var(--shadow-sm)';
            navbar.style.backdropFilter = 'none';
            navbar.style.backgroundColor = 'var(--surface)';
        }

        // Hide/show navbar on scroll (for mobile)
        if (window.innerWidth <= 768) {
            if (currentScroll > lastScroll && currentScroll > 200) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }
        }

        lastScroll = currentScroll;
    });

    // 10. LIVE CHAT INTEGRATION (with visitor tracking)
    const user = typeof getCurrentUser !== 'undefined' ? getCurrentUser() : null;
    if (user && window.Tawk_API) {
        window.Tawk_API.visitor = {
            name: user.fullName || user.email,
            email: user.email
        };
    }

    // 11. PRELOADER (Optional - show then hide)
    const preloader = document.createElement('div');
    preloader.className = 'preloader';
    preloader.innerHTML = '<div class="preloader-spinner"></div>';
    preloader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        transition: opacity 0.5s;
    `;

    // Uncomment to enable preloader
    /*
    document.body.appendChild(preloader);
    window.addEventListener('load', () => {
        setTimeout(() => {
            preloader.style.opacity = '0';
            setTimeout(() => preloader.remove(), 500);
        }, 500);
    });
    */

    console.log('Landing page animations initialized');
});
