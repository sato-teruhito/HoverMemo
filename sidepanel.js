// フィルター状態
let filters = {
  showUsefulYes: true,
  showUsefulNo: true
};

// ドロップダウンの制御
const filterTitle = document.querySelector('.filter-title');
const dropdownContent = document.querySelector('.dropdown-content');

filterTitle.addEventListener('click', () => {
  filterTitle.classList.toggle('open');
  dropdownContent.classList.toggle('show');
});

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

    // エントリーを配列に変換して日付でソート
    const sortedNotes = Object.entries(notes)
      .map(([url, data]) => {
        const noteData = typeof data === "string"
          ? { title: "不明なページ", comment: data, date: "不明な日付", useful: "" }
          : data;
        return { url, ...noteData };
      })
      .sort((a, b) => {
        // "不明な日付" は最後に表示
        if (a.date === "不明な日付") return 1;
        if (b.date === "不明な日付") return -1;
        // 新しい日付が上に来るように降順でソート
        return new Date(b.date) - new Date(a.date);
      });

    for (const noteData of sortedNotes) {
      // フィルター条件のチェック
      if (noteData.useful === "yes" && !filters.showUsefulYes) continue;
      if (noteData.useful === "no" && !filters.showUsefulNo) continue;

      const noteItem = document.createElement("div");
      noteItem.className = "note-item";

      const title = document.createElement("a");
      title.href = noteData.url;
      title.className = "note-title";
      title.textContent = noteData.title || "不明なページ";
      title.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: noteData.url });
      });

      const infoRow = document.createElement("div");
      infoRow.className = "note-info-row";

      const date = document.createElement("div");
      date.className = "note-date";
      date.textContent = `📅 ${noteData.date}`;

      const useful = document.createElement("div");
      useful.className = `note-useful ${noteData.useful === "yes" ? "useful-yes" : "useful-no"}`;
      useful.textContent = noteData.useful === "yes" ? "〇 必要" : "× 不要";

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-btn";
      deleteBtn.textContent = "🗑 削除";
      deleteBtn.addEventListener("click", () => {
        if (confirm(`「${noteData.title}」のメモを削除しますか？`)) {
          delete notes[noteData.url];
          chrome.storage.local.set({ pageNotes: notes }, () => {
            updateNotesList();
          });
        }
      });

      const comment = document.createElement("div");
      comment.className = "note-comment";
      comment.textContent = noteData.comment || "（メモなし）";

      infoRow.appendChild(date);
      infoRow.appendChild(useful);
      infoRow.appendChild(deleteBtn);

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

// ドロップダウン以外の場所をクリックした時にドロップダウンを閉じる
document.addEventListener('click', (e) => {
  const filterSection = document.querySelector('.filter-section');
  if (!filterSection.contains(e.target)) {
    filterTitle.classList.remove('open');
    dropdownContent.classList.remove('show');
  }
});
