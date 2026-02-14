/**
 * SR&ED Report Checker & Generator
 * Analyzes T661 descriptions against CRA requirements
 */

// ============================================
// CRA COMPLIANCE RULES & KEYWORDS
// ============================================

const COMPLIANCE_RULES = {
    advancement: {
        name: "Line 242 - Technological Advancement",
        requiredElements: [
            { name: "Objective Statement", patterns: ["objective", "goal", "aim", "sought to", "attempting to", "develop", "create", "achieve"], weight: 20 },
            { name: "Baseline/State of Art", patterns: ["existing", "current", "baseline", "state of", "prior to", "before this", "previously", "standard practice", "conventional"], weight: 25 },
            { name: "Advancement Description", patterns: ["advancement", "advance", "new", "novel", "innovative", "beyond", "improve", "enhance", "increase", "breakthrough"], weight: 25 },
            { name: "Beyond Standard Practice", patterns: ["could not", "unable", "not possible", "no existing", "not available", "limitations", "beyond standard", "not achievable"], weight: 20 },
            { name: "Technical Specificity", patterns: ["algorithm", "system", "process", "method", "technique", "architecture", "design", "mechanism", "protocol", "framework"], weight: 10 }
        ],
        redFlags: [
            { pattern: "new product", issue: "Focus on 'technological advancement' not 'new product'" },
            { pattern: "market", issue: "Market considerations are not technological advancements" },
            { pattern: "cost sav", issue: "Cost savings alone are not technological advancements" },
            { pattern: "first time", issue: "'First time for the company' is not a valid advancement" },
            { pattern: "business", issue: "Business objectives should be separated from technological objectives" }
        ],
        minWords: 200,
        maxWords: 800
    },
    uncertainty: {
        name: "Line 244 - Technological Uncertainty",
        requiredElements: [
            { name: "Uncertainty Statement", patterns: ["uncertain", "unknown", "unclear", "not known", "could not determine", "unpredictable", "it was uncertain", "it was unknown"], weight: 25 },
            { name: "Technical Nature", patterns: ["technical", "technological", "scientific", "engineering", "algorithm", "system", "process", "mechanism"], weight: 20 },
            { name: "Why Not Resolvable", patterns: ["competent professional", "standard practice", "routine", "existing knowledge", "publicly available", "literature", "experts"], weight: 25 },
            { name: "Specific Uncertainties", patterns: ["whether", "how to", "if", "what", "which approach", "feasibility", "achievable", "possible"], weight: 20 },
            { name: "Hypotheses", patterns: ["hypothes", "theoriz", "propos", "assum", "predict", "expect"], weight: 10 }
        ],
        redFlags: [
            { pattern: "business uncertain", issue: "Business uncertainty is not eligible - must be technological" },
            { pattern: "cost uncertain", issue: "Cost uncertainty is not eligible - must be technological" },
            { pattern: "schedule", issue: "Schedule/timeline uncertainty is not eligible" },
            { pattern: "market uncertain", issue: "Market uncertainty is not eligible" },
            { pattern: "will it sell", issue: "Commercial viability is not a technological uncertainty" }
        ],
        minWords: 200,
        maxWords: 800
    },
    work: {
        name: "Line 246 - Work Performed",
        requiredElements: [
            { name: "Systematic Approach", patterns: ["systematic", "methodical", "structured", "planned", "designed experiment", "test plan", "methodology"], weight: 20 },
            { name: "Experiments/Testing", patterns: ["experiment", "test", "trial", "prototype", "simulation", "analysis", "evaluation", "benchmark", "validation"], weight: 25 },
            { name: "Iterations/Modifications", patterns: ["iteration", "modified", "revised", "adjusted", "refined", "improved", "changed", "attempt", "version"], weight: 20 },
            { name: "Results/Analysis", patterns: ["result", "found", "discovered", "determined", "concluded", "showed", "demonstrated", "revealed", "indicated", "achieved"], weight: 20 },
            { name: "Personnel Involvement", patterns: ["engineer", "scientist", "developer", "researcher", "specialist", "technician", "team", "personnel"], weight: 15 }
        ],
        redFlags: [
            { pattern: "routine", issue: "Routine activities are not eligible SR&ED" },
            { pattern: "quality control", issue: "Quality control is explicitly excluded from SR&ED" },
            { pattern: "production", issue: "Production activities are not eligible" },
            { pattern: "data collection only", issue: "Data collection alone is not SR&ED unless supporting eligible work" },
            { pattern: "style change", issue: "Style changes are excluded from SR&ED" }
        ],
        minWords: 300,
        maxWords: 1200
    }
};

const STRONG_PHRASES = [
    "technological advancement",
    "scientific advancement", 
    "technological uncertainty",
    "systematic investigation",
    "hypothesis",
    "experiment",
    "competent professional",
    "standard practice",
    "state of technology",
    "baseline",
    "iterations",
    "test results"
];

const WEAK_PHRASES = [
    "we wanted to",
    "we needed to",
    "to save money",
    "to reduce costs",
    "customer requested",
    "to be competitive",
    "new to the company",
    "first time we",
    "trial and error",
    "troubleshooting"
];

// ============================================
// TAB FUNCTIONALITY
// ============================================

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Update buttons
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
    });
});

// ============================================
// WORD COUNTERS
// ============================================

function countWords(text) {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

document.getElementById('check-advancement').addEventListener('input', function() {
    document.getElementById('adv-count').textContent = countWords(this.value);
});

document.getElementById('check-uncertainty').addEventListener('input', function() {
    document.getElementById('unc-count').textContent = countWords(this.value);
});

document.getElementById('check-work').addEventListener('input', function() {
    document.getElementById('work-count').textContent = countWords(this.value);
});

// ============================================
// REPORT ANALYZER
// ============================================

function analyzeReport() {
    const advancement = document.getElementById('check-advancement').value;
    const uncertainty = document.getElementById('check-uncertainty').value;
    const work = document.getElementById('check-work').value;
    
    if (!advancement && !uncertainty && !work) {
        alert('Please paste at least one section of your report to analyze.');
        return;
    }
    
    const results = {
        advancement: analyzeSection(advancement, COMPLIANCE_RULES.advancement),
        uncertainty: analyzeSection(uncertainty, COMPLIANCE_RULES.uncertainty),
        work: analyzeSection(work, COMPLIANCE_RULES.work)
    };
    
    displayAnalysisResults(results);
}

function analyzeSection(text, rules) {
    if (!text.trim()) {
        return { score: 0, issues: [{ type: 'error', message: 'Section is empty - this is required for T661' }], status: 'fail', elements: [] };
    }
    
    const textLower = text.toLowerCase();
    const wordCount = countWords(text);
    const issues = [];
    const foundElements = [];
    let totalScore = 0;
    let maxScore = 0;
    
    // Check required elements
    for (const element of rules.requiredElements) {
        maxScore += element.weight;
        const found = element.patterns.some(pattern => textLower.includes(pattern));
        
        if (found) {
            totalScore += element.weight;
            foundElements.push({ name: element.name, found: true });
        } else {
            foundElements.push({ name: element.name, found: false });
            issues.push({
                type: 'warning',
                message: `Missing: <strong>${element.name}</strong> - Consider including language about: ${element.patterns.slice(0, 3).join(', ')}`
            });
        }
    }
    
    // Check for red flags
    for (const flag of rules.redFlags) {
        if (textLower.includes(flag.pattern)) {
            issues.push({
                type: 'error',
                message: `⚠️ Red Flag: "${flag.pattern}" - ${flag.issue}`
            });
            totalScore -= 10;
        }
    }
    
    // Check word count
    if (wordCount < rules.minWords) {
        issues.push({
            type: 'warning',
            message: `Too short: ${wordCount} words (recommended: ${rules.minWords}-${rules.maxWords}). Add more technical detail.`
        });
        totalScore -= 10;
    } else if (wordCount > rules.maxWords) {
        issues.push({
            type: 'warning',
            message: `Consider condensing: ${wordCount} words (recommended: ${rules.minWords}-${rules.maxWords})`
        });
    }
    
    // Check for strong phrases
    const strongFound = STRONG_PHRASES.filter(phrase => textLower.includes(phrase));
    if (strongFound.length > 0) {
        issues.push({
            type: 'success',
            message: `Good: Uses strong SR&ED language: "${strongFound.slice(0, 3).join('", "')}"`
        });
    }
    
    // Check for weak phrases
    const weakFound = WEAK_PHRASES.filter(phrase => textLower.includes(phrase));
    if (weakFound.length > 0) {
        issues.push({
            type: 'warning',
            message: `Weak language detected: "${weakFound.join('", "')}" - Consider rephrasing`
        });
        totalScore -= 5 * weakFound.length;
    }
    
    // Calculate final score
    const score = Math.max(0, Math.min(100, Math.round((totalScore / maxScore) * 100)));
    
    let status = 'pass';
    if (score < 50) status = 'fail';
    else if (score < 75) status = 'warning';
    
    return { score, issues, status, elements: foundElements, wordCount };
}

function displayAnalysisResults(results) {
    const resultsDiv = document.getElementById('analysis-results');
    resultsDiv.style.display = 'block';
    
    // Calculate overall score
    let validSections = 0;
    let totalScore = 0;
    
    for (const section of Object.values(results)) {
        if (section.score > 0) {
            validSections++;
            totalScore += section.score;
        }
    }
    
    const overallScore = validSections > 0 ? Math.round(totalScore / validSections) : 0;
    let overallStatus = 'good';
    let overallLabel = 'Strong Report';
    
    if (overallScore < 50) {
        overallStatus = 'poor';
        overallLabel = 'Needs Work';
    } else if (overallScore < 75) {
        overallStatus = 'warning';
        overallLabel = 'Moderate';
    }
    
    let html = `
        <div class="results-header">
            <h2>📊 Analysis Results</h2>
            <div class="overall-score">
                <div class="score-circle ${overallStatus}">${overallScore}%</div>
                <div class="score-label">${overallLabel}</div>
            </div>
        </div>
    `;
    
    // Section results
    const sections = [
        { key: 'advancement', rules: COMPLIANCE_RULES.advancement },
        { key: 'uncertainty', rules: COMPLIANCE_RULES.uncertainty },
        { key: 'work', rules: COMPLIANCE_RULES.work }
    ];
    
    for (const { key, rules } of sections) {
        const result = results[key];
        html += `
            <div class="analysis-card">
                <div class="analysis-card-header">
                    <h4>${getStatusEmoji(result.status)} ${rules.name}</h4>
                    <span class="status-badge ${result.status}">${result.score}% - ${getStatusText(result.status)}</span>
                </div>
                ${result.wordCount ? `<p style="color: #71767b; margin-bottom: 12px; font-size: 0.9em;">Word count: ${result.wordCount}</p>` : ''}
                <ul class="issue-list">
                    ${result.issues.map(issue => `
                        <li>
                            <span class="issue-icon ${issue.type}">${getIssueIcon(issue.type)}</span>
                            <span class="issue-text">${issue.message}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
    
    // Summary recommendations
    html += `
        <div class="analysis-card" style="border-color: #1d9bf0;">
            <h4 style="color: #1d9bf0; margin-bottom: 12px;">💡 Key Recommendations</h4>
            <ul class="issue-list">
                ${generateRecommendations(results).map(rec => `
                    <li>
                        <span class="issue-icon success">→</span>
                        <span class="issue-text">${rec}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
    
    resultsDiv.innerHTML = html;
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

function getStatusEmoji(status) {
    return { pass: '✅', warning: '⚠️', fail: '❌' }[status] || '❓';
}

function getStatusText(status) {
    return { pass: 'Good', warning: 'Needs Improvement', fail: 'Needs Significant Work' }[status] || 'Unknown';
}

function getIssueIcon(type) {
    return { error: '!', warning: '!', success: '✓' }[type] || '?';
}

function generateRecommendations(results) {
    const recommendations = [];
    
    if (results.advancement.score < 75) {
        recommendations.push("Line 242: Clearly state the baseline technology and what advancement was sought beyond it");
    }
    
    if (results.uncertainty.score < 75) {
        recommendations.push("Line 244: Explicitly state why a competent professional could not resolve the uncertainties using existing knowledge");
    }
    
    if (results.work.score < 75) {
        recommendations.push("Line 246: Detail the systematic experimentation process including hypotheses, tests, iterations, and conclusions");
    }
    
    if (results.advancement.score > 0 && results.uncertainty.score > 0) {
        recommendations.push("Ensure uncertainties (Line 244) directly relate to the advancement (Line 242)");
    }
    
    if (results.work.score > 0 && results.uncertainty.score > 0) {
        recommendations.push("Make sure work performed (Line 246) addresses each uncertainty listed in Line 244");
    }
    
    recommendations.push("Use specific technical language and avoid business/commercial terminology");
    
    return recommendations.slice(0, 5);
}

// ============================================
// REPORT GENERATOR
// ============================================

function generateReport() {
    const inputs = {
        title: document.getElementById('gen-title').value,
        field: document.getElementById('gen-field').value,
        objective: document.getElementById('gen-objective').value,
        baseline: document.getElementById('gen-baseline').value,
        advancement: document.getElementById('gen-advancement').value,
        whyNotStandard: document.getElementById('gen-why-not-standard').value,
        uncertainties: document.getElementById('gen-uncertainties').value,
        whyUncertain: document.getElementById('gen-why-uncertain').value,
        hypotheses: document.getElementById('gen-hypotheses').value,
        experiments: document.getElementById('gen-experiments').value,
        iterations: document.getElementById('gen-iterations').value,
        results: document.getElementById('gen-results').value,
        personnel: document.getElementById('gen-personnel').value
    };
    
    // Check minimum required fields
    if (!inputs.objective || !inputs.uncertainties || !inputs.experiments) {
        alert('Please fill in at least: Objective, Uncertainties, and Experiments to generate a report.');
        return;
    }
    
    const report = {
        line242: generateLine242(inputs),
        line244: generateLine244(inputs),
        line246: generateLine246(inputs)
    };
    
    displayGeneratedReport(report, inputs.title);
}

function generateLine242(inputs) {
    let text = '';
    
    // Opening with objective
    if (inputs.objective) {
        text += `The objective of this project was ${inputs.objective.toLowerCase().replace(/^to /, '')}.\n\n`;
    }
    
    // Baseline
    if (inputs.baseline) {
        text += `At the outset of the project, the state of technology was as follows: ${inputs.baseline}\n\n`;
    }
    
    // Advancement sought
    if (inputs.advancement) {
        text += `The technological advancement sought was ${inputs.advancement.toLowerCase().replace(/^the advancement /, '').replace(/^was /, '')}.\n\n`;
    }
    
    // Why not standard practice
    if (inputs.whyNotStandard) {
        text += `This advancement could not be achieved through standard practice because ${inputs.whyNotStandard.toLowerCase()}`;
    }
    
    return text.trim();
}

function generateLine244(inputs) {
    let text = '';
    
    // Opening
    text += `At the commencement of this project, the following technological uncertainties existed:\n\n`;
    
    // Uncertainties
    if (inputs.uncertainties) {
        const uncertaintyList = inputs.uncertainties.split('\n').filter(u => u.trim());
        uncertaintyList.forEach((u, i) => {
            const cleaned = u.replace(/^\d+[\.\)]\s*/, '').trim();
            text += `${i + 1}. It was uncertain ${cleaned.toLowerCase().replace(/^it was uncertain /, '').replace(/^whether /, 'whether ')}\n`;
        });
        text += '\n';
    }
    
    // Why not resolvable
    if (inputs.whyUncertain) {
        text += `These uncertainties could not be resolved by a competent professional using standard practice or publicly available knowledge because ${inputs.whyUncertain.toLowerCase()}\n\n`;
    }
    
    // Hypotheses
    if (inputs.hypotheses) {
        text += `To address these uncertainties, the following hypotheses were formulated:\n\n`;
        const hypothesisList = inputs.hypotheses.split('\n').filter(h => h.trim());
        hypothesisList.forEach((h, i) => {
            const cleaned = h.replace(/^[Hh]\d+[\.\:\)]\s*/, '').trim();
            text += `H${i + 1}: ${cleaned}\n`;
        });
    }
    
    return text.trim();
}

function generateLine246(inputs) {
    let text = '';
    
    // Opening
    text += `A systematic investigation was conducted to address the technological uncertainties identified above.\n\n`;
    
    // Experiments
    if (inputs.experiments) {
        text += `The following experiments and tests were designed and performed:\n\n`;
        const expList = inputs.experiments.split('\n').filter(e => e.trim());
        expList.forEach(e => {
            const cleaned = e.replace(/^[-•]\s*/, '').trim();
            text += `• ${cleaned}\n`;
        });
        text += '\n';
    }
    
    // Iterations
    if (inputs.iterations) {
        text += `Based on experimental results, the following iterations and modifications were made:\n\n`;
        const iterList = inputs.iterations.split('\n').filter(i => i.trim());
        iterList.forEach(i => {
            const cleaned = i.replace(/^[-•]\s*/, '').trim();
            text += `• ${cleaned}\n`;
        });
        text += '\n';
    }
    
    // Results
    if (inputs.results) {
        text += `The investigation yielded the following results and conclusions: ${inputs.results}\n\n`;
    }
    
    // Personnel
    if (inputs.personnel) {
        text += `This work was performed by qualified personnel including: ${inputs.personnel}.`;
    }
    
    return text.trim();
}

function displayGeneratedReport(report, title) {
    const resultsDiv = document.getElementById('generated-report');
    resultsDiv.style.display = 'block';
    
    const html = `
        <div class="results-header">
            <h2>📝 Generated T661 Descriptions</h2>
        </div>
        
        ${title ? `<p style="color: #71767b; margin-bottom: 20px;"><strong>Project:</strong> ${title}</p>` : ''}
        
        <div class="generated-section">
            <h4>Line 242 - Scientific or Technological Advancement</h4>
            <div class="generated-text">
                <button class="copy-btn" onclick="copyText(this)">📋 Copy</button>
                ${report.line242}
            </div>
            <p style="color: #71767b; margin-top: 10px; font-size: 0.85em;">Word count: ${countWords(report.line242)}</p>
        </div>
        
        <div class="generated-section">
            <h4>Line 244 - Scientific or Technological Uncertainty</h4>
            <div class="generated-text">
                <button class="copy-btn" onclick="copyText(this)">📋 Copy</button>
                ${report.line244}
            </div>
            <p style="color: #71767b; margin-top: 10px; font-size: 0.85em;">Word count: ${countWords(report.line244)}</p>
        </div>
        
        <div class="generated-section">
            <h4>Line 246 - Work Performed</h4>
            <div class="generated-text">
                <button class="copy-btn" onclick="copyText(this)">📋 Copy</button>
                ${report.line246}
            </div>
            <p style="color: #71767b; margin-top: 10px; font-size: 0.85em;">Word count: ${countWords(report.line246)}</p>
        </div>
        
        <div class="analysis-card" style="margin-top: 20px; border-color: #ffd400;">
            <h4 style="color: #ffd400;">⚠️ Important Notes</h4>
            <ul class="issue-list">
                <li>
                    <span class="issue-icon warning">!</span>
                    <span class="issue-text">Review and customize this generated text - it's a starting point, not a final report</span>
                </li>
                <li>
                    <span class="issue-icon warning">!</span>
                    <span class="issue-text">Add specific technical details, measurements, and metrics where possible</span>
                </li>
                <li>
                    <span class="issue-icon warning">!</span>
                    <span class="issue-text">Ensure the language accurately reflects your actual project work</span>
                </li>
                <li>
                    <span class="issue-icon warning">!</span>
                    <span class="issue-text">Have an SR&ED professional review before submission</span>
                </li>
            </ul>
        </div>
        
        <button class="primary-btn" style="margin-top: 20px;" onclick="copyAllText()">📋 Copy All Sections</button>
    `;
    
    resultsDiv.innerHTML = html;
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

function copyText(button) {
    const textDiv = button.parentElement;
    const text = textDiv.textContent.replace('📋 Copy', '').trim();
    navigator.clipboard.writeText(text).then(() => {
        button.textContent = '✓ Copied!';
        setTimeout(() => button.textContent = '📋 Copy', 2000);
    });
}

function copyAllText() {
    const sections = document.querySelectorAll('.generated-text');
    let allText = '';
    
    const titles = ['LINE 242 - SCIENTIFIC OR TECHNOLOGICAL ADVANCEMENT', 'LINE 244 - SCIENTIFIC OR TECHNOLOGICAL UNCERTAINTY', 'LINE 246 - WORK PERFORMED'];
    
    sections.forEach((section, i) => {
        const text = section.textContent.replace('📋 Copy', '').trim();
        allText += `${titles[i]}\n${'='.repeat(50)}\n\n${text}\n\n\n`;
    });
    
    navigator.clipboard.writeText(allText).then(() => {
        alert('All sections copied to clipboard!');
    });
}

// ============================================
// AI WRITER TAB
// ============================================

const AI_SERVER_URL = 'http://localhost:5000';
let aiServerOnline = false;

// Check AI server status on load
async function checkAIServer() {
    const statusDiv = document.getElementById('ai-status');
    if (!statusDiv) return;

    try {
        const response = await fetch(`${AI_SERVER_URL}/health`, { signal: AbortSignal.timeout(3000) });
        const data = await response.json();

        if (data.status === 'ok') {
            aiServerOnline = true;
            const mode = data.model_loaded ? 'AI Model' : 'Template Mode';
            const modeClass = data.model_loaded ? 'online' : 'template';
            statusDiv.innerHTML = `<span class="status-dot ${modeClass}"></span><span class="status-text">Server Online - ${mode}</span>`;
        }
    } catch (e) {
        aiServerOnline = false;
        statusDiv.innerHTML = `<span class="status-dot offline"></span><span class="status-text">AI Server Offline - Using built-in templates. <a href="#" onclick="showSetupHelp()">Setup Guide</a></span>`;
    }
}

function showSetupHelp() {
    alert(
        'To start the AI server:\n\n' +
        '1. Open a terminal\n' +
        '2. cd to your T661-Checker folder\n' +
        '3. Run: python ai/server.py\n\n' +
        'For AI model training:\n' +
        '1. Install Axolotl: pip install axolotl\n' +
        '2. Run: axolotl train ai/axolotl_config.yml\n' +
        '3. Run: axolotl merge ai/axolotl_config.yml\n\n' +
        'See the setup scripts in the ai/ folder for detailed instructions.'
    );
}

function setAIMode(mode) {
    document.querySelectorAll('.ai-mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.ai-mode-btn[data-mode="${mode}"]`).classList.add('active');

    document.querySelectorAll('.ai-mode-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`ai-${mode}-mode`).classList.add('active');
}

function showAILoading(show) {
    document.getElementById('ai-loading').style.display = show ? 'flex' : 'none';
}

async function aiGenerate() {
    const title = document.getElementById('ai-title').value;
    const field = document.getElementById('ai-field').value;
    const summary = document.getElementById('ai-summary').value;
    const section = document.getElementById('ai-section').value;

    if (!summary && !title) {
        alert('Please provide at least a project title or summary.');
        return;
    }

    showAILoading(true);

    const projectData = {
        title: title,
        field: field || 'technology',
        objective: document.getElementById('ai-objective')?.value || summary,
        baseline: document.getElementById('ai-baseline')?.value || '',
        advancement: '',
        whyNotStandard: '',
        uncertainties: document.getElementById('ai-uncertainties')?.value || '',
        whyUncertain: '',
        hypotheses: '',
        experiments: document.getElementById('ai-experiments')?.value || '',
        iterations: '',
        results: document.getElementById('ai-results')?.value || '',
        personnel: document.getElementById('ai-personnel')?.value || '',
    };

    // If only summary provided, extract details from it
    if (summary && !projectData.objective) {
        projectData.objective = summary;
    }

    try {
        let result;

        if (aiServerOnline) {
            const response = await fetch(`${AI_SERVER_URL}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section, project: projectData }),
            });
            const data = await response.json();
            if (data.success) {
                result = data.sections;
            } else {
                throw new Error(data.error || 'Generation failed');
            }
        } else {
            // Use built-in fallback generation
            result = localGenerate(section, projectData);
        }

        displayAIResults(result, title);
    } catch (error) {
        console.error('AI generation error:', error);
        // Fallback to local generation
        const result = localGenerate(section, projectData);
        displayAIResults(result, title);
    } finally {
        showAILoading(false);
    }
}

function localGenerate(section, project) {
    const output = {};

    if (section === 'all' || section === '242') {
        let text = `LINE 242 - SCIENTIFIC OR TECHNOLOGICAL ADVANCEMENT\n\n`;
        text += `The objective of this project was to achieve a technological advancement in the field of ${project.field} through ${project.objective || 'the development of a novel technological solution'}.\n\n`;

        if (project.baseline) {
            text += `At the outset of this project, the state of technology was as follows: ${project.baseline}\n\n`;
        } else {
            text += `At the outset of this project, the state of technology in this area was limited. Standard practice and existing solutions could not address the technological challenges outlined below.\n\n`;
        }

        text += `The technological advancement sought was the development of a solution that went beyond what could be achieved through standard practice or routine engineering. This advancement could not be achieved by a competent professional using existing knowledge, publicly available information, or standard industry methodologies.`;

        output.line242 = text;
    }

    if (section === 'all' || section === '244') {
        let text = `LINE 244 - SCIENTIFIC OR TECHNOLOGICAL UNCERTAINTY\n\n`;
        text += `At the commencement of this project, the following technological uncertainties existed that could not be resolved by a competent professional in the field using standard practice, publicly available knowledge, or existing technical literature:\n\n`;

        if (project.uncertainties) {
            const lines = project.uncertainties.split('\n').filter(l => l.trim());
            lines.forEach((u, i) => {
                let cleaned = u.replace(/^\d+[\.\)]\s*/, '').trim();
                if (!cleaned.toLowerCase().startsWith('it was uncertain')) {
                    cleaned = `It was uncertain whether ${cleaned}`;
                }
                text += `${i + 1}. ${cleaned}\n\n`;
            });
        } else {
            text += `1. It was uncertain whether the proposed approach could achieve the required performance characteristics under operational conditions.\n\n`;
            text += `2. It was uncertain whether the system architecture could meet the combined technical requirements simultaneously.\n\n`;
        }

        text += `These uncertainties could not be resolved by a competent professional through standard practice because the required combination of performance parameters exceeded what was documented in existing literature, commercial products, or industry knowledge.`;

        output.line244 = text;
    }

    if (section === 'all' || section === '246') {
        let text = `LINE 246 - WORK PERFORMED\n\n`;

        if (project.personnel) {
            text += `A systematic investigation was conducted by a team of ${project.personnel} to address the technological uncertainties identified above.\n\n`;
        } else {
            text += `A systematic investigation was conducted to address the technological uncertainties identified above.\n\n`;
        }

        if (project.experiments) {
            text += `The following experiments and tests were designed and performed:\n\n`;
            project.experiments.split('\n').filter(e => e.trim()).forEach(e => {
                text += `• ${e.replace(/^[-•*]\s*/, '').trim()}\n`;
            });
            text += `\n`;
        } else {
            text += `The team designed and conducted systematic experiments to test the hypotheses formulated to address the identified uncertainties.\n\n`;
        }

        if (project.results) {
            text += `The investigation yielded the following results and conclusions: ${project.results}\n\n`;
        }

        text += `The work described above constitutes a systematic investigation carried out in a field of science or technology by means of experiment or analysis.`;

        output.line246 = text;
    }

    return output;
}

async function aiImprove() {
    const text = document.getElementById('ai-improve-text').value;
    const section = document.getElementById('ai-improve-section').value;

    if (!text.trim()) {
        alert('Please paste the text you want to improve.');
        return;
    }

    showAILoading(true);

    try {
        let improved;

        if (aiServerOnline) {
            const response = await fetch(`${AI_SERVER_URL}/improve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, section }),
            });
            const data = await response.json();
            if (data.success) {
                improved = data.improved;
            } else {
                throw new Error(data.error);
            }
        } else {
            improved = localImprove(text, section);
        }

        const result = {};
        result[`line${section}`] = improved;
        displayAIResults(result, 'Improved Report', true);
    } catch (error) {
        console.error('Improve error:', error);
        const improved = localImprove(text, section);
        const result = {};
        result[`line${section}`] = improved;
        displayAIResults(result, 'Improved Report', true);
    } finally {
        showAILoading(false);
    }
}

function localImprove(text, section) {
    let improved = text;
    const lower = text.toLowerCase();
    const suggestions = [];

    // Common improvements
    improved = improved.replace(/\bwe wanted to\b/gi, 'the objective was to');
    improved = improved.replace(/\bwe needed to\b/gi, 'it was necessary to');
    improved = improved.replace(/\bwe tried\b/gi, 'the team systematically investigated');
    improved = improved.replace(/\btrial and error\b/gi, 'systematic experimentation');
    improved = improved.replace(/\btroubleshooting\b/gi, 'systematic investigation');
    improved = improved.replace(/\bnew product\b/gi, 'technological advancement');
    improved = improved.replace(/\bwe developed\b/gi, 'the team developed');
    improved = improved.replace(/\bwe found\b/gi, 'the investigation revealed');
    improved = improved.replace(/\bwe tested\b/gi, 'experiments were conducted to test');
    improved = improved.replace(/\bwe discovered\b/gi, 'the analysis demonstrated');
    improved = improved.replace(/\bdidn't work\b/gi, 'did not achieve the required performance parameters');
    improved = improved.replace(/\bfailed\b/gi, 'did not meet the target specifications');

    if (section === '242') {
        if (!lower.includes('technological advancement') && !lower.includes('scientific advancement')) {
            suggestions.push('Add explicit mention of "technological advancement sought"');
        }
        if (!lower.includes('standard practice') && !lower.includes('competent professional')) {
            suggestions.push('Explain why this could not be achieved through standard practice');
        }
        if (!lower.includes('state of') && !lower.includes('baseline') && !lower.includes('existing')) {
            suggestions.push('Describe the baseline state of technology at project outset');
        }
    } else if (section === '244') {
        if (!lower.includes('it was uncertain')) {
            suggestions.push('Frame uncertainties as "It was uncertain whether..."');
        }
        if (!lower.includes('competent professional')) {
            suggestions.push('State why a competent professional could not resolve these uncertainties');
        }
        if (!lower.includes('hypothes')) {
            suggestions.push('Include hypotheses formulated to address uncertainties');
        }
    } else if (section === '246') {
        if (!lower.includes('systematic')) {
            suggestions.push('Describe work as a "systematic investigation"');
        }
        if (!lower.includes('experiment') && !lower.includes('test')) {
            suggestions.push('Detail the specific experiments and tests performed');
        }
        if (!lower.includes('iteration') && !lower.includes('modif')) {
            suggestions.push('Describe iterations and modifications based on results');
        }
        if (!lower.includes('result') && !lower.includes('conclusion')) {
            suggestions.push('Include results and conclusions from the investigation');
        }
    }

    if (suggestions.length > 0) {
        improved += '\n\n--- SUGGESTIONS FOR FURTHER IMPROVEMENT ---\n';
        suggestions.forEach(s => {
            improved += `• ${s}\n`;
        });
    }

    return improved;
}

// ============================================
// FEEDBACK SYSTEM - Thumbs Up/Down per paragraph
// ============================================

let feedbackStore = JSON.parse(localStorage.getItem('sred_feedback') || '[]');
let currentGenerationId = 0;

function saveFeedback() {
    localStorage.setItem('sred_feedback', JSON.stringify(feedbackStore));
    updateFeedbackBadge();
}

function updateFeedbackBadge() {
    const badge = document.getElementById('feedback-count-badge');
    if (badge) {
        const count = feedbackStore.length;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
}

function rateParagraph(btn, sectionKey, paraIndex, rating) {
    const paraEl = btn.closest('.fb-paragraph');
    const paraText = paraEl.querySelector('.fb-para-text').textContent.trim();
    const sectionEl = paraEl.closest('.generated-section');
    const genId = sectionEl.dataset.genId;

    // Toggle off if already selected
    const existing = feedbackStore.findIndex(f =>
        f.genId === genId && f.section === sectionKey && f.paraIndex === paraIndex
    );

    if (existing >= 0) {
        if (feedbackStore[existing].rating === rating) {
            // Un-rate
            feedbackStore.splice(existing, 1);
            paraEl.querySelectorAll('.fb-btn').forEach(b => b.classList.remove('active-up', 'active-down'));
            saveFeedback();
            return;
        }
        feedbackStore.splice(existing, 1);
    }

    // Get the full section text and prompt for context
    const fullText = sectionEl.querySelector('.generated-text').textContent.replace(/📋 Copy/g, '').trim();
    const promptEl = document.getElementById('ai-summary') || document.getElementById('ai-title');
    const prompt = promptEl ? promptEl.value : '';

    feedbackStore.push({
        genId,
        section: sectionKey,
        paraIndex,
        paraText,
        fullSectionText: fullText,
        prompt,
        rating, // 'up' or 'down'
        timestamp: new Date().toISOString(),
    });

    // Update button visuals
    paraEl.querySelectorAll('.fb-btn').forEach(b => b.classList.remove('active-up', 'active-down'));
    btn.classList.add(rating === 'up' ? 'active-up' : 'active-down');

    saveFeedback();

    // Subtle animation
    paraEl.classList.add('fb-flash-' + rating);
    setTimeout(() => paraEl.classList.remove('fb-flash-' + rating), 400);
}

function splitIntoParagraphs(text) {
    // Split on double newlines or <br><br>, filter empties
    return text
        .replace(/<br\s*\/?>/gi, '\n')
        .split(/\n\n+/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
}

function buildFeedbackSection(sectionKey, text, genId) {
    const paragraphs = splitIntoParagraphs(text);

    let html = '';
    paragraphs.forEach((para, i) => {
        // Check if there's existing feedback
        const existing = feedbackStore.find(f =>
            f.genId === genId && f.section === sectionKey && f.paraIndex === i
        );
        const upClass = existing && existing.rating === 'up' ? 'active-up' : '';
        const downClass = existing && existing.rating === 'down' ? 'active-down' : '';

        html += `
            <div class="fb-paragraph" data-para-index="${i}">
                <div class="fb-para-text">${para}</div>
                <div class="fb-actions">
                    <button class="fb-btn fb-up ${upClass}" onclick="rateParagraph(this, '${sectionKey}', ${i}, 'up')" title="Good - keep this style">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M2 20h2c.55 0 1-.45 1-1v-9c0-.55-.45-1-1-1H2v11zm19.83-7.12c.11-.25.17-.52.17-.8V11c0-1.1-.9-2-2-2h-5.5l.92-4.65c.05-.22.02-.46-.08-.66-.23-.45-.52-.86-.88-1.22L14 2 7.59 8.41C7.21 8.79 7 9.3 7 9.83v7.84C7 18.95 8.05 20 9.34 20h8.11c.7 0 1.36-.37 1.72-.97l2.66-6.15z"/></svg>
                    </button>
                    <button class="fb-btn fb-down ${downClass}" onclick="rateParagraph(this, '${sectionKey}', ${i}, 'down')" title="Bad - needs improvement">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M15 3H6c-.83 0-1.54.5-1.84 1.22l-3.02 7.05c-.09.23-.14.47-.14.73v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2zm4 0v12h4V3h-4z"/></svg>
                    </button>
                </div>
            </div>
        `;
    });

    return html;
}

function exportFeedbackAsDPO() {
    if (feedbackStore.length === 0) {
        alert('No feedback collected yet. Rate some paragraphs with 👍/👎 first!');
        return;
    }

    // Group feedback by genId + section to build DPO pairs
    const groups = {};
    for (const fb of feedbackStore) {
        const key = `${fb.genId}_${fb.section}`;
        if (!groups[key]) groups[key] = { prompt: fb.prompt, section: fb.section, fullText: fb.fullSectionText, items: [] };
        groups[key].items.push(fb);
    }

    const dpoData = [];

    for (const group of Object.values(groups)) {
        const upParas = group.items.filter(i => i.rating === 'up').map(i => i.paraText);
        const downParas = group.items.filter(i => i.rating === 'down').map(i => i.paraText);

        if (upParas.length > 0 && downParas.length > 0) {
            // Full DPO pair: chosen = liked paragraphs, rejected = disliked ones
            dpoData.push({
                prompt: `Write a T661 ${group.section} description for the following project: ${group.prompt}`,
                chosen: upParas.join('\n\n'),
                rejected: downParas.join('\n\n'),
            });
        } else if (upParas.length > 0) {
            // Only positive: use as SFT data (chosen only)
            dpoData.push({
                prompt: `Write a T661 ${group.section} description for the following project: ${group.prompt}`,
                chosen: upParas.join('\n\n'),
                rejected: '',
            });
        } else if (downParas.length > 0) {
            // Only negative: use as rejected examples
            dpoData.push({
                prompt: `Write a T661 ${group.section} description for the following project: ${group.prompt}`,
                chosen: '',
                rejected: downParas.join('\n\n'),
            });
        }
    }

    // Also export as Axolotl-compatible ShareGPT for SFT
    const sftData = [];
    for (const fb of feedbackStore) {
        if (fb.rating === 'up') {
            sftData.push({
                conversations: [
                    { from: 'system', value: 'You are an expert SR&ED report writer specializing in CRA T661 form project descriptions.' },
                    { from: 'human', value: `Write a T661 ${fb.section} description for: ${fb.prompt}` },
                    { from: 'gpt', value: fb.paraText },
                ],
                source: 'user_feedback_positive',
            });
        }
    }

    // Build downloadable files
    const dpoJsonl = dpoData.map(d => JSON.stringify(d)).join('\n');
    const sftJsonl = sftData.map(d => JSON.stringify(d)).join('\n');

    // Download DPO data
    if (dpoData.length > 0) {
        downloadFile('sred_dpo_feedback.jsonl', dpoJsonl);
    }
    // Download SFT data
    if (sftData.length > 0) {
        downloadFile('sred_sft_feedback.jsonl', sftJsonl);
    }

    const stats = {
        total: feedbackStore.length,
        thumbsUp: feedbackStore.filter(f => f.rating === 'up').length,
        thumbsDown: feedbackStore.filter(f => f.rating === 'down').length,
        dpoPairs: dpoData.filter(d => d.chosen && d.rejected).length,
        sftExamples: sftData.length,
    };

    alert(
        `Feedback exported!\n\n` +
        `Total ratings: ${stats.total} (👍 ${stats.thumbsUp} / 👎 ${stats.thumbsDown})\n` +
        `DPO pairs (chosen vs rejected): ${stats.dpoPairs}\n` +
        `SFT examples (positive only): ${stats.sftExamples}\n\n` +
        `Files downloaded:\n` +
        `• sred_dpo_feedback.jsonl - for DPO training\n` +
        `• sred_sft_feedback.jsonl - for SFT training\n\n` +
        `To train:\n` +
        `1. Copy files to ai/dataset/\n` +
        `2. Run: axolotl train ai/axolotl_dpo_config.yml`
    );
}

function downloadFile(filename, content) {
    const blob = new Blob([content], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function clearFeedback() {
    if (confirm(`Clear all ${feedbackStore.length} feedback ratings? This cannot be undone.`)) {
        feedbackStore = [];
        saveFeedback();
        alert('Feedback cleared.');
    }
}

function displayAIResults(sections, title, isImprovement = false) {
    const container = document.getElementById('ai-results-container');
    container.style.display = 'block';
    currentGenerationId++;
    const genId = `gen_${currentGenerationId}_${Date.now()}`;

    const sectionNames = {
        line242: 'Line 242 - Scientific or Technological Advancement',
        line244: 'Line 244 - Scientific or Technological Uncertainty',
        line246: 'Line 246 - Work Performed',
    };

    let html = `
        <div class="results-header">
            <h2>${isImprovement ? '🔧 Improved' : '🤖 AI Generated'} T661 Descriptions</h2>
            <div class="fb-header-actions">
                <span class="fb-info" title="Rate each paragraph with 👍/👎 to train the AI">Rate paragraphs to improve future results</span>
            </div>
        </div>
        ${title ? `<p style="color: #71767b; margin-bottom: 20px;"><strong>Project:</strong> ${title}</p>` : ''}
    `;

    for (const [key, text] of Object.entries(sections)) {
        if (!text) continue;
        const name = sectionNames[key] || key;
        const wordCount = countWords(text);

        html += `
            <div class="generated-section" data-gen-id="${genId}" data-section="${key}">
                <h4>${name}</h4>
                <div class="generated-text fb-container">
                    <button class="copy-btn" onclick="copyText(this)">📋 Copy</button>
                    ${buildFeedbackSection(key, text, genId)}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <span style="color: #71767b; font-size: 0.85em;">Word count: ${wordCount}</span>
                    <button class="secondary-btn" onclick="sendToChecker('${key}', this)">🔍 Run Checker on This</button>
                </div>
            </div>
        `;
    }

    html += `
        <div class="ai-actions">
            <button class="primary-btn" onclick="copyAllAIText()">📋 Copy All Sections</button>
            <button class="primary-btn fb-export-btn" onclick="exportFeedbackAsDPO()">
                📊 Export Feedback (<span id="feedback-count-badge" class="fb-badge">${feedbackStore.length}</span>)
            </button>
            <button class="secondary-btn" onclick="clearFeedback()" style="margin-left: 5px;">🗑️ Clear Feedback</button>
        </div>
    `;

    container.innerHTML = html;
    updateFeedbackBadge();
    container.scrollIntoView({ behavior: 'smooth' });
}

function sendToChecker(sectionKey, btn) {
    const textDiv = btn.closest('.generated-section').querySelector('.generated-text');
    const text = textDiv.textContent.replace('📋 Copy', '').trim();

    const fieldMap = {
        line242: 'check-advancement',
        line244: 'check-uncertainty',
        line246: 'check-work',
    };

    const targetId = fieldMap[sectionKey];
    if (targetId) {
        document.getElementById(targetId).value = text;
        // Switch to checker tab
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.tab-btn[data-tab="checker"]').classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById('checker-tab').classList.add('active');
        // Trigger word count
        document.getElementById(targetId).dispatchEvent(new Event('input'));
    }
}

function copyAllAIText() {
    const sections = document.querySelectorAll('#ai-results-container .generated-text');
    let allText = '';
    const titles = ['LINE 242 - SCIENTIFIC OR TECHNOLOGICAL ADVANCEMENT', 'LINE 244 - SCIENTIFIC OR TECHNOLOGICAL UNCERTAINTY', 'LINE 246 - WORK PERFORMED'];

    sections.forEach((section, i) => {
        const text = section.textContent.replace('📋 Copy', '').trim();
        const title = titles[i] || `SECTION ${i + 1}`;
        allText += `${title}\n${'='.repeat(50)}\n\n${text}\n\n\n`;
    });

    navigator.clipboard.writeText(allText).then(() => {
        alert('All sections copied to clipboard!');
    });
}

// Check server on page load
setTimeout(checkAIServer, 500);

console.log('SR&ED Report Checker & Generator loaded');
