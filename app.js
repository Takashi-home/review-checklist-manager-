// Application state
let appState = {
    settings: {
        githubToken: '',
        repoOwner: '',
        repoName: '',
        filePath: '.github/review-checklist.md'
    },
    reviewItems: {},
    isLoading: false
};

// Sample data for demonstration
const sampleReviewItems = {
    'セキュリティ': [
        '入力値検証が適切に行われているか',
        'SQLインジェクション対策が実装されているか',
        '認証・認可が正しく実装されているか'
    ],
    '組込み特有': [
        'メモリリークが発生していないか',
        '割り込み処理が適切に実装されているか',
        'リアルタイム性要件を満たしているか',
        '電力消費が最適化されているか'
    ],
    'パフォーマンス': [
        'アルゴリズムの計算量が適切か',
        'メモリ使用量が適切か',
        'I/O処理が効率的か'
    ]
};

// GitHub API endpoints
const GITHUB_API_BASE = 'https://api.github.com';

// DOM elements
const elements = {
    navButtons: document.querySelectorAll('.nav-btn'),
    sections: document.querySelectorAll('.section'),
    settingsForm: document.getElementById('settings-form'),
    reviewForm: document.getElementById('review-form'),
    addReviewBtn: document.getElementById('add-review-btn'),
    cancelAddBtn: document.getElementById('cancel-add-btn'),
    addReviewForm: document.getElementById('add-review-form'),
    reviewItemsContainer: document.getElementById('review-items-container'),
    statusDisplay: document.getElementById('status-display'),
    loadingModal: document.getElementById('loading-modal'),
    testConnectionBtn: document.getElementById('test-connection-btn'),
    testMcpBtn: document.getElementById('test-mcp-btn')
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeForms();
    initializeButtons();
    loadSampleData();
    renderReviewItems();
});

// Navigation functionality
function initializeNavigation() {
    elements.navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetSection = this.dataset.section;
            switchSection(targetSection);
            
            // Update active nav button
            elements.navButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function switchSection(sectionName) {
    elements.sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

// Form initialization
function initializeForms() {
    // Settings form
    if (elements.settingsForm) {
        elements.settingsForm.addEventListener('submit', handleSettingsSubmit);
        loadSettingsToForm();
    }
    
    // Review form
    if (elements.reviewForm) {
        elements.reviewForm.addEventListener('submit', handleReviewSubmit);
    }
}

// Button event handlers
function initializeButtons() {
    if (elements.addReviewBtn) {
        elements.addReviewBtn.addEventListener('click', showAddReviewForm);
    }
    
    if (elements.cancelAddBtn) {
        elements.cancelAddBtn.addEventListener('click', hideAddReviewForm);
    }
    
    if (elements.testConnectionBtn) {
        elements.testConnectionBtn.addEventListener('click', testGitHubConnection);
    }
    
    if (elements.testMcpBtn) {
        elements.testMcpBtn.addEventListener('click', testMcpConnection);
    }
}

// Settings management
function handleSettingsSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    appState.settings = {
        githubToken: document.getElementById('github-token').value,
        repoOwner: document.getElementById('repo-owner').value,
        repoName: document.getElementById('repo-name').value,
        filePath: document.getElementById('file-path').value
    };
    
    showStatus('設定が保存されました', 'success');
    
    // Test connection if all fields are filled
    if (appState.settings.githubToken && appState.settings.repoOwner && appState.settings.repoName) {
        setTimeout(testGitHubConnection, 1000);
    }
}

function loadSettingsToForm() {
    document.getElementById('github-token').value = appState.settings.githubToken;
    document.getElementById('repo-owner').value = appState.settings.repoOwner;
    document.getElementById('repo-name').value = appState.settings.repoName;
    document.getElementById('file-path').value = appState.settings.filePath;
}

// Review item management
function handleReviewSubmit(event) {
    event.preventDefault();
    
    const category = document.getElementById('category').value;
    const content = document.getElementById('content').value;
    
    if (!category || !content) {
        showStatus('カテゴリと内容を入力してください', 'error');
        return;
    }
    
    addReviewItem(category, content);
    hideAddReviewForm();
    elements.reviewForm.reset();
    
    // Update GitHub file if settings are configured
    if (isGitHubConfigured()) {
        updateGitHubFile();
    }
}

function addReviewItem(category, content) {
    if (!appState.reviewItems[category]) {
        appState.reviewItems[category] = [];
    }
    
    appState.reviewItems[category].push({
        id: Date.now(),
        content: content,
        createdAt: new Date().toISOString()
    });
    
    renderReviewItems();
    showStatus(`「${category}」にレビュー観点を追加しました`, 'success');
}

function removeReviewItem(category, itemId) {
    if (appState.reviewItems[category]) {
        appState.reviewItems[category] = appState.reviewItems[category].filter(
            item => item.id !== itemId
        );
        
        if (appState.reviewItems[category].length === 0) {
            delete appState.reviewItems[category];
        }
        
        renderReviewItems();
        showStatus('レビュー観点を削除しました', 'success');
        
        // Update GitHub file if settings are configured
        if (isGitHubConfigured()) {
            updateGitHubFile();
        }
    }
}

function renderReviewItems() {
    if (!elements.reviewItemsContainer) return;
    
    const container = elements.reviewItemsContainer;
    container.innerHTML = '';
    
    if (Object.keys(appState.reviewItems).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>レビュー観点がありません</h3>
                <p>「新しい観点を追加」ボタンから追加してください</p>
            </div>
        `;
        return;
    }
    
    Object.entries(appState.reviewItems).forEach(([category, items]) => {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'review-category';
        
        categoryElement.innerHTML = `
            <h3>${category} (${items.length}件)</h3>
            <div class="review-items">
                ${items.map(item => `
                    <div class="review-item">
                        <div class="review-item-content">${item.content}</div>
                        <div class="review-item-actions">
                            <button class="btn btn--outline btn--sm" onclick="removeReviewItem('${category}', ${item.id})">削除</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.appendChild(categoryElement);
    });
}

// GitHub API functionality
async function testGitHubConnection() {
    if (!isGitHubConfigured()) {
        showStatus('GitHub設定が完了していません', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const response = await fetch(`${GITHUB_API_BASE}/repos/${appState.settings.repoOwner}/${appState.settings.repoName}`, {
            headers: {
                'Authorization': `token ${appState.settings.githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.ok) {
            showStatus('GitHub接続テスト成功', 'success');
            showConnectionStatus('success', 'GitHub接続: 正常');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'リポジトリにアクセスできません');
        }
    } catch (error) {
        showStatus(`GitHub接続エラー: ${error.message}`, 'error');
        showConnectionStatus('error', 'GitHub接続: エラー');
    } finally {
        showLoading(false);
    }
}

async function updateGitHubFile() {
    if (!isGitHubConfigured()) {
        return;
    }
    
    showLoading(true);
    
    try {
        const markdownContent = generateMarkdownContent();
        const url = `${GITHUB_API_BASE}/repos/${appState.settings.repoOwner}/${appState.settings.repoName}/contents/${appState.settings.filePath}`;
        
        // Get current file SHA (if exists)
        let sha = null;
        try {
            const getResponse = await fetch(url, {
                headers: {
                    'Authorization': `token ${appState.settings.githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (getResponse.ok) {
                const fileData = await getResponse.json();
                sha = fileData.sha;
            }
        } catch (error) {
            // File doesn't exist, will create new
        }
        
        // Update or create file
        const updateData = {
            message: 'Update review checklist via web app',
            content: btoa(unescape(encodeURIComponent(markdownContent))),
            ...(sha && { sha })
        };
        
        const updateResponse = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${appState.settings.githubToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify(updateData)
        });
        
        if (updateResponse.ok) {
            showStatus('GitHubファイルを更新しました', 'success');
        } else {
            const errorData = await updateResponse.json();
            throw new Error(errorData.message || 'ファイル更新に失敗しました');
        }
    } catch (error) {
        showStatus(`GitHub更新エラー: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

function generateMarkdownContent() {
    let content = '# コードレビューチェックリスト\n\n';
    content += '> このファイルはレビュー観点管理アプリによって自動生成されています\n\n';
    
    Object.entries(appState.reviewItems).forEach(([category, items]) => {
        content += `## ${category}\n\n`;
        items.forEach(item => {
            content += `- [ ] ${item.content}\n`;
        });
        content += '\n';
    });
    
    content += '\n---\n';
    content += `最終更新: ${new Date().toLocaleString('ja-JP')}\n`;
    
    return content;
}

// MCP testing functionality
async function testMcpConnection() {
    showLoading(true);
    
    try {
        // Simulate MCP connection test
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // In a real implementation, this would test the actual MCP connection
        const isConnected = Math.random() > 0.3; // Simulate random success/failure
        
        if (isConnected) {
            showStatus('MCP接続テスト成功', 'success');
            showConnectionStatus('success', 'MCP Server: 接続中');
        } else {
            throw new Error('MCP Serverに接続できません');
        }
    } catch (error) {
        showStatus(`MCP接続エラー: ${error.message}`, 'error');
        showConnectionStatus('error', 'MCP Server: 未接続');
    } finally {
        showLoading(false);
    }
}

// UI helper functions
function showAddReviewForm() {
    elements.addReviewForm.classList.remove('hidden');
    document.getElementById('category').focus();
}

function hideAddReviewForm() {
    elements.addReviewForm.classList.add('hidden');
    elements.reviewForm.reset();
}

function showStatus(message, type) {
    if (!elements.statusDisplay) return;
    
    elements.statusDisplay.innerHTML = `
        <div class="status status--${type}">
            ${message}
        </div>
    `;
    elements.statusDisplay.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        elements.statusDisplay.classList.add('hidden');
    }, 5000);
}

function showConnectionStatus(type, message) {
    const settingsSection = document.getElementById('settings-section');
    const existingStatus = settingsSection.querySelector('.connection-status');
    
    if (existingStatus) {
        existingStatus.remove();
    }
    
    const statusElement = document.createElement('div');
    statusElement.className = `connection-status connection-status--${type}`;
    statusElement.innerHTML = `
        <div class="connection-indicator connection-indicator--${type}"></div>
        ${message}
    `;
    
    settingsSection.appendChild(statusElement);
}

function showLoading(show) {
    if (show) {
        elements.loadingModal.classList.remove('hidden');
    } else {
        elements.loadingModal.classList.add('hidden');
    }
}

// Utility functions
function isGitHubConfigured() {
    return appState.settings.githubToken && 
           appState.settings.repoOwner && 
           appState.settings.repoName;
}

function loadSampleData() {
    // Load sample data only if no existing data
    if (Object.keys(appState.reviewItems).length === 0) {
        Object.entries(sampleReviewItems).forEach(([category, items]) => {
            appState.reviewItems[category] = items.map((content, index) => ({
                id: Date.now() + index,
                content: content,
                createdAt: new Date().toISOString()
            }));
        });
    }
}

// Error handling for unhandled errors
window.addEventListener('error', function(event) {
    console.error('Unhandled error:', event.error);
    showStatus('予期しないエラーが発生しました', 'error');
});

// Handle form submission errors
window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    showStatus('処理中にエラーが発生しました', 'error');
    showLoading(false);
});