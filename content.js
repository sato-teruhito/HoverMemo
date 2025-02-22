// content.js

/*window.addEventListener("load", () => {
    const currentURL = window.location.href;
  
    // 遷移先ページならコメント表示用ポップアップを出す
    if (!isSearchResultsPage(currentURL)) {
      chrome.storage.local.get([currentURL], (result) => {
        if (result[currentURL]) {
          showTooltip(result[currentURL], currentURL);
        }
      });
    } else {
      // 検索結果ページならリンクを走査してコメント表示
      highlightLinksWithComments();
    }
  });
  
  function isSearchResultsPage(url) {
    return url.includes("google.com/search") || url.includes("bing.com/search");
  }
  
  function showTooltip(note, url) {
    const tooltip = document.createElement("div");
    tooltip.innerText = note;
    tooltip.style.position = "fixed";
    tooltip.style.bottom = "20px";
    tooltip.style.right = "20px";
    tooltip.style.backgroundColor = "#f9f9f9";
    tooltip.style.border = "1px solid #ccc";
    tooltip.style.padding = "10px";
    tooltip.style.borderRadius = "5px";
    tooltip.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.2)";
    tooltip.style.zIndex = "10000";
  
    const editButton = document.createElement("button");
    editButton.innerText = "編集";
    editButton.style.marginRight = "5px";
    editButton.onclick = () => editNote(url, note);
  
    const deleteButton = document.createElement("button");
    deleteButton.innerText = "削除";
    deleteButton.onclick = () => deleteNote(url, tooltip);
  
    tooltip.appendChild(document.createElement("br"));
    tooltip.appendChild(editButton);
    tooltip.appendChild(deleteButton);
  
    document.body.appendChild(tooltip);
  }
  
  function editNote(url, currentNote) {
    const newNote = prompt("新しいコメントを入力してください:", currentNote);
    if (newNote !== null) {
      chrome.storage.local.set({ [url]: newNote }, () => {
        alert("コメントを更新しました！");
        location.reload();
      });
    }
  }
  
  function deleteNote(url, tooltip) {
    if (confirm("このコメントを削除しますか？")) {
      chrome.storage.local.remove(url, () => {
        alert("コメントを削除しました。");
        tooltip.remove();
      });
    }
  }
  
  function highlightLinksWithComments() {
    const links = document.querySelectorAll("a");
  
    chrome.storage.local.get(null, (storedNotes) => {
      links.forEach(link => {
        const href = link.href;
        if (storedNotes[href]) {
          link.style.borderBottom = "2px dashed orange";
          link.addEventListener("mouseenter", () => showHoverNote(link, storedNotes[href]));
          link.addEventListener("mouseleave", hideHoverNote);
        }
      });
    });
  }
  
  function showHoverNote(link, note) {
    const hoverNote = document.createElement("div");
    hoverNote.className = "hover-note";
    hoverNote.innerText = note;
    hoverNote.style.position = "absolute";
    hoverNote.style.backgroundColor = "#fff8dc";
    hoverNote.style.border = "1px solid #ccc";
    hoverNote.style.padding = "5px";
    hoverNote.style.borderRadius = "5px";
    hoverNote.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.2)";
    hoverNote.style.zIndex = "10000";
  
    link.appendChild(hoverNote);
  }
  
  function hideHoverNote() {
    const note = document.querySelector(".hover-note");
    if (note) note.remove();
  } */
  
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
    
      // イベントリスナーの設定
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
    
    // 検索結果ページでのホバー表示処理
    function setupSearchResultsHover() {
      const links = document.querySelectorAll('a');
      
      links.forEach(link => {
        link.addEventListener('mouseenter', async () => {
          const url = link.href;
          const result = await chrome.storage.local.get(['pageNotes']);
          const notes = result.pageNotes || {};
          
          if (notes[url]) {
            showTooltip(link, notes[url]);
          }
        });
        
        link.addEventListener('mouseleave', () => {
          hideTooltip();
        });
      });
    }
    
    // ツールチップを表示sssss
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
    
    // 検索結果ページでのホバー機能を初期化
    setupSearchResultsHover();
        