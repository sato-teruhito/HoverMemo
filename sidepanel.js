// フィルター状態
let filters = {
<<<<<<< HEAD
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
  
        // 情報行のコンテナを作成
        const infoRow = document.createElement("div");
        infoRow.className = "note-info-row";

        const date = document.createElement("div");
        date.className = "note-date";
        date.textContent = `📅 ${noteData.date || "不明な日付"}`;

        const useful = document.createElement("div");
        useful.className = `note-useful ${noteData.useful === "yes" ? "useful-yes" : "useful-no"}`;
        useful.textContent = noteData.useful === "yes" ? "〇 役立つ" : "× 役立たない";

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

        //コメント部分
        const comment = document.createElement("div");
        comment.className = "note-comment";
        comment.textContent = noteData.comment || "（メモなし）";
  
        // 情報行に要素を追加
        infoRow.appendChild(date);
        infoRow.appendChild(useful);
        infoRow.appendChild(deleteBtn);

        // noteItemに要素を追加
        noteItem.appendChild(title);
        noteItem.appendChild(infoRow);
        noteItem.appendChild(comment);

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
=======
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

      // 情報行のコンテナを作成
      const infoRow = document.createElement("div");
      infoRow.className = "note-info-row";

      const date = document.createElement("div");
      date.className = "note-date";
      date.textContent = `📅 ${noteData.date || "不明な日付"}`;

      const useful = document.createElement("div");
      useful.className = `note-useful ${noteData.useful === "yes" ? "useful-yes" : "useful-no"}`;
      useful.textContent = noteData.useful === "yes" ? "〇 必要" : "× 不要";

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

      //コメント部分
      const comment = document.createElement("div");
      comment.className = "note-comment";
      comment.textContent = noteData.comment || "（メモなし）";

      // 情報行に要素を追加
      infoRow.appendChild(date);
      infoRow.appendChild(useful);
      infoRow.appendChild(deleteBtn);

      // noteItemに要素を追加
      noteItem.appendChild(title);
      noteItem.appendChild(infoRow);
      noteItem.appendChild(comment);

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
>>>>>>> main
