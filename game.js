// 题目生成器
class QuestionGenerator {
    generateAddition() {
        const a = Math.floor(Math.random() * 21);
        const b = Math.floor(Math.random() * (21 - a));
        return {
            text: `${a} + ${b} = ?`,
            answer: a + b
        };
    }
    
    generateSubtraction() {
        const a = Math.floor(Math.random() * 21);
        const b = Math.floor(Math.random() * (a + 1));
        return {
            text: `${a} - ${b} = ?`,
            answer: a - b
        };
    }
    
    generateRandomQuestion() {
        return Math.random() > 0.5 ? this.generateAddition() : this.generateSubtraction();
    }
    
    generateWrongOptions(correctAnswer, count) {
        const options = [];
        while (options.length < count) {
            let wrong;
            do {
                wrong = Math.floor(Math.random() * 21);
            } while (wrong === correctAnswer || options.includes(wrong));
            options.push(wrong);
        }
        return options;
    }
}

// 蛇控制器
class Snake {
    constructor(startX, startY) {
        this.body = [{ x: startX, y: startY }];
        this.direction = 'right';
        this.nextDirection = 'right';
        this.growPending = 0;
    }
    
    move() {
        this.direction = this.nextDirection;
        const head = this.getHead();
        let newX = head.x;
        let newY = head.y;
        
        switch (this.direction) {
            case 'up': newY--; break;
            case 'down': newY++; break;
            case 'left': newX--; break;
            case 'right': newX++; break;
        }
        
        this.body.unshift({ x: newX, y: newY });
        
        if (this.growPending > 0) {
            this.growPending--;
        } else {
            this.body.pop();
        }
    }
    
    changeDirection(newDir) {
        const opposite = {
            'up': 'down',
            'down': 'up',
            'left': 'right',
            'right': 'left'
        };
        
        if (opposite[newDir] !== this.direction) {
            this.nextDirection = newDir;
        }
    }
    
    grow() {
        this.growPending++;
    }
    
    getHead() {
        return this.body[0];
    }
    
    checkSelfCollision() {
        const head = this.getHead();
        for (let i = 1; i < this.body.length; i++) {
            if (head.x === this.body[i].x && head.y === this.body[i].y) {
                return true;
            }
        }
        return false;
    }
}

// 排行榜管理器
class LeaderboardManager {
    constructor() {
        this.storageKey = 'mathSnake_leaderboard';
        this.maxEntries = 10;
    }
    
    saveScore(name, score) {
        const leaderboard = this.getLeaderboard();
        const date = new Date();
        const timeString = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        leaderboard.push({
            name: name,
            score: score,
            date: dateString,
            time: timeString
        });
        
        leaderboard.sort((a, b) => b.score - a.score);
        const top10 = leaderboard.slice(0, this.maxEntries);
        
        localStorage.setItem(this.storageKey, JSON.stringify(top10));
    }
    
    getLeaderboard() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : [];
    }
    
    isHighScore(score) {
        const leaderboard = this.getLeaderboard();
        if (leaderboard.length < this.maxEntries) {
            return true;
        }
        return score > leaderboard[leaderboard.length - 1].score;
    }
    
    clearLeaderboard() {
        localStorage.removeItem(this.storageKey);
    }
}

// 答案方块
class AnswerBlock {
    constructor(x, y, value, isCorrect, color) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.isCorrect = isCorrect;
        this.color = color;
    }
}

// 游戏主控制器
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 30;
        this.gridWidth = this.canvas.width / this.gridSize;
        this.gridHeight = this.canvas.height / this.gridSize;
        
        this.score = 0;
        this.highScore = 0;
        this.isRunning = false;
        this.isPaused = false;
        this.gameSpeed = 250;
        
        this.snake = null;
        this.currentQuestion = null;
        this.answerBlocks = [];
        this.questionGenerator = new QuestionGenerator();
        this.leaderboard = new LeaderboardManager();
        
        // 触摸控制变量
        this.touchStartX = 0;
        this.touchStartY = 0;
        
        // 答案方块颜色池
        this.blockColors = [
            '#95E1D3', // 浅绿色
            '#FF8B94', // 浅红色
            '#A8D8EA', // 浅蓝色
            '#FFD93D', // 黄色
            '#6BCB77', // 绿色
            '#FF6B6B'  // 红色
        ];
        
        this.loadHighScore();
        this.setupEventListeners();
        this.drawInitialScreen();
    }
    
    loadHighScore() {
        const leaderboard = this.leaderboard.getLeaderboard();
        this.highScore = leaderboard.length > 0 ? leaderboard[0].score : 0;
        this.updateScoreDisplay();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        document.getElementById('showLeaderboardBtn').addEventListener('click', () => this.showLeaderboard());
        
        document.getElementById('saveScoreBtn').addEventListener('click', () => this.saveScore());
        document.getElementById('skipSaveBtn').addEventListener('click', () => this.hideNameInputModal());
        document.getElementById('closeLeaderboardBtn').addEventListener('click', () => this.hideLeaderboard());
        document.getElementById('clearLeaderboardBtn').addEventListener('click', () => this.clearLeaderboard());
        document.getElementById('restartFromLeaderboardBtn').addEventListener('click', () => {
            this.hideLeaderboard();
            this.restart();
        });
        document.getElementById('viewLeaderboardBtn').addEventListener('click', () => {
            this.hideGameOverModal();
            this.showLeaderboard();
        });
        document.getElementById('restartFromGameOverBtn').addEventListener('click', () => {
            this.hideGameOverModal();
            this.restart();
        });
        
        // 触摸控制
        this.canvas.addEventListener('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            e.preventDefault();
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        });
        
        this.canvas.addEventListener('touchend', (e) => {
            if (!this.isRunning || this.isPaused) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const dx = touchEndX - this.touchStartX;
            const dy = touchEndY - this.touchStartY;
            
            // 降低阈值，使操作更灵敏（从30改为20）
            if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 20) this.snake.changeDirection('right');
                else if (dx < -20) this.snake.changeDirection('left');
            } else {
                if (dy > 20) this.snake.changeDirection('down');
                else if (dy < -20) this.snake.changeDirection('up');
            }
            
            e.preventDefault();
        });
        
        // 方向按键控制
        document.getElementById('btnUp').addEventListener('click', () => {
            if (this.isRunning && !this.isPaused) {
                this.snake.changeDirection('up');
            }
        });
        
        document.getElementById('btnDown').addEventListener('click', () => {
            if (this.isRunning && !this.isPaused) {
                this.snake.changeDirection('down');
            }
        });
        
        document.getElementById('btnLeft').addEventListener('click', () => {
            if (this.isRunning && !this.isPaused) {
                this.snake.changeDirection('left');
            }
        });
        
        document.getElementById('btnRight').addEventListener('click', () => {
            if (this.isRunning && !this.isPaused) {
                this.snake.changeDirection('right');
            }
        });
        
        // 防止方向按键的触摸事件冒泡
        const dPadButtons = document.querySelectorAll('.d-pad-btn');
        dPadButtons.forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.click();
            });
        });
    }
    
    handleKeyDown(e) {
        if (!this.isRunning) return;
        
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.snake.changeDirection('up');
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.snake.changeDirection('down');
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.snake.changeDirection('left');
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.snake.changeDirection('right');
                break;
            case ' ':
                e.preventDefault();
                this.togglePause();
                break;
        }
    }
    
    start() {
        if (this.isRunning) return;
        
        this.snake = new Snake(Math.floor(this.gridWidth / 2), Math.floor(this.gridHeight / 2));
        this.score = 0;
        this.isRunning = true;
        this.isPaused = false;
        
        this.generateQuestion();
        this.updateScoreDisplay();
        
        this.gameLoop();
    }
    
    togglePause() {
        if (!this.isRunning) return;
        
        this.isPaused = !this.isPaused;
        
        if (!this.isPaused) {
            this.gameLoop();
        }
    }
    
    restart() {
        this.isRunning = false;
        this.isPaused = false;
        this.start();
    }
    
    generateQuestion() {
        this.currentQuestion = this.questionGenerator.generateRandomQuestion();
        
        document.getElementById('questionText').textContent = this.currentQuestion.text;
        
        const correctAnswer = this.currentQuestion.answer;
        const wrongAnswers = this.questionGenerator.generateWrongOptions(correctAnswer, 3);
        
        const allAnswers = [correctAnswer, ...wrongAnswers];
        this.shuffleArray(allAnswers);
        
        this.answerBlocks = [];
        const occupiedPositions = new Set();
        
        // 为每个答案分配随机颜色
        const shuffledColors = [...this.blockColors];
        this.shuffleArray(shuffledColors);
        
        for (let i = 0; i < allAnswers.length; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * this.gridWidth);
                y = Math.floor(Math.random() * this.gridHeight);
            } while (this.isPositionOccupied(x, y, occupiedPositions));
            
            occupiedPositions.add(`${x},${y}`);
            const isCorrect = allAnswers[i] === correctAnswer;
            const color = shuffledColors[i];
            this.answerBlocks.push(new AnswerBlock(x, y, allAnswers[i], isCorrect, color));
        }
    }
    
    isPositionOccupied(x, y, occupiedPositions) {
        if (occupiedPositions.has(`${x},${y}`)) return true;
        
        const head = this.snake.getHead();
        if (x === head.x && y === head.y) return true;
        
        for (let segment of this.snake.body) {
            if (x === segment.x && y === segment.y) return true;
        }
        
        return false;
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    gameLoop() {
        if (!this.isRunning || this.isPaused) return;
        
        this.update();
        this.render();
        
        setTimeout(() => requestAnimationFrame(() => this.gameLoop()), this.gameSpeed);
    }
    
    update() {
        this.snake.move();
        
        const head = this.snake.getHead();
        
        // 检查撞墙
        if (head.x < 0 || head.x >= this.gridWidth || head.y < 0 || head.y >= this.gridHeight) {
            this.gameOver();
            return;
        }
        
        // 检查撞自己
        if (this.snake.checkSelfCollision()) {
            this.gameOver();
            return;
        }
        
        // 检查吃答案
        for (let i = 0; i < this.answerBlocks.length; i++) {
            const block = this.answerBlocks[i];
            if (head.x === block.x && head.y === block.y) {
                if (block.isCorrect) {
                    this.score += 10;
                    this.snake.grow();
                    this.updateScoreDisplay();
                    this.generateQuestion();
                } else {
                    this.gameOver();
                    return;
                }
                break;
            }
        }
    }
    
    render() {
        this.ctx.fillStyle = '#FFF9E6';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawGrid();
        this.drawSnake();
        this.drawAnswerBlocks();
    }
    
    drawInitialScreen() {
        this.ctx.fillStyle = '#FFF9E6';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawGrid();
        
        this.ctx.fillStyle = '#667eea';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('点击"开始"按钮开始游戏', this.canvas.width / 2, this.canvas.height / 2);
    }
    
    drawGrid() {
        this.ctx.strokeStyle = '#E8E8E8';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
    
    drawSnake() {
        for (let i = 0; i < this.snake.body.length; i++) {
            const segment = this.snake.body[i];
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;
            
            if (i === 0) {
                this.ctx.fillStyle = '#FF6B6B';
            } else {
                this.ctx.fillStyle = '#4ECDC4';
            }
            
            this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
            
            this.ctx.strokeStyle = '#2C3E50';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
        }
    }
    
    drawAnswerBlocks() {
        for (let block of this.answerBlocks) {
            const x = block.x * this.gridSize;
            const y = block.y * this.gridSize;
            
            this.ctx.fillStyle = block.color;
            this.ctx.fillRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
            
            this.ctx.strokeStyle = '#2C3E50';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x + 1, y + 1, this.gridSize - 2, this.gridSize - 2);
            
            this.ctx.fillStyle = '#2C3E50';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(block.value, x + this.gridSize / 2, y + this.gridSize / 2);
        }
    }
    
    updateScoreDisplay() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('highScore').textContent = this.highScore;
    }
    
    gameOver() {
        this.isRunning = false;
        
        if (this.leaderboard.isHighScore(this.score)) {
            this.showNameInputModal();
        } else {
            this.showGameOverModal();
        }
    }
    
    showNameInputModal() {
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('nameInputModal').classList.remove('hidden');
        document.getElementById('playerName').value = '';
        document.getElementById('playerName').focus();
    }
    
    hideNameInputModal() {
        document.getElementById('nameInputModal').classList.add('hidden');
        this.showLeaderboard();
    }
    
    saveScore() {
        const nameInput = document.getElementById('playerName');
        const name = nameInput.value.trim() || '匿名玩家';
        
        this.leaderboard.saveScore(name, this.score);
        this.loadHighScore();
        this.hideNameInputModal();
    }
    
    showGameOverModal() {
        document.getElementById('gameOverScore').textContent = this.score;
        document.getElementById('gameOverModal').classList.remove('hidden');
    }
    
    hideGameOverModal() {
        document.getElementById('gameOverModal').classList.add('hidden');
    }
    
    showLeaderboard() {
        const leaderboard = this.leaderboard.getLeaderboard();
        const tbody = document.getElementById('leaderboardBody');
        tbody.innerHTML = '';
        
        if (leaderboard.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4">暂无记录</td></tr>';
        } else {
            leaderboard.forEach((entry, index) => {
                const row = document.createElement('tr');
                const rank = index + 1;
                const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
                const rankClass = rank <= 3 ? `rank-${rank}` : '';
                
                row.innerHTML = `
                    <td class="${rankClass}">${rankIcon}</td>
                    <td class="${rankClass}">${entry.name}</td>
                    <td class="${rankClass}">${entry.score}</td>
                    <td class="${rankClass}">${entry.time}</td>
                `;
                tbody.appendChild(row);
            });
        }
        
        document.getElementById('leaderboardModal').classList.remove('hidden');
    }
    
    hideLeaderboard() {
        document.getElementById('leaderboardModal').classList.add('hidden');
    }
    
    clearLeaderboard() {
        if (confirm('确定要清除排行榜吗？')) {
            this.leaderboard.clearLeaderboard();
            this.highScore = 0;
            this.updateScoreDisplay();
            this.showLeaderboard();
        }
    }
}

// 初始化游戏
const game = new Game();