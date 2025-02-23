let commentWindow = null;
let sideMenuWindow = null; // サイドメニューウィンドウ

// コメントウィンドウを作成
function createCommentWindow() {
  if (commentWindow) return;

  const url = window.location.href;

  chrome.storage.local.get(["pageNotes"], async (result) => {
    const notes = result.pageNotes || {};
    const existingNote = notes[url] || "";
    
    // もし `notes[url]` がオブジェクトなら `comment` のみ取得
    const existingComment = typeof existingNote === "object" && existingNote.comment ? existingNote.comment : existingNote;

    commentWindow = document.createElement("div");
    commentWindow.className = "page-notes-window";
    commentWindow.innerHTML = `
          <div class="page-notes-header">
            <span>メモを残そう！</span>
            <button class="page-notes-close">×</button>
            <button class="page-notes-menu">☰</button> <!-- サイドメニューボタン追加 -->
          </div>
          <textarea class="page-notes-textarea">${existingComment}</textarea>
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
    const openMenuBtn = commentWindow.querySelector(".page-notes-menu");

    openMenuBtn.addEventListener("click", () => {
      createSideMenuWindow(); // サイドメニューウィンドウを開く
    });

    closeBtn.addEventListener("click", () => {
      commentWindow.remove();
      commentWindow = null;
    });

    saveBtn.addEventListener("click", () => {
      const comment = textarea.value;
      if (comment) {
        saveComment(comment);
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


// サイドメニューウィンドウを作成
function createSideMenuWindow() {
  if (sideMenuWindow) return;

  sideMenuWindow = document.createElement("div");
  sideMenuWindow.className = "side-menu-window";
  sideMenuWindow.innerHTML = `
        <div class="side-menu-header">
          <span>保存されたメモ一覧</span>
          <button class="side-menu-close">×</button>
        </div>
        <div class="side-menu-content">
          <ul id="notesList"></ul> <!-- メモ一覧を表示する場所 -->
        </div>
      `;

  document.body.appendChild(sideMenuWindow);

  // 閉じるボタンのイベントリスナー
  const closeMenuBtn = sideMenuWindow.querySelector(".side-menu-close");

  closeMenuBtn.addEventListener("click", () => {
    sideMenuWindow.remove();
    sideMenuWindow = null;
  });

  updateNotesList(); // メモ一覧を更新
}

// メモ一覧を更新する関数（サイト名クリックでジャンプ & 日付 & 削除ボタン）
function updateNotesList() {
  if (!sideMenuWindow) return;

  chrome.storage.local.get(["pageNotes"], (result) => {
    const notes = result.pageNotes || {};
    const notesList = sideMenuWindow.querySelector("#notesList");

    notesList.innerHTML = ""; // 一度リストをクリア

    for (const [url, data] of Object.entries(notes)) {
      if (typeof data === "string") {
        // 古いデータ形式（単なる文字列のコメント）の場合、オブジェクトに変換
        data = { title: "不明なページ", comment: data, date: "不明な日付" };
      }

      const listItem = document.createElement("li");
      listItem.style.marginBottom = "10px"; // 各メモの間隔を少し空ける

      // サイト名（クリックでジャンプ）
      const link = document.createElement("a");
      link.href = url;
      link.textContent = data.title || "不明なページ";
      link.target = "_blank"; // 新しいタブで開く
      link.style.color = "blue";
      link.style.textDecoration = "underline";
      link.style.cursor = "pointer";
      link.style.display = "block"; // 1行で表示

      // 日付
      const date = document.createElement("span");
      date.textContent = `📅 ${data.date || "不明な日付"}`;
      date.style.display = "block"; // 1行で表示

      // コメント
      const comment = document.createElement("span");
      comment.textContent = `📝 ${data.comment || "（メモなし）"}`;
      comment.style.display = "block"; // 1行で表示

      // 削除ボタン
      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "🗑 削除";
      deleteBtn.style.background = "red";
      deleteBtn.style.color = "white";
      deleteBtn.style.border = "none";
      deleteBtn.style.padding = "5px 10px";
      deleteBtn.style.cursor = "pointer";
      deleteBtn.style.marginTop = "5px"; // ボタンの上に少し間隔
      deleteBtn.style.display = "block"; // 1行で表示

      deleteBtn.addEventListener("click", () => {
        if (confirm(`「${data.title}」のメモを削除しますか？`)) {
          deleteComment(url);
        }
      });

      // 要素を追加（連続の行で表示）
      listItem.appendChild(link);
      listItem.appendChild(date);
      listItem.appendChild(comment);
      listItem.appendChild(deleteBtn);

      notesList.appendChild(listItem);
    }

    console.log("📜 現在の全メモ:", notes);
  });
}

// コメントを保存（サイト名・日付も一緒に保存）
function saveComment(comment) {
  const url = window.location.href;
  const title = document.title; // 現在のページのタイトルを取得
  const date = new Date().toLocaleString(); // 現在の日付と時刻を取得

  chrome.storage.local.get(["pageNotes"], (result) => {
    const notes = result.pageNotes || {};
    notes[url] = { title, comment, date }; // サイト名・コメント・日付を保存

    chrome.storage.local.set({ pageNotes: notes }, () => {
      console.log("📜 メモを保存しました:", notes);
      updateNotesList(); // メモ一覧を更新
    });
  });
}

// コメントを削除（URL指定で削除）
function deleteComment(url) {
  chrome.storage.local.get(["pageNotes"], (result) => {
    const notes = result.pageNotes || {};
    delete notes[url];

    chrome.storage.local.set({ pageNotes: notes }, () => {
      console.log("🗑 メモを削除しました:", notes);
      updateNotesList(); // メモ一覧を更新
    });
  });
}

// URLからページタイトルを取得する関数
function fetchTitle(url) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["pageNotes"], (result) => {
      const notes = result.pageNotes || {};
      if (notes[url] && notes[url].title) {
        resolve(notes[url].title); // 保存されているタイトルを返す
      } else {
        resolve("不明なページ"); // タイトルがない場合のデフォルト
      }
    });
  });
}

// 検索結果ページでのホバー表示処理
function setupSearchResultsHover() {
  const links = document.querySelectorAll("a");

  links.forEach((link) => {
    link.addEventListener("mouseenter", async () => {
      try {
        // 拡張機能のコンテキストをチェック
        if (!isExtensionContextValid()) {
          return;
        }

        const url = link.href;
        const result = await chrome.storage.local.get(["pageNotes"]);
        const notes = result.pageNotes || {};

        // `notes[url]` がオブジェクトなら `comment` のみ取得
        if (notes[url]) {
          const noteData = notes[url];
          const noteText = typeof noteData === "object" && noteData.comment ? noteData.comment : noteData;

          showTooltip(link, noteText);
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


    
    // 拡張機能のコンテキストが有効かチェックする関数
    function isExtensionContextValid() {
      try {
        return chrome.runtime.id !== undefined;
      } catch (e) {
        return false;
      }
    }
    
    // ツールチップを表示　ああああああ
    function showTooltip(element, text) {
      try {
        const tooltip = document.createElement("div");
        tooltip.className = "page-notes-tooltip";
        tooltip.textContent = text;
    
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
    
    let isConnected = false;
    
    // 拡張機能の準備完了を通知
    function notifyReady() {
      isConnected = true;
      chrome.runtime.sendMessage({ action: "contentScriptReady" });
    }
    
    // 拡張機能のコンテキストが有効かチェック
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
      return true; // 非同期レスポンスのために必要
    });
    
    // 初期化処理
    function initialize() {
      if (!isExtensionContextValid()) {
        console.error("Extension context invalid during initialization");
        return;
      }
    
      try {
        setupSearchResultsHover();
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
    
    // 検索結果ページでのホバー機能を初期化
    setupSearchResultsHover();
    