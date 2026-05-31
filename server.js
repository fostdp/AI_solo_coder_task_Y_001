const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'experiments.json');

function loadExperiments() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('加载实验数据时出错:', error);
    }
    return [];
}

function formatPrecision(obj) {
    if (typeof obj === 'number') {
        return parseFloat(obj.toPrecision(15));
    } else if (Array.isArray(obj)) {
        return obj.map(formatPrecision);
    } else if (obj !== null && typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
            result[key] = formatPrecision(obj[key]);
        }
        return result;
    }
    return obj;
}

function saveExperiments(experiments) {
    try {
        const highPrecisionData = formatPrecision(experiments);
        fs.writeFileSync(DATA_FILE, JSON.stringify(highPrecisionData, null, 2), 'utf8');
    } catch (error) {
        console.error('保存实验数据时出错:', error);
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/experiments', (req, res) => {
    const experiments = loadExperiments();
    res.json(experiments);
});

app.post('/api/experiments', (req, res) => {
    try {
        const experiments = loadExperiments();
        const newExperiment = {
            id: Date.now(),
            ...req.body
        };
        
        experiments.unshift(newExperiment);
        
        if (experiments.length > 100) {
            experiments.splice(100);
        }
        
        saveExperiments(experiments);
        
        res.status(201).json({
            success: true,
            message: '实验数据保存成功',
            data: newExperiment
        });
    } catch (error) {
        console.error('保存实验数据时出错:', error);
        res.status(500).json({
            success: false,
            message: '保存失败',
            error: error.message
        });
    }
});

app.delete('/api/experiments/:id', (req, res) => {
    try {
        const experiments = loadExperiments();
        const id = parseInt(req.params.id);
        const filtered = experiments.filter(exp => exp.id !== id);
        
        if (filtered.length === experiments.length) {
            return res.status(404).json({
                success: false,
                message: '未找到该实验数据'
            });
        }
        
        saveExperiments(filtered);
        
        res.json({
            success: true,
            message: '删除成功'
        });
    } catch (error) {
        console.error('删除实验数据时出错:', error);
        res.status(500).json({
            success: false,
            message: '删除失败',
            error: error.message
        });
    }
});

app.get('/api/experiments/statistics', (req, res) => {
    try {
        const experiments = loadExperiments();
        
        const stats = {
            totalExperiments: experiments.length,
            avgTransmission: 0,
            minTransmission: 1,
            maxTransmission: 0,
            tunnelingCount: 0,
            classicCount: 0,
            resonanceCount: 0
        };
        
        experiments.forEach(exp => {
            const T = exp.results?.transmissionCoefficient || 0;
            stats.avgTransmission += T;
            stats.minTransmission = Math.min(stats.minTransmission, T);
            stats.maxTransmission = Math.max(stats.maxTransmission, T);
            
            const status = exp.results?.status || '';
            if (status.includes('隧穿')) {
                stats.tunnelingCount++;
            } else if (status.includes('经典')) {
                stats.classicCount++;
            } else if (status.includes('共振')) {
                stats.resonanceCount++;
            }
        });
        
        if (experiments.length > 0) {
            stats.avgTransmission /= experiments.length;
        }
        
        res.json(stats);
    } catch (error) {
        console.error('获取统计数据时出错:', error);
        res.status(500).json({
            success: false,
            message: '获取统计数据失败',
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 量子隧穿效应演示服务器已启动`);
    console.log(`📍 访问地址: http://localhost:${PORT}`);
    console.log(`📊 API 文档:`);
    console.log(`   - GET  /api/experiments          获取所有实验数据`);
    console.log(`   - POST /api/experiments          保存实验数据`);
    console.log(`   - GET  /api/experiments/statistics  获取统计数据`);
    console.log(`   - DELETE /api/experiments/:id    删除指定实验数据`);
    console.log(`\n💡 按 Ctrl+C 停止服务器\n`);
});
