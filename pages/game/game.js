Page({
  data: {
    boardSize: 15,    // 棋盘大小 15x15
    pieceSize: 12,    // 棋子大小改小一些
    currentPlayer: 1, // 1: 黑棋, 2: 白棋
    gameOver: false,
    board: [],         // 存储棋盘状态
    winner: '',        // 添加winner状态
    moveHistory: [],  // 添加走棋历史记录
    canUndo: false   // 是否可以悔棋
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

    // 添���内边距
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
    const padding = gridSize / 2;
    
    const { x, y } = e.touches[0];
    
    const adjustedX = x - padding;
    const adjustedY = y - padding;
    
    const col = Math.min(Math.max(Math.round(adjustedX / gridSize), 0), this.data.boardSize - 1);
    const row = Math.min(Math.max(Math.round(adjustedY / gridSize), 0), this.data.boardSize - 1);

    if (row < 0 || row >= this.data.boardSize || col < 0 || col >= this.data.boardSize) {
      return;
    }

    if (this.data.board[row]?.[col] !== 0) return;

    // 检查三三禁手（仅对黑棋生效）
    if (this.data.currentPlayer === 1) {  // 黑棋
      // 临时放置棋子检查是否形成三三禁手
      const tempBoard = [...this.data.board];
      tempBoard[row] = [...tempBoard[row]];
      tempBoard[row][col] = this.data.currentPlayer;
      
      // 保存原始棋盘状态
      const originalBoard = this.data.board;
      this.data.board = tempBoard;
      
      // 检查是否形成三三禁手
      const liveThreeCount = this.checkLiveThree(row, col, this.data.currentPlayer);
      
      // 恢复原始棋盘状态
      this.data.board = originalBoard;

      if (liveThreeCount >= 2) {
        wx.showToast({
          title: '三三禁手',
          icon: 'none',
          duration: 1500
        });
        return;
      }
    }

    // 记录这步棋
    const moveHistory = [...this.data.moveHistory];
    moveHistory.push({
      row,
      col,
      player: this.data.currentPlayer
    });

    const newBoard = [...this.data.board];
    newBoard[row][col] = this.data.currentPlayer;
    
    this.setData({
      board: newBoard,
      currentPlayer: this.data.currentPlayer === 1 ? 2 : 1,
      moveHistory,
      canUndo: true
    });

    this.drawPiece(row, col, this.data.currentPlayer === 2 ? 1 : 2);

    if (this.checkWin(row, col)) {
      const winner = this.data.currentPlayer === 2 ? '黑棋' : '白棋';
      this.setData({ 
        gameOver: true,
        winner: winner
      });
      
      const audio = wx.createInnerAudioContext();
      audio.src = '/assets/win.mp3';
      audio.play();
      
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

  // 添加悔棋功能
  undoMove() {
    if (!this.data.canUndo || this.data.moveHistory.length === 0) return;

    // 取出最后一步棋
    const moveHistory = [...this.data.moveHistory];
    const lastMove = moveHistory.pop();
    
    // 更新棋盘
    const newBoard = [...this.data.board];
    newBoard[lastMove.row][lastMove.col] = 0;
    
    this.setData({
      board: newBoard,
      currentPlayer: lastMove.player,  // 恢复到上一步的玩家
      moveHistory,
      canUndo: moveHistory.length > 0
    });

    // 重绘棋盘
    this.drawBoard();
  },

  resetGame() {
    this.setData({
      gameOver: false,
      winner: '',
      moveHistory: [],  // 清空历史记录
      canUndo: false   // 重置悔棋状态
    });
    this.initGame();
  },

  // 添加判断活三的方法
  checkLiveThree(row, col, player) {
    const directions = [
      [[0, 1], [0, -1]], // 水平
      [[1, 0], [-1, 0]], // 垂直
      [[1, 1], [-1, -1]], // 对角线
      [[1, -1], [-1, 1]] // 反对角线
    ];

    let liveThreeCount = 0;

    directions.forEach(direction => {
      // 在当前方向上检查是否形成活三
      let count = 1;
      let leftSpace = 0;
      let rightSpace = 0;
      
      // 检查左边
      let [dx, dy] = direction[0];
      let x = row + dx;
      let y = col + dy;
      while (x >= 0 && x < this.data.boardSize && y >= 0 && y < this.data.boardSize) {
        if (this.data.board[x][y] === player) {
          count++;
        } else if (this.data.board[x][y] === 0) {
          leftSpace++;
          break;
        } else {
          break;
        }
        x += dx;
        y += dy;
      }

      // 检查右边
      [dx, dy] = direction[1];
      x = row + dx;
      y = col + dy;
      while (x >= 0 && x < this.data.boardSize && y >= 0 && y < this.data.boardSize) {
        if (this.data.board[x][y] === player) {
          count++;
        } else if (this.data.board[x][y] === 0) {
          rightSpace++;
          break;
        } else {
          break;
        }
        x += dx;
        y += dy;
      }

      // 判断是否为活三：连续三个子且两端都有空位
      if (count === 3 && leftSpace === 1 && rightSpace === 1) {
        liveThreeCount++;
      }
    });

    return liveThreeCount;
  }
}); 