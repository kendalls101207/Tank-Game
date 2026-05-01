const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');

const mazeRatio = { width: 4, height: 3 };
const minMazeScale = 1;
const maxMazeScale = 10;
const tankBorderColor = '#080808';
const tankFillColor = 'blue';
const defaultTankSpeed = 100;

let rows = 30;
let cols = 40;
let cellSize = 20;

let maze = [];
let tank = { x: cellSize / 2, y: cellSize / 2, angle: 0, speed: defaultTankSpeed, destroyed: false };
let bullets = [];
let tankFragments = [];
let blastStains = [];
let keys = {};
let gameRunning = false;
let resetTimer = 0;

// Initialize maze with all walls
function initMaze() {
    maze = [];
    for (let r = 0; r < rows; r++) {
        maze[r] = [];
        for (let c = 0; c < cols; c++) {
            maze[r][c] = {
                top: true,
                right: true,
                bottom: true,
                left: true,
                visited: false
            };
        }
    }
}

// Recursive backtracking to generate maze
function generateMaze(r, c) {
    maze[r][c].visited = true;
    const directions = shuffle(['top', 'right', 'bottom', 'left']);
    for (const dir of directions) {
        let nr = r, nc = c;
        if (dir === 'top') nr--;
        else if (dir === 'right') nc++;
        else if (dir === 'bottom') nr++;
        else if (dir === 'left') nc--;

        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !maze[nr][nc].visited) {
            // Remove walls
            if (dir === 'top') {
                maze[r][c].top = false;
                maze[nr][nc].bottom = false;
            } else if (dir === 'right') {
                maze[r][c].right = false;
                maze[nr][nc].left = false;
            } else if (dir === 'bottom') {
                maze[r][c].bottom = false;
                maze[nr][nc].top = false;
            } else if (dir === 'left') {
                maze[r][c].left = false;
                maze[nr][nc].right = false;
            }
            generateMaze(nr, nc);
        }
    }
}

// Shuffle array
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getTankBodyWidth() {
    return Math.max(8, cellSize * 0.45);
}

function getTankBodyHeight() {
    return Math.max(8, cellSize * 0.35);
}

function getTankBarrelLength() {
    return Math.max(12, cellSize * 0.35);
}

function getTankBarrelWidth() {
    return Math.max(3, cellSize * 0.08);
}

function getBulletRadius() {
    return Math.max(1.5, cellSize * 0.075);
}

function setMazeDimensions(scale) {
    const clampedScale = Math.max(minMazeScale, Math.min(maxMazeScale, scale));
    cols = mazeRatio.width * clampedScale;
    rows = mazeRatio.height * clampedScale;
    cellSize = Math.min(canvas.width / cols, canvas.height / rows);
}

function getRandomMazeScale() {
    return Math.floor(Math.random() * (maxMazeScale - minMazeScale + 1)) + minMazeScale;
}

function resetMazeGenerationState() {
    maze = [];
    bullets = [];
    tankFragments = [];
    blastStains = [];
    keys = {};
    tank.speed = defaultTankSpeed;
    tank.destroyed = false;
    gameRunning = false;
    resetTimer = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Draw the scene
function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw maze
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const x = c * cellSize;
            const y = r * cellSize;

            if (maze[r][c].top) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + cellSize, y);
                ctx.stroke();
            }
            if (maze[r][c].right) {
                ctx.beginPath();
                ctx.moveTo(x + cellSize, y);
                ctx.lineTo(x + cellSize, y + cellSize);
                ctx.stroke();
            }
            if (maze[r][c].bottom) {
                ctx.beginPath();
                ctx.moveTo(x, y + cellSize);
                ctx.lineTo(x + cellSize, y + cellSize);
                ctx.stroke();
            }
            if (maze[r][c].left) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y + cellSize);
                ctx.stroke();
            }
        }
    }
    drawBlastStains();
    drawTank();
    drawBullets();
    drawTankFragments();
}

// Draw tank
function drawTank() {
    if (tank.destroyed) return;
    const bodyWidth = getTankBodyWidth();
    const bodyHeight = getTankBodyHeight();
    const barrelLength = getTankBarrelLength();
    const barrelWidth = getTankBarrelWidth();

    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.angle);

    ctx.fillStyle = tankFillColor;
    ctx.strokeStyle = tankBorderColor;
    ctx.lineWidth = 1;

    ctx.fillRect(-bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight);
    ctx.strokeRect(-bodyWidth / 2, -bodyHeight / 2, bodyWidth, bodyHeight);

    ctx.beginPath();
    ctx.rect(0, -barrelWidth / 2, barrelLength, barrelWidth);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

// Draw bullets
function drawBullets() {
    ctx.fillStyle = 'black';
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Draw blast stains
function drawBlastStains() {
    blastStains.forEach(stain => {
        ctx.fillStyle = `rgba(100, 100, 100, ${stain.alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(stain.x, stain.y, stain.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Draw tank fragments
function drawTankFragments() {
    tankFragments.forEach(fragment => {
        ctx.save();
        ctx.translate(fragment.x, fragment.y);
        ctx.rotate(fragment.angle);
        ctx.globalAlpha = fragment.alpha;
        ctx.fillStyle = tankFillColor;
        ctx.strokeStyle = tankBorderColor;
        ctx.lineWidth = 1;
        ctx.fillRect(-fragment.width / 2, -fragment.height / 2, fragment.width, fragment.height);
        ctx.strokeRect(-fragment.width / 2, -fragment.height / 2, fragment.width, fragment.height);
        ctx.restore();
    });
}

// Check wall collision for tank body only
function checkWallCollision(x, y) {
    const halfWidth = getTankBodyWidth() / 2;
    const halfHeight = getTankBodyHeight() / 2;
    const minX = x - halfWidth;
    const maxX = x + halfWidth;
    const minY = y - halfHeight;
    const maxY = y + halfHeight;

    const minC = Math.floor(minX / cellSize);
    const maxC = Math.floor(maxX / cellSize);
    const minR = Math.floor(minY / cellSize);
    const maxR = Math.floor(maxY / cellSize);

    if (minC < 0 || maxC >= cols || minR < 0 || maxR >= rows) return true;

    for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
            const x0 = c * cellSize;
            const x1 = x0 + cellSize;
            const y0 = r * cellSize;
            const y1 = y0 + cellSize;

            if (maze[r][c].left && minX < x0 && maxX > x0) return true;
            if (maze[r][c].right && minX < x1 && maxX > x1) return true;
            if (maze[r][c].top && minY < y0 && maxY > y0) return true;
            if (maze[r][c].bottom && minY < y1 && maxY > y1) return true;
        }
    }
    return false;
}

// Check collision on a specific axis
function checkWallCollisionAxis(x, y, axis) {
    const halfWidth = getTankBodyWidth() / 2;
    const halfHeight = getTankBodyHeight() / 2;
    const minX = x - halfWidth;
    const maxX = x + halfWidth;
    const minY = y - halfHeight;
    const maxY = y + halfHeight;

    const minC = Math.floor(minX / cellSize);
    const maxC = Math.floor(maxX / cellSize);
    const minR = Math.floor(minY / cellSize);
    const maxR = Math.floor(maxY / cellSize);

    if (minC < 0 || maxC >= cols || minR < 0 || maxR >= rows) return true;

    for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
            const x0 = c * cellSize;
            const x1 = x0 + cellSize;
            const y0 = r * cellSize;
            const y1 = y0 + cellSize;

            if (axis === 'x') {
                if (maze[r][c].left && minX < x0 && maxX > x0) return true;
                if (maze[r][c].right && minX < x1 && maxX > x1) return true;
            } else if (axis === 'y') {
                if (maze[r][c].top && minY < y0 && maxY > y0) return true;
                if (maze[r][c].bottom && minY < y1 && maxY > y1) return true;
            }
        }
    }
    return false;
}

// Check wall collision for bullet
function checkBulletWallCollision(bullet, nx, ny) {
    const r = Math.floor(ny / cellSize);
    const c = Math.floor(nx / cellSize);
    if (r < 0 || r >= rows || c < 0 || c >= cols) return true;
    const cx = c * cellSize;
    const cy = r * cellSize;
    if (maze[r][c].top && Math.abs(ny - cy) < 3) return true;
    if (maze[r][c].bottom && Math.abs(ny - (cy + cellSize)) < 3) return true;
    if (maze[r][c].left && Math.abs(nx - cx) < 3) return true;
    if (maze[r][c].right && Math.abs(nx - (cx + cellSize)) < 3) return true;
    return false;
}

// Update tank
function updateTank() {
    if (tank.destroyed) return;
    let deltaX = 0;
    let deltaY = 0;
    
    if (keys['w']) {
        deltaX = Math.cos(tank.angle) * tank.speed;
        deltaY = Math.sin(tank.angle) * tank.speed;
    }
    if (keys['s']) {
        deltaX -= Math.cos(tank.angle) * tank.speed;
        deltaY -= Math.sin(tank.angle) * tank.speed;
    }
    if (keys['a']) {
        tank.angle -= 0.1;
    }
    if (keys['d']) {
        tank.angle += 0.1;
    }
    if (keys[' ']) {
        // Fire bullet from the tip of the barrel
        const barrelLength = getTankBarrelLength();
        const bulletSpeed = tank.speed * 1.1;
        bullets.push({
            x: tank.x + Math.cos(tank.angle) * barrelLength,
            y: tank.y + Math.sin(tank.angle) * barrelLength,
            dx: Math.cos(tank.angle) * bulletSpeed,
            dy: Math.sin(tank.angle) * bulletSpeed,
            ricochets: 0,
            radius: getBulletRadius()
        });
        keys[' '] = false; // Prevent continuous firing
    }
    
    // Handle movement with wall sliding
    if (deltaX !== 0 || deltaY !== 0) {
        const newX = tank.x + deltaX;
        const newY = tank.y + deltaY;
        
        // Try full movement first
        if (!checkWallCollision(newX, newY)) {
            tank.x = newX;
            tank.y = newY;
        } else {
            // Try moving only on X axis
            if (!checkWallCollisionAxis(newX, tank.y, 'x')) {
                tank.x = newX;
            }
            // Try moving only on Y axis
            if (!checkWallCollisionAxis(tank.x, newY, 'y')) {
                tank.y = newY;
            }
        }
    }
}

// Update bullets
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        const nx = bullet.x + bullet.dx;
        const ny = bullet.y + bullet.dy;
        if (checkBulletWallCollision(bullet, nx, ny)) {
            bullet.ricochets++;
            if (bullet.ricochets > 5) {
                bullets.splice(i, 1);
                continue;
            }
            // Ricochet - determine which wall was hit based on velocity direction
            const r = Math.floor(bullet.y / cellSize);
            const c = Math.floor(bullet.x / cellSize);
            const cx = c * cellSize;
            const cy = r * cellSize;
            
            // Check which wall is in the direction of movement and reflect
            // For horizontal walls (top/bottom): negate dy
            // For vertical walls (left/right): negate dx
            let wallHit = false;
            
            // Check vertical walls first based on x-velocity direction
            if (bullet.dx < 0 && maze[r][c].left && bullet.x - cx < 5) {
                // Moving left, hit left wall
                bullet.dx = -bullet.dx;
                wallHit = true;
            } else if (bullet.dx > 0 && maze[r][c].right && cx + cellSize - bullet.x < 5) {
                // Moving right, hit right wall
                bullet.dx = -bullet.dx;
                wallHit = true;
            }
            
            // Check horizontal walls based on y-velocity direction
            if (bullet.dy < 0 && maze[r][c].top && bullet.y - cy < 5) {
                // Moving up, hit top wall
                bullet.dy = -bullet.dy;
                wallHit = true;
            } else if (bullet.dy > 0 && maze[r][c].bottom && cy + cellSize - bullet.y < 5) {
                // Moving down, hit bottom wall
                bullet.dy = -bullet.dy;
                wallHit = true;
            }
        } else {
            bullet.x = nx;
            bullet.y = ny;
        }
        // Check tank collision
        const dist = Math.sqrt((bullet.x - tank.x) ** 2 + (bullet.y - tank.y) ** 2);
        if (dist < 10 && gameRunning && !tank.destroyed) {
            tank.destroyed = true;
            resetTimer = 180; // 3 seconds at 60fps
            // Create blast stain
            blastStains.push({
                x: tank.x,
                y: tank.y,
                radius: Math.max(20, cellSize * 0.8),
                alpha: 1
            });
            
            // Fracture tank into pieces
            const bodyWidth = getTankBodyWidth();
            const bodyHeight = getTankBodyHeight();
            const fragmentCount = 6;
            
            for (let f = 0; f < fragmentCount; f++) {
                const angle = (Math.PI * 2 / fragmentCount) * f + (Math.random() - 0.5) * 0.5;
                const speed = 1 + Math.random() * 1.5;
                tankFragments.push({
                    x: tank.x,
                    y: tank.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    angle: Math.random() * Math.PI * 2,
                    angularVelocity: (Math.random() - 0.5) * 0.3,
                    width: bodyWidth * 0.5 + Math.random() * bodyWidth * 0.3,
                    height: bodyHeight * 0.4 + Math.random() * bodyHeight * 0.2,
                    alpha: 1,
                    lifespan: 60 + Math.random() * 40
                });
            }
            
            gameRunning = false;
            bullets.splice(i, 1);
        }
    }
}

// Update tank fragments
function updateTankFragments() {
    for (let i = tankFragments.length - 1; i >= 0; i--) {
        const fragment = tankFragments[i];
        fragment.x += fragment.vx * 0.3;
        fragment.y += fragment.vy * 0.3;
        fragment.vx *= 0.95;
        fragment.vy *= 0.95;
        fragment.angle += fragment.angularVelocity;
        fragment.lifespan--;
        fragment.alpha = Math.max(0, fragment.lifespan / 100);
        
        if (fragment.lifespan <= 0) {
            tankFragments.splice(i, 1);
        }
    }
}

// Update blast stains
function updateBlastStains() {
    for (let i = blastStains.length - 1; i >= 0; i--) {
        const stain = blastStains[i];
        stain.alpha -= 0.01;
        if (stain.alpha <= 0) {
            blastStains.splice(i, 1);
        }
    }
}

function generateNewMaze() {
    resetMazeGenerationState();
    const scale = getRandomMazeScale();
    setMazeDimensions(scale);
    
    // Set tank speed inversely to maze scale
    tank.speed = 2 / scale;
    // Double the tank speed after it has been readjusted for maze size
    tank.speed *= 2;
    
    initMaze();
    generateMaze(0, 0);
    // Spawn tank at a random cell center anywhere in the generated maze
    const spawnRow = Math.floor(Math.random() * rows);
    const spawnCol = Math.floor(Math.random() * cols);
    tank.x = spawnCol * cellSize + cellSize / 2;
    tank.y = spawnRow * cellSize + cellSize / 2;
    tank.angle = 0;
    gameRunning = true;
}

// Game loop
function gameLoop() {
    if (!gameRunning && tankFragments.length === 0 && resetTimer === 0) return;
    updateTank();
    updateBullets();
    updateTankFragments();
    updateBlastStains();
    if (resetTimer > 0) {
        resetTimer--;
        if (resetTimer === 0) {
            generateNewMaze();
        }
    }
    drawScene();
    requestAnimationFrame(gameLoop);
}

// Key listeners
document.addEventListener('keydown', (e) => {
    if (e.key === ' ') e.preventDefault();
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Generate button click
generateBtn.addEventListener('click', () => {
    generateNewMaze();
    gameLoop();
});

// Clear button click
clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gameRunning = false;
});