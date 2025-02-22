let commentWindow = null;

// コメントウィンドウを作成
function createCommentWindow() {
    if (commentWindow) return;

    commentWindow = document.createElement('div');
    commentWindow.className = 'page-notes-window';
    commentWindow.innerHTML = `
        <div class="page-notes-header">
          <span>コメントを追加</span>
          <button class="page-notes-close">×</button>
        </div>
        <textarea class="page-notes-textarea"></textarea>
        <button class="page-notes-save">保存</button>
    `;

    document.body.appendChild(commentWindow);

    const closeBtn = commentWindow.querySelector('.page-notes-close');
    const saveBtn = commentWindow.querySelector('.page-notes-save');
    const textarea = commentWindow.querySelector('.page-notes-textarea');

    closeBtn.addEventListener('click', () => {
        commentWindow.remove();
        commentWindow = null;
    });

    saveBtn.addEventListener('click', () => {
        const comment = textarea.value;
        if (comment) {
            saveComment(comment);
            commentWindow.remove();
            commentWindow = null;
        }
    });
}

// コメントを保存
function saveComment(comment) {
    const url = window.location.href;
    chrome.storage.local.get(['pageNotes'], (result) => {
        const notes = result.pageNotes || {};
        notes[url] = comment;
        chrome.storage.local.set({ pageNotes: notes });
    });
}

// 非同期エラーを回避するための関数
async function getStoredNotes() {
    try {
        return await chrome.storage.local.get(null);
    } catch (error) {
        console.error("Error accessing storage:", error);
        return {};
    }
}

// リンクを強調表示
async function highlightLinksWithComments() {
    const links = document.querySelectorAll("a");
    const storedNotes = await getStoredNotes();

    links.forEach(link => {
        const href = link.href;
        if (storedNotes[href]) {
            link.style.borderBottom = "2px dashed orange !important";
            link.style.textDecoration = "none";
            link.style.display = "inline-block";
        }
    });
}

// 検索結果ページでのホバー表示処理
function setupSearchResultsHover() {
    const links = document.querySelectorAll('a');

    chrome.storage.local.get(['pageNotes'], (result) => {
        const notes = result.pageNotes || {};
        
        links.forEach(link => {
            const url = link.href;
            if (notes[url]) {
                link.addEventListener('mouseenter', () => {
                    showTooltip(link, notes[url]);
                });

                link.addEventListener('mouseleave', () => {
                    hideTooltip();
                });
            }
        });
    });
}

// ツールチップを表示
function showTooltip(element, text) {
    const tooltip = document.createElement('div');
    tooltip.className = 'page-notes-tooltip';
    tooltip.textContent = text;

    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + window.scrollY}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;

    document.body.appendChild(tooltip);
}

// ツールチップを非表示
function hideTooltip() {
    const tooltip = document.querySelector('.page-notes-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openCommentWindow") {
        createCommentWindow();
    }
});

// スクリプト読み込み時に実行
highlightLinksWithComments();
setupSearchResultsHover();
