document.addEventListener('DOMContentLoaded', () => {
    const animatedSections = document.querySelectorAll('.fade-in-section');

    if (!animatedSections.length) return;

    const observerOptions = {
        root: null, // Use the viewport as the root
        rootMargin: '0px',
        threshold: 0.1 // Trigger when 10% of the element is visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Stop observing once it's visible
            }
        });
    }, observerOptions);

    animatedSections.forEach(section => {
        observer.observe(section);
    });

    // --- Timeline Animation ---
    const timelineItems = document.querySelectorAll('.timeline-item:not(.complete)');

    if (timelineItems.length > 0) {
        const timelineObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                // When the item is intersecting (scrolled into view)
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    // Stop observing the item once it has been animated
                    observer.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            // Trigger when the top of the element is 45% from the bottom of the viewport.
            // This makes the animation fire as the item approaches the middle of the screen.
            rootMargin: '0px 0px -45% 0px',
            threshold: 0
        });

        timelineItems.forEach(item => timelineObserver.observe(item));
    }

    // --- Particle Animation ---
    const canvas = document.getElementById('particle-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particlesArray;
        let accentColorRgb;

        // Function to parse the accent color from CSS variables into an RGB object
        function getAccentColor() {
            const accentColorHex = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
            if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(accentColorHex)) {
                let hex = accentColorHex.substring(1);
                if (hex.length === 3) {
                    hex = hex.split('').map(char => char + char).join('');
                }
                const bigint = parseInt(hex, 16);
                accentColorRgb = {
                    r: (bigint >> 16) & 255,
                    g: (bigint >> 8) & 255,
                    b: bigint & 255
                };
            }
        }

        // Mouse interactive object
        let mouse = {
            x: null,
            y: null,
            radius: 120 // Radius of influence around the mouse
        };

        window.addEventListener('mousemove', event => {
            mouse.x = event.x;
            mouse.y = event.y;
        });

        window.addEventListener('mouseout', () => {
            mouse.x = null;
            mouse.y = null;
        });

        // Set canvas size
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Particle class
        class Particle {
            constructor(x, y, directionX, directionY, size) {
                this.x = x;
                this.y = y;
                this.directionX = directionX;
                this.directionY = directionY;
                this.size = size;
            }

            // Method to draw individual particle
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
                ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--border-color');
                ctx.fill();
            }

            // Check particle position, move the particle, draw the particle
            update() {
                // Wall collision detection (improved to account for particle size)
                if (this.x + this.size > canvas.width || this.x - this.size < 0) {
                    this.directionX = -this.directionX;
                }
                if (this.y + this.size > canvas.height || this.y - this.size < 0) {
                    this.directionY = -this.directionY;
                }

                // Mouse collision detection
                if (mouse.x !== null && mouse.y !== null) {
                    let dx = this.x - mouse.x;
                    let dy = this.y - mouse.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < mouse.radius) {
                        const force = (mouse.radius - distance) / mouse.radius;
                        const forceDirectionX = dx / distance;
                        const forceDirectionY = dy / distance;
                        // The '1.5' is a multiplier for push strength
                        this.x += forceDirectionX * force * 1.5;
                        this.y += forceDirectionY * force * 1.5;
                    }
                }

                this.x += this.directionX;
                this.y += this.directionY;
                this.draw();
            }
        }

        // Create particle array
        function init() {
            particlesArray = [];
            let numberOfParticles = (canvas.height * canvas.width) / 11000;
            for (let i = 0; i < numberOfParticles; i++) {
                let size = (Math.random() * 1.5) + 1;
                let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
                let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
                let directionX = (Math.random() * .4) - .2;
                let directionY = (Math.random() * .4) - .2;
                particlesArray.push(new Particle(x, y, directionX, directionY, size));
            }
        }

        // Check if particles are close enough to draw line between them
        function connect() {
            let opacityValue = 1;
            for (let a = 0; a < particlesArray.length; a++) {
                for (let b = a; b < particlesArray.length; b++) {
                    let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x)) +
                        ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
                    
                    if (distance < (canvas.width / 8) * (canvas.height / 8)) {
                        opacityValue = 1 - (distance / 20000);
                        let lineColor = `rgba(222, 226, 230, ${opacityValue})`; // Default border color

                        // Check if either particle is near the mouse to "light up" the line
                        if (mouse.x !== null && mouse.y !== null && accentColorRgb) {
                            const dist_a_mouse_sq = Math.pow(particlesArray[a].x - mouse.x, 2) + Math.pow(particlesArray[a].y - mouse.y, 2);
                            const dist_b_mouse_sq = Math.pow(particlesArray[b].x - mouse.x, 2) + Math.pow(particlesArray[b].y - mouse.y, 2);
                            const mouse_radius_sq = mouse.radius * mouse.radius;

                            if (dist_a_mouse_sq < mouse_radius_sq || dist_b_mouse_sq < mouse_radius_sq) {
                                lineColor = `rgba(${accentColorRgb.r}, ${accentColorRgb.g}, ${accentColorRgb.b}, ${opacityValue})`;
                            }
                        }

                        ctx.strokeStyle = lineColor;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                        ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                        ctx.stroke();
                    }
                }
            }
        }

        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            ctx.clearRect(0, 0, innerWidth, innerHeight);
            particlesArray.forEach(particle => particle.update());
            connect();
        }

        window.addEventListener('resize', () => {
            canvas.width = innerWidth;
            canvas.height = innerHeight;
            getAccentColor(); // Re-check color in case of theme change
            init();
        });
        getAccentColor();
        init();
        animate();
    }
});