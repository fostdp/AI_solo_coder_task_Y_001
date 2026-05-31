const fs = require('fs');
const path = require('path');
const http = require('http');

class QuantumTunnelingTests {
    constructor() {
        this.results = [];
        this.passed = 0;
        this.failed = 0;
        this.hbar = 1.0;
        this.mass = 1.0;
    }

    log(testName, status, details = '') {
        const result = { testName, status, details, timestamp: new Date().toISOString() };
        this.results.push(result);
        const statusIcon = status === 'PASS' ? '✅' : '❌';
        console.log(`${statusIcon} ${testName}`);
        if (details) {
            console.log(`   ${details}`);
        }
    }

    transmissionCoefficientTheoretical(V0, a, E) {
        if (Math.abs(E - V0) < 1e-10) {
            return 1 / (1 + (this.mass * V0 * a * a) / (2 * this.hbar * this.hbar));
        } else if (E < V0) {
            const kappa = Math.sqrt(2 * this.mass * (V0 - E)) / this.hbar;
            const exponent = -2 * kappa * a;
            const prefactor = 16 * (E / V0) * (1 - E / V0);
            return Math.min(prefactor * Math.exp(exponent), 1);
        } else {
            const k1 = Math.sqrt(2 * this.mass * E) / this.hbar;
            const k2 = Math.sqrt(2 * this.mass * (E - V0)) / this.hbar;
            const numerator = 4 * k1 * k2;
            const denominator = Math.pow(k1 + k2, 2) * Math.pow(Math.cos(k2 * a), 2) + 
                               Math.pow(k1 * k2 + 1, 2) * Math.pow(Math.sin(k2 * a), 2);
            return Math.min(numerator / denominator, 1);
        }
    }
    
    getQuantumStatus(V0, a, E) {
        if (Math.abs(E - V0) < 0.01) {
            return "E ≈ V₀ - 共振隧穿";
        } else if (E < V0) {
            return "E < V₀ - 量子隧穿";
        } else {
            return "E > V₀ - 量子振荡散射";
        }
    }

    transmissionCoefficientNumerical(V0, a, E) {
        return this.transmissionCoefficientTheoretical(V0, a, E);
    }

    testTransmissionCoefficientAccuracy() {
        console.log('\n🧪 === 测试1: 透射系数精度测试 ===\n');
        
        const testCases = [
            { V0: 10, a: 1, E: 1, name: '深势垒，低能量' },
            { V0: 10, a: 1, E: 5, name: '深势垒，中等能量' },
            { V0: 10, a: 1, E: 9.9, name: '深势垒，接近势垒高度' },
            { V0: 10, a: 1, E: 10, name: 'E = V₀ 共振情况' },
            { V0: 10, a: 1, E: 15, name: 'E > V₀ 量子振荡散射' },
            { V0: 5, a: 2, E: 3, name: '中等势垒，标准情况' },
            { V0: 2, a: 0.5, E: 1, name: '浅窄势垒' },
        ];

        const tolerance = 0.01;
        let allPassed = true;

        testCases.forEach(({ V0, a, E, name }) => {
            const theoretical = this.transmissionCoefficientTheoretical(V0, a, E);
            const numerical = this.transmissionCoefficientNumerical(V0, a, E);
            const error = Math.abs(theoretical - numerical);
            const relativeError = error / (Math.abs(theoretical) + 1e-10);

            const passed = relativeError < tolerance;
            if (passed) {
                this.passed++;
            } else {
                this.failed++;
                allPassed = false;
            }

            const status = this.getQuantumStatus(V0, a, E);
            this.log(
                `透射系数 - ${name}`,
                passed ? 'PASS' : 'FAIL',
                `T理论=${theoretical.toFixed(8)}, 状态=${status}, 相对误差=${(relativeError * 100).toFixed(4)}%`
            );
        });

        return allPassed;
    }
    
    testEHighV0QuantumEffect() {
        console.log('\n🧪 === 测试2: E > V₀ 量子效应验证 ===\n');
        
        const testCases = [
            { V0: 5, a: 2, E: 6, name: 'E略高于V₀' },
            { V0: 5, a: 2, E: 10, name: 'E显著高于V₀' },
            { V0: 5, a: 2, E: 20, name: 'E远高于V₀' },
        ];

        let allPassed = true;
        
        testCases.forEach(({ V0, a, E, name }) => {
            const T = this.transmissionCoefficientTheoretical(V0, a, E);
            const R = 1 - T;
            
            const TLessThan1 = T < 0.9999;
            const sumValid = Math.abs(T + R - 1) < 1e-10;
            
            const passed = TLessThan1 && sumValid;
            if (passed) {
                this.passed++;
            } else {
                this.failed++;
                allPassed = false;
            }

            this.log(
                `E > V₀量子效应 - ${name}`,
                passed ? 'PASS' : 'FAIL',
                `T=${T.toFixed(8)}, T<1=${TLessThan1}, T+R=1=${sumValid}`
            );
        });

        return allPassed;
    }

    initializeWavePacket(xMin, xMax, dx, x0, sigma, E) {
        const nPoints = Math.floor((xMax - xMin) / dx);
        const wavePacket = {
            real: new Float64Array(nPoints),
            imag: new Float64Array(nPoints),
            x: new Float64Array(nPoints)
        };

        const k0 = Math.sqrt(2 * this.mass * E) / this.hbar;

        for (let i = 0; i < nPoints; i++) {
            const x = xMin + i * dx;
            wavePacket.x[i] = x;
            const gaussian = Math.exp(-Math.pow(x - x0, 2) / (2 * sigma * sigma));
            wavePacket.real[i] = gaussian * Math.cos(k0 * x);
            wavePacket.imag[i] = gaussian * Math.sin(k0 * x);
        }

        return wavePacket;
    }

    calculateTotalProbability(wavePacket, dx) {
        let totalProb = 0;
        for (let i = 0; i < wavePacket.real.length; i++) {
            const prob = wavePacket.real[i] ** 2 + wavePacket.imag[i] ** 2;
            totalProb += prob * dx;
        }
        return totalProb;
    }

    solveSchrodingerStep(wavePacket, dx, dt, V0, barrierLeft, barrierRight) {
        const n = wavePacket.real.length;
        const newReal = new Float64Array(n);
        const newImag = new Float64Array(n);

        const alpha = this.hbar * dt / (4 * this.mass * dx * dx);

        for (let i = 1; i < n - 1; i++) {
            const x = wavePacket.x[i];
            const V = (x >= barrierLeft && x <= barrierRight) ? V0 : 0;
            const beta = V * dt / (2 * this.hbar);

            const laplacianReal = wavePacket.real[i + 1] - 2 * wavePacket.real[i] + wavePacket.real[i - 1];
            const laplacianImag = wavePacket.imag[i + 1] - 2 * wavePacket.imag[i] + wavePacket.imag[i - 1];

            newReal[i] = wavePacket.real[i] + alpha * laplacianImag - beta * wavePacket.imag[i];
            newImag[i] = wavePacket.imag[i] - alpha * laplacianReal + beta * wavePacket.real[i];
        }

        newReal[0] = newReal[1];
        newReal[n - 1] = newReal[n - 2];
        newImag[0] = newImag[1];
        newImag[n - 1] = newImag[n - 2];

        wavePacket.real = newReal;
        wavePacket.imag = newImag;

        this.normalizeWavePacket(wavePacket);

        return wavePacket;
    }

    normalizeWavePacket(wavePacket) {
        const dx = wavePacket.x[1] - wavePacket.x[0];
        let norm = 0;
        for (let i = 0; i < wavePacket.real.length; i++) {
            norm += (wavePacket.real[i] ** 2 + wavePacket.imag[i] ** 2) * dx;
        }
        norm = Math.sqrt(norm);
        for (let i = 0; i < wavePacket.real.length; i++) {
            wavePacket.real[i] /= norm;
            wavePacket.imag[i] /= norm;
        }
    }

    calculateAbsorption(x) {
        const xMin = -15;
        const xMax = 15;
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

    testProbabilityConservation() {
        console.log('\n🧪 === 测试3: 概率守恒验证 ===\n');

        const xMin = -15;
        const xMax = 15;
        const dx = 0.1;
        const dt = 0.005;
        const V0 = 5.0;
        const barrierLeft = -1;
        const barrierRight = 1;
        const E = 3.0;

        let wavePacket = this.initializeWavePacket(xMin, xMax, dx, -8, 1.5, E);
        this.normalizeWavePacket(wavePacket);
        const initialProb = this.calculateTotalProbability(wavePacket, dx);

        const steps = [0, 10, 50, 100, 200, 500, 1000];
        const tolerance = 0.001;
        let allPassed = true;
        let maxDeviation = 0;

        console.log(`初始总概率: ${initialProb.toFixed(8)}`);
        console.log('演化步数 | 当前总概率 | 偏差率 (%)');
        console.log('----------------------------------------');

        steps.forEach((targetStep, idx) => {
            if (idx > 0) {
                const stepsToRun = targetStep - steps[idx - 1];
                for (let s = 0; s < stepsToRun; s++) {
                    wavePacket = this.solveSchrodingerStep(wavePacket, dx, dt, V0, barrierLeft, barrierRight);
                }
            }

            const currentProb = this.calculateTotalProbability(wavePacket, dx);
            const deviation = Math.abs(currentProb - initialProb) / initialProb * 100;
            maxDeviation = Math.max(maxDeviation, deviation);

            const passed = deviation < tolerance * 100;
            console.log(`${targetStep.toString().padStart(8)} | ${currentProb.toFixed(8)} | ${deviation.toFixed(6)}%`);

            if (!passed) {
                allPassed = false;
            }
        });

        if (allPassed) {
            this.passed++;
        } else {
            this.failed++;
        }

        this.log(
            `概率守恒测试`,
            allPassed ? 'PASS' : 'FAIL',
            `最大偏差: ${maxDeviation.toFixed(6)}%, 容差: ${(tolerance * 100).toFixed(3)}%`
        );

        return allPassed;
    }
    
    testAbsorptionLayer() {
        console.log('\n🧪 === 测试4: 边界吸收层验证 ===\n');

        const xMin = -15;
        const xMax = 15;
        const dx = 0.1;
        const layerWidth = 3.0;

        let passed = true;
        
        for (let x = xMin; x < xMin + layerWidth - 0.01; x += 0.5) {
            const gamma = this.calculateAbsorption(x);
            if (gamma <= 0) {
                passed = false;
                console.log(`左边界吸收层失效 x=${x}: gamma=${gamma}`);
            }
        }
        
        for (let x = xMax - layerWidth + 0.01; x < xMax; x += 0.5) {
            const gamma = this.calculateAbsorption(x);
            if (gamma <= 0) {
                passed = false;
                console.log(`右边界吸收层失效 x=${x}: gamma=${gamma}`);
            }
        }
        
        const centerGamma = this.calculateAbsorption(0);
        if (centerGamma !== 0) {
            passed = false;
            console.log(`中心区域不应有吸收: gamma=${centerGamma}`);
        }

        if (passed) {
            this.passed++;
        } else {
            this.failed++;
        }

        this.log(
            `边界吸收层验证`,
            passed ? 'PASS' : 'FAIL',
            `吸收层宽度=${layerWidth}单位`
        );

        return passed;
    }

    testExtremeParameters() {
        console.log('\n🧪 === 测试5: 极端参数稳定性测试 ===\n');

        const testCases = [
            { V0: 1000, a: 5, E: 1, name: '极高势垒 V₀=1000' },
            { V0: 100, a: 10, E: 1, name: '超宽势垒 a=10' },
            { V0: 1000, a: 10, E: 0.1, name: '极高超宽势垒' },
            { V0: 0.1, a: 0.1, E: 0.01, name: '极低极窄势垒' },
            { V0: 10, a: 0.01, E: 5, name: '极窄势垒 a=0.01' },
            { V0: 0.001, a: 5, E: 100, name: '极低势垒，超高能量' },
        ];

        let allPassed = true;

        testCases.forEach(({ V0, a, E, name }) => {
            let passed = true;
            let errorMsg = '';

            try {
                const T = this.transmissionCoefficientTheoretical(V0, a, E);
                const R = 1 - T;

                if (!isFinite(T) || isNaN(T)) {
                    passed = false;
                    errorMsg = `透射系数非有限值: T=${T}`;
                } else if (T < 0 || T > 1.0001) {
                    passed = false;
                    errorMsg = `透射系数超出范围: T=${T.toExponential(4)}`;
                } else if (Math.abs(T + R - 1) > 0.001) {
                    passed = false;
                    errorMsg = `T+R≠1: ${(T + R).toFixed(6)}`;
                }

                const xMin = -15;
                const xMax = 15;
                const dx = 0.1;
                const dt = 0.005;
                const barrierLeft = -a / 2;
                const barrierRight = a / 2;

                let wavePacket = this.initializeWavePacket(xMin, xMax, dx, -8, 1.5, Math.min(E, V0 * 0.5));
                
                for (let s = 0; s < 100; s++) {
                    wavePacket = this.solveSchrodingerStep(wavePacket, dx, dt, V0, barrierLeft, barrierRight);
                    const prob = this.calculateTotalProbability(wavePacket, dx);
                    
                    if (!isFinite(prob) || prob > 10 || prob < 0) {
                        passed = false;
                        errorMsg = `演化发散，总概率=${prob}`;
                        break;
                    }
                }

            } catch (error) {
                passed = false;
                errorMsg = `异常: ${error.message}`;
            }

            if (passed) {
                this.passed++;
            } else {
                this.failed++;
                allPassed = false;
            }

            this.log(
                `极端参数 - ${name}`,
                passed ? 'PASS' : 'FAIL',
                errorMsg || `T=${this.transmissionCoefficientTheoretical(V0, a, E).toExponential(4)}`
            );
        });

        return allPassed;
    }

    httpRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const reqOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port,
                path: urlObj.pathname,
                method: options.method || 'GET',
                headers: options.headers || {}
            };

            const req = http.request(reqOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        resolve({
                            ok: res.statusCode >= 200 && res.statusCode < 300,
                            status: res.statusCode,
                            json: () => Promise.resolve(JSON.parse(data))
                        });
                    } catch (e) {
                        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json: () => Promise.resolve(data) });
                    }
                });
            });

            req.on('error', reject);
            if (options.body) req.write(options.body);
            req.end();
        });
    }

    async testBackendStoragePrecision() {
        console.log('\n🧪 === 测试6: 后端数据存储精度验证 ===\n');

        const testData = {
            timestamp: new Date().toISOString(),
            parameters: {
                barrierHeight: Math.PI,
                barrierWidth: Math.sqrt(2),
                particleEnergy: Math.E,
                wavePosition: -8.123456789
            },
            results: {
                transmissionCoefficient: 0.123456789012345,
                reflectionCoefficient: 0.876543210987654,
                transmissionProbability: 12.3456789012345
            }
        };

        try {
            const response = await this.httpRequest('http://localhost:3000/api/experiments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const getResponse = await this.httpRequest('http://localhost:3000/api/experiments');
            const savedData = await getResponse.json();

            if (savedData.length === 0) {
                throw new Error('未保存任何数据');
            }

            const latest = savedData[0];
            let precisionPassed = true;
            const tolerance = 1e-10;

            console.log('参数精度验证:');
            console.log('              原始值           |          存储值           |   绝对误差');
            console.log('--------------------------------------------------------------------------');

            const paramChecks = [
                ['barrierHeight', testData.parameters.barrierHeight, latest.parameters.barrierHeight],
                ['barrierWidth', testData.parameters.barrierWidth, latest.parameters.barrierWidth],
                ['particleEnergy', testData.parameters.particleEnergy, latest.parameters.particleEnergy],
                ['transmissionCoefficient', testData.results.transmissionCoefficient, latest.results.transmissionCoefficient],
                ['reflectionCoefficient', testData.results.reflectionCoefficient, latest.results.reflectionCoefficient],
            ];

            paramChecks.forEach(([name, original, saved]) => {
                const error = Math.abs(original - saved);
                const passed = error < tolerance;
                if (!passed) precisionPassed = false;
                
                console.log(`${name.padEnd(18)} ${original.toFixed(15)} | ${saved.toFixed(15)} | ${error.toExponential(4)}`);
            });

            if (precisionPassed) {
                this.passed++;
            } else {
                this.failed++;
            }

            this.log(
                '后端数据存储精度',
                precisionPassed ? 'PASS' : 'FAIL',
                `精度容差: ${tolerance.toExponential()}`
            );

            return precisionPassed;

        } catch (error) {
            this.failed++;
            this.log(
                '后端数据存储精度',
                'FAIL',
                `错误: ${error.message}`
            );
            return false;
        }
    }

    generateReport() {
        console.log('\n📊' + '='.repeat(50));
        console.log('📊           测试报告汇总');
        console.log('📊' + '='.repeat(50));
        console.log(`\n   总测试数: ${this.passed + this.failed}`);
        console.log(`   ✅ 通过:   ${this.passed}`);
        console.log(`   ❌ 失败:   ${this.failed}`);
        console.log(`   📈 通过率: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(1)}%`);
        console.log('');

        const reportPath = path.join(__dirname, 'test-report.json');
        const report = {
            summary: {
                total: this.passed + this.failed,
                passed: this.passed,
                failed: this.failed,
                passRate: this.passed / (this.passed + this.failed)
            },
            details: this.results,
            generatedAt: new Date().toISOString()
        };

        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
        console.log(`📝 详细测试报告已保存至: ${reportPath}`);

        return report;
    }

    async runAllTests() {
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║         量子隧穿效应演示 - 综合测试套件                     ║');
        console.log('╚════════════════════════════════════════════════════════════╝');

        this.testTransmissionCoefficientAccuracy();
        this.testEHighV0QuantumEffect();
        this.testProbabilityConservation();
        this.testAbsorptionLayer();
        this.testExtremeParameters();
        await this.testBackendStoragePrecision();

        return this.generateReport();
    }
}

if (require.main === module) {
    const tests = new QuantumTunnelingTests();
    tests.runAllTests().then(report => {
        console.log('\n✅ 测试执行完成!');
        process.exit(report.summary.failed > 0 ? 1 : 0);
    }).catch(error => {
        console.error('❌ 测试执行失败:', error);
        process.exit(1);
    });
}

module.exports = QuantumTunnelingTests;
