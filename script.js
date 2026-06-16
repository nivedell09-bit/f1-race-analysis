// =============================================
// F1 LIVE RACE SIMULATION - FIXED VERSION
// Proper lap counting and race simulation
// =============================================

class F1RaceSimulation {
    constructor() {
        // Race configuration
        this.totalLaps = 57;
        this.currentLap = 0;
        this.isRacing = false;
        this.isPaused = false;
        this.simulationSpeed = 1;
        this.lapProgress = 0; // Track progress within a lap
        this.lapTime = 0; // Current lap time in seconds
        
        // Driver data (from actual F1 2024 Bahrain GP)
        this.drivers = [
            { id: 'VER', name: 'Verstappen', team: 'Red Bull', color: '#e10600', number: 1 },
            { id: 'PER', name: 'Perez', team: 'Red Bull', color: '#e10600', number: 11 },
            { id: 'SAI', name: 'Sainz', team: 'Ferrari', color: '#dc0000', number: 55 },
            { id: 'LEC', name: 'Leclerc', team: 'Ferrari', color: '#dc0000', number: 16 },
            { id: 'NOR', name: 'Norris', team: 'McLaren', color: '#1e5bc6', number: 4 },
            { id: 'PIA', name: 'Piastri', team: 'McLaren', color: '#1e5bc6', number: 81 },
            { id: 'HAM', name: 'Hamilton', team: 'Mercedes', color: '#00d2be', number: 44 },
            { id: 'RUS', name: 'Russell', team: 'Mercedes', color: '#00d2be', number: 63 },
            { id: 'ALO', name: 'Alonso', team: 'Aston Martin', color: '#469b46', number: 14 },
            { id: 'STR', name: 'Stroll', team: 'Aston Martin', color: '#469b46', number: 18 }
        ];
        
        // Initial positions (qualifying order)
        this.positions = [
            { driver: 'VER', position: 1, lapTime: 96.56, gap: 0, totalTime: 0 },
            { driver: 'PER', position: 2, lapTime: 96.91, gap: 0.35, totalTime: 0 },
            { driver: 'SAI', position: 3, lapTime: 96.95, gap: 0.39, totalTime: 0 },
            { driver: 'LEC', position: 4, lapTime: 97.25, gap: 0.69, totalTime: 0 },
            { driver: 'NOR', position: 5, lapTime: 97.34, gap: 0.78, totalTime: 0 },
            { driver: 'PIA', position: 6, lapTime: 97.50, gap: 0.94, totalTime: 0 },
            { driver: 'HAM', position: 7, lapTime: 97.65, gap: 1.09, totalTime: 0 },
            { driver: 'RUS', position: 8, lapTime: 97.80, gap: 1.24, totalTime: 0 },
            { driver: 'ALO', position: 9, lapTime: 98.10, gap: 1.54, totalTime: 0 },
            { driver: 'STR', position: 10, lapTime: 98.30, gap: 1.74, totalTime: 0 }
        ];
        
        // Track positions for car animation
        this.trackPath = this.generateTrackPath();
        
        // Speed chart data
        this.speedHistory = [];
        
        // Initialize
        this.init();
    }
    
    generateTrackPath() {
        const points = [];
        const numPoints = 100;
        for (let i = 0; i < numPoints; i++) {
            const t = i / numPoints;
            const angle = t * 2 * Math.PI;
            const x = 50 + 40 * Math.cos(angle);
            const y = 50 + 30 * Math.sin(angle) + 5 * Math.sin(angle * 3);
            points.push({ x, y });
        }
        return points;
    }
    
    init() {
        this.renderTrack();
        this.renderCars();
        this.updateTiming();
        this.setupEventListeners();
        this.startClock();
    }
    
    renderTrack() {
        const canvas = document.getElementById('trackCanvas');
        const ctx = canvas.getContext('2d');
        
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const gradient = ctx.createRadialGradient(
            canvas.width/2, canvas.height/2, 0,
            canvas.width/2, canvas.height/2, canvas.width/2
        );
        gradient.addColorStop(0, '#2a2a3e');
        gradient.addColorStop(1, '#0a0a1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.beginPath();
        const trackWidth = Math.min(canvas.width, canvas.height) * 0.3;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        for (let i = 0; i <= 100; i++) {
            const t = i / 100;
            const angle = t * 2 * Math.PI;
            const x = centerX + trackWidth * Math.cos(angle);
            const y = centerY + trackWidth * 0.7 * Math.sin(angle) + 0.1 * trackWidth * Math.sin(angle * 3);
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 4;
        ctx.stroke();
        
        ctx.beginPath();
        for (let i = 0; i <= 100; i++) {
            const t = i / 100;
            const angle = t * 2 * Math.PI;
            const x = centerX + (trackWidth - 30) * Math.cos(angle);
            const y = centerY + (trackWidth - 30) * 0.7 * Math.sin(angle) + 0.1 * trackWidth * Math.sin(angle * 3);
            
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.setLineDash([10, 10]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = '#fff';
        ctx.font = '14px Arial';
        ctx.fillText('🏁 START/FINISH', canvas.width/2 - 60, canvas.height - 30);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(10, canvas.height/2 - 10, 60, 20);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '10px Arial';
        ctx.fillText('PIT', 15, canvas.height/2 + 4);
        
        this.trackData = { centerX, centerY, trackWidth };
    }
    
    renderCars() {
        const container = document.getElementById('carsContainer');
        container.innerHTML = '';
        this.carElements = {};
        
        this.positions.forEach((pos, index) => {
            const driver = this.drivers.find(d => d.id === pos.driver);
            if (!driver) return;
            
            const car = document.createElement('div');
            car.className = 'car';
            car.dataset.driver = driver.id;
            car.style.position = 'absolute';
            car.style.width = '30px';
            car.style.height = '15px';
            car.style.fontSize = '24px';
            car.style.transition = 'all 0.3s ease';
            
            car.innerHTML = `
                🏎️
                <span class="driver-label">${driver.id}</span>
            `;
            
            const progress = (this.currentLap / this.totalLaps) + (index / this.positions.length * 0.1);
            const position = this.getTrackPosition(progress);
            car.style.left = position.x + '%';
            car.style.top = position.y + '%';
            car.style.transform = `rotate(${position.rotation}deg)`;
            
            container.appendChild(car);
            this.carElements[driver.id] = car;
        });
    }
    
    getTrackPosition(progress) {
        const t = progress % 1;
        const angle = t * 2 * Math.PI;
        
        const x = 50 + 40 * Math.cos(angle);
        const y = 50 + 30 * Math.sin(angle) + 5 * Math.sin(angle * 3);
        
        const nextAngle = ((t + 0.01) % 1) * 2 * Math.PI;
        const nextX = 50 + 40 * Math.cos(nextAngle);
        const nextY = 50 + 30 * Math.sin(nextAngle) + 5 * Math.sin(nextAngle * 3);
        const rotation = Math.atan2(nextY - y, nextX - x) * 180 / Math.PI + 90;
        
        return { x, y, rotation };
    }
    
    updateTiming() {
        const grid = document.getElementById('timingGrid');
        grid.innerHTML = '';
        
        const sorted = [...this.positions].sort((a, b) => a.position - b.position);
        
        sorted.forEach((pos, index) => {
            const driver = this.drivers.find(d => d.id === pos.driver);
            if (!driver) return;
            
            const row = document.createElement('div');
            row.className = 'timing-row';
            
            const displayTime = pos.lapTime + (pos.gap || 0);
            
            row.innerHTML = `
                <span class="pos">${index + 1}</span>
                <span class="car" style="color: ${driver.color}">${driver.id}</span>
                <span class="driver">${driver.name}</span>
                <span class="time">${this.formatTime(displayTime)}</span>
            `;
            
            if (index === 0) {
                row.style.background = 'rgba(255, 215, 0, 0.1)';
                row.style.border = '1px solid gold';
            }
            
            grid.appendChild(row);
        });
        
        if (sorted.length > 0) {
            document.getElementById('currentLeader').textContent = sorted[0].driver;
            document.getElementById('fastestLap').textContent = this.formatTime(Math.min(...this.positions.map(p => p.lapTime)));
        }
    }
    
    updatePositions() {
        // Simulate position changes based on performance
        this.positions.forEach((pos, index) => {
            // Each driver has slightly different pace
            const baseLapTime = pos.lapTime;
            const variation = (Math.random() - 0.5) * 0.3 * this.simulationSpeed;
            
            // Update lap time for this driver
            const newLapTime = baseLapTime + variation;
            pos.lapTime = newLapTime;
            pos.totalTime += newLapTime;
            
            // Some drivers gain/lose positions
            if (Math.random() < 0.05 * this.simulationSpeed) {
                const change = Math.random() > 0.5 ? 1 : -1;
                const newPos = pos.position + change;
                if (newPos >= 1 && newPos <= this.positions.length) {
                    const other = this.positions.find(p => p.position === newPos);
                    if (other && other.driver !== pos.driver) {
                        // Swap positions
                        const tempPos = pos.position;
                        pos.position = other.position;
                        other.position = tempPos;
                    }
                }
            }
        });
    }
    
    simulateLapProgress() {
        if (!this.isRacing || this.isPaused) return;
        
        // Increment lap progress (each step is 1/100th of a lap)
        this.lapProgress += 0.01 * this.simulationSpeed;
        
        // Update car positions based on progress
        this.positions.forEach((pos, index) => {
            const driver = this.drivers.find(d => d.id === pos.driver);
            if (!driver) return;
            
            const car = this.carElements[driver.id];
            if (!car) return;
            
            // Calculate progress offset for each car based on position
            const offset = (pos.position - 1) * 0.02;
            const progress = (this.currentLap + this.lapProgress + offset) / this.totalLaps;
            const position = this.getTrackPosition(progress);
            
            car.style.left = position.x + '%';
            car.style.top = position.y + '%';
            car.style.transform = `rotate(${position.rotation}deg)`;
            
            if (pos.position === 1) {
                car.style.filter = 'drop-shadow(0 0 10px gold)';
            } else {
                car.style.filter = 'none';
            }
        });
        
        // Check if lap is complete (progress >= 1)
        if (this.lapProgress >= 1) {
            this.completeLap();
        }
    }
    
    completeLap() {
        this.currentLap++;
        this.lapProgress = 0;
        
        // Update positions
        this.updatePositions();
        
        // Update timing
        this.updateTiming();
        
        // Update lap counter
        document.getElementById('lapCounter').textContent = `Lap ${this.currentLap}/${this.totalLaps}`;
        document.getElementById('raceProgress').textContent = `${Math.round((this.currentLap / this.totalLaps) * 100)}%`;
        
        // Update speed chart
        this.updateSpeedChart();
        
        // Check if race is complete
        if (this.currentLap >= this.totalLaps) {
            this.finishRace();
        }
    }
    
    updateSpeedChart() {
        const canvas = document.getElementById('speedChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        const speed = 200 + Math.random() * 100;
        this.speedHistory.push(speed);
        if (this.speedHistory.length > 50) this.speedHistory.shift();
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const padding = 20;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;
        
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 5; i++) {
            const y = padding + (i / 4) * chartHeight;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(canvas.width - padding, y);
            ctx.stroke();
        }
        
        if (this.speedHistory.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = '#e10600';
            ctx.lineWidth = 2;
            
            this.speedHistory.forEach((speed, i) => {
                const x = padding + (i / (this.speedHistory.length - 1)) * chartWidth;
                const y = padding + chartHeight - (speed - 150) / 200 * chartHeight;
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            
            const lastX = padding + ((this.speedHistory.length - 1) / (this.speedHistory.length - 1)) * chartWidth;
            ctx.lineTo(lastX, padding + chartHeight);
            ctx.lineTo(padding, padding + chartHeight);
            ctx.closePath();
            ctx.fillStyle = 'rgba(225, 6, 0, 0.1)';
            ctx.fill();
        }
    }
    
    startRace() {
        if (this.isRacing && !this.isPaused) return;
        
        this.isRacing = true;
        this.isPaused = false;
        document.getElementById('raceStatus').textContent = '🏁 RACING';
        document.getElementById('startRace').textContent = '⏳ RACING...';
        document.getElementById('startRace').style.opacity = '0.7';
        
        if (this.interval) return;
        
        // Update every 100ms for smooth animation
        this.interval = setInterval(() => {
            this.simulateLapProgress();
        }, 100);
    }
    
    pauseRace() {
        if (!this.isRacing) return;
        this.isPaused = !this.isPaused;
        document.getElementById('raceStatus').textContent = this.isPaused ? '⏸️ PAUSED' : '🏁 RACING';
        document.getElementById('pauseRace').textContent = this.isPaused ? '▶️ RESUME' : '⏸️ PAUSE';
    }
    
    resetRace() {
        this.isRacing = false;
        this.isPaused = false;
        this.currentLap = 0;
        this.lapProgress = 0;
        this.speedHistory = [];
        
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        
        this.positions = [
            { driver: 'VER', position: 1, lapTime: 96.56, gap: 0, totalTime: 0 },
            { driver: 'PER', position: 2, lapTime: 96.91, gap: 0.35, totalTime: 0 },
            { driver: 'SAI', position: 3, lapTime: 96.95, gap: 0.39, totalTime: 0 },
            { driver: 'LEC', position: 4, lapTime: 97.25, gap: 0.69, totalTime: 0 },
            { driver: 'NOR', position: 5, lapTime: 97.34, gap: 0.78, totalTime: 0 },
            { driver: 'PIA', position: 6, lapTime: 97.50, gap: 0.94, totalTime: 0 },
            { driver: 'HAM', position: 7, lapTime: 97.65, gap: 1.09, totalTime: 0 },
            { driver: 'RUS', position: 8, lapTime: 97.80, gap: 1.24, totalTime: 0 },
            { driver: 'ALO', position: 9, lapTime: 98.10, gap: 1.54, totalTime: 0 },
            { driver: 'STR', position: 10, lapTime: 98.30, gap: 1.74, totalTime: 0 }
        ];
        
        document.getElementById('raceStatus').textContent = '🔄 RESET';
        document.getElementById('lapCounter').textContent = 'Lap 0/57';
        document.getElementById('raceProgress').textContent = '0%';
        document.getElementById('startRace').textContent = '▶️ START RACE';
        document.getElementById('startRace').style.opacity = '1';
        document.getElementById('pauseRace').textContent = '⏸️ PAUSE';
        
        this.renderCars();
        this.updateTiming();
        this.updateSpeedChart();
    }
    
    finishRace() {
        this.isRacing = false;
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        document.getElementById('raceStatus').textContent = '🏆 RACE COMPLETE!';
        document.getElementById('startRace').textContent = '✅ FINISHED';
        
        const winner = this.positions.find(p => p.position === 1);
        if (winner) {
            document.getElementById('currentLeader').textContent = `🏆 ${winner.driver}`;
            document.getElementById('fastestLap').style.color = '#ffd700';
        }
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = (seconds % 60).toFixed(3);
        return `${mins}:${secs.padStart(6, '0')}`;
    }
    
    startClock() {
        setInterval(() => {
            if (this.isRacing && !this.isPaused) {
                this.updateTiming();
            }
        }, 1000);
    }
    
    setupEventListeners() {
        document.getElementById('startRace').addEventListener('click', () => this.startRace());
        document.getElementById('pauseRace').addEventListener('click', () => this.pauseRace());
        document.getElementById('resetRace').addEventListener('click', () => this.resetRace());
        
        document.getElementById('toggleView').addEventListener('click', () => {
            const tower = document.querySelector('.timing-tower');
            tower.style.display = tower.style.display === 'none' ? 'block' : 'none';
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Space') {
                e.preventDefault();
                if (this.isRacing) this.pauseRace();
                else this.startRace();
            }
            if (e.key === 'r' || e.key === 'R') {
                this.resetRace();
            }
        });
        
        window.addEventListener('resize', () => {
            this.renderTrack();
            this.renderCars();
        });
    }
}

// Initialize the simulation
document.addEventListener('DOMContentLoaded', () => {
    const race = new F1RaceSimulation();
    window.raceSimulation = race;
});