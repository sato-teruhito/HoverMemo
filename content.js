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
    <div class="page-notes-selection">
      <label class="selection-button yes">
        <input type="radio" name="useful" value="yes">
        <span class="selection-icon">〇</span>
        役立つ
      </label>
      <label class="selection-button no">
        <input type="radio" name="useful" value="no">
        <span class="selection-icon">×</span>
        役立たない
      </label>
    </div>
    <button class="page-notes-save">保存</button>
  `;

  document.body.appendChild(commentWindow);

  // イベントリスナーの設定
  const closeBtn = commentWindow.querySelector('.page-notes-close');
  const saveBtn = commentWindow.querySelector('.page-notes-save');
  const textarea = commentWindow.querySelector('.page-notes-textarea');
  const radios = commentWindow.querySelectorAll('input[name="useful"]');

  // ラジオボタンの選択状態を視覚的に表示
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      // 全ての選択ボタンからselectedクラスを削除
      document.querySelectorAll('.selection-button').forEach(btn => {
        btn.classList.remove('selected');
      });
      // 選択されたボタンにselectedクラスを追加
      radio.closest('.selection-button').classList.add('selected');
    });
  });

  closeBtn.addEventListener('click', () => {
    commentWindow.remove();
    commentWindow = null;
  });

  saveBtn.addEventListener('click', () => {
    const comment = textarea.value;
    const selectedValue = Array.from(radios).find(radio => radio.checked)?.value;
    
    if (comment && selectedValue) {
      saveComment(comment, selectedValue);
      commentWindow.remove();
      commentWindow = null;
    }
  });
}

// コメントを保存
function saveComment(comment, useful) {
  const url = window.location.href;
  chrome.storage.local.get(['pageNotes'], (result) => {
    const notes = result.pageNotes || {};
    notes[url] = {
      text: comment,
      useful: useful
    };
    chrome.storage.local.set({ pageNotes: notes });
  });
}

// 検索結果ページでのホバー表示処理
function setupSearchResultsHover() {
  const links = document.querySelectorAll('a');
  
  links.forEach(link => {
    link.addEventListener('mouseenter', async () => {
      const url = link.href;
      const result = await chrome.storage.local.get(['pageNotes']);
      const notes = result.pageNotes || {};
      
      if (notes[url]) {
        showTooltip(link, notes[url].text);
      }
    });
    
    link.addEventListener('mouseleave', () => {
      hideTooltip();
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

function highlightLinksWithComments() {
  const links = document.querySelectorAll("a");

  chrome.storage.local.get(['pageNotes'], (result) => {
    const notes = result.pageNotes || {};
    
    links.forEach(link => {
      const href = link.href;
      if (notes[href]) {
        const noteData = notes[href];
        // 選択結果に応じて色を変更
        const borderColor = noteData.useful === 'yes' ? '#4CAF50' : '#f44336';
        
        // !importantを使用して確実にスタイルを適用
        link.style.cssText = `
          border-bottom: 2px solid ${borderColor} !important;
          text-decoration: none !important;
          display: inline-block;
        `;
      }
    });
  });
}

// スタイルの即時適用のため、MutationObserverを使用
function setupLinkObserver() {
  const observer = new MutationObserver((mutations) => {
    highlightLinksWithComments();
  });

  // 検索結果のコンテナ要素を監視
  const searchResults = document.querySelector('#search') || document.body;
  observer.observe(searchResults, {
    childList: true,
    subtree: true
  });
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openCommentWindow") {
    createCommentWindow();
  }
});

// 初期化処理
document.addEventListener('DOMContentLoaded', () => {
  highlightLinksWithComments();
  setupSearchResultsHover();
  setupLinkObserver();
});

// ページロード完了時にも実行
window.addEventListener('load', () => {
  highlightLinksWithComments();
});