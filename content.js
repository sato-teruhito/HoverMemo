    let commentWindow = null;

    // コメントウィンドウを作成
    function createCommentWindow() {
      if (commentWindow) return;
    
      // kei追加箇所(既存のコメントを取得するためのプロセス)この行から，196行目（コメント削除）まで．
      const url = window.location.href;
    
      chrome.storage.local.get(["pageNotes"], async (result) => {
        const notes = result.pageNotes || {};
        const existingComment = notes[url] || "";
    
        commentWindow = document.createElement("div");
        commentWindow.className = "page-notes-window";
        commentWindow.innerHTML = `
              <div class="page-notes-header">
                <span>メモを残そう！</span>
                <button class="page-notes-close">×</button>
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
    
    // コメントを保存
    function saveComment(comment) {
      const url = window.location.href;
      chrome.storage.local.get(["pageNotes"], (result) => {
        const notes = result.pageNotes || {};
        notes[url] = comment;
        chrome.storage.local.set({ pageNotes: notes });
      });
    }
    
    // コメントを削除
    function deleteComment() {
      const url = window.location.href;
      try {
        chrome.storage.local.get(["pageNotes"], (result) => {
          const notes = result.pageNotes || {};
          delete notes[url];
          chrome.storage.local.set({ pageNotes: notes }, () => {
            // 削除完了後の処理（必要に応じて）
            setupSearchResultsHover();
          });
        });
      } catch (error) {
        console.error("Error in deleteComment:", error);
      }
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
    
            if (notes[url]) {
              showTooltip(link, notes[url]);
            }
          } catch (error) {
            // エラーをログに記録するが、ユーザーエクスペリエンスは中断しない
            console.error("Error in hover handler:", error);
            hideTooltip(); // エラー時は既存のツールチップを非表示に
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
    