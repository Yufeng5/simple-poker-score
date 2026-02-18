// Supabase配置
const SUPABASE_URL = 'https://dhacupfekukhjupdiof.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_21D_P08U70gjF_mZaz7rQ_rT1va_'; // 请替换为完整的Publishable key

// 初始化Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 全局状态
let currentRoomCode = null;
let currentPlayerName = null;
let currentRoomId = null;
let currentPlayerId = null;
let transferData = {
    fromPlayerId: null,
    toPlayerId: null,
    fromPlayerName: '',
    toPlayerName: '',
    cards: 0,
    hasBomb: false
};

// 根据剩余牌数和是否有炸弹计算积分
function calculateScore(cards, hasBomb) {
    if (hasBomb) {
        // 炸弹计算
        if (cards >= 1 && cards <= 9) {
            return cards * 1;
        } else if (cards === 10) {
            return 20;
        } else if (cards === 11) {
            return 22;
        } else if (cards === 12) {
            return 24;
        } else if (cards === 13) {
            return 30;
        }
    } else {
        // 基础计算
        if (cards >= 1 && cards <= 9) {
            return cards * 0.5;
        } else if (cards === 10) {
            return 10;
        } else if (cards === 11) {
            return 11;
        } else if (cards === 12) {
            return 12;
        } else if (cards === 13) {
            return 15;
        }
    }
    return 0;
}

// DOM元素
const elements = {
    // 首页元素
    homePage: document.getElementById('home-page'),
    createRoomBtn: document.getElementById('create-room-btn'),
    joinRoomBtn: document.getElementById('join-room-btn'),
    historyBtn: document.getElementById('history-btn'),
    joinForm: document.getElementById('join-form'),
    createForm: document.getElementById('create-form'),
    roomCodeInput: document.getElementById('room-code'),
    playerNameInput: document.getElementById('player-name'),
    createPlayerNameInput: document.getElementById('create-player-name'),
    submitJoinBtn: document.getElementById('submit-join-btn'),
    cancelJoinBtn: document.getElementById('cancel-join-btn'),
    submitCreateBtn: document.getElementById('submit-create-btn'),
    cancelCreateBtn: document.getElementById('cancel-create-btn'),
    
    // 房间页元素
    roomPage: document.getElementById('room-page'),
    currentRoomCode: document.getElementById('current-room-code'),
    onlinePlayers: document.getElementById('online-players'),
    settleRoomBtn: document.getElementById('settle-room-btn'),
    leaveRoomBtn: document.getElementById('leave-room-btn'),
    playersList: document.getElementById('players-list'),
    transactionsList: document.getElementById('transactions-list'),
    
    // 转账弹窗元素
    transferModal: document.getElementById('transfer-modal'),
    transferTitle: document.getElementById('transfer-title'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    scoreCards: document.querySelectorAll('.score-card'),
    bombCheckbox: document.getElementById('bomb-checkbox'),
    confirmTransferBtn: document.getElementById('confirm-transfer-btn'),
    
    // 历史记录页元素
    historyPage: document.getElementById('history-page'),
    backToHomeBtn: document.getElementById('back-to-home-btn'),
    historyRoomsList: document.getElementById('history-rooms-list'),
    
    // 历史详情页元素
    historyDetailPage: document.getElementById('history-detail-page'),
    backToHistoryBtn: document.getElementById('back-to-history-btn'),
    historyRoomCode: document.getElementById('history-room-code'),
    historyRoomTime: document.getElementById('history-room-time'),
    historyRoomPlayers: document.getElementById('history-room-players'),
    finalScoresList: document.getElementById('final-scores-list'),
    historyTransactionsList: document.getElementById('history-transactions-list')
};

// 生成4位随机纯数字房间号
function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// 显示页面
function showPage(pageElement) {
    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('hidden');
    });
    // 隐藏弹窗
    elements.transferModal.classList.add('hidden');
    // 显示目标页面
    pageElement.classList.remove('hidden');
}

// 创建房间
async function createRoom() {
    const playerName = elements.createPlayerNameInput.value.trim();
    
    if (!playerName) {
        alert('请输入你的昵称');
        return;
    }
    
    try {
        const roomCode = generateRoomCode();
        currentRoomCode = roomCode;
        currentPlayerName = playerName;
        
        // 创建房间记录
        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .insert({
                code: roomCode,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (roomError) throw roomError;
        currentRoomId = room.id;
        
        // 创建玩家记录
        const { data: player, error: playerError } = await supabase
            .from('players')
            .insert({
                room_id: room.id,
                name: playerName,
                balance: 0
            })
            .select()
            .single();
        
        if (playerError) throw playerError;
        currentPlayerId = player.id;
        
        setupRoomPage();
    } catch (error) {
        console.error('创建房间失败:', error);
        alert('创建房间失败，请重试');
    }
}

// 加入房间
async function joinRoom() {
    const roomCode = elements.roomCodeInput.value.trim();
    const playerName = elements.playerNameInput.value.trim();
    
    if (!roomCode || !playerName) {
        alert('请输入房间号和昵称');
        return;
    }
    
    try {
        // 查找房间
        const { data: room, error: roomError } = await supabase
            .from('rooms')
            .select('id')
            .eq('code', roomCode)
            .single();
        
        if (roomError) {
            alert('房间不存在');
            return;
        }
        
        currentRoomCode = roomCode;
        currentPlayerName = playerName;
        currentRoomId = room.id;
        
        // 检查玩家是否已存在
        const { data: existingPlayer } = await supabase
            .from('players')
            .select('id')
            .eq('room_id', room.id)
            .eq('name', playerName)
            .single();
        
        let playerId;
        
        // 如果玩家不存在，创建新玩家
        if (!existingPlayer) {
            const { data: newPlayer, error: playerError } = await supabase
                .from('players')
                .insert({
                    room_id: room.id,
                    name: playerName,
                    balance: 0
                })
                .select()
                .single();
            
            if (playerError) throw playerError;
            playerId = newPlayer.id;
        } else {
            playerId = existingPlayer.id;
        }
        
        currentPlayerId = playerId;
        setupRoomPage();
    } catch (error) {
        console.error('加入房间失败:', error);
        alert('加入房间失败，请重试');
    }
}

// 设置房间页面
function setupRoomPage() {
    elements.currentRoomCode.textContent = currentRoomCode;
    showPage(elements.roomPage);
    loadPlayers();
    loadTransactions();
    setupRealtimeListeners();
}

// 加载玩家列表
async function loadPlayers() {
    try {
        const { data: players, error } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', currentRoomId)
            .order('name');
        
        if (error) throw error;
        
        // 更新在线玩家数
        elements.onlinePlayers.textContent = `在线玩家：${players.length}`;
        
        // 更新玩家列表
        elements.playersList.innerHTML = '';
        
        players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = `player-item ${player.id === currentPlayerId ? 'self' : ''}`;
            playerItem.dataset.playerId = player.id;
            playerItem.dataset.playerName = player.name;
            
            const balanceClass = player.balance > 0 ? 'balance-positive' : 
                                player.balance < 0 ? 'balance-negative' : 'balance-zero';
            
            // 生成头像（使用名字的第一个字符）
            const avatarText = player.name.charAt(0).toUpperCase();
            
            playerItem.innerHTML = `
                <div class="player-avatar">${avatarText}</div>
                <div class="player-name">${player.name}</div>
                <div class="player-balance ${balanceClass}">${player.balance}</div>
            `;
            
            // 添加点击事件（如果不是自己）
            if (player.id !== currentPlayerId) {
                playerItem.addEventListener('click', () => {
                    openTransferModal(player.id, player.name);
                });
            }
            
            elements.playersList.appendChild(playerItem);
        });
    } catch (error) {
        console.error('加载玩家失败:', error);
    }
}

// 加载转账记录
async function loadTransactions() {
    try {
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('room_id', currentRoomId)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // 更新转账记录
        elements.transactionsList.innerHTML = '';
        
        transactions.forEach(transaction => {
            const transactionItem = document.createElement('div');
            transactionItem.className = 'transaction-item';
            
            const time = new Date(transaction.created_at).toLocaleString('zh-CN');
            
            transactionItem.innerHTML = `
                <div class="transaction-content">
                    <div>
                        <span class="transaction-sender">${transaction.from_player_name}</span>
                        <span> 转给 </span>
                        <span class="transaction-receiver">${transaction.to_player_name}</span>
                        ${transaction.has_bomb ? '<span class="transaction-bomb">[炸弹]</span>' : ''}
                    </div>
                    <span class="transaction-amount">${transaction.amount}</span>
                </div>
                <div class="transaction-time">${time}</div>
            `;
            
            elements.transactionsList.appendChild(transactionItem);
        });
    } catch (error) {
        console.error('加载转账记录失败:', error);
    }
}

// 打开转账弹窗
function openTransferModal(toPlayerId, toPlayerName) {
    transferData = {
        fromPlayerId: currentPlayerId,
        toPlayerId: toPlayerId,
        fromPlayerName: currentPlayerName,
        toPlayerName: toPlayerName,
        cards: 0,
        hasBomb: false
    };
    
    elements.transferTitle.textContent = `${currentPlayerName} 转给 ${toPlayerName}`;
    elements.transferModal.classList.remove('hidden');
    
    // 重置弹窗状态
    resetTransferModal();
}

// 重置转账弹窗
function resetTransferModal() {
    elements.scoreCards.forEach(card => {
        card.classList.remove('selected');
    });
    elements.bombCheckbox.checked = false;
    elements.confirmTransferBtn.disabled = true;
    transferData.cards = 0;
    transferData.hasBomb = false;
}

// 关闭转账弹窗
function closeTransferModal() {
    elements.transferModal.classList.add('hidden');
    resetTransferModal();
}

// 提交转账
async function submitTransfer() {
    if (!transferData.cards) {
        alert('请选择剩余牌数');
        return;
    }
    
    try {
        // 根据剩余牌数和是否有炸弹计算积分
        const amount = calculateScore(transferData.cards, transferData.hasBomb);
        
        // 开始事务
        const { error: txError } = await supabase.rpc('transfer_transaction', {
            p_room_id: currentRoomId,
            p_from_player_id: transferData.fromPlayerId,
            p_to_player_id: transferData.toPlayerId,
            p_from_player_name: transferData.fromPlayerName,
            p_to_player_name: transferData.toPlayerName,
            p_amount: amount,
            p_has_bomb: transferData.hasBomb
        });
        
        if (txError) throw txError;
        
        closeTransferModal();
    } catch (error) {
        console.error('提交转账失败:', error);
        alert('提交转账失败，请重试');
    }
}

// 设置实时监听器
function setupRealtimeListeners() {
    // 监听玩家变化
    supabase.channel('players')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'players',
            filter: `room_id=eq.${currentRoomId}`
        }, () => {
            loadPlayers();
        })
        .subscribe();
    
    // 监听转账变化
    supabase.channel('transactions')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: `room_id=eq.${currentRoomId}`
        }, () => {
            loadTransactions();
        })
        .subscribe();
}

// 离开房间
function leaveRoom() {
    currentRoomCode = null;
    currentPlayerName = null;
    currentRoomId = null;
    currentPlayerId = null;
    showPage(elements.homePage);
    // 清空表单
    elements.roomCodeInput.value = '';
    elements.playerNameInput.value = '';
    elements.createPlayerNameInput.value = '';
    elements.joinForm.classList.add('hidden');
    elements.createForm.classList.add('hidden');
}

// 进入历史记录页
async function goToHistoryPage() {
    showPage(elements.historyPage);
    await loadHistoryRooms();
}

// 加载历史房间列表
async function loadHistoryRooms() {
    try {
        const { data: rooms, error } = await supabase
            .from('rooms')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        elements.historyRoomsList.innerHTML = '';
        
        for (const room of rooms) {
            // 获取房间玩家
            const { data: players } = await supabase
                .from('players')
                .select('name, balance')
                .eq('room_id', room.id);
            
            const roomItem = document.createElement('div');
            roomItem.className = 'history-room-item';
            roomItem.dataset.roomId = room.id;
            roomItem.dataset.roomCode = room.code;
            
            const time = new Date(room.created_at).toLocaleString('zh-CN');
            const playerNames = players.map(p => p.name).join(', ');
            
            roomItem.innerHTML = `
                <div class="history-room-info">
                    <span class="history-room-code">${room.code}</span>
                    <span class="history-room-time">${time}</span>
                </div>
                <p class="history-room-players">参与玩家：${playerNames}</p>
                <div class="history-room-scores">
                    ${players.map(p => `
                        <div class="history-player-score">
                            <span class="name">${p.name}:</span>
                            <span class="score ${p.balance > 0 ? 'balance-positive' : p.balance < 0 ? 'balance-negative' : 'balance-zero'}">${p.balance}</span>
                        </div>
                    `).join('')}
                </div>
            `;
            
            roomItem.addEventListener('click', () => {
                goToHistoryDetailPage(room.id, room.code);
            });
            
            elements.historyRoomsList.appendChild(roomItem);
        }
    } catch (error) {
        console.error('加载历史房间失败:', error);
    }
}

// 进入历史详情页
async function goToHistoryDetailPage(roomId, roomCode) {
    showPage(elements.historyDetailPage);
    
    try {
        // 获取房间信息
        const { data: room } = await supabase
            .from('rooms')
            .select('created_at')
            .eq('id', roomId)
            .single();
        
        // 获取房间玩家
        const { data: players } = await supabase
            .from('players')
            .select('name, balance')
            .eq('room_id', roomId)
            .order('name');
        
        // 获取转账记录
        const { data: transactions } = await supabase
            .from('transactions')
            .select('*')
            .eq('room_id', roomId)
            .order('created_at', { ascending: false });
        
        // 更新页面
        elements.historyRoomCode.textContent = roomCode;
        elements.historyRoomTime.textContent = `对局时间：${new Date(room.created_at).toLocaleString('zh-CN')}`;
        elements.historyRoomPlayers.textContent = `参与玩家：${players.map(p => p.name).join(', ')}`;
        
        // 更新最终得分
        elements.finalScoresList.innerHTML = '';
        players.forEach(player => {
            const scoreItem = document.createElement('div');
            scoreItem.className = 'final-score-item';
            const balanceClass = player.balance > 0 ? 'balance-positive' : 
                                player.balance < 0 ? 'balance-negative' : 'balance-zero';
            
            scoreItem.innerHTML = `
                <span class="name">${player.name}:</span>
                <span class="score ${balanceClass}">${player.balance}</span>
            `;
            elements.finalScoresList.appendChild(scoreItem);
        });
        
        // 更新转账记录
        elements.historyTransactionsList.innerHTML = '';
        transactions.forEach(transaction => {
            const transactionItem = document.createElement('div');
            transactionItem.className = 'transaction-item';
            
            const time = new Date(transaction.created_at).toLocaleString('zh-CN');
            
            transactionItem.innerHTML = `
                <div class="transaction-content">
                    <div>
                        <span class="transaction-sender">${transaction.from_player_name}</span>
                        <span> 转给 </span>
                        <span class="transaction-receiver">${transaction.to_player_name}</span>
                        ${transaction.has_bomb ? '<span class="transaction-bomb">[炸弹]</span>' : ''}
                    </div>
                    <span class="transaction-amount">${transaction.amount}</span>
                </div>
                <div class="transaction-time">${time}</div>
            `;
            
            elements.historyTransactionsList.appendChild(transactionItem);
        });
    } catch (error) {
        console.error('加载历史详情失败:', error);
    }
}

// 事件监听器
function setupEventListeners() {
    // 首页事件
    elements.createRoomBtn.addEventListener('click', () => {
        elements.createForm.classList.remove('hidden');
        elements.joinForm.classList.add('hidden');
    });
    
    elements.joinRoomBtn.addEventListener('click', () => {
        elements.joinForm.classList.remove('hidden');
        elements.createForm.classList.add('hidden');
    });
    
    elements.historyBtn.addEventListener('click', goToHistoryPage);
    
    elements.submitJoinBtn.addEventListener('click', joinRoom);
    elements.cancelJoinBtn.addEventListener('click', () => {
        elements.joinForm.classList.add('hidden');
    });
    
    elements.submitCreateBtn.addEventListener('click', createRoom);
    elements.cancelCreateBtn.addEventListener('click', () => {
        elements.createForm.classList.add('hidden');
    });
    
    // 房间页事件
    elements.leaveRoomBtn.addEventListener('click', leaveRoom);
    elements.settleRoomBtn.addEventListener('click', () => {
        if (confirm('确定要结算房间吗？结算后将不能继续转账。')) {
            // 这里可以添加房间结算逻辑
            alert('房间已结算');
        }
    });
    
    // 转账弹窗事件
    elements.closeModalBtn.addEventListener('click', closeTransferModal);
    
    // 分数卡片点击事件
    elements.scoreCards.forEach(card => {
        card.addEventListener('click', () => {
            // 移除其他卡片的选中状态
            elements.scoreCards.forEach(c => c.classList.remove('selected'));
            // 添加当前卡片的选中状态
            card.classList.add('selected');
            // 设置剩余牌数
            transferData.cards = parseInt(card.dataset.cards);
            // 启用确认按钮
            elements.confirmTransferBtn.disabled = false;
        });
    });
    
    // 炸弹选项点击事件
    elements.bombCheckbox.addEventListener('change', (e) => {
        transferData.hasBomb = e.target.checked;
    });
    
    // 确认转账按钮
    elements.confirmTransferBtn.addEventListener('click', submitTransfer);
    
    // 历史记录页事件
    elements.backToHomeBtn.addEventListener('click', () => {
        showPage(elements.homePage);
    });
    
    elements.backToHistoryBtn.addEventListener('click', () => {
        showPage(elements.historyPage);
    });
}

// 初始化
function init() {
    setupEventListeners();
    console.log('扑克记账本初始化完成');
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', init);

// Supabase SQL初始化脚本（用户需要在Supabase控制台执行）
/*
-- 创建房间表
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(4) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建玩家表
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    balance NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, name)
);

-- 创建转账记录表
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    from_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    to_player_id UUID REFERENCES players(id) ON DELETE CASCADE,
    from_player_name VARCHAR(50) NOT NULL,
    to_player_name VARCHAR(50) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    has_bomb BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建转账事务函数
CREATE OR REPLACE FUNCTION transfer_transaction(
    p_room_id UUID,
    p_from_player_id UUID,
    p_to_player_id UUID,
    p_from_player_name VARCHAR(50),
    p_to_player_name VARCHAR(50),
    p_amount NUMERIC(10, 2),
    p_has_bomb BOOLEAN
) RETURNS VOID AS $$
BEGIN
    -- 更新转出玩家余额
    UPDATE players 
    SET balance = balance - p_amount 
    WHERE id = p_from_player_id;
    
    -- 更新转入玩家余额
    UPDATE players 
    SET balance = balance + p_amount 
    WHERE id = p_to_player_id;
    
    -- 记录转账
    INSERT INTO transactions (
        room_id, from_player_id, to_player_id, from_player_name, to_player_name, amount, has_bomb
    ) VALUES (
        p_room_id, p_from_player_id, p_to_player_id, p_from_player_name, p_to_player_name, p_amount, p_has_bomb
    );
END;
$$ LANGUAGE plpgsql;

-- 启用实时订阅
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
*/