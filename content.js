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
      <textarea class="page-notes-textarea" placeholder="ここにメモを入力...">${existingComment}</textarea>
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

function getSearchResultLinks() {
  let links = [];

  const host = location.hostname;

  if (host === "www.google.com" || host === "www.google.co.jp") {
    // Google 通常検索
    links = Array.from(document.querySelectorAll("a:has(h3)"));
  } else if (host === "scholar.google.com" || host === "scholar.google.co.jp") {
    // Google Scholar
    links = Array.from(document.querySelectorAll("h3.gs_rt a"));
  } else if (host === "search.yahoo.com" || host === "search.yahoo.co.jp") {
    // Yahoo! Japan
    links = Array.from(document.querySelectorAll(".sw-Card__title a"));
  } else if (host == "bing.com" || host === "bing.co.jp") {
    // Bing
    links = Array.from(document.querySelectorAll("a.b_ads1line"));
  } else if (host === "zenn.dev") {
    // Zenn 記事ページ・トップなど
    links = Array.from(document.querySelectorAll("a.ArticleList_link__4Igs4"));
  } else if (host === "qiita.com") {
    // Qiita 記事一覧
    links = Array.from(document.querySelectorAll("h2.style-1ws5e6r a, h3.style-1eiv6gj a"));
  }

  return links;
}

// リンクのスタイルを更新
function updateLinkStyles() {
  chrome.storage.local.get(["pageNotes"], (result) => {
    const notes = result.pageNotes || {};
    const links = getSearchResultLinks();

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
      const usefulStatus = noteData.useful === "yes" ? "〇 必要" : "× 不要";
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
  const links = getSearchResultLinks();

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateLinkStyles") {
    try {
      updateLinkStyles();
      setupSearchResultsHover();
      if (sendResponse) sendResponse({ success: true });
    } catch (error) {
      console.error("Error updating link styles:", error);
      if (sendResponse) sendResponse({ success: false, error: error.message });
    }
  }
  return true; // 非同期レスポンスのために true を返す
});

// SPAサイト対応：ページの変更を検出するためのMutationObserver
let mutationObserver = null;
let historyStateWatcherSetup = false;

// SPAサイト対応のためのコード初期化
function initSPASupport() {
  try {
    // 既に初期化済みの場合は何もしない
    if (mutationObserver) return;
    
    // 現在のサイトがZennかどうか確認
    const currentHost = window.location.hostname;
    const isZennSite = currentHost === 'zenn.dev';
    
    // Zenn以外のサイトの場合は初期化しない
    if (!isZennSite) {
      console.log("現在のサイトはZennではないため、SPA対応機能を無効化します。");
      return;
    }
    
    console.log("Zenn向けのSPA対応機能を初期化しています...");
    
    // DOM変更の監視を設定
    setupMutationObserver();
    
    // History API（戻る・進むボタン対応など）の監視を設定
    setupHistoryStateWatcher();
  } catch (error) {
    console.error("SPA対応初期化中にエラーが発生しました:", error);
  }
}

// DOM変更を監視するMutationObserverの設定
function setupMutationObserver() {
  try {
    // 既存のObserverをクリーンアップ
    if (mutationObserver) {
      mutationObserver.disconnect();
    }
    
    // 新しいObserverを作成
    mutationObserver = new MutationObserver(
      debounce((mutations) => {
        try {
          // Zennの記事一覧や記事ページが更新された可能性がある
          console.log("Zennページの変更を検出しました - リンクスタイルを更新します");
          
          // リンクスタイルとホバー機能を更新
          updateLinkStyles();
          setupSearchResultsHover();
        } catch (error) {
          console.error("MutationObserverのコールバック中にエラーが発生しました:", error);
        }
      }, 800)  // デバウンス時間を調整
    );
    
    // Zennのメインコンテンツエリアを監視
    const zennContentContainers = document.querySelectorAll('.container, main, .ArticleList');
    
    if (zennContentContainers.length > 0) {
      zennContentContainers.forEach(container => {
        mutationObserver.observe(container, {
          childList: true,
          subtree: true
        });
      });
      console.log("Zennのコンテンツエリアの監視を開始しました");
    } else {
      // 特定のコンテナが見つからない場合はbody全体を監視
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
      console.log("Zennの特定コンテナが見つからないため、body全体の監視を開始しました");
    }
  } catch (error) {
    console.error("MutationObserverの設定中にエラーが発生しました:", error);
  }
}

// 安全にHistory APIを拡張する関数
function safelyWrapHistoryMethod(originalMethod, methodName) {
  return function() {
    try {
      // 元の関数を呼び出す
      originalMethod.apply(this, arguments);
      
      // Zennサイトの場合のみ処理を実行
      if (window.location.hostname === 'zenn.dev') {
        console.log(`Zennでの${methodName}検出 - リンクスタイルを更新します`);
        setTimeout(() => {
          try {
            updateLinkStyles();
            setupSearchResultsHover();
          } catch (error) {
            console.error(`${methodName}後の更新処理中にエラーが発生しました:`, error);
          }
        }, 300);
      }
    } catch (error) {
      console.error(`History APIの${methodName}実行中にエラーが発生しました:`, error);
      // エラーが発生した場合でも元の関数を実行
      try {
        originalMethod.apply(this, arguments);
      } catch (e) {
        console.error(`元の${methodName}実行時にもエラーが発生しました:`, e);
      }
    }
  };
}

// History API変更を検知する関数
function setupHistoryStateWatcher() {
  try {
    // 既に設定済みの場合は何もしない
    if (historyStateWatcherSetup) return;
    
    // 元のHistory APIメソッドを保存
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    // 安全にラップしたメソッドを設定
    history.pushState = safelyWrapHistoryMethod(originalPushState, 'pushState');
    history.replaceState = safelyWrapHistoryMethod(originalReplaceState, 'replaceState');
    
    // popstateイベントのリスナー設定（ブラウザの戻る・進むボタン対応）
    window.addEventListener('popstate', () => {
      try {
        // Zennサイトの場合のみ処理を実行
        if (window.location.hostname === 'zenn.dev') {
          console.log("Zennでのpopstate検出 - リンクスタイルを更新します");
          setTimeout(() => {
            updateLinkStyles();
            setupSearchResultsHover();
          }, 300);
        }
      } catch (error) {
        console.error("popstateイベント処理中にエラーが発生しました:", error);
      }
    });
    
    historyStateWatcherSetup = true;
  } catch (error) {
    console.error("History API監視の設定中にエラーが発生しました:", error);
  }
}

// 連続実行を防止するデバウンス関数
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      try {
        func.apply(context, args);
      } catch (error) {
        console.error("デバウンス関数の実行中にエラーが発生しました:", error);
      }
    }, wait);
  };
}

// 既存の初期化関数を拡張（エラーハンドリング追加）
const originalInitialize = initialize;
initialize = function() {
  try {
    // 既存の初期化処理を実行
    if (typeof originalInitialize === 'function') {
      originalInitialize();
    }
    
    // SPA対応の初期化を追加
    initSPASupport();
  } catch (error) {
    console.error("初期化処理中にエラーが発生しました:", error);
  }
};

// 既存のページが既に読み込まれている場合にも初期化を実行
if (document.readyState !== "loading") {
  try {
    initSPASupport();
  } catch (error) {
    console.error("SPA対応の初期化中にエラーが発生しました:", error);
  }
}