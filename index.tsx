
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    try {
      // 使用 URL 建構子確保 Service Worker 路徑與目前頁面的 Origin 完全一致
      // 這可以修復在某些預覽環境下報出的 'origin of provided scriptURL does not match' 錯誤
      const swUrl = new URL('./sw.js', window.location.href).href;
      
      navigator.serviceWorker.register(swUrl).then(registration => {
        console.log('SW registered');
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker == null) return;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New content found; please refresh.');
                // 若要強制更新，可取消註解下行：
                // window.location.reload();
              }
            }
          };
        };
      }).catch(error => {
        console.error('SW registration failed:', error);
      });
    } catch (e) {
      console.error('SW URL construction failed:', e);
    }
  });
}
