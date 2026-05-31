class QuantumTunnelingSimulation {
    constructor() {
        this.canvas = document.getElementById('simulationCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        this.params = {
            barrierHeight: 5.0,
            barrierWidth: 2.0,
            particleEnergy: 3.0,
            wavePosition: -8.0
        };
        
        this.simulationParams = {
            xMin: -15,
            xMax: 15,
            dx: 0.1,
            dt: 0.005,
            mass: 1.0,
            hbar: 1.0
        };
        
        this.isRunning = false;
        this.wavePacket = null;
        this.worker = null;
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.currentFps = 0;
        this.computeTimes = [];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.initWorker();
        this.draw();
    }
    
    initWorker() {
        if (this.worker) {
            this.worker.terminate();
        }
        
        this.worker = new Worker('quantum-worker.js');
        
        this.worker.onmessage = (e) => {
            switch (e.data.type) {
                case 'init':
                    this.handleInit(e.data);
                    break;
                case 'progress':
                    this.handleProgress(e.data);
                    break;
                case 'paused':
                    this.handlePaused(e.data);
                    break;
                case 'reset':
                    this.handleReset(e.data);
                    break;
            }
        };
        
        this.worker.onerror = (error) => {
            console.error('Worker error:', error);
        };
        
        this.sendToWorker('init', {
            params: {
                ...this.params,
                ...this.simulationParams
            }
        });
    }
    
    sendToWorker(type, data = {}) {
        if (this.worker) {
            this.worker.postMessage({ type, ...data });
        }
    }
    
    handleInit(data) {
        this.wavePacket = data.wavePacket;
        this.frameCount = 0;
        this.computeTimes = [];
        this.draw();
        this.updateStatus('就绪 - 等待开始', 'ready');
    }
    
    handleProgress(data) {
        this.wavePacket = data.wavePacket;
        this.frameCount++;
        
        if (data.progress.computeTime) {
            this.computeTimes.push(data.progress.computeTime);
            if (this.computeTimes.length > 50) {
                this.computeTimes.shift();
            }
        }
        
        const now = performance.now();
        if (now - this.lastFpsUpdate >= 500) {
            this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate + 1));
            this.lastFpsUpdate = now;
        }
        
        this.draw();
        this.updatePerformanceDisplay();
    }
    
    handlePaused(data) {
        this.updateStatus('已暂停', 'paused');
    }
    
    handleReset(data) {
        this.wavePacket = data.wavePacket;
        this.frameCount = 0;
        this.computeTimes = [];
        this.draw();
        this.updateStatus('已重置', 'ready');
    }
    
    setupEventListeners() {
        document.getElementById('barrierHeight').addEventListener('input', (e) => {
            this.params.barrierHeight = parseFloat(e.target.value);
            document.getElementById('barrierHeightValue').textContent = this.params.barrierHeight.toFixed(1);
            this.calculateTransmissionCoefficient();
            this.updateWorkerParams();
        });
        
        document.getElementById('barrierWidth').addEventListener('input', (e) => {
            this.params.barrierWidth = parseFloat(e.target.value);
            document.getElementById('barrierWidthValue').textContent = this.params.barrierWidth.toFixed(1);
            this.calculateTransmissionCoefficient();
            this.updateWorkerParams();
        });
        
        document.getElementById('particleEnergy').addEventListener('input', (e) => {
            this.params.particleEnergy = parseFloat(e.target.value);
            document.getElementById('particleEnergyValue').textContent = this.params.particleEnergy.toFixed(1);
            this.calculateTransmissionCoefficient();
            this.updateWorkerParams();
        });
        
        document.getElementById('wavePosition').addEventListener('input', (e) => {
            this.params.wavePosition = parseFloat(e.target.value);
            document.getElementById('wavePositionValue').textContent = this.params.wavePosition.toFixed(1);
            this.updateWorkerParams();
        });
        
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.pause());
        document.getElementById('resetBtn').addEventListener('click', () => this.reset());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveExperiment());
    }
    
    updateWorkerParams() {
        if (!this.isRunning) {
            this.sendToWorker('updateParams', {
                params: {
                    ...this.params,
                    ...this.simulationParams
                }
            });
        }
    }
    
    calculateTransmissionCoefficient() {
        const { barrierHeight: V0, barrierWidth: a, particleEnergy: E } = this.params;
        const { mass, hbar } = this.simulationParams;
        
        let T, R, status;
        
        if (Math.abs(E - V0) < 0.01) {
            T = 1 / (1 + (mass * V0 * a * a) / (2 * hbar * hbar));
            status = "E ≈ V₀ - 共振隧穿";
        } else if (E < V0) {
            const kappa = Math.sqrt(2 * mass * (V0 - E)) / hbar;
            const exponent = -2 * kappa * a;
            const prefactor = 16 * (E / V0) * (1 - E / V0);
            T = prefactor * Math.exp(exponent);
            T = Math.min(T, 1);
            status = "E < V₀ - 量子隧穿";
        } else {
            const k1 = Math.sqrt(2 * mass * E) / hbar;
            const k2 = Math.sqrt(2 * mass * (E - V0)) / hbar;
            const numerator = 4 * k1 * k2;
            const denominator = Math.pow(k1 + k2, 2) * Math.pow(Math.cos(k2 * a), 2) + 
                               Math.pow(k1 * k2 + 1, 2) * Math.pow(Math.sin(k2 * a), 2);
            T = numerator / denominator;
            T = Math.min(T, 1);
            status = "E > V₀ - 量子振荡散射";
        }
        
        R = 1 - T;
        
        document.getElementById('transmissionCoeff').textContent = T.toFixed(8);
        document.getElementById('reflectionCoeff').textContent = R.toFixed(8);
        document.getElementById('transmissionProb').textContent = (T * 100).toFixed(6) + '%';
        document.getElementById('tunnelingStatus').textContent = status;
        
        return { T, R };
    }
    
    updateStatus(message, type) {
        const statusEl = document.getElementById('simulationStatus');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status-${type}`;
        }
    }
    
    updatePerformanceDisplay() {
        const avgComputeTime = this.computeTimes.length > 0 
            ? (this.computeTimes.reduce((a, b) => a + b, 0) / this.computeTimes.length).toFixed(2)
            : '0.00';
        
        const perfEl = document.getElementById('performanceDisplay');
        if (perfEl) {
            perfEl.innerHTML = `
                <span>FPS: <strong>${this.currentFps}</strong></span>
                <span>步数: <strong>${this.frameCount}</strong></span>
                <span>计算: <strong>${avgComputeTime}ms</strong></span>
            `;
        }
    }
    
    xToCanvas(x) {
        const { xMin, xMax } = this.simulationParams;
        return ((x - xMin) / (xMax - xMin)) * this.width;
    }
    
    yToCanvas(y, maxValue) {
        const padding = 40;
        const plotHeight = this.height - 2 * padding;
        return this.height - padding - (y / maxValue) * plotHeight;
    }
    
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);
        
        this.drawGrid();
        this.drawAbsorptionLayer();
        this.drawPotential();
        this.drawEnergyLine();
        this.drawWavePacket();
        this.drawAxes();
    }
    
    drawGrid() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= 10; i++) {
            const x = (i / 10) * this.width;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
            
            const y = (i / 10) * this.height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
    }
    
    drawAbsorptionLayer() {
        const ctx = this.ctx;
        const { xMin, xMax } = this.simulationParams;
        const layerWidth = 3.0;
        
        const leftEnd = this.xToCanvas(xMin + layerWidth);
        const rightStart = this.xToCanvas(xMax - layerWidth);
        
        const leftGradient = ctx.createLinearGradient(0, 0, leftEnd, 0);
        leftGradient.addColorStop(0, 'rgba(255, 100, 100, 0.3)');
        leftGradient.addColorStop(1, 'rgba(255, 100, 100, 0)');
        ctx.fillStyle = leftGradient;
        ctx.fillRect(0, 0, leftEnd, this.height);
        
        const rightGradient = ctx.createLinearGradient(rightStart, 0, this.width, 0);
        rightGradient.addColorStop(0, 'rgba(255, 100, 100, 0)');
        rightGradient.addColorStop(1, 'rgba(255, 100, 100, 0.3)');
        ctx.fillStyle = rightGradient;
        ctx.fillRect(rightStart, 0, this.width - rightStart, this.height);
        
        ctx.fillStyle = 'rgba(255, 150, 150, 0.8)';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('吸收层', leftEnd / 2, 25);
        ctx.fillText('吸收层', rightStart + (this.width - rightStart) / 2, 25);
    }
    
    drawAxes() {
        const ctx = this.ctx;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        
        const centerY = this.height - 40;
        
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(this.width, centerY);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        
        const { xMin, xMax } = this.simulationParams;
        for (let x = xMin; x <= xMax; x += 5) {
            const canvasX = this.xToCanvas(x);
            ctx.fillText(x.toString(), canvasX, centerY + 20);
        }
    }
    
    drawPotential() {
        const ctx = this.ctx;
        const { barrierHeight, barrierWidth } = this.params;
        const maxY = Math.max(10, barrierHeight * 1.2);
        
        const barrierLeft = this.xToCanvas(-barrierWidth / 2);
        const barrierRight = this.xToCanvas(barrierWidth / 2);
        const barrierTop = this.yToCanvas(barrierHeight, maxY);
        const bottomY = this.yToCanvas(0, maxY);
        
        const gradient = ctx.createLinearGradient(barrierLeft, barrierTop, barrierRight, bottomY);
        gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(barrierLeft, barrierTop, barrierRight - barrierLeft, bottomY - barrierTop);
        
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.strokeRect(barrierLeft, barrierTop, barrierRight - barrierLeft, bottomY - barrierTop);
    }
    
    drawEnergyLine() {
        const ctx = this.ctx;
        const { particleEnergy, barrierHeight } = this.params;
        const maxY = Math.max(10, barrierHeight * 1.2);
        
        const y = this.yToCanvas(particleEnergy, maxY);
        
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`E = ${particleEnergy.toFixed(1)}`, 10, y - 8);
    }
    
    drawWavePacket() {
        if (!this.wavePacket) return;
        
        const ctx = this.ctx;
        const { barrierHeight } = this.params;
        const maxY = Math.max(10, barrierHeight * 1.2);
        const maxProb = Math.max(...this.wavePacket.prob) * 1.2;
        const scale = maxY * 0.3 / maxProb;
        
        const gradient = ctx.createLinearGradient(0, 0, this.width, 0);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.9)');
        gradient.addColorStop(0.5, 'rgba(124, 58, 237, 0.9)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0.9)');
        
        ctx.beginPath();
        ctx.moveTo(0, this.height - 40);
        
        for (let i = 0; i < this.wavePacket.x.length; i++) {
            const x = this.xToCanvas(this.wavePacket.x[i]);
            const prob = this.wavePacket.prob[i] * scale;
            const y = this.yToCanvas(prob, maxY);
            
            ctx.lineTo(x, y);
        }
        
        ctx.lineTo(this.width, this.height - 40);
        ctx.closePath();
        
        const fillGradient = ctx.createLinearGradient(0, this.height - 150, 0, this.height - 40);
        fillGradient.addColorStop(0, 'rgba(0, 212, 255, 0.4)');
        fillGradient.addColorStop(1, 'rgba(124, 58, 237, 0.1)');
        ctx.fillStyle = fillGradient;
        ctx.fill();
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastFpsUpdate = performance.now();
        this.sendToWorker('start');
        this.updateStatus('模拟运行中...', 'running');
    }
    
    pause() {
        this.isRunning = false;
        this.sendToWorker('pause');
    }
    
    reset() {
        this.isRunning = false;
        this.sendToWorker('reset');
    }
    
    async saveExperiment() {
        const { T, R } = this.calculateTransmissionCoefficient();
        
        const data = {
            timestamp: new Date().toISOString(),
            parameters: { ...this.params },
            results: {
                transmissionCoefficient: T,
                reflectionCoefficient: R,
                transmissionProbability: T * 100,
                simulationSteps: this.frameCount
            }
        };
        
        try {
            const response = await fetch('/api/experiments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                this.addToHistory(data);
                alert('实验数据保存成功！');
            } else {
                throw new Error('保存失败');
            }
        } catch (error) {
            console.error('保存实验数据时出错:', error);
            this.addToHistory(data);
            alert('保存到本地历史（离线模式）');
        }
    }
    
    addToHistory(data) {
        const historyList = document.getElementById('historyList');
        const emptyHistory = historyList.querySelector('.empty-history');
        if (emptyHistory) {
            emptyHistory.remove();
        }
        
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const date = new Date(data.timestamp);
        const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        
        item.innerHTML = `
            <div class="params">
                ${timeStr} | V₀=${data.parameters.barrierHeight.toFixed(3)} | a=${data.parameters.barrierWidth.toFixed(3)} | E=${data.parameters.particleEnergy.toFixed(3)}
            </div>
            <div class="result">
                透射系数: ${data.results.transmissionCoefficient.toFixed(8)} (${data.results.transmissionProbability.toFixed(4)}%)
            </div>
        `;
        
        historyList.insertBefore(item, historyList.firstChild);
        
        const items = historyList.querySelectorAll('.history-item');
        if (items.length > 10) {
            items[items.length - 1].remove();
        }
    }
    
    async loadHistory() {
        try {
            const response = await fetch('/api/experiments');
            if (response.ok) {
                const experiments = await response.json();
                experiments.forEach(exp => this.addToHistory(exp));
            }
        } catch (error) {
            console.log('无法加载历史数据:', error);
        }
    }
}

class PWA {
    static async register() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });
                console.log('[PWA] Service Worker registered successfully:', registration.scope);

                registration.addEventListener('updatefound', () => {
                    console.log('[PWA] New Service Worker found, installing...');
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed') {
                            if (navigator.serviceWorker.controller) {
                                console.log('[PWA] New version available!');
                                PWA.showUpdateNotification(registration);
                            }
                        }
                    });
                });

                registration.addEventListener('waiting', () => {
                    console.log('[PWA] New SW waiting to activate');
                });

                return registration;
            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
                return null;
            }
        } else {
            console.log('[PWA] Service Workers not supported');
            return null;
        }
    }

    static showUpdateNotification(registration) {
        if (confirm('发现新版本！是否立即刷新更新？')) {
            if (registration.waiting) {
                registration.waiting.postMessage({ action: 'skipWaiting' });
            }
            window.location.reload();
        }
    }

    static isOffline() {
        return !navigator.onLine;
    }

    static async getCacheSize() {
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            let totalSize = 0;
            for (const name of cacheNames) {
                const cache = await caches.open(name);
                const requests = await cache.keys();
                totalSize += requests.length;
            }
            return totalSize;
        }
        return 0;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const simulation = new QuantumTunnelingSimulation();
    simulation.loadHistory();
    PWA.register();

    window.addEventListener('online', () => {
        console.log('[PWA] Back online');
        simulation.updateStatus('已连接 - 同步中...', 'ready');
    });

    window.addEventListener('offline', () => {
        console.log('[PWA] Offline mode');
        simulation.updateStatus('离线模式 - 使用缓存', 'paused');
    });
});
