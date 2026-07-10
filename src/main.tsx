import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // 確保這行路徑正確對應到 src/App.jsx

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);