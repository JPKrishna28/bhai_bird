// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Load images
const birdImg = new Image();
birdImg.src = 'bird.jpg';
const pipeImg = new Image();
pipeImg.src = 'pipe.jpg';

// Load audio
const backgroundMusic = document.getElementById('backgroundMusic');
backgroundMusic.volume = 0.3; // Set volume to 30%
const gameOverSound = document.getElementById('gameOverSound');
gameOverSound.volume = 0.5; // Set volume to 50%
let isMusicEnabled = true;

// Game state
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let score = 0;
let highScore = localStorage.getItem('flappyBirdHighScore') || 0;

// Game objects
// Physics tuned for a 60 FPS reference frame, then scaled by delta time so the
// bird falls at the same real-world speed on 60Hz, 90Hz and 120Hz displays.
const bird = {
    x: 50,
    y: canvas.height / 2,
    width: 30,
    height: 30,
    velocity: 0,
    gravity: 0.5,
    jump: -8,
    color: '#FFD700'
};

const pipes = [];
const pipeWidth = 60;
const pipeGap = 150;
const pipeSpeed = 2;

// Game settings
let frameCount = 0;
const pipeSpawnRate = 120; // frames between pipes (at 60 FPS reference)

// Frame-rate independence: multiply per-frame motion by this factor.
const REFERENCE_FPS = 60;
let lastTime = 0;
let timeScale = 1;
let spawnTimer = 0; // accumulates scaled frames for pipe spawning

// UI elements
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const gameOverScreen = document.getElementById('gameOver');
const startScreen = document.getElementById('startScreen');
const finalScoreElement = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const audioToggle = document.getElementById('audioToggle');

// Initialize high score display
highScoreElement.textContent = highScore;

// Event listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);
audioToggle.addEventListener('click', toggleAudio);

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        handleInput();
    }
});

canvas.addEventListener('click', handleInput);

// Mobile: touchstart fires immediately, unlike the delayed synthetic click.
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    handleInput();
}, { passive: false });

// Let taps anywhere on the game flap too (buttons still work via their own handlers).
document.addEventListener('touchstart', (e) => {
    if (gameState === 'playing' && !e.target.closest('button')) {
        e.preventDefault();
        handleInput();
    }
}, { passive: false });

function handleInput() {
    if (gameState === 'playing') {
        bird.velocity = bird.jump;
    } else if (gameState === 'start') {
        startGame();
    }
}

function toggleAudio() {
    if (isMusicEnabled) {
        backgroundMusic.pause();
        gameOverSound.pause();
        audioToggle.textContent = '🔇';
        isMusicEnabled = false;
    } else {
        if (gameState === 'playing') {
            backgroundMusic.play().catch(e => console.log('Audio play failed:', e));
        }
        audioToggle.textContent = '🔊';
        isMusicEnabled = true;
    }
}

function startGame() {
    gameState = 'playing';
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    resetGame();
    
    // Start background music
    if (isMusicEnabled) {
        backgroundMusic.currentTime = 0;
        backgroundMusic.play().catch(e => console.log('Audio play failed:', e));
    }
    
    gameLoop();
}

function restartGame() {
    gameState = 'playing';
    gameOverScreen.style.display = 'none';
    resetGame();
    
    // Restart background music
    if (isMusicEnabled) {
        backgroundMusic.currentTime = 0;
        backgroundMusic.play().catch(e => console.log('Audio play failed:', e));
    }
    
    gameLoop();
}

function resetGame() {
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    pipes.length = 0;
    score = 0;
    frameCount = 0;
    spawnTimer = 0;
    lastTime = 0;
    timeScale = 1;
    scoreElement.textContent = score;
}

function createPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - pipeGap - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    
    pipes.push({
        x: canvas.width,
        topHeight: topHeight,
        bottomHeight: canvas.height - topHeight - pipeGap,
        passed: false
    });
}

function updateBird() {
    bird.velocity += bird.gravity * timeScale;
    bird.y += bird.velocity * timeScale;

    // Check boundaries
    if (bird.y < 0 || bird.y + bird.height > canvas.height) {
        gameOver();
    }
}

function updatePipes() {
    // Create new pipes (spawnTimer counts scaled frames so spacing is
    // consistent regardless of display refresh rate).
    spawnTimer += timeScale;
    if (spawnTimer >= pipeSpawnRate) {
        spawnTimer -= pipeSpawnRate;
        createPipe();
    }

    // Update existing pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= pipeSpeed * timeScale;
        
        // Remove pipes that are off screen
        if (pipe.x + pipeWidth < 0) {
            pipes.splice(i, 1);
            continue;
        }
        
        // Check for scoring
        if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
            pipe.passed = true;
            score++;
            scoreElement.textContent = score;
        }
        
        // Check collision
        if (checkCollision(bird, pipe)) {
            gameOver();
        }
    }
}

function checkCollision(bird, pipe) {
    // Check if bird is within pipe's x range
    if (bird.x < pipe.x + pipeWidth && bird.x + bird.width > pipe.x) {
        // Check if bird hits top or bottom pipe
        if (bird.y < pipe.topHeight || bird.y + bird.height > canvas.height - pipe.bottomHeight) {
            return true;
        }
    }
    return false;
}

function drawBird() {
    // Draw the bird image
    if (birdImg.complete) {
        ctx.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
    } else {
        // Fallback to simple rectangle if image isn't loaded yet
        ctx.fillStyle = bird.color;
        ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
        
        // Add simple bird features
        ctx.fillStyle = '#FF6B35';
        ctx.fillRect(bird.x + bird.width - 5, bird.y + bird.height/2 - 2, 8, 4); // beak
        
        ctx.fillStyle = '#000';
        ctx.fillRect(bird.x + 5, bird.y + 5, 4, 4); // eye
    }
}

function drawPipes() {
    if (pipeImg.complete) {
        pipes.forEach(pipe => {
            // Top pipe (flipped vertically)
            ctx.save();
            ctx.translate(pipe.x + pipeWidth/2, pipe.topHeight);
            ctx.scale(1, -1);
            ctx.drawImage(pipeImg, -pipeWidth/2, 0, pipeWidth, pipe.topHeight);
            ctx.restore();
            
            // Bottom pipe (normal)
            ctx.drawImage(pipeImg, pipe.x, canvas.height - pipe.bottomHeight, pipeWidth, pipe.bottomHeight);
        });
    } else {
        // Fallback to simple rectangles if image isn't loaded yet
        ctx.fillStyle = '#228B22';
        
        pipes.forEach(pipe => {
            // Top pipe
            ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
            // Bottom pipe
            ctx.fillRect(pipe.x, canvas.height - pipe.bottomHeight, pipeWidth, pipe.bottomHeight);
            
            // Pipe caps
            ctx.fillStyle = '#32CD32';
            ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, pipeWidth + 10, 20);
            ctx.fillRect(pipe.x - 5, canvas.height - pipe.bottomHeight, pipeWidth + 10, 20);
            ctx.fillStyle = '#228B22';
        });
    }
}

function drawBackground() {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.7);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98FB98');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.7);
    
    // Ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
    
    // Clouds
    drawClouds();
}

function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    
    // Simple cloud shapes
    const cloudPositions = [
        {x: 50, y: 80},
        {x: 200, y: 60},
        {x: 320, y: 100}
    ];
    
    cloudPositions.forEach(cloud => {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, 15, 0, Math.PI * 2);
        ctx.arc(cloud.x + 15, cloud.y, 20, 0, Math.PI * 2);
        ctx.arc(cloud.x + 30, cloud.y, 15, 0, Math.PI * 2);
        ctx.fill();
    });
}

function gameOver() {
    gameState = 'gameOver';
    
    // Stop background music
    backgroundMusic.pause();
    
    // Play game over sound
    if (isMusicEnabled) {
        gameOverSound.currentTime = 0;
        gameOverSound.play().catch(e => console.log('Game over sound play failed:', e));
    }
    
    // Update high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyBirdHighScore', highScore);
        highScoreElement.textContent = highScore;
    }
    
    finalScoreElement.textContent = score;
    gameOverScreen.style.display = 'block';
}

function gameLoop(now) {
    if (gameState !== 'playing') return;

    // Compute time scale from real elapsed time. First frame (lastTime 0) and
    // any long stall (tab switch) are clamped so physics never jumps.
    if (!lastTime) lastTime = now;
    const deltaMs = now - lastTime;
    lastTime = now;
    timeScale = Math.min(deltaMs / (1000 / REFERENCE_FPS), 2);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    drawBackground();

    // Update game objects
    updateBird();
    updatePipes();

    // Draw game objects
    drawBird();
    drawPipes();

    frameCount++;
    requestAnimationFrame(gameLoop);
}

// Instructions for adding custom images
console.log(`
🎮 FLAPPY BIRD GAME READY!

📁 To add custom images:

1. BIRD IMAGE:
   - Add your bird image to this folder (e.g., 'bird.png')
   - Replace the drawBird() function with:
   
   const birdImg = new Image();
   birdImg.src = 'bird.png';
   
   function drawBird() {
       ctx.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);
   }

2. PIPE IMAGES:
   - Add your pipe image to this folder (e.g., 'pipe.png')
   - Replace the drawPipes() function with:
   
   const pipeImg = new Image();
   pipeImg.src = 'pipe.png';
   
   function drawPipes() {
       pipes.forEach(pipe => {
           // Top pipe (rotated)
           ctx.save();
           ctx.translate(pipe.x + pipeWidth/2, pipe.topHeight);
           ctx.rotate(Math.PI);
           ctx.drawImage(pipeImg, -pipeWidth/2, 0, pipeWidth, pipe.topHeight);
           ctx.restore();
           
           // Bottom pipe
           ctx.drawImage(pipeImg, pipe.x, canvas.height - pipe.bottomHeight, pipeWidth, pipe.bottomHeight);
       });
   }

🎯 Controls: SPACE key or click to flap!
`);

// Wait for images to load before starting
let imagesLoaded = 0;
const totalImages = 2;

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        // All images loaded, draw initial screen
        drawBackground();
        drawBird();
    }
}

birdImg.addEventListener('load', imageLoaded);
pipeImg.addEventListener('load', imageLoaded);

// Fallback if images don't load
setTimeout(() => {
    if (imagesLoaded < totalImages) {
        drawBackground();
        drawBird();
    }
}, 1000);