let commentWindow = null;

// コメントウィンドウを作成
function createCommentWindow() {
  if (commentWindow) return;

  const url = window.location.href;

  chrome.storage.local.get(["pageNotes"], async (result) => {
    const notes = result.pageNotes || {};
    const existingNote = notes[url] || {};
    const existingComment = existingNote.text || "";
    const existingUseful = existingNote.useful || "";

    commentWindow = document.createElement("div");
    commentWindow.className = "page-notes-window";
    commentWindow.innerHTML = `
      <div class="page-notes-header">
        <span>メモを残そう！</span>
        <button class="page-notes-close">×</button>
      </div>
      <textarea class="page-notes-textarea">${existingComment}</textarea>
      <div class="page-notes-selection">
        <label class="selection-button yes ${existingUseful === 'yes' ? 'selected' : ''}">
          <input type="radio" name="useful" value="yes" ${existingUseful === 'yes' ? 'checked' : ''}>
          <span class="selection-icon">〇</span> 役立つ
        </label>
        <label class="selection-button no ${existingUseful === 'no' ? 'selected' : ''}">
          <input type="radio" name="useful" value="no" ${existingUseful === 'no' ? 'checked' : ''}>
          <span class="selection-icon">×</span> 役立たない
        </label>
      </div>
      <div class="page-notes-buttons">
        ${
          existingComment
            ? `<button class="page-notes-save page-notes-update">メモ更新</button>`
            : `<button class="page-notes-save page-notes-create">メモ作成</button>`
        }
        ${
          existingComment
            ? `<button class="page-notes-delete">メモ削除</button>`
            : ""
        }
      </div>
    `;

    document.body.appendChild(commentWindow);

    // イベントリスナーの設定
    const closeBtn = commentWindow.querySelector(".page-notes-close");
    const saveBtn = commentWindow.querySelector(".page-notes-save");
    const deleteBtn = commentWindow.querySelector(".page-notes-delete");
    const textarea = commentWindow.querySelector(".page-notes-textarea");
    const radios = commentWindow.querySelectorAll("input[name='useful']");
    const selectionButtons = commentWindow.querySelectorAll(".selection-button");

    // 選択ボタンのスタイル更新
    selectionButtons.forEach(button => {
      const radio = button.querySelector('input[type="radio"]');
      radio.addEventListener('change', () => {
        selectionButtons.forEach(b => b.classList.remove('selected'));
        if (radio.checked) {
          button.classList.add('selected');
        }
      });
    });

    closeBtn.addEventListener("click", () => {
      commentWindow.remove();
      commentWindow = null;
    });

    saveBtn.addEventListener("click", () => {
      const comment = textarea.value;
      const selectedUseful = Array.from(radios).find(radio => radio.checked)?.value;
      if (comment && selectedUseful) {
        saveComment(comment, selectedUseful);
        commentWindow.remove();
        commentWindow = null;
      }
    });

    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        if (confirm("このメモを削除してもよろしいですか？")) {
          deleteComment();
          commentWindow.remove();
          commentWindow = null;
        }
      });
    }
  });
}

// コメントを保存
function saveComment(comment, useful) {
  const url = new URL(window.location.href).toString();
  chrome.storage.local.get(["pageNotes"], (result) => {
    const notes = result.pageNotes || {};
    notes[url] = { 
      text: comment, 
      useful: useful 
    };
    chrome.storage.local.set({ pageNotes: notes }, () => {
      updateLinkStyles();
    });
  });
}

// リンクのスタイルを更新
function updateLinkStyles() {
  chrome.storage.local.get(["pageNotes"], (result) => {
    const notes = result.pageNotes || {};
    const links = document.querySelectorAll("a:has(h3)");
    
    links.forEach(link => {
      // href属性がない場合はスキップ
      if (!link.href) return;
      
      // 完全なURLを取得
      const url = new URL(link.href).toString();
      const noteData = notes[url];
      
      // 既存のスタイルをリセット
      link.classList.remove("useful-yes", "useful-no");
      
      if (noteData && noteData.useful) {
        const className = noteData.useful === "yes" ? "useful-yes" : "useful-no";
        link.classList.add(className);
      }
    });
  });
}

// コメントを削除
function deleteComment() {
  const url = new URL(window.location.href).toString();
  try {
    chrome.storage.local.get(["pageNotes"], (result) => {
      const notes = result.pageNotes || {};
      delete notes[url];
      chrome.storage.local.set({ pageNotes: notes }, () => {
        updateLinkStyles();
        setupSearchResultsHover();
      });
    });
  } catch (error) {
    console.error("Error in deleteComment:", error);
  }
}

// 検索結果ページでのホバー表示処理
function setupSearchResultsHover() {
  const links = document.querySelectorAll("a:has(h3)");

  links.forEach((link) => {
    // href属性がない場合はスキップ
    if (!link.href) return;
    link.addEventListener("mouseenter", async () => {
      try {
        if (!isExtensionContextValid()) {
          return;
        }

        const url = link.href;
        const result = await chrome.storage.local.get(["pageNotes"]);
        const notes = result.pageNotes || {};

        if (notes[url]) {
          showTooltip(link, notes[url]);
        }
      } catch (error) {
        console.error("Error in hover handler:", error);
        hideTooltip();
      }
    });

    link.addEventListener("mouseleave", () => {
      try {
        hideTooltip();
      } catch (error) {
        console.error("Error in mouseleave handler:", error);
      }
    });
  });
}

// ツールチップを表示
function showTooltip(element, noteData) {
  try {
    const tooltip = document.createElement("div");
    tooltip.className = "page-notes-tooltip";
    
    const usefulStatus = noteData.useful === "yes" ? "〇 役立つ" : "× 役立たない";
    tooltip.innerHTML = `
      <div class="tooltip-status ${noteData.useful}">${usefulStatus}</div>
      <div class="tooltip-text">${noteData.text}</div>
    `;

    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + window.scrollY}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;

    document.body.appendChild(tooltip);
  } catch (error) {
    console.error("Error in showTooltip:", error);
  }
}

// ツールチップを非表示
function hideTooltip() {
  try {
    const tooltip = document.querySelector(".page-notes-tooltip");
    if (tooltip) {
      tooltip.remove();
    }
  } catch (error) {
    console.error("Error in hideTooltip:", error);
  }
}

// 拡張機能のコンテキストが有効かチェックする関数
function isExtensionContextValid() {
  try {
    return chrome.runtime.id !== undefined;
  } catch (e) {
    return false;
  }
}

let isConnected = false;

// 拡張機能の準備完了を通知
function notifyReady() {
  isConnected = true;
  chrome.runtime.sendMessage({ action: "contentScriptReady" });
}

// メッセージリスナー
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!isExtensionContextValid()) {
    console.error("Extension context invalid");
    return;
  }

  if (request.action === "openCommentWindow") {
    try {
      createCommentWindow();
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error in openCommentWindow:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true;
});

// 初期化処理
function initialize() {
  if (!isExtensionContextValid()) {
    console.error("Extension context invalid during initialization");
    return;
  }

  try {
    setupSearchResultsHover();
    updateLinkStyles();
    notifyReady();
  } catch (error) {
    console.error("Error during initialization:", error);
  }
}

// ページ読み込み完了時に初期化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}