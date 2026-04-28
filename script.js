const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');

const rows = 30;
const cols = 40;
const cellSize = 20;

let maze = [];
let tank = { x: cellSize / 2, y: cellSize / 2, angle: 0, speed: 1 };
let bullets = [];
let keys = {};
let gameRunning = false;

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
    drawTank();
    drawBullets();
}

// Draw tank
function drawTank() {
    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.angle);
    ctx.fillStyle = 'blue';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
    ctx.restore();
}

// Draw bullets
function drawBullets() {
    ctx.fillStyle = 'black';
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 1.5, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Check wall collision for tank
function checkWallCollision(x, y) {
    const r = Math.floor(y / cellSize);
    const c = Math.floor(x / cellSize);
    if (r < 0 || r >= rows || c < 0 || c >= cols) return true;
    const cx = c * cellSize;
    const cy = r * cellSize;
    if (maze[r][c].top && Math.abs(y - cy) < 5) return true;
    if (maze[r][c].bottom && Math.abs(y - (cy + cellSize)) < 5) return true;
    if (maze[r][c].left && Math.abs(x - cx) < 5) return true;
    if (maze[r][c].right && Math.abs(x - (cx + cellSize)) < 5) return true;
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
    let moved = false;
    if (keys['w']) {
        tank.x += Math.cos(tank.angle) * tank.speed;
        tank.y += Math.sin(tank.angle) * tank.speed;
        moved = true;
    }
    if (keys['s']) {
        tank.x -= Math.cos(tank.angle) * (tank.speed / 2);
        tank.y -= Math.sin(tank.angle) * (tank.speed / 2);
        moved = true;
    }
    if (keys['a']) {
        tank.angle -= 0.1;
    }
    if (keys['d']) {
        tank.angle += 0.1;
    }
    if (keys[' ']) {
        // Fire bullet
        const bulletSpeed = tank.speed * 1.1;
        bullets.push({
            x: tank.x + Math.cos(tank.angle) * 10,
            y: tank.y + Math.sin(tank.angle) * 10,
            dx: Math.cos(tank.angle) * bulletSpeed,
            dy: Math.sin(tank.angle) * bulletSpeed,
            ricochets: 0
        });
        keys[' '] = false; // Prevent continuous firing
    }
    // Check wall collision
    if (moved) {
        if (checkWallCollision(tank.x, tank.y)) {
            // Revert
            if (keys['w']) {
                tank.x -= Math.cos(tank.angle) * tank.speed;
                tank.y -= Math.sin(tank.angle) * tank.speed;
            } else if (keys['s']) {
                tank.x += Math.cos(tank.angle) * (tank.speed / 2);
                tank.y += Math.sin(tank.angle) * (tank.speed / 2);
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
        if (dist < 10) {
            alert('Tank destroyed!');
            gameRunning = false;
            bullets.splice(i, 1);
        }
    }
}

// Game loop
function gameLoop() {
    if (!gameRunning) return;
    updateTank();
    updateBullets();
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
    initMaze();
    generateMaze(0, 0);
    // Spawn tank
    tank.x = cellSize / 2;
    tank.y = cellSize / 2;
    tank.angle = 0;
    bullets = [];
    gameRunning = true;
    gameLoop();
});

// Clear button click
clearBtn.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    gameRunning = false;
});