// =========================================================
// GLOBAL LOGIC (Runs on all pages)
// =========================================================

// --- 1. Dynamic Footer Copyright Year ---
function initDynamicYear() {
    const currentYear = new Date().getFullYear();
    document.querySelectorAll('.current-year').forEach(el => {
        el.textContent = currentYear;
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDynamicYear);
} else {
    initDynamicYear();
}

// --- 2. Persistent Dark Mode Toggle ---
const themeToggleBtn = document.getElementById('themeToggle');

function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    if (themeToggleBtn) {
        const icon = themeToggleBtn.querySelector('i');
        if (icon) {
            if (isDark) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        }
    }
}

// Initialize theme on page load
const savedTheme = localStorage.getItem('edmith-theme');
const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const initialTheme = savedTheme ? savedTheme : (systemPrefersDark ? 'dark' : 'light');
applyTheme(initialTheme);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', function() {
        const isCurrentlyDark = document.body.classList.contains('dark-mode');
        const newTheme = isCurrentlyDark ? 'light' : 'dark';
        localStorage.setItem('edmith-theme', newTheme);
        applyTheme(newTheme);
    });
}

// Listen for system theme changes if user hasn't set an explicit preference
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('edmith-theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}

// --- 3. Mobile Navigation Drawer Toggle ---
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = navLinks.classList.toggle('nav-active');
        const icon = this.querySelector('i');
        if (icon) {
            if (isOpen) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            } else {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        }
    });

    // Close mobile menu when clicking any nav link
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('nav-active');
            const icon = mobileMenuBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        });
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!navLinks.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            if (navLinks.classList.contains('nav-active')) {
                navLinks.classList.remove('nav-active');
                const icon = mobileMenuBtn.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                }
            }
        }
    });
}

// --- 4. Smooth Scrolling (For anchor links) ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#' || this.classList.contains('logo')) return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();
            window.scrollTo({
                top: targetElement.offsetTop - 70, 
                behavior: 'smooth'
            });
        }
    });
});

// --- 5. Code Block Copy Buttons ---
function initCodeCopyButtons() {
    // 1. Standalone tutorial blocks and carousel copy buttons
    document.querySelectorAll('.carousel-content, .lesson-content pre, .code-wrapper').forEach(container => {
        const macHeader = container.querySelector('.mac-header');
        const preCode = container.tagName === 'PRE' ? container : container.querySelector('pre');
        if (!preCode) return;

        // Skip if a copy button already exists in this header
        if (macHeader && !macHeader.querySelector('.code-copy-btn, .editor-copy-btn')) {
            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-copy-btn';
            copyBtn.title = 'Copy Code';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> <span>Copy</span>';
            macHeader.appendChild(copyBtn);

            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const codeText = preCode.innerText || preCode.textContent;
                navigator.clipboard.writeText(codeText).then(() => {
                    copyBtn.innerHTML = '<i class="fas fa-check"></i> <span>Copied!</span>';
                    copyBtn.classList.add('copied');
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fas fa-copy"></i> <span>Copy</span>';
                        copyBtn.classList.remove('copied');
                    }, 2000);
                });
            });
        }
    });

    // 2. Pre-rendered editor-copy-btn buttons (e.g. homepage carousel)
    document.querySelectorAll('.editor-copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const container = btn.closest('.carousel-content');
            const preCode = container ? container.querySelector('pre') : null;
            if (!preCode) return;

            const codeText = preCode.innerText || preCode.textContent;
            navigator.clipboard.writeText(codeText).then(() => {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i> <span>Copied!</span>';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('copied');
                }, 2000);
            });
        });
    });

    // 3. Interactive Run Code simulation buttons on homepage carousel
    document.querySelectorAll('.editor-run-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const container = btn.closest('.carousel-content');
            const tray = container ? container.querySelector('.terminal-tray-output') : null;
            const originalHTML = btn.innerHTML;
            
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>Running...</span>';
            btn.classList.add('running');

            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-check"></i> <span>Executed</span>';
                btn.classList.remove('running');
                btn.classList.add('success');

                if (tray) {
                    const now = new Date();
                    const timeStr = now.toTimeString().split(' ')[0];
                    const highlight = tray.querySelector('.term-highlight');
                    if (highlight) {
                        highlight.textContent = `Executed at ${timeStr} • OK (0.6ms)`;
                    }
                    tray.style.transition = 'opacity 0.2s ease';
                    tray.style.opacity = '0.3';
                    setTimeout(() => { tray.style.opacity = '1'; }, 100);
                }

                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.classList.remove('success');
                }, 1800);
            }, 350);
        });
    });
}
document.addEventListener('DOMContentLoaded', initCodeCopyButtons);


// =========================================================
// HOMEPAGE SPECIFIC LOGIC (index.html)
// =========================================================

const carouselItems = document.querySelectorAll('.carousel-item');
if (carouselItems.length > 0) {
    
    // --- CAROUSEL LOGIC ---
    let currentSlide = 0;
    let slideInterval;
    const carouselContainer = document.querySelector('.carousel-container');
    const carouselDots = document.querySelectorAll('.carousel-dot');
    const prevArrow = document.querySelector('.carousel-arrow.prev-arrow');
    const nextArrow = document.querySelector('.carousel-arrow.next-arrow');

    function updateCarousel() {
        carouselItems.forEach((item, index) => {
            item.className = 'carousel-item'; // reset
            
            if (index === currentSlide) {
                item.classList.add('active'); 
            } else if (index === (currentSlide + 1) % carouselItems.length) {
                item.classList.add('next');   
            } else if (index === (currentSlide - 1 + carouselItems.length) % carouselItems.length) {
                item.classList.add('prev');   
            } else {
                item.classList.add('hidden'); 
            }
        });

        // Synchronize dots
        if (carouselDots.length > 0) {
            carouselDots.forEach((dot, idx) => {
                if (idx === currentSlide) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        }
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % carouselItems.length;
        updateCarousel();
    }

    function prevSlideAction() {
        currentSlide = (currentSlide - 1 + carouselItems.length) % carouselItems.length;
        updateCarousel();
    }

    function startAutoSlide() {
        if (!slideInterval) {
            slideInterval = setInterval(nextSlide, 4500);
        }
    }

    function stopAutoSlide() {
        clearInterval(slideInterval);
        slideInterval = null;
    }

    startAutoSlide();

    // Pause auto-rotation when hovering carousel
    if (carouselContainer) {
        carouselContainer.addEventListener('mouseenter', stopAutoSlide);
        carouselContainer.addEventListener('mouseleave', startAutoSlide);
    }

    // Slide card clicks
    carouselItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            if (index !== currentSlide) {
                currentSlide = index;
                updateCarousel();
                stopAutoSlide();
                startAutoSlide();
            }
        });
    });

    // Dot indicators clicks
    carouselDots.forEach((dot, idx) => {
        dot.addEventListener('click', () => {
            currentSlide = idx;
            updateCarousel();
            stopAutoSlide();
            startAutoSlide();
        });
    });

    // Arrow navigation buttons
    if (prevArrow) {
        prevArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            prevSlideAction();
            stopAutoSlide();
            startAutoSlide();
        });
    }

    if (nextArrow) {
        nextArrow.addEventListener('click', (e) => {
            e.stopPropagation();
            nextSlide();
            stopAutoSlide();
            startAutoSlide();
        });
    }

    // Touch Swipe Gestures for Mobile
    let touchStartX = 0;
    let touchEndX = 0;
    if (carouselContainer) {
        carouselContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        carouselContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            if (touchStartX - touchEndX > 45) {
                // Swiped Left -> Next
                nextSlide();
                stopAutoSlide();
                startAutoSlide();
            } else if (touchEndX - touchStartX > 45) {
                // Swiped Right -> Prev
                prevSlideAction();
                stopAutoSlide();
                startAutoSlide();
            }
        }, { passive: true });
    }

    updateCarousel();

    // --- SEARCH BUTTON LOGIC (index.html) ---
    const searchInput = document.getElementById('courseSearch');
    const searchBtn = document.getElementById('searchBtn');
    const courseCards = document.querySelectorAll('.plain-card');
    const noResultsText = document.getElementById('noResults');
    const previewSection = document.getElementById('preview');

    function handleSearch(isButtonClick = false) {
        const query = searchInput.value.toLowerCase().trim();

        if (query === "") {
            if (isButtonClick) {
                searchInput.placeholder = "Please enter a course name...";
                searchInput.focus();
            } else {
                searchInput.placeholder = "Search for SQL, HTML, Python...";
            }
            
            if (previewSection) previewSection.style.display = 'block'; 
            courseCards.forEach(card => card.style.display = 'flex');
            if (noResultsText) noResultsText.style.display = 'none';
            return;
        }

        if (previewSection) previewSection.style.display = 'none'; 
        searchInput.placeholder = "Search for SQL, HTML, Python..."; 

        let visibleCount = 0;
        courseCards.forEach(card => {
            const title = card.getAttribute('data-title') || '';
            if (title.includes(query)) {
                card.style.display = card.classList.contains('view-all-card') ? 'flex' : 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (noResultsText) {
            noResultsText.style.display = visibleCount === 0 ? 'block' : 'none';
        }

        // When user explicitly clicks search, smooth scroll to courses section
        if (isButtonClick) {
            const coursesSection = document.getElementById('courses');
            if (coursesSection) {
                window.scrollTo({
                    top: coursesSection.offsetTop - 70,
                    behavior: 'smooth'
                });
            }
        }
    }

    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                handleSearch(true);
            } else {
                handleSearch(false);
            }
        });
    }
    if (searchBtn) {
        searchBtn.addEventListener('click', () => handleSearch(true));
    }
}


// =========================================================
// ALL COURSES CATALOG PAGE LOGIC (course.html)
// =========================================================

const smartHeader = document.getElementById('smartHeader');
if (smartHeader) {
    const catalogCards = document.querySelectorAll('.catalog-card');
    const catalogHero = document.getElementById('catalogHero');
    const stickySearchBar = document.getElementById('stickySearchBar');
    
    // Main search controls
    const categoryFilter = document.getElementById('categoryFilter');
    const catalogSearchInput = document.getElementById('catalogSearchInput');
    const catalogSearchBtn = document.getElementById('catalogSearchBtn');
    const catalogNoResults = document.getElementById('catalogNoResults');
    
    // Sticky search controls
    const stickyCategoryFilter = document.getElementById('stickyCategoryFilter');
    const stickySearchInput = document.getElementById('stickySearchInput');
    const stickySearchBtn = document.getElementById('stickySearchBtn');

    // --- 1. STICKY HEADER SEARCH TRANSITION LOGIC ---
    if (catalogHero && stickySearchBar) {
        window.addEventListener('scroll', () => {
            const heroBottom = catalogHero.offsetTop + catalogHero.offsetHeight;
            let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
            
            if (currentScroll > heroBottom - 50) {
                stickySearchBar.classList.add('visible');
            } else {
                stickySearchBar.classList.remove('visible');
            }
        });
    }

    // --- 2. UNIFIED FILTER & SEARCH LOGIC ---
    function executeCatalogSearch(queryVal, categoryVal, isButtonClick = false) {
        let query = (queryVal || '').toLowerCase().trim();
        let category = categoryVal || 'all';

        if (query === "") {
            if (isButtonClick && catalogSearchInput) {
                catalogSearchInput.placeholder = "Please enter a course name...";
                if (stickySearchInput) stickySearchInput.placeholder = "Please enter a course name...";
                catalogSearchInput.focus();
            } else {
                if (catalogSearchInput) catalogSearchInput.placeholder = "Search a course...";
                if (stickySearchInput) stickySearchInput.placeholder = "Search a course...";
            }
        }

        let visibleCount = 0;
        catalogCards.forEach(card => {
            const cardCategory = card.getAttribute('data-category') || '';
            const cardTitle = card.getAttribute('data-title') || '';
            
            const matchesCategory = (category === 'all' || cardCategory.includes(category));
            const matchesText = cardTitle.includes(query);

            if (matchesCategory && matchesText) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        if (catalogNoResults) {
            catalogNoResults.style.display = visibleCount === 0 ? 'block' : 'none';
        }

        // Update URL query params without reloading
        const url = new URL(window.location);
        if (query) {
            url.searchParams.set('search', query);
        } else {
            url.searchParams.delete('search');
        }
        if (category && category !== 'all') {
            url.searchParams.set('category', category);
        } else {
            url.searchParams.delete('category');
        }
        window.history.replaceState({}, '', url);
    }

    // --- 3. URL PARAMETERS INIT ON PAGE LOAD ---
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search') || urlParams.get('q') || '';
    const categoryParam = urlParams.get('category') || 'all';

    if (catalogSearchInput) catalogSearchInput.value = searchParam;
    if (stickySearchInput) stickySearchInput.value = searchParam;
    if (categoryFilter) categoryFilter.value = categoryParam;
    if (stickyCategoryFilter) stickyCategoryFilter.value = categoryParam;

    if (searchParam || categoryParam !== 'all') {
        executeCatalogSearch(searchParam, categoryParam, false);
    }

    // Sync Main Bar -> Sticky Bar & Execute
    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            if (stickyCategoryFilter) stickyCategoryFilter.value = categoryFilter.value;
            executeCatalogSearch(catalogSearchInput ? catalogSearchInput.value : '', categoryFilter.value, false);
        });
    }
    if (catalogSearchInput) {
        catalogSearchInput.addEventListener('keyup', (e) => {
            if (stickySearchInput) stickySearchInput.value = catalogSearchInput.value;
            executeCatalogSearch(catalogSearchInput.value, categoryFilter ? categoryFilter.value : 'all', e.key === 'Enter');
        });
    }
    if (catalogSearchBtn) {
        catalogSearchBtn.addEventListener('click', () => {
            if (stickySearchInput && catalogSearchInput) stickySearchInput.value = catalogSearchInput.value;
            executeCatalogSearch(catalogSearchInput ? catalogSearchInput.value : '', categoryFilter ? categoryFilter.value : 'all', true);
        });
    }

    // Sync Sticky Bar -> Main Bar & Execute
    if (stickyCategoryFilter) {
        stickyCategoryFilter.addEventListener('change', () => {
            if (categoryFilter) categoryFilter.value = stickyCategoryFilter.value;
            executeCatalogSearch(stickySearchInput ? stickySearchInput.value : '', stickyCategoryFilter.value, false);
        });
    }
    if (stickySearchInput) {
        stickySearchInput.addEventListener('keyup', (e) => {
            if (catalogSearchInput) catalogSearchInput.value = stickySearchInput.value;
            executeCatalogSearch(stickySearchInput.value, stickyCategoryFilter ? stickyCategoryFilter.value : 'all', e.key === 'Enter');
        });
    }
    if (stickySearchBtn) {
        stickySearchBtn.addEventListener('click', () => {
            if (catalogSearchInput && stickySearchInput) catalogSearchInput.value = stickySearchInput.value;
            executeCatalogSearch(stickySearchInput ? stickySearchInput.value : '', stickyCategoryFilter ? stickyCategoryFilter.value : 'all', true);
        });
    }
}


// =========================================================
// COURSE DETAIL PAGE LOGIC (sql/index.html)
// =========================================================

const detailAccordions = document.querySelectorAll('.detail-main .accordion-header');
if (detailAccordions.length > 0) {
    detailAccordions.forEach(header => {
        header.addEventListener('click', function() {
            const item = this.parentElement;
            const body = item.querySelector('.accordion-body');
            
            if (item.classList.contains('active')) {
                item.classList.remove('active');
                body.style.maxHeight = null;
                body.style.padding = "0 1.5rem";
            } else {
                item.classList.add('active');
                body.style.maxHeight = (body.scrollHeight + 50) + "px";
                body.style.padding = "1.5rem";
            }
        });
    });
}


// =========================================================
// LESSON / READING INTERFACE (sql/intro.html)
// =========================================================

// 1. Reading Progress Bar
const progressBar = document.getElementById('progressBar');
if (progressBar) {
    window.addEventListener('scroll', () => {
        const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const currentScroll = window.scrollY;
        if (totalHeight > 0) {
            const progressPercentage = (currentScroll / totalHeight) * 100;
            progressBar.style.width = Math.min(100, Math.max(0, progressPercentage)) + '%';
        }
    });
}

// 2. Mobile Table of Contents Drawer Toggle
const mobileTocBtn = document.getElementById('mobileTocBtn');
const courseSidebarNav = document.querySelector('.course-sidebar-nav');

if (mobileTocBtn && courseSidebarNav) {
    mobileTocBtn.addEventListener('click', () => {
        courseSidebarNav.classList.toggle('mobile-open');
        const icon = mobileTocBtn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-list');
            icon.classList.toggle('fa-xmark');
        }
    });

    // Close sidebar on link click
    courseSidebarNav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            courseSidebarNav.classList.remove('mobile-open');
            const icon = mobileTocBtn.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-list');
            }
        });
    });
}

// 3. Independent Per-Lesson Completion Tracking
function initLessonCompletion() {
    // Clear legacy buggy global key so it doesn't falsely mark lessons
    localStorage.removeItem('edmith_sql_intro_completed');

    const markCompleteBtn = document.getElementById('markCompleteBtn');
    
    // Helper to show floating toast
    function showToast(message, iconClass = 'fa-circle-check') {
        let toast = document.querySelector('.toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast-notification';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<i class="fas ${iconClass}"></i> <span>${message}</span>`;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Update sidebar checklist icons
    function updateSidebarCheckmarks() {
        document.querySelectorAll('.course-sidebar-nav li a').forEach(link => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('#')) return;
            const pageName = href.split('/').pop().replace('.html', '').replace(/[-_]/g, '_');
            const key = 'edmith_lesson_completed_sql_' + pageName;
            const isDone = localStorage.getItem(key) === 'true';
            
            let badge = link.querySelector('.lesson-done-icon');
            if (isDone) {
                if (!badge) {
                    badge = document.createElement('i');
                    badge.className = 'fas fa-check-circle lesson-done-icon';
                    badge.style.marginLeft = 'auto';
                    badge.style.color = '#10b981';
                    badge.style.fontSize = '0.85rem';
                    link.appendChild(badge);
                }
            } else if (badge) {
                badge.remove();
            }
        });
    }

    updateSidebarCheckmarks();

    if (markCompleteBtn) {
        // Derive lesson ID from data attribute or current filename (normalized)
        const attrId = markCompleteBtn.getAttribute('data-lesson-id');
        const fileId = window.location.pathname.split('/').pop().replace('.html', '');
        const cleanId = (attrId ? attrId.replace('sql_', '') : fileId).replace(/[-_]/g, '_');
        const lessonStorageKey = 'edmith_lesson_completed_sql_' + cleanId;

        function renderButtonState(completed) {
            if (completed) {
                markCompleteBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>Completed!</span>';
                markCompleteBtn.classList.add('completed-btn');
                markCompleteBtn.title = 'Click to unmark or reset';
            } else {
                markCompleteBtn.innerHTML = '<i class="fas fa-check"></i> <span>Mark Complete</span>';
                markCompleteBtn.classList.remove('completed-btn');
                markCompleteBtn.title = 'Mark this lesson as completed';
            }
        }

        const isInitiallyCompleted = localStorage.getItem(lessonStorageKey) === 'true';
        renderButtonState(isInitiallyCompleted);

        markCompleteBtn.addEventListener('click', () => {
            const currentlyCompleted = localStorage.getItem(lessonStorageKey) === 'true';
            const newStatus = !currentlyCompleted;
            
            if (newStatus) {
                localStorage.setItem(lessonStorageKey, 'true');
                renderButtonState(true);
                showToast('Lesson marked as complete! Great job.', 'fa-circle-check');
            } else {
                localStorage.removeItem(lessonStorageKey);
                renderButtonState(false);
                showToast('Lesson marked as incomplete.', 'fa-arrow-rotate-left');
            }
            updateSidebarCheckmarks();
        });
    }
}

// 4. Collapsible Sidebar Modules (Accordion with Hamburger & Chevron)
function initCollapsibleModules() {
    const moduleHeaders = document.querySelectorAll('.sidebar-module-header');
    if (!moduleHeaders.length) return;

    moduleHeaders.forEach(header => {
        header.addEventListener('click', function(e) {
            e.preventDefault();
            const group = this.closest('.sidebar-module-group');
            if (!group) return;

            const isCollapsed = group.classList.toggle('collapsed');
            this.setAttribute('aria-expanded', !isCollapsed);
        });
    });

    // Automatically expand the module containing the active lesson
    const activeItem = document.querySelector('.course-sidebar-nav li.active');
    if (activeItem) {
        const activeGroup = activeItem.closest('.sidebar-module-group');
        if (activeGroup) {
            activeGroup.classList.remove('collapsed');
            const header = activeGroup.querySelector('.sidebar-module-header');
            if (header) header.setAttribute('aria-expanded', 'true');
            // Scroll active item smoothly into the vertical middle of the sidebar nav
            setTimeout(() => {
                const sidebarNav = document.querySelector('.course-sidebar-nav');
                if (sidebarNav) {
                    const sidebarRect = sidebarNav.getBoundingClientRect();
                    const activeRect = activeItem.getBoundingClientRect();
                    // Calculate target scrollTop so activeItem is centered vertically in sidebarNav
                    const currentScroll = sidebarNav.scrollTop;
                    const relativeActiveTop = activeRect.top - sidebarRect.top + currentScroll;
                    const targetScroll = relativeActiveTop - (sidebarRect.height / 2) + (activeRect.height / 2);

                    sidebarNav.scrollTo({
                        top: Math.max(0, targetScroll),
                        behavior: 'smooth'
                    });
                } else {
                    activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 180);
        }
    } else {
        // Default to opening Module 1
        const firstGroup = document.querySelector('.sidebar-module-group[data-module="module-1"]');
        if (firstGroup) {
            firstGroup.classList.remove('collapsed');
            const header = firstGroup.querySelector('.sidebar-module-header');
            if (header) header.setAttribute('aria-expanded', 'true');
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initLessonCompletion();
        initCollapsibleModules();
    });
} else {
    initLessonCompletion();
    initCollapsibleModules();
}