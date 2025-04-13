let commentWindow = null;
let sideMenuWindow = null;
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

// コメントウィンドウを作成
function createCommentWindow() {
  if (commentWindow) return;

  const url = window.location.href;

  chrome.storage.local.get(["pageNotes"], async (result) => {
    const notes = result.pageNotes || {};
    const existingNote = notes[url] || {};

    // commentプロパティがある場合はそれを使用、オブジェクトでない場合は直接値を使用
    const existingComment =
      typeof existingNote === "object"
        ? existingNote.comment || ""
        : existingNote || "";
    const existingUseful = existingNote.useful || "";

    commentWindow = document.createElement("div");
    commentWindow.className = "page-notes-window";
    commentWindow.innerHTML = `
      <div class="page-notes-header">
        <span>PopUpMemoPad</span>
        <div class="header-buttons">
          <button class="page-notes-menu">メモ一覧</button>
          <button class="page-notes-close">×</button>
        </div>
      </div>
      <textarea class="page-notes-textarea">${existingComment}</textarea>
      <div class="page-notes-selection">
        <label class="selection-button yes ${
          existingUseful === "yes" ? "selected" : ""
        }">
          <input type="radio" name="useful" value="yes" ${
            existingUseful === "yes" ? "checked" : ""
          }>
          <span class="selection-icon">〇</span> 必要
        </label>
        <label class="selection-button no ${
          existingUseful === "no" ? "selected" : ""
        }">
          <input type="radio" name="useful" value="no" ${
            existingUseful === "no" ? "checked" : ""
          }>
          <span class="selection-icon">×</span> 不要
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

    // ウィンドウを中央に配置
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const boxWidth = commentWindow.offsetWidth;
    const boxHeight = commentWindow.offsetHeight;

    const centerX = (windowWidth - boxWidth) / 2;
    const centerY = (windowHeight - boxHeight) / 2;

    setTranslate(centerX, centerY);

    // イベントリスナーの設定
    const closeBtn = commentWindow.querySelector(".page-notes-close");
    const saveBtn = commentWindow.querySelector(".page-notes-save");
    const deleteBtn = commentWindow.querySelector(".page-notes-delete");
    const textarea = commentWindow.querySelector(".page-notes-textarea");
    const radios = commentWindow.querySelectorAll("input[name='useful']");
    const selectionButtons =
      commentWindow.querySelectorAll(".selection-button");
    const openMenuBtn = commentWindow.querySelector(".page-notes-menu");

    // ドラッグ機能の初期化
    initDraggable();

    openMenuBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "openSidePanel" });
    });

    closeBtn.addEventListener("click", () => {
      cleanupDraggable();
      commentWindow.remove();
      commentWindow = null;
    });

    // 選択ボタンのスタイル更新
    selectionButtons.forEach((button) => {
      const radio = button.querySelector('input[type="radio"]');
      radio.addEventListener("change", () => {
        selectionButtons.forEach((b) => b.classList.remove("selected"));
        if (radio.checked) {
          button.classList.add("selected");
        }
      });
    });

    saveBtn.addEventListener("click", () => {
      const comment = textarea.value;
      const selectedUseful = Array.from(radios).find(
        (radio) => radio.checked
      )?.value;
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

    // テキストエリアにフォーカスを当てる
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = textarea.value.length;
    }, 0);
  });
}

// コメントを保存
function saveComment(comment, useful) {
  const url = window.location.href;
  const title = document.title;
  const date = new Date().toLocaleString();

  chrome.storage.local.get(["pageNotes"], (result) => {
    const notes = result.pageNotes || {};
    notes[url] = { title, comment, date, useful };

    chrome.storage.local.set({ pageNotes: notes }, () => {
      updateLinkStyles();
    });
  });
}

// コメントを削除
function deleteComment(specificUrl) {
  const url = specificUrl || window.location.href;

  chrome.storage.local.get(["pageNotes"], (result) => {
    const notes = result.pageNotes || {};
    delete notes[url];

    chrome.storage.local.set({ pageNotes: notes }, () => {
      updateLinkStyles();
    });
  });
}

// リンクのスタイルを更新
function updateLinkStyles() {
  chrome.storage.local.get(["pageNotes"], (result) => {
    const notes = result.pageNotes || {};
    let links = [];

    if (location.hostname.includes("google.com")) {
      // Google 通常検索
      links = Array.from(document.querySelectorAll("a:has(h3)"));
    }
  
    if (location.hostname.includes("scholar.google.com")) {
      // Google Scholar
      links = Array.from(document.querySelectorAll("h3.gs_rt a"));
    }
  

    links.forEach((link) => {
      if (!link.href) return;

      const url = new URL(link.href).toString();
      const noteData = notes[url];

      link.classList.remove("useful-yes", "useful-no");

      if (noteData && noteData.useful) {
        const className =
          noteData.useful === "yes" ? "useful-yes" : "useful-no";
        link.classList.add(className);
      }
    });
  });
}

window.addEventListener("pageshow", () => {
  updateLinkStyles();
});

// ツールチップ関連の関数
function showTooltip(element, noteData) {
  try {
    const tooltip = document.createElement("div");
    tooltip.className = "page-notes-tooltip";

    // noteDataがオブジェクトで、commentプロパティがある場合はそれを使用
    // そうでない場合は、noteDataがテキストとして扱われる
    const text = typeof noteData === "object" ? noteData.comment : noteData;

    let tooltipContent = `<div class="tooltip-text">${text}</div>`;

    // usefulプロパティが存在する場合は、ステータスも表示
    if (noteData.useful) {
      const usefulStatus =
        noteData.useful === "yes" ? "〇 必要" : "× 不要";
      tooltipContent = `
        <div class="tooltip-status ${noteData.useful}">${usefulStatus}</div>
        ${tooltipContent}
      `;
    }

    tooltip.innerHTML = tooltipContent;

    const rect = element.getBoundingClientRect();
    tooltip.style.top = `${rect.bottom + window.scrollY}px`;
    tooltip.style.left = `${rect.left + window.scrollX}px`;

    document.body.appendChild(tooltip);
  } catch (error) {
    console.error("Error in showTooltip:", error);
  }
}

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

// ドラッグ機能関連の関数
function initDraggable() {
  const header = commentWindow.querySelector(".page-notes-header");
  header.style.cursor = "move";

  header.addEventListener("mousedown", dragStart);
  document.addEventListener("mousemove", drag);
  document.addEventListener("mouseup", dragEnd);
}

function cleanupDraggable() {
  document.removeEventListener("mousemove", drag);
  document.removeEventListener("mouseup", dragEnd);
  isDragging = false;
}

function dragStart(e) {
  if (!commentWindow) return;

  const windowRect = commentWindow.getBoundingClientRect();
  initialX = e.clientX - windowRect.left;
  initialY = e.clientY - windowRect.top;

  if (
    e.target.closest(".page-notes-header") &&
    !e.target.closest(".page-notes-close")
  ) {
    isDragging = true;
    commentWindow.classList.add("dragging");
  }
}

function drag(e) {
  if (!isDragging || !commentWindow) return;
  e.preventDefault();

  const newX = e.clientX - initialX;
  const newY = e.clientY - initialY;

  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const boxWidth = commentWindow.offsetWidth;
  const boxHeight = commentWindow.offsetHeight;

  const x = Math.min(Math.max(0, newX), windowWidth - boxWidth);
  const y = Math.min(Math.max(0, newY), windowHeight - boxHeight);

  setTranslate(x, y);
}

function dragEnd() {
  if (!commentWindow) return;

  initialX = currentX;
  initialY = currentY;
  isDragging = false;
  commentWindow.classList.remove("dragging");
}

function setTranslate(x, y) {
  if (!commentWindow) return;

  currentX = x;
  currentY = y;
  commentWindow.style.transform = `translate(${x}px, ${y}px)`;
}

// 検索結果ページでのホバー表示処理
function setupSearchResultsHover() {
  let links = [];

    if (location.hostname.includes("google.com")) {
      // Google 通常検索
      links = Array.from(document.querySelectorAll("a:has(h3)"));
    }
  
    if (location.hostname.includes("scholar.google.com")) {
      // Google Scholar
      links = Array.from(document.querySelectorAll("h3.gs_rt a"));
    }

  links.forEach((link) => {
    if (!link.href) return;

    link.addEventListener("mouseenter", async () => {
      try {
        if (!isExtensionContextValid()) return;

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

// 拡張機能の初期化と設定
let isConnected = false;

function notifyReady() {
  isConnected = true;
  chrome.runtime.sendMessage({ action: "contentScriptReady" });
}

function isExtensionContextValid() {
  try {
    return chrome.runtime.id !== undefined;
  } catch (e) {
    return false;
  }
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