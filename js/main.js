// =====================================================
// Main JavaScript File: js/main.js
// Handles theme toggle, animations, AND dynamic content loading
// =====================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- Theme Toggle Logic (既存のコード) ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    function parseRGBAColorSafe(rgbaString) { /* ... (parser function) ... */ if (!rgbaString || typeof rgbaString !== 'string') return null; const match = rgbaString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/); if (match) { const r = parseInt(match[1], 10); const g = parseInt(match[2], 10); const b = parseInt(match[3], 10); const a = match[4] ? parseFloat(match[4]) : 1; return { r, g, b, a: a * 255 }; } console.warn(`Could not parse RGBA string in main.js: ${rgbaString}`); return null; }
    function getThemeParticleColors() { const computedStyle = getComputedStyle(document.documentElement); const colorVars = ['--color-p5-particle-1', '--color-p5-particle-2', '--color-p5-particle-3', '--color-p5-particle-4']; let colors = []; colorVars.forEach(varName => { const colorData = parseRGBAColorSafe(computedStyle.getPropertyValue(varName).trim()); if (colorData) { colors.push(colorData); } }); if (colors.length === 0) { colors.push({ r: 100, g: 100, b: 100, a: 150 }); } return colors; }
    function applyTheme(theme) { body.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); if (typeof window.updateP5Theme === 'function' && typeof p5 !== 'undefined') { requestAnimationFrame(() => { const newColors = getThemeParticleColors(); if (typeof window.updateP5Theme === 'function') { window.updateP5Theme(newColors); } else { console.warn("p5 update function disappeared before execution.") } }); } else if (typeof p5 === 'undefined') { console.log("p5 not ready for theme update."); } }
    const savedTheme = localStorage.getItem('theme');
    const initialTheme = savedTheme ? savedTheme : (prefersDarkScheme.matches ? 'dark' : 'light');
    applyTheme(initialTheme);
    if (themeToggleBtn) { themeToggleBtn.addEventListener('click', () => { const newTheme = body.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; applyTheme(newTheme); }); } else { console.warn("Theme toggle button (#theme-toggle) not found in the DOM."); }
    // --- End Theme Toggle Logic ---


    // =====================================================
    // **NEW:** Load Experience Data
    // =====================================================
    const experienceContainer = document.getElementById('experience-content');
    if (experienceContainer) {
        fetch('data/experience.json') // **注意: パスを確認してください**
            .then(response => {
                if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
                return response.json();
            })
            .then(data => {
                generateExperienceHTML(data);
            })
            .catch(error => {
                console.error('Error loading experience data:', error);
                experienceContainer.innerHTML = '<p style="color: var(--color-accent-2);">Failed to load experience data.</p>';
            });
    } else {
        console.warn("Experience container '#experience-content' not found.");
    }

    function generateExperienceHTML(data) {
        if (!experienceContainer) return;
        experienceContainer.innerHTML = ''; // Clear existing content

        data.forEach(yearData => {
            const yearGroup = document.createElement('div');
            yearGroup.className = 'year-group';

            const yearLabel = document.createElement('span');
            yearLabel.className = 'year-label';
            yearLabel.textContent = yearData.year;
            yearGroup.appendChild(yearLabel);

            yearData.items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'experience-item';
                itemDiv.setAttribute('data-type', item.type); // 'work' or 'education'

                // Add Icon
                const iconSpan = document.createElement('span');
                iconSpan.className = 'item-icon';
                const icon = document.createElement('i');
                icon.className = `fas ${item.type === 'education' ? 'fa-graduation-cap' : 'fa-briefcase'}`;
                iconSpan.appendChild(icon);
                itemDiv.appendChild(iconSpan);

                // Add Title
                const title = document.createElement('h4');
                title.textContent = item.title;
                itemDiv.appendChild(title);

                // Add Details (Organization & Period)
                const detailsDiv = document.createElement('div');
                detailsDiv.className = 'experience-details';

                const orgSpan = document.createElement('span');
                orgSpan.className = 'experience-company';
                if (item.url) {
                    const orgLink = document.createElement('a');
                    orgLink.href = item.url;
                    orgLink.textContent = item.organization;
                    orgLink.target = '_blank';
                    orgLink.rel = 'noopener noreferrer';
                    orgLink.className = 'external-link'; // Add class for external link icon
                    orgSpan.appendChild(orgLink);
                } else {
                    orgSpan.textContent = item.organization;
                }
                detailsDiv.appendChild(orgSpan);

                const periodSpan = document.createElement('span');
                periodSpan.className = 'experience-period';
                periodSpan.textContent = item.period;
                detailsDiv.appendChild(periodSpan);

                itemDiv.appendChild(detailsDiv);

                // Add Description
                if (item.description) {
                    const descriptionP = document.createElement('p');
                    descriptionP.textContent = item.description;
                    itemDiv.appendChild(descriptionP);
                }

                // Add Project Cards (if any)
                if (item.projects && item.projects.length > 0) {
                    const projectsList = document.createElement('div');
                    projectsList.className = 'projects-list';

                    const listTitle = document.createElement('div'); // Optional title
                    listTitle.className = 'projects-list-title';
                    listTitle.textContent = 'Key Projects:';
                    projectsList.appendChild(listTitle);

                    item.projects.forEach(project => {
                        const card = document.createElement('div');
                        card.className = 'project-card';

                        const projectName = document.createElement('h5');
                        projectName.textContent = project.name;
                        card.appendChild(projectName);

                        if (project.description) {
                            const projectDesc = document.createElement('p');
                            projectDesc.textContent = project.description;
                            card.appendChild(projectDesc);
                        }

                        if (project.tags && project.tags.length > 0) {
                            const tagsDiv = document.createElement('div');
                            tagsDiv.className = 'tags';
                            project.tags.forEach(tag => {
                                const tagSpan = document.createElement('span');
                                tagSpan.textContent = tag;
                                tagsDiv.appendChild(tagSpan);
                            });
                            card.appendChild(tagsDiv);
                        }
                        projectsList.appendChild(card);
                    });
                    itemDiv.appendChild(projectsList);
                }

                yearGroup.appendChild(itemDiv);
            });

            experienceContainer.appendChild(yearGroup);
        });
    }


    // =====================================================
    // **NEW:** Load Awards Data
    // =====================================================
    const awardsContainer = document.getElementById('awards-list-content');
    if (awardsContainer) {
        fetch('data/awards.json') // **注意: パスを確認してください**
            .then(response => {
                if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
                return response.json();
            })
            .then(data => {
                generateAwardsHTML(data);
            })
            .catch(error => {
                console.error('Error loading awards data:', error);
                awardsContainer.innerHTML = '<p style="color: var(--color-accent-2);">Failed to load awards data.</p>';
            });
    } else {
        console.warn("Awards container '#awards-list-content' not found.");
    }

    function generateAwardsHTML(data) {
        if (!awardsContainer) return;
        awardsContainer.innerHTML = ''; // Clear existing content

        data.forEach(award => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'award-item';
            itemDiv.setAttribute('data-category', award.category);

            // Add Icon based on category
            const iconSpan = document.createElement('span');
            iconSpan.className = 'item-icon';
            const icon = document.createElement('i');
            let iconClass = 'fa-question-circle'; // Default icon
            switch (award.category) {
                case 'tech': iconClass = 'fa-microchip'; break;
                case 'art': iconClass = 'fa-palette'; break;
                case 'academic': iconClass = 'fa-award'; break;
                case 'sports': iconClass = 'fa-trophy'; break;
                // Add more cases if needed
            }
            icon.className = `fas ${iconClass}`;
            iconSpan.appendChild(icon);
            itemDiv.appendChild(iconSpan);

            // Add Award Name
            const nameH4 = document.createElement('h4');
            nameH4.textContent = award.name;
            itemDiv.appendChild(nameH4);

            // Add Details (Issuer & Date)
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'award-details';

            const issuerSpan = document.createElement('span');
            issuerSpan.className = 'award-issuer';
            issuerSpan.textContent = award.issuer;
            detailsDiv.appendChild(issuerSpan);

            const dateSpan = document.createElement('span');
            dateSpan.className = 'award-date';
            dateSpan.textContent = award.date;
            detailsDiv.appendChild(dateSpan);

            itemDiv.appendChild(detailsDiv);

            // Add Description (Optional)
            if (award.description) {
                const descriptionP = document.createElement('p');
                descriptionP.textContent = award.description;
                itemDiv.appendChild(descriptionP);
            }

            awardsContainer.appendChild(itemDiv);
        });
    }


    // --- Fade-In Animation Logic (既存のコード) ---
    // Needs to run AFTER dynamic content is potentially added,
    // or observe the containers and add observer when content is loaded.
    // Simple approach: Re-run observer setup after data loading.
    function setupIntersectionObserver() {
        const sections = document.querySelectorAll('section'); // Re-select sections
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            }, { root: null, rootMargin: '0px', threshold: 0.1 });
            sections.forEach(section => { observer.observe(section); });
        } else {
            sections.forEach(section => { section.classList.add('visible'); });
        }
    }
    // Call initially and after data loads (using Promises.all if loading multiple)
    Promise.allSettled([
        fetch('data/experience.json').then(res => res.ok ? res.json() : Promise.reject()),
        fetch('data/awards.json').then(res => res.ok ? res.json() : Promise.reject())
    ]).finally(() => {
        // Ensure observer runs after content might be populated
        setTimeout(setupIntersectionObserver, 100); // Small delay to ensure rendering
    });


    // --- Footer Year Logic (既存のコード) ---
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) { currentYearSpan.textContent = new Date().getFullYear(); }
    else { console.warn("Element with ID 'current-year' not found for footer."); }

}); // End DOMContentLoaded