// フィルター状態
let filters = {
    showUsefulYes: true,
    showUsefulNo: true
  };
  
  // フィルターのイベントリスナー
  document.getElementById('filterUsefulYes').addEventListener('change', (e) => {
    filters.showUsefulYes = e.target.checked;
    updateNotesList();
  });
  
  document.getElementById('filterUsefulNo').addEventListener('change', (e) => {
    filters.showUsefulNo = e.target.checked;
    updateNotesList();
  });
  
  function updateNotesList() {
    chrome.storage.local.get(["pageNotes"], (result) => {
      const notes = result.pageNotes || {};
      const notesList = document.getElementById("notesList");
      notesList.innerHTML = "";
  
      for (const [url, data] of Object.entries(notes)) {
        const noteData = typeof data === "string" 
          ? { title: "不明なページ", comment: data, date: "不明な日付", useful: "" }
          : data;
  
        // フィルター条件のチェック
        if (noteData.useful === "yes" && !filters.showUsefulYes) continue;
        if (noteData.useful === "no" && !filters.showUsefulNo) continue;
  
        const noteItem = document.createElement("div");
        noteItem.className = "note-item";
  
        const title = document.createElement("a");
        title.href = url;
        title.className = "note-title";
        title.textContent = noteData.title || "不明なページ";
        title.addEventListener("click", (e) => {
          e.preventDefault();
          chrome.tabs.create({ url: url });
        });
  
        const date = document.createElement("div");
        date.className = "note-date";
        date.textContent = `📅 ${noteData.date || "不明な日付"}`;
  
        const useful = document.createElement("div");
        useful.className = `note-useful ${noteData.useful === "yes" ? "useful-yes" : "useful-no"}`;
        useful.textContent = noteData.useful === "yes" ? "〇 役立つ" : "× 役立たない";
  
        const comment = document.createElement("div");
        comment.className = "note-comment";
        comment.textContent = noteData.comment || "（メモなし）";
  
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "🗑 削除";
        deleteBtn.addEventListener("click", () => {
          if (confirm(`「${noteData.title}」のメモを削除しますか？`)) {
            delete notes[url];
            chrome.storage.local.set({ pageNotes: notes }, () => {
              updateNotesList();
            });
          }
        });
  
        noteItem.appendChild(title);
        noteItem.appendChild(date);
        noteItem.appendChild(useful);
        noteItem.appendChild(comment);
        noteItem.appendChild(deleteBtn);
        notesList.appendChild(noteItem);
      }
    });
  }
  
  // 初期表示時にメモ一覧を更新
  updateNotesList();
  
  // ストレージの変更を監視
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.pageNotes) {
      updateNotesList();
    }
  });