const express = require('express');
const path = require('path');
const app = express();

app.use(express.static(path.join(__dirname, 'frontend'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.listen(3000, () => {
  console.log('Frontend server running on http://localhost:3000');
});
