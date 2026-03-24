const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d', { alpha: true });
const confettiCanvas = document.getElementById('confetti-canvas');
const cfCtx = confettiCanvas.getContext('2d');

const livePercentage = document.getElementById('live-percentage');
const overlay = document.getElementById('result-overlay');
const finalPercentage = document.getElementById('final-percentage');
const commentary = document.getElementById('commentary');
const restartBtn = document.getElementById('restart-btn');
const hintText = document.getElementById('hint-text');
const guideToggle = document.getElementById('guide-toggle');
const guideCircle = document.getElementById('guide-circle');

guideToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        guideCircle.classList.remove('hidden');
    } else {
        guideCircle.classList.add('hidden');
    }
});

let isDrawing = false;
let points = [];
let perfection = 0;

function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    // Internal resolution
    canvas.width = window.innerWidth * ratio;
    canvas.height = window.innerHeight * ratio;
    confettiCanvas.width = window.innerWidth * ratio;
    confettiCanvas.height = window.innerHeight * ratio;
    
    // Display size
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    confettiCanvas.style.width = window.innerWidth + 'px';
    confettiCanvas.style.height = window.innerHeight + 'px';
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

// Drawing Logic (updated to use raw internal coords)
canvas.addEventListener('mousedown', (e) => startDrawing(getMousePos(e)));
canvas.addEventListener('mousemove', (e) => draw(getMousePos(e)));
canvas.addEventListener('mouseup', stopDrawing);

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDrawing(getMousePos(e.touches[0]));
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    draw(getMousePos(e.touches[0]));
}, { passive: false });

canvas.addEventListener('touchend', stopDrawing);

function startDrawing(pos) {
    isDrawing = true;
    points = [pos];
    perfection = 0;
    overlay.classList.add('hidden');
    hintText.style.opacity = '0';
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    cfCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    updateUI(0);
}

function draw(pos) {
    if (!isDrawing) return;

    points.push(pos);

    // Dynamic line width based on speed / precision if we want
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 10 * (window.devicePixelRatio || 1); // scale for high dpi
    ctx.strokeStyle = '#6366f1';
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(99, 102, 241, 0.6)';

    if (points.length > 2) {
        // Draw using quadratic curves for smoothness
        ctx.beginPath();
        const p1 = points[points.length - 2];
        const p2 = points[points.length - 1];
        const midPoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        
        const prev1 = points[points.length - 3];
        const prevMid = { x: (prev1.x + p1.x) / 2, y: (prev1.y + p1.y) / 2 };

        ctx.moveTo(prevMid.x, prevMid.y);
        ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
        ctx.stroke();
    }

    calculatePerfection();
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    showResult();
}

function calculatePerfection(isFinal = false) {
    if (points.length < 10) return;

    // Center of bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
    });

    const currentCenterX = (minX + maxX) / 2;
    const currentCenterY = (minY + maxY) / 2;

    let totalDist = 0;
    let dists = [];
    points.forEach(p => {
        const d = Math.sqrt(Math.pow(p.x - currentCenterX, 2) + Math.pow(p.y - currentCenterY, 2));
        totalDist += d;
        dists.push(d);
    });

    const avgRadius = totalDist / points.length;
    if (avgRadius < 5) return;

    let variance = 0;
    dists.forEach(d => {
        variance += Math.pow(d - avgRadius, 2);
    });
    const stdDev = Math.sqrt(variance / points.length);

    let smoothnessScore = 100 * (1 - (stdDev / avgRadius) * 2.5);
    
    if (isFinal) {
        const start = points[0];
        const end = points[points.length - 1];
        const gap = Math.sqrt(Math.pow(start.x - end.x, 2) + Math.pow(start.y - end.y, 2));
        const gapPenalty = (gap / avgRadius) * 40;
        perfection = Math.max(0, Math.min(100, smoothnessScore - gapPenalty));
    } else {
        perfection = Math.max(0, Math.min(100, smoothnessScore));
    }
    
    updateUI(perfection);
}

function updateUI(value) {
    const displayValue = Math.round(value);
    livePercentage.innerHTML = `${displayValue}<span class="pct">%</span>`;
    
    // Dynamic color for text
    if (value > 90) livePercentage.style.color = '#10b981';
    else if (value > 70) livePercentage.style.color = '#6366f1';
    else if (value > 40) livePercentage.style.color = '#f59e0b';
    else livePercentage.style.color = '#f43f5e';
}

function showResult() {
    overlay.classList.remove('hidden');
    calculatePerfection(true);
    finalPercentage.innerText = perfection.toFixed(1) + '%';
    
    if (perfection > 95) {
        commentary.innerText = "HEAVENLY! A masterpiece.";
        launchConfetti();
    } else if (perfection > 85) {
        commentary.innerText = "Almost perfect! Precision 100.";
        launchConfetti(50);
    } else if (perfection > 70) {
        commentary.innerText = "Solid effort! Keep it steady.";
    } else if (perfection > 40) {
        commentary.innerText = "Keep trying, you'll get there.";
    } else {
        commentary.innerText = "Is that a potato? Try again!";
    }
}

// Confetti Engine
let particles = [];
function launchConfetti(count = 150) {
    particles = [];
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#ffffff'];
    
    for (let i = 0; i < count; i++) {
        particles.push({
            x: confettiCanvas.width / 2,
            y: confettiCanvas.height / 2,
            vx: (Math.random() - 0.5) * 30,
            vy: (Math.random() - 0.5) * 30 - 10,
            size: Math.random() * 10 + 5,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * Math.PI * 2,
            decay: 0.96 + Math.random() * 0.03
        });
    }
    animateConfetti();
}

function animateConfetti() {
    cfCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    
    particles = particles.filter(p => p.size > 0.5);
    
    particles.forEach(p => {
        p.vx *= p.decay;
        p.vy *= p.decay;
        p.vy += 0.5; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.size *= 0.98;
        p.rotation += 0.1;
        
        cfCtx.fillStyle = p.color;
        cfCtx.save();
        cfCtx.translate(p.x, p.y);
        cfCtx.rotate(p.rotation);
        cfCtx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
        cfCtx.restore();
    });
    
    if (particles.length > 0) {
        requestAnimationFrame(animateConfetti);
    }
}

restartBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    cfCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    particles = [];
    updateUI(0);
    hintText.style.opacity = '1';
});


