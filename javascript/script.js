// =========================================================
// GLOBAL LOGIC (Runs on all pages)
// =========================================================

// Theme Toggle
const themeToggleBtn = document.getElementById('themeToggle');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        const icon = this.querySelector('i');
        if (document.body.classList.contains('dark-mode')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    });
}

// Smooth Scrolling (For anchor links)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const targetId = this.getAttribute('href');
        if (targetId === '#' || this.classList.contains('logo')) return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();
            window.scrollTo({
                top: targetElement.offsetTop - 60, 
                behavior: 'smooth'
            });
        }
    });
});


// =========================================================
// HOMEPAGE SPECIFIC LOGIC (index.html)
// =========================================================

// Ensure these elements only run if we are on index.html
const carouselItems = document.querySelectorAll('.carousel-item');
if (carouselItems.length > 0) {
    
    // --- CAROUSEL LOGIC ---
    let currentSlide = 0;
    let slideInterval;

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
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % carouselItems.length;
        updateCarousel();
    }

    slideInterval = setInterval(nextSlide, 4000);

    carouselItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            if (index !== currentSlide) {
                currentSlide = index;
                updateCarousel();
                clearInterval(slideInterval);
                slideInterval = setInterval(nextSlide, 4000);
            }
        });
    });
    updateCarousel();

    // --- SEARCH BUTTON LOGIC ---
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
            
            previewSection.style.display = 'block'; 
            courseCards.forEach(card => card.style.display = 'flex'); // Show all 5 cards
            noResultsText.style.display = 'none';
            return;
        }

        previewSection.style.display = 'none'; 
        searchInput.placeholder = "Search for SQL, HTML, Python..."; 

        let visibleCount = 0;
        courseCards.forEach(card => {
            const title = card.getAttribute('data-title');
            if (title.includes(query)) {
                // Ensure the view-all-card stays as a flex column if visible
                card.style.display = card.classList.contains('view-all-card') ? 'flex' : 'block';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        noResultsText.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    searchInput.addEventListener('keyup', () => handleSearch(false));
    searchBtn.addEventListener('click', () => handleSearch(true));
}


// =========================================================
// ALL COURSES CATALOG PAGE LOGIC (courses.html)
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
    window.addEventListener('scroll', () => {
        const heroBottom = catalogHero.offsetTop + catalogHero.offsetHeight;
        let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        
        // Show sticky bar once user scrolls past the main hero section
        if (currentScroll > heroBottom - 50) {
            stickySearchBar.classList.add('visible');
        } else {
            stickySearchBar.classList.remove('visible');
        }
    });

    // --- 2. UNIFIED FILTER & SEARCH LOGIC ---
    function executeCatalogSearch(queryVal, categoryVal, isButtonClick = false) {
        let query = queryVal.toLowerCase().trim();
        let category = categoryVal;

        if (query === "") {
            if (isButtonClick) {
                catalogSearchInput.placeholder = "Please enter a course name...";
                stickySearchInput.placeholder = "Please enter a course name...";
                catalogSearchInput.focus();
            } else {
                catalogSearchInput.placeholder = "Search a course...";
                stickySearchInput.placeholder = "Search a course...";
            }
        } else {
            catalogSearchInput.placeholder = "Search a course...";
            stickySearchInput.placeholder = "Search a course...";
        }

        let visibleCount = 0;
        catalogCards.forEach(card => {
            const cardCategory = card.getAttribute('data-category');
            const cardTitle = card.getAttribute('data-title');
            
            const matchesCategory = (category === 'all' || cardCategory.includes(category));
            const matchesText = cardTitle.includes(query);

            if (matchesCategory && matchesText) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        catalogNoResults.style.display = visibleCount === 0 ? 'block' : 'none';
    }

    // Sync Main Bar -> Sticky Bar & Execute
    categoryFilter.addEventListener('change', () => {
        stickyCategoryFilter.value = categoryFilter.value;
        executeCatalogSearch(catalogSearchInput.value, categoryFilter.value, false);
    });
    catalogSearchInput.addEventListener('keyup', () => {
        stickySearchInput.value = catalogSearchInput.value;
        executeCatalogSearch(catalogSearchInput.value, categoryFilter.value, false);
    });
    catalogSearchBtn.addEventListener('click', () => {
        stickySearchInput.value = catalogSearchInput.value;
        executeCatalogSearch(catalogSearchInput.value, categoryFilter.value, true);
    });

    // Sync Sticky Bar -> Main Bar & Execute
    stickyCategoryFilter.addEventListener('change', () => {
        categoryFilter.value = stickyCategoryFilter.value;
        executeCatalogSearch(stickySearchInput.value, stickyCategoryFilter.value, false);
    });
    stickySearchInput.addEventListener('keyup', () => {
        catalogSearchInput.value = stickySearchInput.value;
        executeCatalogSearch(stickySearchInput.value, stickyCategoryFilter.value, false);
    });
    stickySearchBtn.addEventListener('click', () => {
        catalogSearchInput.value = stickySearchInput.value;
        executeCatalogSearch(stickySearchInput.value, stickyCategoryFilter.value, true);
    });
}



// =========================================================
// COURSE DETAIL PAGE LOGIC (sql/index.html)
// =========================================================

// Ensure syllabus accordions work on the detail page
const detailAccordions = document.querySelectorAll('.detail-main .accordion-header');
if (detailAccordions.length > 0) {
    detailAccordions.forEach(header => {
        header.addEventListener('click', function() {
            const item = this.parentElement;
            const body = item.querySelector('.accordion-body');
            
            // Toggle active state
            if (item.classList.contains('active')) {
                item.classList.remove('active');
                body.style.maxHeight = null;
                body.style.padding = "0 1.5rem"; // Reset padding
            } else {
                item.classList.add('active');
                body.style.maxHeight = body.scrollHeight + 50 + "px"; // Expand
                body.style.padding = "1.5rem";
            }
        });
    });
}
// =========================================================
// READING PROGRESS BAR LOGIC (intro.html)
// =========================================================
window.addEventListener('scroll', () => {
    const progressBar = document.getElementById('progressBar');
    if (progressBar) {
        const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const currentScroll = window.scrollY;
        const progressPercentage = (currentScroll / totalHeight) * 100;
        progressBar.style.width = progressPercentage + '%';
    }
});