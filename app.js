
// GitHub APIとの同期機能付きアプリケーション
let appState = {
    settings: {
        githubToken: '',
        repoOwner: '',
        repoName: '',
        filePath: '.github/review-checklist.md'
    },
    reviewItems: {},
    isLoading: false,
    lastSyncTime: null,
    autoSync: true
};

// DOM要素
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
    loadingModal: document.getElementById('loading-modal')
};

// Markdownパーサー（シンプルなリスト形式向け）
function parseMarkdownToReviewItems(markdownContent) {
    const reviewItems = {};
    const lines = markdownContent.split('\n');
    let currentCategory = null;

    for (const line of lines) {
        const trimmedLine = line.trim();

        // カテゴリヘッダーを検出 (## カテゴリ名)
        const categoryMatch = trimmedLine.match(/^##\s+(.+)$/);
        if (categoryMatch) {
            currentCategory = categoryMatch[1].trim();
            if (!reviewItems[currentCategory]) {
                reviewItems[currentCategory] = [];
            }
            continue;
        }

        // リストアイテムを検出 (- 項目)
        const itemMatch = trimmedLine.match(/^[-*]\s+(.+)$/);
        if (itemMatch && currentCategory) {
            const item = itemMatch[1].trim();
            if (item && !reviewItems[currentCategory].includes(item)) {
                reviewItems[currentCategory].push(item);
            }
        }
    }

    return reviewItems;
}

// レビューアイテムをMarkdown形式に変換
function convertToMarkdown(reviewItems) {
    let markdown = '# Code Review Checklist\n\nこのファイルはGitHub Copilot Spacesで自動的に参照されます。\n\n';

    for (const [category, items] of Object.entries(reviewItems)) {
        markdown += `## ${category}\n\n`;
        for (const item of items) {
            markdown += `- ${item}\n`;
        }
        markdown += '\n';
    }

    return markdown;
}

// GitHub APIからファイル内容を取得
async function fetchFileFromGitHub() {
    const { githubToken, repoOwner, repoName, filePath } = appState.settings;

    if (!githubToken || !repoOwner || !repoName) {
        console.warn('GitHub settings not configured');
        return null;
    }

    try {
        showLoading('ファイルを読み込み中...');

        const response = await fetch(
            `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
            {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        if (response.status === 404) {
            // ファイルが存在しない場合は空の内容で初期化
            return { content: '', sha: null };
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const content = atob(data.content);

        return { content, sha: data.sha };

    } catch (error) {
        console.error('Error fetching file from GitHub:', error);
        showStatus(`エラー: ${error.message}`, 'error');
        return null;
    } finally {
        hideLoading();
    }
}

// ファイルを同期してUIを更新
async function syncWithGitHub() {
    const fileData = await fetchFileFromGitHub();

    if (fileData) {
        if (fileData.content.trim()) {
            // Markdownをパースして reviewItems を更新
            appState.reviewItems = parseMarkdownToReviewItems(fileData.content);
        } else {
            // 空ファイルの場合は空のオブジェクトを使用
            appState.reviewItems = {};
        }

        appState.lastSyncTime = new Date();

        // UIを更新
        renderReviewItems();
        updateSyncStatus();
        showStatus('同期が完了しました', 'success');

        return true;
    }

    return false;
}

// 同期ステータス表示を更新
function updateSyncStatus() {
    const statusElement = document.getElementById('sync-status');
    if (statusElement && appState.lastSyncTime) {
        const timeStr = appState.lastSyncTime.toLocaleTimeString('ja-JP');
        statusElement.textContent = `最終同期: ${timeStr}`;
        statusElement.parentElement.classList.remove('warning');
    }
}

// ファイルをGitHubに更新
async function updateFileOnGitHub(newContent) {
    const { githubToken, repoOwner, repoName, filePath } = appState.settings;

    try {
        showLoading('ファイルを更新中...');

        // 現在のファイル状態を取得
        const currentFile = await fetchFileFromGitHub();
        if (!currentFile && currentFile !== null) {
            throw new Error('現在のファイル状態を取得できませんでした');
        }

        // ファイルを更新
        const response = await fetch(
            `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Update review checklist from web interface',
                    content: btoa(unescape(encodeURIComponent(newContent))),
                    sha: currentFile ? currentFile.sha : undefined
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API Error: ${response.status} - ${errorText}`);
        }

        // 成功後に少し待ってから同期
        setTimeout(() => syncWithGitHub(), 1500);

        return true;

    } catch (error) {
        console.error('Error updating file on GitHub:', error);
        showStatus(`エラー: ${error.message}`, 'error');
        return false;
    } finally {
        hideLoading();
    }
}

// 新しいレビューアイテムを追加（改良版）
async function addReviewItem(category, content) {
    // 最新の状態を取得してから追加
    await syncWithGitHub();

    // ローカルの reviewItems に追加
    if (!appState.reviewItems[category]) {
        appState.reviewItems[category] = [];
    }

    if (!appState.reviewItems[category].includes(content)) {
        appState.reviewItems[category].push(content);
    }

    // Markdown形式に変換
    const markdownContent = convertToMarkdown(appState.reviewItems);

    // GitHubに更新
    const success = await updateFileOnGitHub(markdownContent);

    if (success) {
        // UIを更新
        renderReviewItems();
        showStatus('項目を追加しました', 'success');

        // フォームをクリア
        document.getElementById('category').value = '';
        document.getElementById('content').value = '';
        elements.addReviewForm.classList.add('hidden');
    }

    return success;
}

// 既存のレビューアイテムを削除
async function deleteReviewItem(category, itemIndex) {
    if (confirm('この項目を削除しますか？')) {
        // 最新の状態を取得
        await syncWithGitHub();

        if (appState.reviewItems[category] && appState.reviewItems[category][itemIndex]) {
            appState.reviewItems[category].splice(itemIndex, 1);

            // カテゴリが空になった場合は削除
            if (appState.reviewItems[category].length === 0) {
                delete appState.reviewItems[category];
            }

            // Markdown形式に変換してGitHubに更新
            const markdownContent = convertToMarkdown(appState.reviewItems);
            const success = await updateFileOnGitHub(markdownContent);

            if (success) {
                renderReviewItems();
                showStatus('項目を削除しました', 'success');
            }
        }
    }
}

// 自動同期を開始
function startAutoSync() {
    if (appState.autoSync && appState.settings.githubToken) {
        setInterval(async () => {
            if (document.visibilityState === 'visible') {
                await syncWithGitHub();
            }
        }, 30000); // 30秒間隔
    }
}

// ページ読み込み時の初期同期
async function initializeSync() {
    // 設定を読み込み
    loadSettings();

    if (appState.settings.githubToken) {
        const syncSuccess = await syncWithGitHub();
        if (syncSuccess) {
            startAutoSync();
        }
    } else {
        // 設定が未完了の場合は空のデータで初期化
        appState.reviewItems = {};
        renderReviewItems();
        showStatus('設定画面でGitHub情報を設定してください', 'warning');

        // 同期ステータスを警告状態に
        const statusElement = document.getElementById('sync-status');
        if (statusElement) {
            statusElement.textContent = '同期ステータス: 未設定';
            statusElement.parentElement.classList.add('warning');
        }
    }
}

// 設定保存時に同期を実行
async function saveSettingsAndSync() {
    saveSettings();
    const syncSuccess = await syncWithGitHub();
    if (syncSuccess) {
        startAutoSync();
    }
}

// 手動同期ボタンのイベントハンドラ
async function handleManualSync() {
    await syncWithGitHub();
}

// レビューアイテムをレンダリング
function renderReviewItems() {
    const container = elements.reviewItemsContainer;
    if (!container) return;

    container.innerHTML = '';

    if (Object.keys(appState.reviewItems).length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>レビュー観点が登録されていません。</p>
                <p>「新しい観点を追加」ボタンから項目を追加してください。</p>
            </div>
        `;
        return;
    }

    for (const [category, items] of Object.entries(appState.reviewItems)) {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'review-category';

        let itemsHtml = '';
        items.forEach((item, index) => {
            itemsHtml += `
                <div class="review-item">
                    <span class="review-item__content">${escapeHtml(item)}</span>
                    <button class="btn btn--danger btn--small review-item__delete" 
                            onclick="deleteReviewItem('${escapeHtml(category)}', ${index})">
                        削除
                    </button>
                </div>
            `;
        });

        categoryElement.innerHTML = `
            <div class="review-category__header">
                <h3>${escapeHtml(category)}</h3>
                <span class="review-category__count">${items.length}件</span>
            </div>
            <div class="review-category__items">
                ${itemsHtml}
            </div>
        `;

        container.appendChild(categoryElement);
    }
}

// HTML エスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 各種ユーティリティ関数
function showStatus(message, type = 'info') {
    const statusElement = elements.statusDisplay;
    if (!statusElement) return;

    statusElement.className = `status-container status--${type}`;
    statusElement.textContent = message;
    statusElement.classList.remove('hidden');

    setTimeout(() => {
        statusElement.classList.add('hidden');
    }, 5000);
}

function showLoading(message = '読み込み中...') {
    appState.isLoading = true;
    const loadingElement = elements.loadingModal;
    if (loadingElement) {
        loadingElement.querySelector('.loading__text').textContent = message;
        loadingElement.classList.remove('hidden');
    }
}

function hideLoading() {
    appState.isLoading = false;
    const loadingElement = elements.loadingModal;
    if (loadingElement) {
        loadingElement.classList.add('hidden');
    }
}

function loadSettings() {
    const saved = localStorage.getItem('github-review-settings');
    if (saved) {
        appState.settings = { ...appState.settings, ...JSON.parse(saved) };

        // フォームに設定を反映
        const form = elements.settingsForm;
        if (form) {
            form.elements.owner.value = appState.settings.repoOwner || '';
            form.elements.repo.value = appState.settings.repoName || '';
            form.elements.filePath.value = appState.settings.filePath || '.github/review-checklist.md';
            form.elements.token.value = appState.settings.githubToken || '';
        }
    }
}

function saveSettings() {
    const form = elements.settingsForm;
    if (form) {
        appState.settings = {
            repoOwner: form.elements.owner.value,
            repoName: form.elements.repo.value,
            filePath: form.elements.filePath.value,
            githubToken: form.elements.token.value
        };

        localStorage.setItem('github-review-settings', JSON.stringify(appState.settings));
    }
}

// ナビゲーション機能
function initializeNavigation() {
    elements.navButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetSection = this.dataset.section;
            switchSection(targetSection);

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

// フォーム初期化
function initializeForms() {
    // 設定フォーム
    if (elements.settingsForm) {
        elements.settingsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveSettingsAndSync();
            showStatus('設定を保存しました', 'success');
        });
    }

    // レビュー追加フォーム
    if (elements.reviewForm) {
        elements.reviewForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const category = document.getElementById('category').value;
            const content = document.getElementById('content').value;

            if (category && content) {
                await addReviewItem(category, content);
            }
        });
    }
}

// ボタン初期化
function initializeButtons() {
    if (elements.addReviewBtn) {
        elements.addReviewBtn.addEventListener('click', function() {
            elements.addReviewForm.classList.toggle('hidden');
        });
    }

    if (elements.cancelAddBtn) {
        elements.cancelAddBtn.addEventListener('click', function() {
            elements.addReviewForm.classList.add('hidden');
            elements.reviewForm.reset();
        });
    }
}

// ページ可視性変更時の処理
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && appState.settings.githubToken) {
        syncWithGitHub();
    }
});

// 初期化処理
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeForms();
    initializeButtons();
    initializeSync();
});
