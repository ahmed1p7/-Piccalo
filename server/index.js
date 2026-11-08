// ═══════════════════════════════════════════════════════════════════════════════
// 🌐 Sea POS - Sync Server (Express + WebSocket)
// ═══════════════════════════════════════════════════════════════════════════════
//
// خادم بسيط للتزامن بين الأجهزة على نفس شبكة Wi-Fi
// - Express: يخدم ملفات الـ build + REST API
// - WebSocket: مزامنة فورية بين الأجهزة
// - اكتشاف IP المحلي تلقائياً
//
// 🚀 تشغيل: npm run server
// 📱 ربط الأجهزة: استخدم IP المحلي (مثلاً 192.168.1.100:3001)
// ═══════════════════════════════════════════════════════════════════════════════

import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.SYNC_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// ═══════════════════════════════════════════════════════════════════
// 📊 قاعدة البيانات في الذاكرة (Memory)
// ═══════════════════════════════════════════════════════════════════
let dbState = {
  users: [],
  inventory: [],
  inventoryLogs: [],
  tables: [],
  receipts: [],
  profile: null,
  lastUpdate: Date.now(),
  lastUpdateBy: 'server',
};

let connectedClients = new Map(); // ws -> { id, name, role, joinedAt }

// ═══════════════════════════════════════════════════════════════════
// 🌐 REST API
// ═══════════════════════════════════════════════════════════════════

// GET /api/state - الحصول على الحالة الكاملة
app.get('/api/state', (req, res) => {
  res.json({
    success: true,
    data: dbState,
    timestamp: Date.now(),
    clientsCount: connectedClients.size,
  });
});

// POST /api/state - تحديث الحالة (للأجهزة التي لا تدعم WS)
app.post('/api/state', (req, res) => {
  const { data, clientId, clientName } = req.body;
  if (!data) {
    return res.status(400).json({ success: false, error: 'No data provided' });
  }
  dbState = { ...data, lastUpdate: Date.now(), lastUpdateBy: clientName || clientId };
  // بث للجميع عبر WS
  broadcastSync('state_update', dbState, clientId);
  res.json({ success: true, timestamp: dbState.lastUpdate });
});

// GET /api/clients - قائمة الأجهزة المتصلة
app.get('/api/clients', (req, res) => {
  const clients = Array.from(connectedClients.values());
  res.json({ success: true, clients, count: clients.length });
});

// GET /api/info - معلومات الخادم
app.get('/api/info', (req, res) => {
  res.json({
    success: true,
    serverName: 'Sea POS Sync Server',
    version: '1.0.0',
    uptime: process.uptime(),
    clientsCount: connectedClients.size,
    localIP: getLocalIP(),
    port: PORT,
  });
});

// ═══════════════════════════════════════════════════════════════════
// 📡 WebSocket Server
// ═══════════════════════════════════════════════════════════════════
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const clientInfo = {
    id: clientId,
    name: 'Unknown',
    role: 'unknown',
    ip: req.socket.remoteAddress,
    joinedAt: Date.now(),
  };
  connectedClients.set(ws, clientInfo);

  console.log(`✅ [WS] ${clientId} connected from ${clientInfo.ip}`);

  // إرسال الحالة الكاملة للعميل الجديد
  ws.send(JSON.stringify({
    type: 'welcome',
    data: {
      yourId: clientId,
      serverState: dbState,
      clientsCount: connectedClients.size,
    },
    timestamp: Date.now(),
  }));

  // إعلان وصول عميل جديد للجميع
  broadcastExcept(ws, 'client_joined', clientInfo);

  // استقبال الرسائل
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message.toString());
      handleMessage(ws, clientId, msg);
    } catch (e) {
      console.error('❌ [WS] Invalid message:', e.message);
    }
  });

  // قطع الاتصال
  ws.on('close', () => {
    const info = connectedClients.get(ws);
    console.log(`❌ [WS] ${clientId} disconnected`);
    connectedClients.delete(ws);
    // إعلان مغادرة العميل للجميع
    broadcastExcept(ws, 'client_left', info || { id: clientId });
  });

  ws.on('error', (err) => {
    console.error(`❌ [WS] ${clientId} error:`, err.message);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 📨 معالجة الرسائل
// ═══════════════════════════════════════════════════════════════════
function handleMessage(ws, clientId, msg) {
  const { type, data } = msg;

  switch (type) {
    case 'register':
      // تسجيل العميل (اسم، دور)
      const info = connectedClients.get(ws);
      if (info) {
        info.name = data?.name || 'Unknown';
        info.role = data?.role || 'unknown';
        connectedClients.set(ws, info);
        console.log(`📝 [WS] ${clientId} registered as ${info.name} (${info.role})`);
        broadcastExcept(ws, 'client_updated', info);
      }
      break;

    case 'sync_update':
      // تحديث الحالة الكاملة
      if (data) {
        dbState = { ...data, lastUpdate: Date.now(), lastUpdateBy: clientId };
        broadcastExcept(ws, 'state_update', dbState);
        console.log(`🔄 [SYNC] State updated by ${clientId}`);
      }
      break;

    case 'partial_update':
      // تحديث جزئي (مثلاً: طاولة واحدة فقط)
      if (data?.key && data?.value) {
        dbState[data.key] = data.value;
        dbState.lastUpdate = Date.now();
        dbState.lastUpdateBy = clientId;
        broadcastExcept(ws, 'partial_update', data);
        console.log(`🔄 [SYNC] Partial update: ${data.key} by ${clientId}`);
      }
      break;

    case 'new_receipt':
      // إيصال جديد - بث للجميع
      if (data) {
        broadcastExcept(ws, 'new_receipt', data);
        console.log(`🧾 [RECEIPT] New receipt by ${clientId}`);
      }
      break;

    case 'table_update':
      // تحديث طاولة معينة
      if (data?.tableId && data?.updates) {
        broadcastExcept(ws, 'table_update', data);
        console.log(`🍽️ [TABLE] ${data.tableId} updated by ${clientId}`);
      }
      break;

    case 'inventory_update':
      // تحديث مخزون
      if (data) {
        broadcastExcept(ws, 'inventory_update', data);
        console.log(`📦 [INVENTORY] Updated by ${clientId}`);
      }
      break;

    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;

    default:
      console.log(`❓ [WS] Unknown message type: ${type}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// 📡 دوال البث
// ═══════════════════════════════════════════════════════════════════
function broadcastSync(type, data, exceptClientId = null) {
  const msg = JSON.stringify({ type, data, timestamp: Date.now() });
  connectedClients.forEach((info, ws) => {
    if (info.id !== exceptClientId && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  });
}

function broadcastExcept(excludeWs, type, data) {
  const msg = JSON.stringify({ type, data, timestamp: Date.now() });
  connectedClients.forEach((info, ws) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(msg);
      } catch (e) {
        console.error('❌ [WS] Send failed:', e.message);
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════
// 🌐 الحصول على IP المحلي
// ═══════════════════════════════════════════════════════════════════
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // IPv4 فقط، ليس internal (lo)
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// ═══════════════════════════════════════════════════════════════════
// 🚀 تشغيل الخادم
// ═══════════════════════════════════════════════════════════════════
server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  🌊 Sea POS - Sync Server v1.0.0');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  📍 Local IP:    ${localIP}`);
  console.log(`  🚀 HTTP:        http://${localIP}:${PORT}`);
  console.log(`  📡 WebSocket:   ws://${localIP}:${PORT}/ws`);
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('📱 للأجهزة الأخرى على نفس الـ Wi-Fi:');
  console.log(`   افتح في المتصفح: http://${localIP}:${PORT}`);
  console.log('');
  console.log('⏳ بانتظار اتصال الأجهزة...');
  console.log('');
});

// ═══════════════════════════════════════════════════════════════════
// 📊 طباعة حالة كل دقيقة
// ═══════════════════════════════════════════════════════════════════
setInterval(() => {
  if (connectedClients.size > 0) {
    console.log(`📊 [${new Date().toLocaleTimeString()}] ${connectedClients.size} جهاز متصل`);
    connectedClients.forEach((info, ws) => {
      console.log(`   • ${info.name} (${info.role}) - ${info.id}`);
    });
  }
}, 60000);

// ═══════════════════════════════════════════════════════════════════
// ⚠️ معالجة الأخطاء
// ═══════════════════════════════════════════════════════════════════
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});
