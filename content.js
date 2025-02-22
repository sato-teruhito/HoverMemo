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
      <label>
        <input type="radio" name="useful" value="yes"> 〇
      </label>
      <label>
        <input type="radio" name="useful" value="no"> ×
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

  chrome.storage.local.get(null, (storedNotes) => {
    links.forEach(link => {
      const href = link.href;
      if (storedNotes[href]) {
        const noteData = storedNotes[href];
        // 選択結果に応じて色を変更
        const borderColor = noteData.useful === 'yes' ? 'green' : 'red';
        link.style.borderBottom = `2px solid ${borderColor}`; 
        link.style.textDecoration = "none";
        link.style.display = "inline-block";
      }
    });
  });
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openCommentWindow") {
    createCommentWindow();
  }
});

highlightLinksWithComments();
// 検索結果ページでのホバー機能を初期化
setupSearchResultsHover();