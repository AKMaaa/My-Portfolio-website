// =====================================================
// Main JavaScript File: js/main.js
// Handles theme toggle, animations, AND dynamic content loading
// =====================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- Theme Toggle Logic ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

    // Function to parse RGBA color string safely (needed to pass data to p5)
    function parseRGBAColorSafe(rgbaString) {
        if (!rgbaString || typeof rgbaString !== 'string') return null;
        const match = rgbaString.match(/rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (match) {
            const r = parseInt(match[1], 10); const g = parseInt(match[2], 10); const b = parseInt(match[3], 10);
            const a = match[4] ? parseFloat(match[4]) : 1;
            return { r, g, b, a: a * 255 }; // Return object with RGBA values (p5 alpha 0-255)
        }
        console.warn(`Could not parse RGBA string in main.js: ${rgbaString}`);
        return null;
    }

    // Function to get current theme's particle colors as data objects
    function getThemeParticleColors() {
        const computedStyle = getComputedStyle(document.documentElement);
        const colorVars = ['--color-p5-particle-1', '--color-p5-particle-2', '--color-p5-particle-3', '--color-p5-particle-4'];
        let colors = [];
        colorVars.forEach(varName => {
            const colorData = parseRGBAColorSafe(computedStyle.getPropertyValue(varName).trim());
            if (colorData) { colors.push(colorData); }
        });
        // Fallback if all parsing fails
        if (colors.length === 0) { colors.push({ r: 100, g: 100, b: 100, a: 150 }); }
        return colors;
    }

    // Function to apply theme and notify p5 sketch
    function applyTheme(theme) {
        body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        // Ensure p5 is ready and the update function exists before calling
        if (typeof window.updateP5Theme === 'function' && typeof p5 !== 'undefined') {
            // Use requestAnimationFrame to ensure styles are applied before p5 reads them
            requestAnimationFrame(() => {
                const newColors = getThemeParticleColors();
                // Check again if function exists right before calling
                if (typeof window.updateP5Theme === 'function') {
                    window.updateP5Theme(newColors);
                } else {
                    console.warn("p5 update function disappeared before execution.")
                }
            });
        } else if (typeof p5 === 'undefined') {
            console.log("p5 not ready for theme update.");
        }
    }

    // Determine and apply initial theme
    const savedTheme = localStorage.getItem('theme');
    const initialTheme = savedTheme ? savedTheme : (prefersDarkScheme.matches ? 'dark' : 'light');
    // Apply theme immediately without waiting for p5 function (it will get colors on its setup)
    body.setAttribute('data-theme', initialTheme);
    if (savedTheme) localStorage.setItem('theme', initialTheme); // Ensure storage matches initial state if derived from OS

    // Add listener to the button
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const newTheme = body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
            applyTheme(newTheme); // Apply theme and trigger p5 update
        });
    } else { console.warn("Theme toggle button (#theme-toggle) not found in the DOM."); }
    // --- End Theme Toggle Logic ---


    // --- Get Containers ---
    const experienceContainer = document.getElementById('experience-content');
    const awardsContainer = document.getElementById('awards-list-content');
    const skillsContainer = document.getElementById('skills-container-content');

    // =====================================================
    // Function to generate Experience HTML
    // =====================================================
    function generateExperienceHTML(data) {
        if (!experienceContainer) {
            console.error("Experience container not found in generateExperienceHTML");
            return;
        }
        experienceContainer.innerHTML = ''; // Clear existing content
        console.log("Generating Experience HTML..."); // Debug

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
        console.log("Experience HTML generation complete."); // Debug
    }

    // =====================================================
    // Function to generate Awards HTML
    // =====================================================
    function generateAwardsHTML(data) {
        if (!awardsContainer) {
            console.error("Awards container not found in generateAwardsHTML");
            return;
        }
        awardsContainer.innerHTML = ''; // Clear existing content
        console.log("Generating Awards HTML..."); // Debug

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
        console.log("Awards HTML generation complete."); // Debug
    }

    // =====================================================
    // Function to generate Skills HTML
    // =====================================================
    function generateSkillsHTML(data) {
        if (!skillsContainer) {
            console.error("Skills container not found in generateSkillsHTML");
            return;
        }
        skillsContainer.innerHTML = ''; // Clear existing content
        console.log("Generating Skills HTML..."); // Debug

        data.forEach(categoryData => {
            // Create category container
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'skill-category';

            // Create category title
            const categoryTitle = document.createElement('h3');
            categoryTitle.textContent = categoryData.category;
            categoryDiv.appendChild(categoryTitle);

            // Create skill list container
            const skillListDiv = document.createElement('div');
            skillListDiv.className = 'skill-list';

            // Create each skill item
            categoryData.skills.forEach(skill => {
                const skillItemDiv = document.createElement('div');
                skillItemDiv.className = 'skill-item';

                // Create icon element
                const icon = document.createElement('i');
                // Add classes based on iconType (devicon or fas) and iconClass
                icon.className = `${skill.iconType === 'fas' ? 'fas' : ''} ${skill.iconClass}`; // Add fas prefix only if needed
                skillItemDiv.appendChild(icon);

                // Create skill name span
                const skillNameSpan = document.createElement('span');
                skillNameSpan.textContent = skill.name;
                skillItemDiv.appendChild(skillNameSpan);

                skillListDiv.appendChild(skillItemDiv);
            });

            categoryDiv.appendChild(skillListDiv);
            skillsContainer.appendChild(categoryDiv);
        });
        console.log("Skills HTML generation complete."); // Debug
    }


    // =====================================================
    // Data Loading Functions (Return Promises)
    // =====================================================
    const loadExperience = () => {
        console.log("Attempting to load experience data...");
        if (!experienceContainer) {
            console.warn("Experience container '#experience-content' not found.");
            return Promise.resolve({ status: 'skipped', reason: 'Container not found' });
        }
        return fetch('data/experience.json') // **Check path**
            .then(response => { if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for experience.json`); return response.json(); })
            .then(data => {
                generateExperienceHTML(data);
                return { status: 'fulfilled' };
            })
            .catch(error => {
                console.error('Error loading or generating experience data:', error);
                if (experienceContainer) experienceContainer.innerHTML = '<p style="color: var(--color-accent-2);">Failed to load experience data.</p>';
                return { status: 'rejected', reason: error };
            });
    };

    const loadAwards = () => {
        console.log("Attempting to load awards data...");
        if (!awardsContainer) {
            console.warn("Awards container '#awards-list-content' not found.");
            return Promise.resolve({ status: 'skipped', reason: 'Container not found' });
        }
        return fetch('data/awards.json') // **Check path**
            .then(response => { if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for awards.json`); return response.json(); })
            .then(data => {
                generateAwardsHTML(data);
                return { status: 'fulfilled' };
            })
            .catch(error => {
                console.error('Error loading or generating awards data:', error);
                if (awardsContainer) awardsContainer.innerHTML = '<p style="color: var(--color-accent-2);">Failed to load awards data.</p>';
                return { status: 'rejected', reason: error };
            });
    };

    const loadSkills = () => {
        console.log("Attempting to load skills data...");
        if (!skillsContainer) {
            console.warn("Skills container '#skills-container-content' not found.");
            return Promise.resolve({ status: 'skipped', reason: 'Container not found' });
        }
        return fetch('data/skills.json') // **Check path**
            .then(response => { if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for skills.json`); return response.json(); })
            .then(data => {
                generateSkillsHTML(data);
                return { status: 'fulfilled' };
            })
            .catch(error => {
                console.error('Error loading or generating skills data:', error);
                if (skillsContainer) skillsContainer.innerHTML = '<p style="color: var(--color-accent-2);">Failed to load skills data.</p>';
                return { status: 'rejected', reason: error };
            });
    };


    // =====================================================
    // Intersection Observer Setup Function
    // =====================================================
    function setupIntersectionObserver() {
        console.log("Setting up Intersection Observer...");
        const sections = document.querySelectorAll('section'); // Select sections again AFTER content generation
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => { // Removed unused 'observer' param
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // console.log(`Section ${entry.target.id || 'without ID'} is intersecting.`); // Optional log
                        entry.target.classList.add('visible');
                        // observer.unobserve(entry.target); // Optional: stop observing after visible
                    }
                });
            }, { root: null, rootMargin: '0px', threshold: 0.1 }); // Options object
            if (sections.length > 0) {
                sections.forEach(section => { observer.observe(section); });
                console.log(`Observer is now watching ${sections.length} sections.`);
            } else {
                console.warn("No sections found to observe.");
            }
        } else {
            console.warn("IntersectionObserver not supported, revealing all sections.");
            sections.forEach(section => { section.classList.add('visible'); });
        }
    }

    // =====================================================
    // Execute Data Loading and Setup Observer
    // =====================================================
    console.log("Starting data loading...");
    Promise.allSettled([
        loadExperience(),
        loadAwards(),
        loadSkills()
    ]).then((results) => {
        console.log("All data loading promises settled:", results);
        // Wait for the next frame to ensure DOM updates from JSON are rendered
        requestAnimationFrame(() => {
            setupIntersectionObserver();
        });
    });


    // --- Footer Year Logic ---
    const currentYearSpan = document.getElementById('current-year');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    } else {
        console.warn("Element with ID 'current-year' not found for footer.");
    }

}); // End DOMContentLoaded