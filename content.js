let commentWindow = null;

// コメントを保存
function saveComment(comment, useful) {
  const url = window.location.href;
  chrome.storage.local.get(['pageNotes'], (result) => {
    const notes = result.pageNotes || {};
    notes[url] = {
      text: comment,
      useful: useful,
      timestamp: Date.now()
    };
    chrome.storage.local.set({ pageNotes: notes }, () => {
      // 保存後に再度ハイライトを適用
      highlightLinksWithComments();
    });
  });
}

// ツールチップを表示
function showTooltip(element, text) {
  hideTooltip(); // 既存のツールチップを削除
  
  const tooltip = document.createElement('div');
  tooltip.className = 'page-notes-tooltip';
  tooltip.textContent = text;
  
  const rect = element.getBoundingClientRect();
  tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`; // 少し下にずらす
  tooltip.style.left = `${rect.left + window.scrollX}px`;
  
  document.body.appendChild(tooltip);
}

// ツールチップを非表示
function hideTooltip() {
  const tooltips = document.querySelectorAll('.page-notes-tooltip');
  tooltips.forEach(tooltip => tooltip.remove());
}

// リンクのハイライトとホバーイベントを設定
function setupLinkBehavior() {
  const links = document.querySelectorAll('a');
  
  chrome.storage.local.get(['pageNotes'], (result) => {
    const notes = result.pageNotes || {};
    
    links.forEach(link => {
      const href = link.href;
      if (notes[href]) {
        const noteData = notes[href];
        const borderColor = noteData.useful === 'yes' ? '#4CAF50' : '#f44336';
        
        // スタイルの適用
        link.style.cssText = `
          border-bottom: 2px solid ${borderColor} !important;
          text-decoration: none !important;
          display: inline-block;
        `;
        
        // ホバーイベントの設定
        link.addEventListener('mouseenter', () => {
          showTooltip(link, noteData.text);
        });
        
        link.addEventListener('mouseleave', () => {
          hideTooltip();
        });
      }
    });
  });
}

// リンクの監視を設定
function setupLinkObserver() {
  const observer = new MutationObserver((mutations) => {
    setupLinkBehavior();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

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
    <textarea class="page-notes-textarea" placeholder="コメントを入力してください"></textarea>
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

  // 既存のコメントがあれば読み込む
  chrome.storage.local.get(['pageNotes'], (result) => {
    const notes = result.pageNotes || {};
    const currentUrl = window.location.href;
    if (notes[currentUrl]) {
      textarea.value = notes[currentUrl].text;
      const useful = notes[currentUrl].useful;
      const radio = commentWindow.querySelector(`input[value="${useful}"]`);
      if (radio) {
        radio.checked = true;
        radio.closest('.selection-button').classList.add('selected');
      }
    }
  });

  // ラジオボタンの選択状態を視覚的に表示
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.selection-button').forEach(btn => {
        btn.classList.remove('selected');
      });
      radio.closest('.selection-button').classList.add('selected');
    });
  });

  closeBtn.addEventListener('click', () => {
    commentWindow.remove();
    commentWindow = null;
  });

  saveBtn.addEventListener('click', () => {
    const comment = textarea.value.trim();
    const selectedValue = Array.from(radios).find(radio => radio.checked)?.value;
    
    if (comment && selectedValue) {
      saveComment(comment, selectedValue);
      commentWindow.remove();
      commentWindow = null;
    } else {
      alert('コメントと評価を入力してください');
    }
  });
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openCommentWindow") {
    createCommentWindow();
  }
});

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  setupLinkBehavior();
  setupLinkObserver();
});

// ページロード完了時にも実行
window.addEventListener('load', () => {
  setupLinkBehavior();
});

// デバッグ用：保存されているデータを確認
chrome.storage.local.get(['pageNotes'], (result) => {
  console.log('Stored Notes:', result.pageNotes);
});