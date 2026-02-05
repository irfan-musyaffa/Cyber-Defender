/**
         * CYBER-DEFENDER
         * Engine: HTML5 Canvas + Vanilla JavaScript
         * Konsep: Pertahanan Inti terhadap Serangan Virus
         */

        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        const scoreVal = document.getElementById('scoreVal');
        const bestScoreVal = document.getElementById('bestScoreVal');
        const healthBar = document.getElementById('health-bar');
        
        // Element UI
        const startScreen = document.getElementById('startScreen');
        const gameOverScreen = document.getElementById('gameOverScreen');
        const startBtn = document.getElementById('startBtn');
        const restartBtn = document.getElementById('restartBtn');

        // State Global
        let score = 0;
        let health = 100;
        let enemies = [];
        let projectiles = [];
        let particles = [];
        let isPlaying = false;
        let enemySpawnRate = 1500; // ms
        let lastSpawn = 0;
        let highScore = localStorage.getItem('cyber_defender_high') || 0;

        bestScoreVal.innerText = highScore;

        // Resize handler
        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        window.addEventListener('resize', resize);
        resize();

        /**
         * Kelas untuk Musuh (Virus)
         */
        class Enemy {
            constructor() {
                this.radius = 15 + Math.random() * 20;
                // Muncul dari sisi layar secara acak
                if (Math.random() > 0.5) {
                    this.x = Math.random() > 0.5 ? -50 : canvas.width + 50;
                    this.y = Math.random() * canvas.height;
                } else {
                    this.x = Math.random() * canvas.width;
                    this.y = Math.random() > 0.5 ? -50 : canvas.height + 50;
                }

                // Target ke tengah layar (Inti)
                const angle = Math.atan2(canvas.height / 2 - this.y, canvas.width / 2 - this.x);
                const speed = 1.5 + (score / 1000); // Bertambah cepat seiring skor
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                this.color = `hsl(${Math.random() * 60 + 300}, 100%, 60%)`; // Range Pink/Purple
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 2;
                ctx.stroke();
                // Core musuh
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius / 2, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
            }
        }

        /**
         * Kelas Proyektil (Laser)
         */
        class Projectile {
            constructor(tx, ty) {
                this.x = canvas.width / 2;
                this.y = canvas.height / 2;
                const angle = Math.atan2(ty - this.y, tx - this.x);
                this.vx = Math.cos(angle) * 10;
                this.vy = Math.sin(angle) * 10;
                this.radius = 3;
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                ctx.fillStyle = '#00f2ff';
                ctx.shadowBlur = 10;
                ctx.shadowColor = '#00f2ff';
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
            }
        }

        /**
         * Kelas Partikel (Efek Ledakan)
         */
        class Particle {
            constructor(x, y, color) {
                this.x = x;
                this.y = y;
                this.color = color;
                this.vx = (Math.random() - 0.5) * 6;
                this.vy = (Math.random() - 0.5) * 6;
                this.alpha = 1;
            }

            draw() {
                ctx.save();
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = this.color;
                ctx.fillRect(this.x, this.y, 3, 3);
                ctx.restore();
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;
                this.alpha -= 0.02;
            }
        }

        // --- Fungsi Utama Game ---

        function shoot(e) {
            if (!isPlaying) return;
            const x = e.clientX || e.touches[0].clientX;
            const y = e.clientY || e.touches[0].clientY;
            projectiles.push(new Projectile(x, y));
        }

        function createExplosion(x, y, color) {
            for (let i = 0; i < 12; i++) {
                particles.push(new Particle(x, y, color));
            }
        }

        function spawnEnemy(timestamp) {
            if (timestamp - lastSpawn > enemySpawnRate) {
                enemies.push(new Enemy());
                lastSpawn = timestamp;
                // Percepat pemunculan musuh
                if (enemySpawnRate > 500) enemySpawnRate -= 10;
            }
        }

        function resetGame() {
            score = 0;
            health = 100;
            enemies = [];
            projectiles = [];
            particles = [];
            enemySpawnRate = 1500;
            scoreVal.innerText = score;
            healthBar.style.width = '100%';
            isPlaying = true;
            startScreen.classList.add('hidden');
            gameOverScreen.classList.add('hidden');
        }

        function gameOver() {
            isPlaying = false;
            if (score > highScore) {
                highScore = score;
                localStorage.setItem('cyber_defender_high', highScore);
                bestScoreVal.innerText = highScore;
            }
            document.getElementById('finalScore').innerText = score;
            gameOverScreen.classList.remove('hidden');
        }

        function update(timestamp) {
            if (!isPlaying) return;

            spawnEnemy(timestamp);

            // Update Proyektil
            projectiles.forEach((p, pi) => {
                p.update();
                if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
                    projectiles.splice(pi, 1);
                }
            });

            // Update Musuh
            enemies.forEach((e, ei) => {
                e.update();

                // Cek tabrakan dengan proyektil
                projectiles.forEach((p, pi) => {
                    const dist = Math.hypot(p.x - e.x, p.y - e.y);
                    if (dist < e.radius + p.radius) {
                        createExplosion(e.x, e.y, e.color);
                        enemies.splice(ei, 1);
                        projectiles.splice(pi, 1);
                        score += 100;
                        scoreVal.innerText = score;
                    }
                });

                // Cek tabrakan dengan Core (tengah)
                const distToCore = Math.hypot(canvas.width / 2 - e.x, canvas.height / 2 - e.y);
                if (distToCore < e.radius + 30) {
                    enemies.splice(ei, 1);
                    health -= 15;
                    healthBar.style.width = `${health}%`;
                    createExplosion(canvas.width/2, canvas.height/2, '#ff0000');
                    if (health <= 0) gameOver();
                }
            });

            // Update Partikel
            particles.forEach((p, pi) => {
                p.update();
                if (p.alpha <= 0) particles.splice(pi, 1);
            });
        }

        function draw() {
            // Trail effect (tidak clearRect sepenuhnya untuk efek motion blur)
            ctx.fillStyle = 'rgba(5, 5, 16, 0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw Core
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, 30, 0, Math.PI * 2);
            ctx.strokeStyle = '#00f2ff';
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#00f2ff';
            ctx.fillStyle = 'rgba(0, 242, 255, 0.1)';
            ctx.fill();
            ctx.shadowBlur = 0;

            // Draw Entitas
            enemies.forEach(e => e.draw());
            projectiles.forEach(p => p.draw());
            particles.forEach(p => p.draw());
        }

        function animate(timestamp) {
            update(timestamp);
            draw();
            requestAnimationFrame(animate);
        }

        // Listeners
        window.addEventListener('mousedown', shoot);
        window.addEventListener('touchstart', (e) => {
            shoot(e);
            e.preventDefault();
        }, {passive: false});

        startBtn.addEventListener('click', resetGame);
        restartBtn.addEventListener('click', resetGame);

        // Start Loop
        requestAnimationFrame(animate);