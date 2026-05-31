class QuantumSolver {
    constructor() {
        this.params = null;
        this.wavePacket = null;
        this.running = false;
        this.stepCount = 0;
    }

    init(params) {
        this.params = params;
        this.initializeWavePacket();
        this.running = false;
        this.stepCount = 0;
        
        self.postMessage({
            type: 'init',
            wavePacket: this.wavePacket,
            step: this.stepCount
        });
    }

    initializeWavePacket() {
        const { xMin, xMax, dx, wavePosition, particleEnergy, mass, hbar } = this.params;
        
        const nPoints = Math.floor((xMax - xMin) / dx);
        this.wavePacket = {
            real: new Float64Array(nPoints),
            imag: new Float64Array(nPoints),
            prob: new Float64Array(nPoints),
            x: new Float64Array(nPoints)
        };

        const sigma = 1.5;
        const k0 = Math.sqrt(2 * mass * particleEnergy) / hbar;

        for (let i = 0; i < nPoints; i++) {
            const x = xMin + i * dx;
            this.wavePacket.x[i] = x;
            
            const gaussian = Math.exp(-Math.pow(x - wavePosition, 2) / (2 * sigma * sigma));
            const phase = k0 * x;
            
            this.wavePacket.real[i] = gaussian * Math.cos(phase);
            this.wavePacket.imag[i] = gaussian * Math.sin(phase);
        }

        this.normalizeWavePacket();
        this.calculateProbability();
    }

    normalizeWavePacket() {
        const dx = this.params.dx;
        let norm = 0;
        
        for (let i = 0; i < this.wavePacket.real.length; i++) {
            norm += (this.wavePacket.real[i] ** 2 + this.wavePacket.imag[i] ** 2) * dx;
        }
        
        norm = Math.sqrt(norm);
        for (let i = 0; i < this.wavePacket.real.length; i++) {
            this.wavePacket.real[i] /= norm;
            this.wavePacket.imag[i] /= norm;
        }
    }

    calculateProbability() {
        for (let i = 0; i < this.wavePacket.real.length; i++) {
            this.wavePacket.prob[i] = this.wavePacket.real[i] ** 2 + this.wavePacket.imag[i] ** 2;
        }
    }

    calculatePotential(x) {
        const { barrierHeight, barrierWidth } = this.params;
        const barrierLeft = -barrierWidth / 2;
        const barrierRight = barrierWidth / 2;
        
        return (x >= barrierLeft && x <= barrierRight) ? barrierHeight : 0;
    }

    calculateAbsorption(x) {
        const { xMin, xMax } = this.params;
        const layerWidth = 3.0;
        const strength = 0.5;
        
        const distToLeft = x - xMin;
        const distToRight = xMax - x;
        
        let absorption = 0;
        
        if (distToLeft < layerWidth) {
            const ratio = 1 - distToLeft / layerWidth;
            absorption += strength * ratio * ratio;
        }
        
        if (distToRight < layerWidth) {
            const ratio = 1 - distToRight / layerWidth;
            absorption += strength * ratio * ratio;
        }
        
        return absorption;
    }

    solveSchrodingerStep() {
        const { dx, dt, mass, hbar } = this.params;
        const n = this.wavePacket.real.length;
        
        const newReal = new Float64Array(n);
        const newImag = new Float64Array(n);
        
        const alpha = hbar * dt / (4 * mass * dx * dx);
        
        for (let i = 1; i < n - 1; i++) {
            const V = this.calculatePotential(this.wavePacket.x[i]);
            const gamma = this.calculateAbsorption(this.wavePacket.x[i]);
            const beta = V * dt / hbar;
            
            const laplacianReal = this.wavePacket.real[i + 1] - 2 * this.wavePacket.real[i] + this.wavePacket.real[i - 1];
            const laplacianImag = this.wavePacket.imag[i + 1] - 2 * this.wavePacket.imag[i] + this.wavePacket.imag[i - 1];
            
            const decay = Math.exp(-gamma * dt);
            
            newReal[i] = (this.wavePacket.real[i] + alpha * laplacianImag - beta * this.wavePacket.imag[i]) * decay;
            newImag[i] = (this.wavePacket.imag[i] - alpha * laplacianReal + beta * this.wavePacket.real[i]) * decay;
        }
        
        newReal[0] = 0;
        newReal[n - 1] = 0;
        newImag[0] = 0;
        newImag[n - 1] = 0;
        
        this.wavePacket.real = newReal;
        this.wavePacket.imag = newImag;
        
        this.normalizeWavePacket();
        this.calculateProbability();
        
        this.stepCount++;
    }

    start() {
        this.running = true;
        this.runSimulation();
    }

    pause() {
        this.running = false;
        self.postMessage({
            type: 'paused',
            step: this.stepCount
        });
    }

    reset() {
        this.running = false;
        this.stepCount = 0;
        this.initializeWavePacket();
        self.postMessage({
            type: 'reset',
            wavePacket: this.wavePacket,
            step: this.stepCount
        });
    }

    runSimulation() {
        if (!this.running) return;

        const stepsPerBatch = 5;
        const batchStartTime = performance.now();

        for (let i = 0; i < stepsPerBatch && this.running; i++) {
            this.solveSchrodingerStep();
        }

        const progress = {
            step: this.stepCount,
            computeTime: performance.now() - batchStartTime
        };

        self.postMessage({
            type: 'progress',
            wavePacket: this.wavePacket,
            progress: progress
        });

        if (this.running) {
            setTimeout(() => this.runSimulation(), 0);
        }
    }
}

const solver = new QuantumSolver();

self.onmessage = function(e) {
    switch (e.data.type) {
        case 'init':
            solver.init(e.data.params);
            break;
        case 'start':
            solver.start();
            break;
        case 'pause':
            solver.pause();
            break;
        case 'reset':
            solver.reset();
            break;
        case 'updateParams':
            solver.init(e.data.params);
            break;
    }
};
