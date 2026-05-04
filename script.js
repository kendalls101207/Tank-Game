const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const generateBtn = document.getElementById('generateBtn');
const clearBtn = document.getElementById('clearBtn');
const score1Display = document.getElementById('score1');
const score2Display = document.getElementById('score2');

const mazeRatio = { width: 4, height: 3 };
const minMazeScale = 1;
const maxMazeScale = 6;
const tankBorderColor = '#080808';
const defaultTankSpeed = 100;

const player1Controls = {
    forward: 'w',
    backward: 's',
    left: 'a',
    right: 'd',
    fire: ' ',
    activate: 'f'
};

const player2Controls = {
    forward: 'ArrowUp',
    backward: 'ArrowDown',
    left: 'ArrowLeft',
    right: 'ArrowRight',
    fire: 'm',
    activate: 'l'
};

let rows = 30;
let cols = 40;
let cellSize = 20;

let maze = [];
let tank = { x: cellSize / 2, y: cellSize / 2, angle: 0, speed: defaultTankSpeed, destroyed: false, color: 'blue', powerUp: null };
let tank2 = { x: cellSize / 2, y: cellSize / 2, angle: Math.PI, speed: defaultTankSpeed, destroyed: false, color: 'red', powerUp: null };
let bullets = [];
let tankFragments = [];
let blastStains = [];
let keys = {};
let gameRunning = false;
let resetTimer = 0;
let score1 = 0;
let score2 = 0;
let roundOver = false;
let spawnTimer = 600;
let powerUps = [];
let rockets = [];
let lasers = [];
let mines = [];

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
    powerUps = [];
    rockets = [];
    lasers = [];
    mines = [];
    tank.speed = defaultTankSpeed;
    tank.destroyed = false;
    tank.powerUp = null;
    tank2.speed = defaultTankSpeed;
    tank2.destroyed = false;
    tank2.powerUp = null;
    gameRunning = false;
    resetTimer = 0;
    roundOver = false;
    spawnTimer = 600;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function updateScoreDisplay() {
    if (score1Display) score1Display.textContent = `Player 1: ${score1}`;
    if (score2Display) score2Display.textContent = `Player 2: ${score2}`;
}

function getCellCenter(row, col) {
    return {
        x: col * cellSize + cellSize / 2,
        y: row * cellSize + cellSize / 2
    };
}

function getRandomPowerUpType() {
    const types = ['laser', 'rocket', 'mine'];
    return types[Math.floor(Math.random() * types.length)];
}

function spawnPowerUp() {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);
    const center = getCellCenter(row, col);
    powerUps.push({
        type: getRandomPowerUpType(),
        row,
        col,
        x: center.x,
        y: center.y
    });
}

function activatePowerUp(currentTank) {
    if (!currentTank.powerUp || currentTank.destroyed) return;
    if (currentTank.powerUp === 'laser') {
        fireLaser(currentTank);
    } else if (currentTank.powerUp === 'rocket') {
        fireRocket(currentTank);
    } else if (currentTank.powerUp === 'mine') {
        placeMine(currentTank);
    }
    currentTank.powerUp = null;
}

function fireLaser(currentTank) {
    const barrelLength = getTankBarrelLength();
    lasers.push({
        x: currentTank.x + Math.cos(currentTank.angle) * barrelLength,
        y: currentTank.y + Math.sin(currentTank.angle) * barrelLength,
        angle: currentTank.angle,
        duration: 120,
        owner: currentTank
    });
}

function fireRocket(currentTank) {
    const barrelLength = getTankBarrelLength();
    const speed = 4;
    rockets.push({
        x: currentTank.x + Math.cos(currentTank.angle) * barrelLength,
        y: currentTank.y + Math.sin(currentTank.angle) * barrelLength,
        dx: Math.cos(currentTank.angle) * speed,
        dy: Math.sin(currentTank.angle) * speed,
        speed,
        countdown: 120,
        state: 'arming',
        owner: currentTank,
        path: [],
        pathIndex: 0
    });
}

function placeMine(currentTank) {
    mines.push({
        x: currentTank.x,
        y: currentTank.y,
        owner: currentTank,
        armTimer: 60,
        armed: false,
        visible: true,
        radius: Math.max(8, cellSize * 0.2)
    });
}

function pointLineDistance(x1, y1, x2, y2, px, py) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    const param = lenSq !== 0 ? dot / lenSq : -1;
    let xx, yy;
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

function getClosestTank(rocket) {
    const targets = [tank, tank2].filter(t => t !== rocket.owner && !t.destroyed);
    if (targets.length === 0) {
        const fallback = [tank, tank2].filter(t => !t.destroyed);
        return fallback.length ? fallback[0] : null;
    }
    return targets.reduce((closest, current) => {
        const d1 = Math.hypot(closest.x - rocket.x, closest.y - rocket.y);
        const d2 = Math.hypot(current.x - rocket.x, current.y - rocket.y);
        return d2 < d1 ? current : closest;
    });
}

function findPath(startRow, startCol, targetRow, targetCol) {
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const queue = [{ row: startRow, col: startCol }];
    const prev = Array.from({ length: rows }, () => Array(cols).fill(null));
    visited[startRow][startCol] = true;
    const directions = [
        { rowDelta: -1, colDelta: 0, wall: 'top', opposite: 'bottom' },
        { rowDelta: 1, colDelta: 0, wall: 'bottom', opposite: 'top' },
        { rowDelta: 0, colDelta: -1, wall: 'left', opposite: 'right' },
        { rowDelta: 0, colDelta: 1, wall: 'right', opposite: 'left' }
    ];

    while (queue.length) {
        const { row, col } = queue.shift();
        if (row === targetRow && col === targetCol) break;

        for (const dir of directions) {
            const nr = row + dir.rowDelta;
            const nc = col + dir.colDelta;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            if (visited[nr][nc]) continue;
            if (maze[row][col][dir.wall] || maze[nr][nc][dir.opposite]) continue;
            visited[nr][nc] = true;
            prev[nr][nc] = { row, col };
            queue.push({ row: nr, col: nc });
        }
    }

    if (!visited[targetRow][targetCol]) return [];
    const path = [];
    let current = { row: targetRow, col: targetCol };
    while (current) {
        path.unshift(current);
        current = prev[current.row][current.col];
    }
    return path;
}

function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        for (const currentTank of [tank, tank2]) {
            if (currentTank.destroyed || currentTank.powerUp) continue;
            const dist = Math.hypot(currentTank.x - powerUp.x, currentTank.y - powerUp.y);
            if (dist < cellSize * 0.4) {
                currentTank.powerUp = powerUp.type;
                powerUps.splice(i, 1);
                break;
            }
        }
    }
}

function updateLasers() {
    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        laser.duration--;
        if (laser.duration <= 0) {
            lasers.splice(i, 1);
            continue;
        }

        const length = Math.max(canvas.width, canvas.height) * 1.5;
        const x1 = laser.x;
        const y1 = laser.y;
        const x2 = x1 + Math.cos(laser.angle) * length;
        const y2 = y1 + Math.sin(laser.angle) * length;
        const target = [tank, tank2].find(t => t !== laser.owner && !t.destroyed);
        if (target) {
            const distanceToBeam = pointLineDistance(x1, y1, x2, y2, target.x, target.y);
            if (distanceToBeam < getTankBodyWidth() * 0.6) {
                destroyTank(target);
            }
        }
    }
}

function getRocketCell(rocket) {
    const row = Math.max(0, Math.min(rows - 1, Math.floor(rocket.y / cellSize)));
    const col = Math.max(0, Math.min(cols - 1, Math.floor(rocket.x / cellSize)));
    return { row, col };
}

function updateRockets() {
    for (let i = rockets.length - 1; i >= 0; i--) {
        const rocket = rockets[i];
        if (rocket.state === 'arming') {
            const nx = rocket.x + rocket.dx;
            const ny = rocket.y + rocket.dy;
            if (checkBulletWallCollision(rocket, nx, ny)) {
                rocket.dx = -rocket.dx;
                rocket.dy = -rocket.dy;
            } else {
                rocket.x = nx;
                rocket.y = ny;
            }
            rocket.countdown--;
            if (rocket.countdown <= 0) {
                const targetTank = getClosestTank(rocket);
                if (targetTank) {
                    const currentCell = getRocketCell(rocket);
                    const targetCell = getRocketCell(targetTank);
                    const path = findPath(currentCell.row, currentCell.col, targetCell.row, targetCell.col);
                    rocket.path = path;
                    rocket.pathIndex = 1;
                    rocket.state = 'locked';
                } else {
                    rocket.state = 'locked';
                }
            }
        } else {
            if (rocket.path && rocket.path.length > rocket.pathIndex) {
                const nextCell = rocket.path[rocket.pathIndex];
                const center = getCellCenter(nextCell.row, nextCell.col);
                const dx = center.x - rocket.x;
                const dy = center.y - rocket.y;
                const distance = Math.hypot(dx, dy);
                if (distance < 4) {
                    rocket.pathIndex++;
                } else {
                    rocket.dx = (dx / distance) * rocket.speed;
                    rocket.dy = (dy / distance) * rocket.speed;
                    rocket.x += rocket.dx;
                    rocket.y += rocket.dy;
                }
            } else {
                rocket.x += rocket.dx;
                rocket.y += rocket.dy;
            }
        }

        for (const currentTank of [tank, tank2]) {
            if (checkTankCollision(rocket, currentTank)) {
                destroyTank(currentTank);
                rockets.splice(i, 1);
                break;
            }
        }
    }
}

function updateMines() {
    for (let i = mines.length - 1; i >= 0; i--) {
        const mine = mines[i];
        if (!mine.armed) {
            mine.armTimer--;
            if (mine.armTimer <= 0) {
                mine.armed = true;
                mine.visible = false;
            }
        }
        if (!mine.armed) continue;
        for (const currentTank of [tank, tank2]) {
            if (currentTank.destroyed) continue;
            const dist = Math.hypot(currentTank.x - mine.x, currentTank.y - mine.y);
            if (dist < mine.radius + getTankBodyWidth() * 0.4) {
                destroyTank(currentTank);
                mines.splice(i, 1);
                break;
            }
        }
    }
}

function drawPowerUps() {
    for (const powerUp of powerUps) {
        if (powerUp.type === 'laser') ctx.fillStyle = 'yellow';
        else if (powerUp.type === 'rocket') ctx.fillStyle = 'orange';
        else ctx.fillStyle = 'gray';
        ctx.beginPath();
        ctx.arc(powerUp.x, powerUp.y, Math.max(6, cellSize * 0.18), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'black';
        ctx.font = `${Math.max(10, cellSize * 0.12)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = powerUp.type === 'laser' ? 'L' : powerUp.type === 'rocket' ? 'R' : 'M';
        ctx.fillText(label, powerUp.x, powerUp.y);
    }
}

function drawLasers() {
    for (const laser of lasers) {
        const alpha = Math.max(0, laser.duration / 120);
        const length = Math.max(canvas.width, canvas.height) * 1.5;
        const x1 = laser.x;
        const y1 = laser.y;
        const x2 = x1 + Math.cos(laser.angle) * length;
        const y2 = y1 + Math.sin(laser.angle) * length;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 0, 0, ${alpha * 0.8})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.restore();
    }
}

function drawRockets() {
    for (const rocket of rockets) {
        ctx.save();
        ctx.translate(rocket.x, rocket.y);
        const angle = Math.atan2(rocket.dy, rocket.dx);
        ctx.rotate(angle);
        ctx.fillStyle = 'orange';
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-6, 5);
        ctx.lineTo(-6, -5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}

function drawMines() {
    for (const mine of mines) {
        if (!mine.visible) continue;
        ctx.save();
        ctx.fillStyle = mine.armed ? 'black' : 'gray';
        ctx.beginPath();
        ctx.arc(mine.x, mine.y, mine.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function checkRoundVictory() {
    if (roundOver) return;

    const aliveTanks = [tank, tank2].filter(t => !t.destroyed);
    if (aliveTanks.length === 1) {
        const winner = aliveTanks[0];
        if (winner === tank) score1++;
        else score2++;
        updateScoreDisplay();
        roundOver = true;
        gameRunning = false;
        bullets = [];
        resetTimer = 180;
    } else if (aliveTanks.length === 0) {
        roundOver = true;
        gameRunning = false;
        bullets = [];
        resetTimer = 180;
    }
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
    drawPowerUps();
    drawMines();
    drawRockets();
    drawLasers();
    drawTank(tank);
    drawTank(tank2);
    drawBullets();
    drawTankFragments();
}

// Draw tank
function drawTank(currentTank) {
    if (currentTank.destroyed) return;
    const bodyWidth = getTankBodyWidth();
    const bodyHeight = getTankBodyHeight();
    const barrelLength = getTankBarrelLength();
    const barrelWidth = getTankBarrelWidth();

    ctx.save();
    ctx.translate(currentTank.x, currentTank.y);
    ctx.rotate(currentTank.angle);

    ctx.fillStyle = currentTank.color;
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
        ctx.fillStyle = fragment.color;
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
function updateTank(currentTank, controls) {
    if (currentTank.destroyed) return;
    let deltaX = 0;
    let deltaY = 0;

    if (keys[controls.forward]) {
        deltaX = Math.cos(currentTank.angle) * currentTank.speed;
        deltaY = Math.sin(currentTank.angle) * currentTank.speed;
    }
    if (keys[controls.backward]) {
        deltaX -= Math.cos(currentTank.angle) * currentTank.speed;
        deltaY -= Math.sin(currentTank.angle) * currentTank.speed;
    }
    if (keys[controls.left]) {
        currentTank.angle -= 0.1;
    }
    if (keys[controls.right]) {
        currentTank.angle += 0.1;
    }
    if (keys[controls.fire]) {
        const barrelLength = getTankBarrelLength();
        const bulletSpeed = currentTank.speed * 1.1;
        bullets.push({
            x: currentTank.x + Math.cos(currentTank.angle) * barrelLength,
            y: currentTank.y + Math.sin(currentTank.angle) * barrelLength,
            dx: Math.cos(currentTank.angle) * bulletSpeed,
            dy: Math.sin(currentTank.angle) * bulletSpeed,
            ricochets: 0,
            radius: getBulletRadius(),
            owner: currentTank
        });
        keys[controls.fire] = false; // Prevent continuous firing
    }

    if (keys[controls.activate]) {
        activatePowerUp(currentTank);
        keys[controls.activate] = false;
    }

    if (deltaX !== 0 || deltaY !== 0) {
        const newX = currentTank.x + deltaX;
        const newY = currentTank.y + deltaY;

        if (!checkWallCollision(newX, newY)) {
            currentTank.x = newX;
            currentTank.y = newY;
        } else {
            if (!checkWallCollisionAxis(newX, currentTank.y, 'x')) {
                currentTank.x = newX;
            }
            if (!checkWallCollisionAxis(currentTank.x, newY, 'y')) {
                currentTank.y = newY;
            }
        }
    }
}

function destroyTank(currentTank) {
    if (currentTank.destroyed) return;
    currentTank.destroyed = true;

    blastStains.push({
        x: currentTank.x,
        y: currentTank.y,
        radius: Math.max(20, cellSize * 0.8),
        alpha: 1
    });

    const bodyWidth = getTankBodyWidth();
    const bodyHeight = getTankBodyHeight();
    const fragmentCount = 6;

    for (let f = 0; f < fragmentCount; f++) {
        const angle = (Math.PI * 2 / fragmentCount) * f + (Math.random() - 0.5) * 0.5;
        const speed = 1 + Math.random() * 1.5;
        tankFragments.push({
            x: currentTank.x,
            y: currentTank.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            angle: Math.random() * Math.PI * 2,
            angularVelocity: (Math.random() - 0.5) * 0.3,
            width: bodyWidth * 0.5 + Math.random() * bodyWidth * 0.3,
            height: bodyHeight * 0.4 + Math.random() * bodyHeight * 0.2,
            alpha: 1,
            lifespan: 60 + Math.random() * 40,
            color: currentTank.color
        });
    }
}

function checkTankCollision(bullet, currentTank) {
    if (bullet.owner === currentTank) return false;
    if (currentTank.destroyed) return false;
    const dist = Math.sqrt((bullet.x - currentTank.x) ** 2 + (bullet.y - currentTank.y) ** 2);
    return dist < 10;
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
            const r = Math.floor(bullet.y / cellSize);
            const c = Math.floor(bullet.x / cellSize);
            const cx = c * cellSize;
            const cy = r * cellSize;

            if (bullet.dx < 0 && maze[r][c].left && bullet.x - cx < 5) {
                bullet.dx = -bullet.dx;
            } else if (bullet.dx > 0 && maze[r][c].right && cx + cellSize - bullet.x < 5) {
                bullet.dx = -bullet.dx;
            }
            if (bullet.dy < 0 && maze[r][c].top && bullet.y - cy < 5) {
                bullet.dy = -bullet.dy;
            } else if (bullet.dy > 0 && maze[r][c].bottom && cy + cellSize - bullet.y < 5) {
                bullet.dy = -bullet.dy;
            }
        } else {
            bullet.x = nx;
            bullet.y = ny;
        }

        if (gameRunning) {
            if (checkTankCollision(bullet, tank)) {
                destroyTank(tank);
                bullets.splice(i, 1);
                continue;
            }
            if (checkTankCollision(bullet, tank2)) {
                destroyTank(tank2);
                bullets.splice(i, 1);
                continue;
            }
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
    tank2.speed = 2 / scale;
    // Double the tank speed after it has been readjusted for maze size
    tank.speed *= 2;
    tank2.speed *= 2;
    
    initMaze();
    generateMaze(0, 0);

    const spawnRow = Math.floor(Math.random() * rows);
    const spawnCol = Math.floor(Math.random() * cols);
    tank.x = spawnCol * cellSize + cellSize / 2;
    tank.y = spawnRow * cellSize + cellSize / 2;
    tank.angle = 0;

    let spawnRow2 = Math.floor(Math.random() * rows);
    let spawnCol2 = Math.floor(Math.random() * cols);
    while (spawnRow2 === spawnRow && spawnCol2 === spawnCol) {
        spawnRow2 = Math.floor(Math.random() * rows);
        spawnCol2 = Math.floor(Math.random() * cols);
    }
    tank2.x = spawnCol2 * cellSize + cellSize / 2;
    tank2.y = spawnRow2 * cellSize + cellSize / 2;
    tank2.angle = Math.PI;
    gameRunning = true;
}

// Game loop
function gameLoop() {
    if (!gameRunning && tankFragments.length === 0 && resetTimer === 0) return;
    if (gameRunning) {
        updateTank(tank, player1Controls);
        updateTank(tank2, player2Controls);
        updatePowerUps();
        updateLasers();
        updateRockets();
        updateMines();
        spawnTimer--;
        if (spawnTimer <= 0) {
            spawnPowerUp();
            spawnTimer = 600;
        }
    }
    updateBullets();
    updateTankFragments();
    updateBlastStains();
    if (resetTimer > 0) {
        resetTimer--;
        if (resetTimer === 0) {
            generateNewMaze();
        }
    }
    checkRoundVictory();
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