// 接続が確立されているタブのIDを追跡
let connectedTabs = new Set();

// タブが更新された時の処理
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    connectedTabs.add(tabId);
  }
});

// タブが閉じられた時の処理
chrome.tabs.onRemoved.addListener((tabId) => {
  connectedTabs.delete(tabId);
});

// コマンドリスナー
chrome.commands.onCommand.addListener(async (command) => {
  if (command === "open-comment") {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab) {
        console.error("No active tab found");
        return;
      }

      // タブが接続可能か確認
      if (!connectedTabs.has(tab.id)) {
        console.error("Tab not ready for connection");
        return;
      }

      // メッセージ送信を試みる
      try {
        await chrome.tabs.sendMessage(tab.id, { action: "openCommentWindow" });
      } catch (error) {
        console.error("Failed to send message:", error);
        // エラーが発生した場合、タブをリロード
        if (error.message.includes("Receiving end does not exist")) {
          chrome.tabs.reload(tab.id);
        }
      }
    } catch (error) {
      console.error("Error in command handler:", error);
    }
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openSidePanel") {
    // 現在のウィンドウIDを取得してサイドパネルを開く
    chrome.windows.getCurrent((currentWindow) => {
      chrome.sidePanel.open({ windowId: currentWindow.id });
    });
  }
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});
