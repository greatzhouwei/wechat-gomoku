Page({
  data: {
    boardSize: 15,    // 棋盘大小 15x15
    pieceSize: 12,    // 棋子大小改小一些
    currentPlayer: 1, // 1: 黑棋, 2: 白棋
    gameOver: false,
    board: [],         // 存储棋盘状态
    winner: ''        // 添加winner状态
  },

  onLoad() {
    this.initGame();
  },

  onReady() {
    // 获取canvas上下文
    const query = wx.createSelectorQuery();
    query.select('#chess')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].node) {
          console.error('Failed to get canvas node');
          return;
        }
        
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        // 获取屏幕信息
        const systemInfo = wx.getSystemInfoSync();
        const screenWidth = systemInfo.windowWidth;
        const screenHeight = systemInfo.windowHeight;
        const dpr = systemInfo.pixelRatio;
        
        // 计算可用空间，预留底部按钮的空间
        const availableHeight = screenHeight - 120; // 预留底部120rpx的空间
        
        // 使用较大的值作为画布大小
        const canvasSize = Math.min(availableHeight, screenWidth);
        
        // 设置canvas大小
        canvas.width = canvasSize * dpr;
        canvas.height = canvasSize * dpr;
        ctx.scale(dpr, dpr);
        
        this.canvas = canvas;
        this.ctx = ctx;
        this.drawBoard();
      });
  },

  initGame() {
    // 初始化棋盘数组
    const board = new Array(this.data.boardSize);
    for (let i = 0; i < this.data.boardSize; i++) {
      board[i] = new Array(this.data.boardSize).fill(0);
    }
    
    this.setData({
      board,
      currentPlayer: 1,
      gameOver: false
    });
    
    if (this.ctx) {
      this.drawBoard();
    }
  },

  drawBoard() {
    const ctx = this.ctx;
    const canvas = this.canvas;
    const dpr = wx.getSystemInfoSync().pixelRatio;
    const canvasWidth = canvas.width / dpr;
    const gridSize = canvasWidth / (this.data.boardSize - 1);

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 设置背景色
    ctx.fillStyle = '#f3d6a0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制棋盘网格
    ctx.beginPath();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

    // 添加内边距
    const padding = gridSize / 2;
    
    for (let i = 0; i < this.data.boardSize; i++) {
      // 横线
      ctx.moveTo(padding, i * gridSize + padding);
      ctx.lineTo(canvasWidth - padding, i * gridSize + padding);
      // 竖线
      ctx.moveTo(i * gridSize + padding, padding);
      ctx.lineTo(i * gridSize + padding, canvasWidth - padding);
    }
    ctx.stroke();

    // 绘制棋子
    this.data.board.forEach((row, i) => {
      row.forEach((piece, j) => {
        if (piece !== 0) {
          this.drawPiece(i, j, piece);
        }
      });
    });
  },

  drawPiece(row, col, player) {
    const ctx = this.ctx;
    const dpr = wx.getSystemInfoSync().pixelRatio;
    const canvasWidth = this.canvas.width / dpr;
    const gridSize = canvasWidth / (this.data.boardSize - 1);
    const padding = gridSize / 2;
    
    const x = col * gridSize + padding;
    const y = row * gridSize + padding;

    ctx.beginPath();
    ctx.arc(x, y, gridSize * 0.4, 0, 2 * Math.PI);  // 棋子大小设为格子的0.4倍
    ctx.fillStyle = player === 1 ? '#000' : '#fff';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();
  },

  handleTap(e) {
    if (this.data.gameOver) return;

    const dpr = wx.getSystemInfoSync().pixelRatio;
    const canvasWidth = this.canvas.width / dpr;
    const gridSize = canvasWidth / (this.data.boardSize - 1);
    const padding = gridSize / 2;  // 添加相同的padding
    
    const { x, y } = e.touches[0];
    
    // 减去padding后再计算位置
    const adjustedX = x - padding;
    const adjustedY = y - padding;
    
    // 计算最接近的棋盘交叉点
    const col = Math.min(Math.max(Math.round(adjustedX / gridSize), 0), this.data.boardSize - 1);
    const row = Math.min(Math.max(Math.round(adjustedY / gridSize), 0), this.data.boardSize - 1);

    // 检查是否在有效范围内
    if (row < 0 || row >= this.data.boardSize || col < 0 || col >= this.data.boardSize) {
      return;
    }

    if (this.data.board[row]?.[col] !== 0) return;

    const newBoard = [...this.data.board];
    newBoard[row][col] = this.data.currentPlayer;
    
    this.setData({
      board: newBoard,
      currentPlayer: this.data.currentPlayer === 1 ? 2 : 1
    });

    this.drawPiece(row, col, this.data.currentPlayer === 2 ? 1 : 2);

    if (this.checkWin(row, col)) {
      const winner = this.data.currentPlayer === 2 ? '黑棋' : '白棋';
      this.setData({ 
        gameOver: true,
        winner: winner
      });
      
      // 播放胜利音效（可选）
      const audio = wx.createInnerAudioContext();
      audio.src = '/assets/win.mp3';  // 需要添加音效文件
      audio.play();
      
      // 添加胜利动画效果（可选）
      wx.vibrateShort({
        type: 'medium'
      });
    }
  },

  checkWin(row, col) {
    const directions = [
      [[0, 1], [0, -1]], // 水平
      [[1, 0], [-1, 0]], // 垂直
      [[1, 1], [-1, -1]], // 对角线
      [[1, -1], [-1, 1]] // 反对角线
    ];

    const player = this.data.board[row][col];

    return directions.some(direction => {
      let count = 1;
      direction.forEach(([dx, dy]) => {
        let x = row + dx;
        let y = col + dy;
        while (
          x >= 0 && x < this.data.boardSize &&
          y >= 0 && y < this.data.boardSize &&
          this.data.board[x][y] === player
        ) {
          count++;
          x += dx;
          y += dy;
        }
      });
      return count >= 5;
    });
  },

  resetGame() {
    this.setData({
      gameOver: false,
      winner: ''
    });
    this.initGame();
  }
}); 