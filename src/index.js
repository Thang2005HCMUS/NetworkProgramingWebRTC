const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.status(200).send('Chào bạn! Server ExpressJS đã chạy thành công.');
});

// Chỉ lắng nghe port nếu file này được chạy trực tiếp (không phải khi đang test)
if (require.main === module) {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server đang lắng nghe tại http://localhost:${PORT}`);
  });
}

module.exports = app; // Export app để dùng trong file test