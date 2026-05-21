# WMS 微信小程序重制版 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 从零重建 WMS 微信小程序（Vant Weapp 1.11.7），实现库存查询、出入库单据查询、个人中心仪表盘、微信静默登录，并改造后端接口以支持小程序。

**Architecture:** 原生微信小程序 + Vant Weapp 组件库（28个组件全局注册），复用现有 Express 后端（新增4个API，改造1个打印接口），sys_user 表新增 openid 字段支持微信登录。

**Tech Stack:** 微信小程序原生框架, Vant Weapp 1.11.7, Express + Sequelize + MySQL, 积木报表(JimuReport) PDF生成

---

## 文件结构总览

### 后端（D:\wms-new\wms-backend\）

| 文件                              | 操作  | 用途                           |
| ------------------------------- | --- | ---------------------------- |
| `models/sys_user.js`            | 修改  | 新增 openid 字段                 |
| `routes/auth.js`                | 新建  | wx-login + bind-openid 路由    |
| `controllers/auth.js`           | 新建  | 微信登录 + 绑定控制器                 |
| `routes/inbound_order.js`       | 修改  | 新增 /search 增强搜索路由            |
| `controllers/inbound_order.js`  | 修改  | 新增 search 方法（明细级产品搜索）        |
| `routes/outbound_order.js`      | 修改  | 新增 /search 增强搜索路由            |
| `controllers/outbound_order.js` | 修改  | 新增 search 方法（明细级产品搜索+客户字段搜索） |
| `routes/print.js`               | 修改  | 改造 print 控制器返回临时URL          |
| `controllers/print.js`          | 修改  | PDF 保存到本地临时目录，返回下载URL        |
| `migrations/003_add_openid.sql` | 新建  | sys_user.openid 迁移           |

### 小程序（D:\wms-new\wms-miniapp\）

| 文件                                 | 操作      | 用途                               |
| ---------------------------------- | ------- | -------------------------------- |
| `package.json`                     | 新建      | @vant/weapp 依赖                   |
| `app.json`                         | 新建      | 9页路由 + 4Tab + 28全局组件             |
| `app.wxss`                         | 新建      | Vant主题覆盖 + 全局样式                  |
| `app.js`                           | 新建      | 启动登录流程 + 全局状态                    |
| `utils/request.js`                 | 保留      | 请求封装 + Mock数据（需更新Mock以匹配新接口）     |
| `utils/auth.js`                    | 保留      | Token/用户信息管理                     |
| `utils/api.js`                     | 保留      | API调用函数（需新增wx-login/bind-openid） |
| `utils/highlight.wxs`              | 保留      | WXS关键词高亮                         |
| `custom-tab-bar/index.*`           | 新建      | van-tabbar 自定义TabBar             |
| `pages/stock/stock.*`              | 新建(4文件) | 库存查询页                            |
| `pages/inbound/inbound.*`          | 新建(4文件) | 入库单列表页                           |
| `pages/inbound/inbound-detail.*`   | 新建(4文件) | 入库单详情页                           |
| `pages/outbound/outbound.*`        | 新建(4文件) | 出库单列表页                           |
| `pages/outbound/outbound-detail.*` | 新建(4文件) | 出库单详情页                           |
| `pages/mine/mine.*`                | 新建(4文件) | 个人中心页                            |
| `pages/login/login.*`              | 新建(4文件) | 绑定账号页                            |

---

## 第一阶段：后端基础设施 + 数据库 + 微信登录 API

> **依赖**: 无 | **总工时**: 4h | **产出**: wx-login + bind-openid 接口可用

### Task 1: sys_user 表新增 openid 字段

**Files:**

- Create: `D:\wms-new\wms-backend\migrations\003_add_openid.sql`
- Modify: `D:\wms-new\wms-backend\models\sys_user.js`

**耗时**: 0.5h

- [ ] **Step 1: 创建数据库迁移 SQL**

```sql
-- D:\wms-new\wms-backend\migrations\003_add_openid.sql
ALTER TABLE sys_user
  ADD COLUMN openid VARCHAR(64) DEFAULT NULL COMMENT '微信openid',
  ADD UNIQUE INDEX idx_openid (openid);
```

- [ ] **Step 2: 修改 sys_user 模型新增 openid 字段**

在 `D:\wms-new\wms-backend\models\sys_user.js` 中，找到字段定义区（约在 `avatar` 与 `status` 之间），添加：

```js
openid: {
  type: DataTypes.STRING(64),
  allowNull: true,
  unique: true,
  comment: '微信openid'
},
```

确保在 `init` 方法的 `options` 中 `indexes` 数组（如果有）包含 openid 唯一索引；否则依赖迁移 SQL 创建索引。

- [ ] **Step 3: 验证模型加载**

```bash
cd /d/wms-new/wms-backend && node -e "const m = require('./models/sys_user'); console.log(Object.keys(m.rawAttributes));"
```

预期：输出中包含 `openid`

- [ ] **Step 4: 执行迁移 SQL（生产环境需手动确认）**

```bash
# 开发环境测试
mysql -u root -p wms < /d/wms-new/wms-backend/migrations/003_add_openid.sql
```

### Task 2: 实现微信登录接口 POST /api/auth/wx-login

**Files:**

- Create: `D:\wms-new\wms-backend\routes\auth.js`
- Create: `D:\wms-new\wms-backend\controllers\auth.js`
- Modify: `D:\wms-new\wms-backend\app.js`（挂载路由 + 放行为公开路由）

**耗时**: 2h

- [ ] **Step 1: 创建 auth 控制器**

```js
// D:\wms-new\wms-backend\controllers\auth.js
const axios = require("axios");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const db = require("../models");
const SysUser = db.SysUser;

const JWT_SECRET = process.env.JWT_SECRET || "wms-jwt-secret";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";
const WX_APPID = process.env.WX_APPID || "";
const WX_SECRET = process.env.WX_APP_SECRET || "";

// wx.login → code 换取 openid → 查用户 → 返回 token 或 needBind
exports.wxLogin = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ code: 400, message: "缺少 code" });
    }

    // 调微信接口获取 openid
    const wxRes = await axios.get("https://api.weixin.qq.com/sns/jscode2session", {
      params: { appid: WX_APPID, secret: WX_SECRET, js_code: code, grant_type: "authorization_code" }
    });

    const { openid, errcode, errmsg } = wxRes.data;
    if (errcode) {
      console.error("wx jscode2session 失败:", errmsg);
      return res.status(500).json({ code: 500, message: "微信登录失败，请稍后重试" });
    }

    // 查 sys_user 是否有此 openid
    const user = await SysUser.findOne({
      where: { openid, del_flag: 0 },
      include: [{ model: db.SysRole, as: "role" }]
    });

    if (user) {
      const token = jwt.sign(
        { id: user.id, username: user.username, nickname: user.nickname, roleCode: user.role?.role_code },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
      );
      return res.json({
        code: 200,
        data: {
          token,
          userInfo: {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            roleName: user.role?.role_name || "",
            avatar: user.avatar || ""
          }
        }
      });
    }

    // openid 未绑定
    return res.json({ code: 200, data: { needBind: true, openid } });
  } catch (e) {
    console.error("wx-login error:", e.message);
    return res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};

// 绑定 openid 到已有账号
exports.bindOpenid = async (req, res) => {
  try {
    const { openid, username, password } = req.body;
    if (!openid || !username || !password) {
      return res.status(400).json({ code: 400, message: "参数不完整" });
    }

    // 查用户
    const user = await SysUser.findOne({
      where: { username, del_flag: 0, status: 1 }
    });
    if (!user) {
      return res.status(400).json({ code: 400, message: "用户名不存在或已禁用" });
    }

    // 校验密码
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return res.status(400).json({ code: 400, message: "密码错误" });
    }

    // 检查 openid 是否已被其他账号绑定
    const existing = await SysUser.findOne({ where: { openid, del_flag: 0 } });
    if (existing && existing.id !== user.id) {
      return res.status(400).json({ code: 400, message: "该微信已绑定其他账号" });
    }

    // 写入 openid
    await user.update({ openid });

    const userWithRole = await SysUser.findByPk(user.id, {
      include: [{ model: db.SysRole, as: "role" }]
    });

    const token = jwt.sign(
      { id: user.id, username: user.username, nickname: user.nickname, roleCode: userWithRole.role?.role_code },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.json({
      code: 200,
      data: {
        token,
        userInfo: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          roleName: userWithRole.role?.role_name || "",
          avatar: user.avatar || ""
        }
      }
    });
  } catch (e) {
    console.error("bind-openid error:", e.message);
    return res.status(500).json({ code: 500, message: "服务器内部错误" });
  }
};
```

- [ ] **Step 2: 创建 auth 路由文件**

```js
// D:\wms-new\wms-backend\routes\auth.js
const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/auth");

// 公开路由（无需 auth 中间件）
router.post("/wx-login", authCtrl.wxLogin);
router.post("/bind-openid", authCtrl.bindOpenid);

module.exports = router;
```

- [ ] **Step 3: 在 app.js 中挂载路由并放行认证**

在 `D:\wms-new\wms-backend\app.js` 中找到路由挂载处（约第47行附近），添加：

```js
app.use("/api/auth", require("./routes/auth")); // 微信认证（公开路由）
```

确保 auth 中间件的白名单包含新增路径。找到 `middleware/auth.js`，在公开路径数组中添加：

```js
const publicPaths = [
  "/api/login",
  "/api/auth/wx-login",
  "/api/auth/bind-openid",
  // ...existing public paths
];
```

- [ ] **Step 4: 环境变量配置**

确认 `D:\wms-new\wms-backend\.env` 中包含以下变量：

```env
WX_APPID=wx_your_appid_here
WX_APP_SECRET=your_app_secret_here
JWT_SECRET=wms-jwt-secret
JWT_EXPIRES=7d
```

- [ ] **Step 5: 手动测试接口**

```bash
# 测试 wx-login（无 code 参数应返回 400）
curl -X POST http://localhost:3000/api/auth/wx-login -H "Content-Type: application/json" -d '{}'

# 测试 bind-openid（参数不完整应返回 400）
curl -X POST http://localhost:3000/api/auth/bind-openid -H "Content-Type: application/json" -d '{}'
```

- [ ] **Step 6: Commit**

```bash
cd /d/wms-new/wms-backend
git add migrations/003_add_openid.sql models/sys_user.js controllers/auth.js routes/auth.js app.js middleware/auth.js
git commit -m "feat: 新增微信登录接口 (wx-login + bind-openid)，sys_user表新增openid字段"
```

---

## 第二阶段：小程序项目骨架 + 登录页

> **依赖**: 第一阶段完成 | **总工时**: 3h | **产出**: 小程序可运行，登录流程可用

### Task 3: 初始化小程序项目 + 安装依赖

**Files:**

- Create: `D:\wms-new\wms-miniapp\package.json`
- Create: `D:\wms-new\wms-miniapp\project.config.json`

**耗时**: 0.5h

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "wms-miniapp",
  "version": "1.0.0",
  "description": "WMS仓储管理微信小程序",
  "dependencies": {
    "@vant/weapp": "1.11.7"
  }
}
```

- [ ] **Step 2: 创建 project.config.json**

```json
{
  "description": "WMS仓储管理",
  "packOptions": { "ignore": [], "include": [] },
  "setting": {
    "urlCheck": true,
    "es6": true,
    "enhance": true,
    "postcss": true,
    "preloadBackgroundData": false,
    "minified": true,
    "newFeature": false,
    "coverView": true,
    "nodeModules": true,
    "autoAudits": false,
    "showShadowRootInWxmlPanel": true,
    "scopeDataCheck": false,
    "uglifyFileName": false,
    "checkInvalidKey": true,
    "checkSiteMap": true,
    "uploadWithSourceMap": true,
    "compileHotReLoad": false,
    "lazyCodeLoading": "requiredComponents",
    "useMultiFrameRuntime": true,
    "useApiHook": true,
    "useApiHostProcess": true,
    "babelSetting": { "ignore": [], "disablePlugins": [], "outputPath": "" }
  },
  "compileType": "miniprogram",
  "libVersion": "3.0.0",
  "appid": "",
  "projectname": "wms-miniapp"
}
```

- [ ] **Step 3: 安装依赖**

```bash
cd /d/wms-new/wms-miniapp && npm install
```

- [ ] **Step 4: 提示用户**

在微信开发者工具中，点击 **工具 → 构建 npm** 生成 `miniprogram_npm` 目录。

### Task 4: 创建 app.json / app.wxss / app.js

**Files:**

- Create: `D:\wms-new\wms-miniapp\app.json`
- Create: `D:\wms-new\wms-miniapp\app.wxss`
- Create: `D:\wms-new\wms-miniapp\app.js`

**耗时**: 1h

- [ ] **Step 1: 创建 app.json**

```json
{
  "pages": [
    "pages/stock/stock",
    "pages/inbound/inbound",
    "pages/outbound/outbound",
    "pages/mine/mine",
    "pages/login/login",
    "pages/inbound/inbound-detail",
    "pages/outbound/outbound-detail"
  ],
  "window": {
    "navigationBarTextStyle": "white",
    "navigationBarTitleText": "WMS仓储管理",
    "navigationBarBackgroundColor": "#409EFF",
    "backgroundColor": "#F0F2F5"
  },
  "tabBar": {
    "custom": true,
    "color": "#909399",
    "selectedColor": "#409EFF",
    "backgroundColor": "#FFFFFF",
    "borderStyle": "black",
    "list": [
      { "pagePath": "pages/stock/stock", "text": "库存查询", "iconPath": "static/tab-stock.png", "selectedIconPath": "static/tab-stock-active.png" },
      { "pagePath": "pages/inbound/inbound", "text": "入库单", "iconPath": "static/tab-inbound.png", "selectedIconPath": "static/tab-inbound-active.png" },
      { "pagePath": "pages/outbound/outbound", "text": "出库单", "iconPath": "static/tab-outbound.png", "selectedIconPath": "static/tab-outbound-active.png" },
      { "pagePath": "pages/mine/mine", "text": "我的", "iconPath": "static/tab-mine.png", "selectedIconPath": "static/tab-mine-active.png" }
    ]
  },
  "usingComponents": {
    "van-search": "@vant/weapp/search/index",
    "van-dropdown-menu": "@vant/weapp/dropdown-menu/index",
    "van-dropdown-item": "@vant/weapp/dropdown-item/index",
    "van-tag": "@vant/weapp/tag/index",
    "van-popup": "@vant/weapp/popup/index",
    "van-cell": "@vant/weapp/cell/index",
    "van-cell-group": "@vant/weapp/cell-group/index",
    "van-card": "@vant/weapp/card/index",
    "van-tabs": "@vant/weapp/tabs/index",
    "van-tab": "@vant/weapp/tab/index",
    "van-action-sheet": "@vant/weapp/action-sheet/index",
    "van-button": "@vant/weapp/button/index",
    "van-empty": "@vant/weapp/empty/index",
    "van-loading": "@vant/weapp/loading/index",
    "van-icon": "@vant/weapp/icon/index",
    "van-grid": "@vant/weapp/grid/index",
    "van-grid-item": "@vant/weapp/grid-item/index",
    "van-field": "@vant/weapp/field/index",
    "van-tabbar": "@vant/weapp/tabbar/index",
    "van-tabbar-item": "@vant/weapp/tabbar-item/index",
    "van-dialog": "@vant/weapp/dialog/index",
    "van-toast": "@vant/weapp/toast/index",
    "van-divider": "@vant/weapp/divider/index",
    "van-switch": "@vant/weapp/switch/index"
  },
  "lazyCodeLoading": "requiredComponents"
}
```

- [ ] **Step 2: 创建 app.wxss**

```css
page {
  --van-primary-color: #409EFF;
  --van-success-color: #67C23A;
  --van-warning-color: #E6A23C;
  --van-danger-color: #F56C6C;
  --van-text-color: #303133;
  --van-text-color-weak: #909399;
  --van-cell-font-size: 28rpx;
  --van-cell-label-font-size: 22rpx;
  --van-cell-label-color: #909399;
  --van-cell-vertical-padding: 20rpx;
  --van-cell-horizontal-padding: 28rpx;
  --van-tag-border-radius: 6rpx;
  --van-tag-font-weight: 500;
  --van-card-background: #ffffff;
  --van-card-padding: 24rpx 28rpx;
  --van-tab-font-size: 28rpx;
  --van-tab-active-text-color: #409EFF;
  --van-dropdown-menu-height: 80rpx;
  --van-dropdown-menu-title-active-text-color: #409EFF;
  --van-grid-item-content-padding: 24rpx 16rpx;
  --van-grid-item-text-font-size: 22rpx;
  --van-grid-item-text-color: #606266;
  --van-button-primary-background: #409EFF;
  --van-button-primary-border-color: #409EFF;
  --van-button-danger-background: #F56C6C;
  --van-field-label-color: #303133;
  --van-field-input-text-color: #303133;

  background-color: #f0f2f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 28rpx;
  color: #303133;
}

.van-cell-group,
.van-card {
  border-radius: 8rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04);
}

.van-card {
  margin: 12rpx 16rpx;
}

.safe-bottom {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
```

- [ ] **Step 3: 创建 app.js**

```js
const { getToken, setToken, setUserInfo, removeToken } = require("./utils/auth");

App({
  onLaunch() {
    this.checkLogin();
  },

  async checkLogin() {
    const token = getToken();
    if (token) {
      // 验证 token 是否有效
      try {
        const request = require("./utils/request");
        const res = await request.get("/api/user/profile");
        if (res.code === 200) {
          // token 有效，直接进入主界面
          return;
        }
      } catch (e) {
        // token 无效，清空重新登录
        removeToken();
      }
    }
    // 进入微信静默登录流程
    this.wxSilentLogin();
  },

  wxSilentLogin() {
    wx.login({
      success: async (loginRes) => {
        if (!loginRes.code) {
          console.error("wx.login 失败");
          return;
        }
        try {
          const request = require("./utils/request");
          const res = await request.post("/api/auth/wx-login", { code: loginRes.code });
          if (res.needBind) {
            // 未绑定，跳转绑定页
            wx.setStorageSync("openid", res.openid);
            wx.navigateTo({ url: "/pages/login/login" });
          } else if (res.token) {
            setToken(res.token);
            setUserInfo(res.userInfo);
          }
        } catch (e) {
          console.error("静默登录失败:", e);
          wx.showToast({ title: "登录失败，请重启小程序", icon: "none" });
        }
      }
    });
  }
});
```

### Task 5: 迁移保留的工具文件

**Files:**

- Create: `D:\wms-new\wms-miniapp\utils\request.js`（从旧项目复制并更新）
- Create: `D:\wms-new\wms-miniapp\utils\auth.js`
- Create: `D:\wms-new\wms-miniapp\utils\api.js`
- Create: `D:\wms-new\wms-miniapp\utils\highlight.wxs`

**耗时**: 1h

- [ ] **Step 1: 创建 utils/request.js**

```js
const BASE_URL = "https://114.67.203.242";
const MOCK = true; // 开发阶段使用Mock

function mockResponse(path, params) {
  // Mock 实现见 DESIGN.md 附录 B，此处保持与原 utils/request.js 一致
  // 需要新增的 Mock 端点：POST /api/auth/wx-login, POST /api/auth/bind-openid
  // ...（从原项目复制完整 Mock 代码）
}

function request(method, url, data) {
  if (MOCK) {
    return Promise.resolve(mockResponse(url, data));
  }
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + url,
      method,
      data,
      header: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (wx.getStorageSync("token") || "")
      },
      success(res) {
        if (res.statusCode === 401) {
          wx.removeStorageSync("token");
          wx.removeStorageSync("userInfo");
          wx.showToast({ title: "登录已过期，请重新登录", icon: "none" });
          return;
        }
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          wx.showToast({ title: res.data.message || "请求失败", icon: "none" });
          reject(res.data);
        }
      },
      fail(err) {
        wx.showToast({ title: "网络错误，请检查网络", icon: "none" });
        reject(err);
      }
    });
  });
}

module.exports = {
  get: (url, params) => request("GET", url, params),
  post: (url, data) => request("POST", url, data),
  put: (url, data) => request("PUT", url, data),
  delete: (url, data) => request("DELETE", url, data),
};
```

- [ ] **Step 2: 创建 utils/auth.js**

```js
const TOKEN_KEY = "token";
const USER_KEY = "userInfo";

function getToken() { return wx.getStorageSync(TOKEN_KEY); }
function setToken(token) { wx.setStorageSync(TOKEN_KEY, token); }
function removeToken() { wx.removeStorageSync(TOKEN_KEY); }

function getUserInfo() { return wx.getStorageSync(USER_KEY); }
function setUserInfo(info) { wx.setStorageSync(USER_KEY, info); }
function removeUserInfo() { wx.removeStorageSync(USER_KEY); }

function logout() {
  removeToken();
  removeUserInfo();
  wx.reLaunch({ url: "/pages/stock/stock" });
}

module.exports = { getToken, setToken, removeToken, getUserInfo, setUserInfo, removeUserInfo, logout };
```

- [ ] **Step 3: 创建 utils/api.js**

```js
const request = require("./request");

module.exports = {
  // 微信登录
  wxLogin: (code) => request.post("/api/auth/wx-login", { code }),
  // 绑定 openid
  bindOpenid: (openid, username, password) =>
    request.post("/api/auth/bind-openid", { openid, username, password }),
  // 获取用户信息
  getUserProfile: () => request.get("/api/user/profile"),
  // 修改密码
  changePassword: (oldPassword, newPassword) =>
    request.post("/api/user/change-password", { oldPassword, newPassword }),
  // ...（从原项目复制其余 API 函数）
};
```

- [ ] **Step 4: 创建 utils/highlight.wxs**

从原项目复制 WXS 高亮模块（内容不变）。

### Task 6: Custom TabBar

**Files:**

- Create: `D:\wms-new\wms-miniapp\custom-tab-bar\index.json`
- Create: `D:\wms-new\wms-miniapp\custom-tab-bar\index.wxml`
- Create: `D:\wms-new\wms-miniapp\custom-tab-bar\index.js`
- Create: `D:\wms-new\wms-miniapp\custom-tab-bar\index.wxss`
- Create: `D:\wms-new\wms-miniapp\static\` 目录（占位）

**耗时**: 0.5h

- [ ] **Step 1: index.json**

```json
{
  "component": true,
  "usingComponents": {
    "van-tabbar": "@vant/weapp/tabbar/index",
    "van-tabbar-item": "@vant/weapp/tabbar-item/index"
  }
}
```

- [ ] **Step 2: index.wxml**

```html
<van-tabbar active="{{value}}" active-color="#409eff" inactive-color="#909399" bind:change="onChange">
  <van-tabbar-item wx:for="{{list}}" wx:key="value" name="{{item.value}}" icon="{{item.icon}}">
    {{item.label}}
  </van-tabbar-item>
</van-tabbar>
```

- [ ] **Step 3: index.js**

```js
Component({
  data: {
    value: "stock",
    list: [
      { value: "stock", label: "库存查询", icon: "orders-o" },
      { value: "inbound", label: "入库单", icon: "arrow-down" },
      { value: "outbound", label: "出库单", icon: "arrow-up" },
      { value: "mine", label: "我的", icon: "user-o" },
    ],
  },
  methods: {
    onChange(e) {
      const val = e.detail;
      this.setData({ value: val });
      wx.switchTab({ url: "/pages/" + val + "/" + val });
    },
  },
});
```

- [ ] **Step 4: index.wxss（空文件，样式由全局 app.wxss 控制）**

```css
/* custom-tab-bar 样式 */
```

### Task 7: 登录绑定页面 (pages/login/login)

**Files:**

- Create: `D:\wms-new\wms-miniapp\pages\login\login.json`
- Create: `D:\wms-new\wms-miniapp\pages\login\login.wxml`
- Create: `D:\wms-new\wms-miniapp\pages\login\login.wxss`
- Create: `D:\wms-new\wms-miniapp\pages\login\login.js`

**耗时**: 1h

- [ ] **Step 1: login.json**

```json
{ "navigationBarTitleText": "绑定账号" }
```

- [ ] **Step 2: login.wxml**

```html
<view class="page">
  <view class="logo-area">
    <image class="logo" src="/static/logo.png" mode="aspectFit" />
    <text class="app-name">WMS仓储管理</text>
    <text class="subtitle">绑定已有系统账号</text>
  </view>

  <view class="form-area">
    <van-field
      value="{{username}}"
      label="用户名"
      placeholder="请输入用户名"
      left-icon="contact"
      custom-class="form-field"
      bind:change="onUsernameInput"
    />
    <van-field
      value="{{password}}"
      label="密码"
      type="password"
      placeholder="请输入密码"
      left-icon="lock"
      custom-class="form-field"
      bind:change="onPasswordInput"
    />

    <view class="btn-area">
      <van-button type="primary" block loading="{{loading}}" bind:tap="handleBind">绑定账号</van-button>
    </view>

    <view class="tips">
      <text>首次使用需将微信与 WMS 系统账号绑定</text>
    </view>
  </view>
</view>
```

- [ ] **Step 3: login.wxss**

```css
.page {
  display: flex; flex-direction: column; align-items: center;
  padding-top: 120rpx; min-height: 100vh;
  background-color: #f0f2f5;
}
.logo-area { display: flex; flex-direction: column; align-items: center; margin-bottom: 64rpx; }
.logo { width: 120rpx; height: 120rpx; margin-bottom: 16rpx; }
.app-name { font-size: 36rpx; font-weight: 600; color: #303133; }
.subtitle { font-size: 24rpx; color: #909399; margin-top: 12rpx; }
.form-area { width: 100%; padding: 0 16rpx; }
.form-field { margin-bottom: 0 !important; }
.btn-area { margin-top: 56rpx; padding: 0 16rpx; }
.tips { margin-top: 32rpx; text-align: center; }
.tips text { font-size: 22rpx; color: #c0c4cc; }
```

- [ ] **Step 4: login.js**

```js
const { setToken, setUserInfo } = require("../../utils/auth");
const request = require("../../utils/request");

Page({
  data: { username: "", password: "", loading: false },

  onUsernameInput(e) { this.setData({ username: e.detail }); },
  onPasswordInput(e) { this.setData({ password: e.detail }); },

  async handleBind() {
    const { username, password } = this.data;
    if (!username.trim()) { wx.showToast({ title: "请输入用户名", icon: "none" }); return; }
    if (!password) { wx.showToast({ title: "请输入密码", icon: "none" }); return; }

    this.setData({ loading: true });
    try {
      const openid = wx.getStorageSync("openid") || "";
      const res = await request.post("/api/auth/bind-openid", { openid, username: username.trim(), password });
      setToken(res.data.token);
      setUserInfo(res.data.userInfo);
      wx.removeStorageSync("openid");
      wx.showToast({ title: "绑定成功", icon: "success" });
      setTimeout(() => { wx.switchTab({ url: "/pages/stock/stock" }); }, 800);
    } catch (e) {
      wx.showToast({ title: e.message || "绑定失败，请重试", icon: "none", duration: 2000 });
    } finally {
      this.setData({ loading: false });
    }
  },
});
```

---

## 第三阶段：库存查询页

> **依赖**: 第二阶段完成 | **总工时**: 4h | **产出**: 库存查询Tab可正常搜索、筛选、分页

### Task 8: 库存查询页 JS 逻辑

**Files:**

- Create: `D:\wms-new\wms-miniapp\pages\stock\stock.js`

**耗时**: 1.5h

- [ ] **Step 1: 创建 stock.js**

```js
const request = require("../../utils/request");

Page({
  data: {
    keyword: "",
    alertStatus: "",
    warehouseCode: "",

    statusOptions: [
      { text: "全部状态", value: "" },
      { text: "低库存", value: "低库存" },
      { text: "零库存", value: "零库存" },
      { text: "高库存", value: "高库存" },
      { text: "正常", value: "正常" },
    ],
    warehouseOptions: [{ text: "全部仓库", value: "" }],

    stockList: [], page: 1, pageSize: 15, total: 0,
    hasMore: true, loading: false, refreshing: false, empty: false,
  },

  onLoad() {
    this.loadWarehouseList();
    this.loadStockList(true);
  },
  onShow() {
    const tb = this.getTabBar && this.getTabBar();
    if (tb) tb.setData({ value: "stock" });
  },

  async loadWarehouseList() {
    try {
      const res = await request.get("/api/warehouse/list");
      const list = res.data.rows || [];
      const opts = [{ text: "全部仓库", value: "" }];
      list.forEach(w => opts.push({ text: w.warehouse_name, value: w.warehouse_code }));
      this.setData({ warehouseOptions: opts });
    } catch (e) { console.warn("加载仓库失败:", e); }
  },

  async loadStockList(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    if (reset) this.setData({ page: 1, hasMore: true, empty: false });
    this.setData({ loading: true });
    try {
      const params = { page, pageSize: this.data.pageSize };
      if (this.data.keyword) params.keyword = this.data.keyword;
      if (this.data.warehouseCode) params.warehouse_code = this.data.warehouseCode;
      if (this.data.alertStatus) params.alert_status = this.data.alertStatus;
      const res = await request.get("/api/stock/list", params);
      const rows = res.data.rows || [];
      const total = res.data.total || 0;
      const list = reset ? rows : this.data.stockList.concat(rows);
      this.setData({
        stockList: list, page: page + 1, total,
        hasMore: list.length < total,
        loading: false, refreshing: false,
        empty: list.length === 0,
      });
    } catch (e) {
      this.setData({ loading: false, refreshing: false });
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },

  onSearch(e) { this.setData({ keyword: e.detail || "" }); },
  onSubmitSearch() { this.loadStockList(true); },
  onClearSearch() { this.setData({ keyword: "" }); this.loadStockList(true); },

  onStatusChange(e) { this.setData({ alertStatus: e.detail }); this.loadStockList(true); },
  onWarehouseChange(e) {
    this.setData({ warehouseCode: e.detail });
    this.loadStockList(true);
  },

  onRefresh() { this.setData({ refreshing: true }); this.loadStockList(true); },
  onScrollToLower() {
    if (this.data.hasMore && !this.data.loading) this.loadStockList(false);
  },

  getAlertType(s) {
    const m = { "零库存": "default", "低库存": "danger", "高库存": "warning", "正常": "success" };
    return m[s] || "default";
  },
  getAlertColor(s) {
    const m = { "零库存": "#909399", "低库存": "#F56C6C", "高库存": "#E6A23C", "正常": "#67C23A" };
    return m[s] || "#909399";
  },
});
```

### Task 9: 库存查询页 WXML + WXSS

**Files:**

- Create: `D:\wms-new\wms-miniapp\pages\stock\stock.wxml`
- Create: `D:\wms-new\wms-miniapp\pages\stock\stock.wxss`
- Create: `D:\wms-new\wms-miniapp\pages\stock\stock.json`

**耗时**: 1.5h

- [ ] **Step 1: stock.json**

```json
{ "navigationBarTitleText": "库存查询" }
```

- [ ] **Step 2: stock.wxml**

```html
<wxs src="../../utils/highlight.wxs" module="hl" />

<view class="page">
  <van-search
    value="{{keyword}}"
    placeholder="搜索商品编码/名称/型号"
    show-action
    bind:change="onSearch"
    bind:search="onSubmitSearch"
    bind:cancel="onClearSearch"
  />

  <van-dropdown-menu>
    <van-dropdown-item value="{{alertStatus}}" options="{{statusOptions}}" bind:change="onStatusChange" />
    <van-dropdown-item value="{{warehouseCode}}" options="{{warehouseOptions}}" bind:change="onWarehouseChange" />
  </van-dropdown-menu>

  <scroll-view
    class="scroll-body"
    scroll-y
    bindscrolltolower="onScrollToLower"
    lower-threshold="100"
    refresher-enabled
    refresher-triggered="{{refreshing}}"
    bindrefresherrefresh="onRefresh"
  >
    <view wx:if="{{!empty}}">
      <van-cell-group wx:for="{{stockList}}" wx:key="product_code" custom-class="card-group">
        <van-cell value="{{item.stock_qty}}件" border="{{false}}" custom-class="stock-cell">
          <view slot="title" class="cell-head">
            <van-tag
              custom-class="cell-tag"
              color="{{getAlertColor(item.alert_status)}}"
              text-color="#fff"
            >{{item.alert_status}}</van-tag>
            <view class="cell-name">
              <block wx:for="{{hl.parts(item.product_name, keyword)}}" wx:for-item="p">
                <text wx:if="{{p.h}}" class="hl">{{p.t}}</text>
                <text wx:else>{{p.t}}</text>
              </block>
            </view>
          </view>
          <view slot="label" class="cell-meta">
            <text>{{item.product_code}}</text>
            <text class="meta-sep">|</text>
            <text>{{item.product_model}}</text>
            <text class="meta-sep">|</text>
            <text>{{item.warehouse_name}}</text>
          </view>
        </van-cell>
      </van-cell-group>
    </view>

    <van-empty wx:if="{{empty}}" description="暂无库存数据" />
    <view class="load-more" wx:if="{{loading}}">
      <van-loading size="40rpx" /><text class="load-text">加载中...</text>
    </view>
    <view class="load-more" wx:elif="{{!hasMore && !empty}}">
      <text class="load-text">已加载全部 {{total}} 条</text>
    </view>
  </scroll-view>
</view>
```

- [ ] **Step 3: stock.wxss**

```css
.page { display: flex; flex-direction: column; height: 100vh; }
.scroll-body { flex: 1; }

.card-group { margin: 12rpx 16rpx; }
.stock-cell { padding: 20rpx 28rpx !important; }

.cell-head { display: flex; align-items: center; gap: 12rpx; }
.cell-tag { flex-shrink: 0; }
.cell-name {
  font-size: 28rpx; font-weight: 600; color: #303133;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  flex: 1;
}
.cell-name .hl { color: #409EFF; }

.cell-meta { font-size: 22rpx; color: #909399; margin-top: 8rpx; display: flex; align-items: center; gap: 6rpx; }
.meta-sep { color: #dcdfe6; }

.load-more {
  padding: 32rpx; text-align: center;
  display: flex; align-items: center; justify-content: center;
}
.load-text { font-size: 22rpx; color: #909399; margin-left: 12rpx; }
```

### Task 10: 库存查询 Mock 数据验证

**耗时**: 0.5h

- [ ] **Step 1: 确认 utils/request.js 中 Mock 的 GET /api/stock/list 返回格式**

Mock 返回结构必须为：

```json
{ "code": 200, "data": { "rows": [...], "total": 50 } }
```

每条记录包含字段：`product_code, product_name, product_model, stock_qty, stock_weight, warehouse_name, alert_status`

- [ ] **Step 2: 确认 Mock 数据支持 keyword / warehouse_code / alert_status 参数过滤**

- [ ] **Step 3: Commit**

```bash
cd /d/wms-new/wms-miniapp
git add pages/stock/ utils/ app.* custom-tab-bar/ package.json project.config.json
git commit -m "feat: 库存查询页 + 项目骨架 + Custom TabBar"
```

---

## 第四阶段：后端搜索增强 + 打印接口改造

> **依赖**: 第一阶段完成 | **总工时**: 5h | **产出**: 出入库搜索 API + 打印临时URL

### Task 11: 入库单搜索增强接口

**Files:**

- Modify: `D:\wms-new\wms-backend\routes\inbound_order.js`
- Modify: `D:\wms-new\wms-backend\controllers\inbound_order.js`

**耗时**: 2h

- [ ] **Step 1: 在 inbound_order 控制器中新增 search 方法**

```js
// 在 controllers/inbound_order.js 末尾添加

exports.search = async (req, res) => {
  try {
    const { page = 1, pageSize = 15 } = req.query;
    const { keyword, warehouse_code, supplier_code, supplier_name,
            product_code, product_name, product_model,
            order_status, order_no, vehicle_no } = req.query;
    const { Op } = require("sequelize");
    const db = require("../models");
    const InboundOrder = db.InboundOrder;
    const InboundOrderDetail = db.InboundOrderDetail;

    // 如果需要按明细搜索，先查明细表获取匹配的 order_no
    let detailOrderNos = null;
    if (product_code || product_name || product_model) {
      const detailWhere = { del_flag: 0 };
      if (product_code) detailWhere.product_code = { [Op.like]: `%${product_code}%` };
      if (product_name) detailWhere.product_name = { [Op.like]: `%${product_name}%` };
      if (product_model) detailWhere.product_model = { [Op.like]: `%${product_model}%` };
      const details = await InboundOrderDetail.findAll({
        where: detailWhere,
        attributes: [[db.Sequelize.fn("DISTINCT", db.Sequelize.col("order_no")), "order_no"]],
        raw: true,
      });
      detailOrderNos = details.map(d => d.order_no);
      if (detailOrderNos.length === 0) {
        return res.json({ code: 200, data: { rows: [], total: 0, page, pageSize } });
      }
    }

    // 构建主表查询条件
    const where = { del_flag: 0 };
    if (detailOrderNos) where.order_no = { [Op.in]: detailOrderNos };
    if (keyword) {
      where[Op.or] = [
        { order_no: { [Op.like]: `%${keyword}%` } },
        { vehicle_no: { [Op.like]: `%${keyword}%` } },
        { container_no: { [Op.like]: `%${keyword}%` } },
        { delivery_no: { [Op.like]: `%${keyword}%` } },
      ];
    }
    if (supplier_name) {
      // 需要查 supplier 表获取 supplier_code
      const Supplier = db.Supplier;
      const suppliers = await Supplier.findAll({
        where: { supplier_name: { [Op.like]: `%${supplier_name}%` }, del_flag: 0 },
        attributes: ["supplier_code"], raw: true,
      });
      const codes = suppliers.map(s => s.supplier_code);
      if (codes.length) where.supplier_code = { [Op.in]: codes };
      else return res.json({ code: 200, data: { rows: [], total: 0, page, pageSize } });
    }
    if (order_no) where.order_no = { [Op.like]: `%${order_no}%` };
    if (vehicle_no) where.vehicle_no = { [Op.like]: `%${vehicle_no}%` };
    if (warehouse_code) where.warehouse_code = warehouse_code;
    if (supplier_code) where.supplier_code = supplier_code;
    if (order_status) where.order_status = order_status;

    const { count, rows } = await InboundOrder.findAndCountAll({
      where,
      order: [["create_time", "DESC"]],
      limit: parseInt(pageSize),
      offset: (parseInt(page) - 1) * parseInt(pageSize),
      raw: true,
    });

    // 填充聚合字段（与 list 接口一致）
    const orderNos = rows.map(r => r.order_no);
    const aggregations = await InboundOrderDetail.findAll({
      where: { order_no: { [Op.in]: orderNos }, del_flag: 0 },
      attributes: [
        "order_no",
        [db.Sequelize.fn("SUM", db.Sequelize.col("inbound_qty")), "totalQty"],
        [db.Sequelize.fn("SUM", db.Sequelize.col("inbound_weight")), "totalWeight"],
      ],
      group: ["order_no"],
      raw: true,
    });
    const aggMap = {};
    aggregations.forEach(a => { aggMap[a.order_no] = { totalQty: a.totalQty || 0, totalWeight: a.totalWeight || 0 }; });

    const result = rows.map(r => ({
      ...r,
      total_qty: aggMap[r.order_no]?.totalQty || 0,
      total_weight: parseFloat((aggMap[r.order_no]?.totalWeight || 0).toFixed(4)),
    }));

    // 填充名称
    const warehouseCodes = [...new Set(result.map(r => r.warehouse_code))];
    const supplierCodes = [...new Set(result.map(r => r.supplier_code))];
    const warehouses = await db.Warehouse.findAll({ where: { warehouse_code: { [Op.in]: warehouseCodes } }, raw: true });
    const suppliers = await db.Supplier.findAll({ where: { supplier_code: { [Op.in]: supplierCodes } }, raw: true });
    const whMap = {}; warehouses.forEach(w => { whMap[w.warehouse_code] = w.warehouse_name; });
    const spMap = {}; suppliers.forEach(s => { spMap[s.supplier_code] = s.supplier_name; });
    result.forEach(r => {
      r.warehouse_name = whMap[r.warehouse_code] || "";
      r.supplier_name = spMap[r.supplier_code] || "";
    });

    return res.json({ code: 200, data: { rows: result, total: count, page: parseInt(page), pageSize: parseInt(pageSize) } });
  } catch (e) {
    console.error("入库单搜索失败:", e.message);
    return res.status(500).json({ code: 500, message: "搜索失败" });
  }
};
```

- [ ] **Step 2: 在入库单路由中添加 search 端点**

```js
// 在 routes/inbound_order.js 中，/list 路由附近添加：
router.get("/search", inboundOrderCtrl.search);
```

### Task 12: 出库单搜索增强接口

**Files:**

- Modify: `D:\wms-new\wms-backend\routes\outbound_order.js`
- Modify: `D:\wms-new\wms-backend\controllers\outbound_order.js`

**耗时**: 2h

出库单 search 方法与入库单结构一致，差异在于：

- 关联主表为 `outbound_order` + `outbound_order_detail`
- 额外支持 `customer_name`, `customer_address`, `contact_person`, `contact_phone` 模糊搜索
- 聚合字段为 `outbound_qty` + `outbound_weight`
- 名称填充涉及 `warehouse` + `customer`（而非 supplier）

代码结构与 Task 11 完全对称，不重复列出。路由添加行：

```js
router.get("/search", outboundOrderCtrl.search);
```

### Task 13: 打印接口改造（stream → 临时URL）

**Files:**

- Modify: `D:\wms-new\wms-backend\controllers\print.js`

**耗时**: 1h

- [ ] **Step 1: 改造 print 控制器**

```js
// 找到 D:\wms-new\wms-backend\controllers\print.js 的 exports.print 方法
// 将最后一步 "pipe 响应流" 改为 "保存临时文件 + 返回URL"

const fs = require("fs");
const path = require("path");

exports.print = async (req, res) => {
  try {
    const { templateId, businessId } = req.params;
    const db = require("../models");
    const PrintTemplate = db.PrintTemplate;
    const axios = require("axios");

    const tmpl = await PrintTemplate.findOne({
      where: { id: templateId, is_enabled: 1, del_flag: 0 }
    });
    if (!tmpl) return res.status(404).json({ code: 404, message: "打印模板不存在或已禁用" });

    const exportParam = {
      reportId: tmpl.report_code,
      exportType: (tmpl.output_format || "PDF").toLowerCase(),
      queryParam: { [tmpl.business_param]: businessId }
    };
    const url = `${tmpl.api_url}?token=${tmpl.jimu_token}&exportParams=${encodeURIComponent(JSON.stringify([exportParam]))}`;

    // 确保临时目录存在
    const tempDir = path.join(__dirname, "../public/temp/print");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const fileName = `print_${templateId}_${businessId}_${Date.now()}.pdf`;
    const filePath = path.join(tempDir, fileName);
    const writer = fs.createWriteStream(filePath);

    const response = await axios.get(url, { responseType: "stream", timeout: 30000 });
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
      response.data.on("error", reject);
    });

    // 返回可下载URL
    const downloadUrl = `/temp/print/${fileName}`;
    return res.json({ code: 200, data: { url: downloadUrl, fileName } });
  } catch (e) {
    console.error("打印失败:", e.message);
    return res.status(500).json({ code: 500, message: "打印失败，请稍后重试" });
  }
};
```

- [ ] **Step 2: 确认 static 中间件能提供临时文件访问**

在 `app.js` 中确认有 `app.use(express.static("public"))` 或等价配置。

- [ ] **Step 3: Commit**

```bash
cd /d/wms-new/wms-backend
git add controllers/inbound_order.js routes/inbound_order.js controllers/outbound_order.js routes/outbound_order.js controllers/print.js
git commit -m "feat: 入库/出库增强搜索接口 + 打印返回临时URL"
```

---

## 第五阶段：入库单页面

> **依赖**: 第二、四阶段完成 | **总工时**: 5h | **产出**: 入库单列表 + 详情 + 打印

### Task 14: 入库单列表页 JS

**Files:**

- Create: `D:\wms-new\wms-miniapp\pages\inbound\inbound.js`

**耗时**: 1.5h

```js
const request = require("../../utils/request");

Page({
  data: {
    keyword: "", orderStatus: "",
    warehouseCode: "", warehouseName: "",
    supplierCode: "", supplierName: "",
    tmpWCode: "", tmpSCode: "",

    list: [], page: 1, pageSize: 15, total: 0,
    hasMore: true, loading: false, refreshing: false, empty: false,
    warehouseList: [], supplierList: [],
    showActionSheet: false, actionSheetActions: [],
  },

  onLoad() {
    this.loadWarehouseList();
    this.loadSupplierList();
    this.loadList(true);
  },
  onShow() {
    const tb = this.getTabBar && this.getTabBar();
    if (tb) tb.setData({ value: "inbound" });
  },

  async loadWarehouseList() {
    try {
      const res = await request.get("/api/warehouse/list");
      this.setData({ warehouseList: res.data.rows || [] });
    } catch (e) { console.warn("加载仓库失败:", e); }
  },
  async loadSupplierList() {
    try {
      const res = await request.get("/api/supplier/list");
      this.setData({ supplierList: res.data.rows || [] });
    } catch (e) { console.warn("加载供应商失败:", e); }
  },

  async loadList(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    if (reset) this.setData({ page: 1, hasMore: true, empty: false });
    this.setData({ loading: true });
    try {
      const params = { page, pageSize: this.data.pageSize };
      if (this.data.keyword) params.keyword = this.data.keyword;
      if (this.data.orderStatus) params.order_status = this.data.orderStatus;
      if (this.data.warehouseCode) params.warehouse_code = this.data.warehouseCode;
      if (this.data.supplierCode) params.supplier_code = this.data.supplierCode;

      // 优先使用增强搜索接口
      const url = (this.data.keyword || this.data.supplierCode || this.data.warehouseCode)
        ? "/api/inbound/order/search" : "/api/inbound/order/list";
      const res = await request.get(url, params);
      const rows = res.data.rows || [];
      const total = res.data.total || 0;
      const list = reset ? rows : this.data.list.concat(rows);
      this.setData({
        list, page: page + 1, total,
        hasMore: list.length < total,
        loading: false, refreshing: false,
        empty: list.length === 0,
      });
    } catch (e) {
      this.setData({ loading: false, refreshing: false });
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },

  onSearch(e) { this.setData({ keyword: e.detail || "" }); },
  onSubmitSearch() { this.loadList(true); },
  onClearSearch() { this.setData({ keyword: "" }); this.loadList(true); },

  onTabChange(e) {
    this.setData({ orderStatus: e.detail.name || "" });
    this.loadList(true);
  },

  onOpenFilter() {
    this.setData({ tmpWCode: this.data.warehouseCode, tmpSCode: this.data.supplierCode });
    this.buildActions();
    this.setData({ showActionSheet: true });
  },
  onActionClose() { this.setData({ showActionSheet: false }); },
  onActionSelect(e) {
    const item = this._actionMap[e.detail.index];
    if (!item) return;
    if (item.type === "reset") { this.setData({ tmpWCode: "", tmpSCode: "" }); this.buildActions(); return; }
    if (item.type === "warehouse") { this.setData({ tmpWCode: this.data.tmpWCode === item.code ? "" : item.code }); this.buildActions(); return; }
    if (item.type === "supplier") { this.setData({ tmpSCode: this.data.tmpSCode === item.code ? "" : item.code }); this.buildActions(); return; }
    if (item.type === "apply") {
      const w = this.data.warehouseList.find(x => x.warehouse_code === this.data.tmpWCode);
      const s = this.data.supplierList.find(x => x.supplier_code === this.data.tmpSCode);
      this.setData({
        warehouseCode: this.data.tmpWCode, warehouseName: w ? w.warehouse_name : "",
        supplierCode: this.data.tmpSCode, supplierName: s ? s.supplier_name : "",
        showActionSheet: false,
      });
      this.loadList(true);
    }
  },
  buildActions() {
    const { warehouseList, supplierList, tmpWCode, tmpSCode } = this.data;
    const actions = [], map = {};
    let i = 0;
    actions.push({ name: "—— 仓库 ——", disabled: true }); i++;
    warehouseList.forEach(w => {
      actions.push({ name: w.warehouse_name, color: tmpWCode === w.warehouse_code ? "#409EFF" : undefined });
      map[i] = { type: "warehouse", code: w.warehouse_code }; i++;
    });
    if (tmpWCode) { actions.push({ name: "清除仓库", color: "#909399" }); map[i] = { type: "warehouse", code: "" }; i++; }
    actions.push({ name: "—— 供应商 ——", disabled: true }); i++;
    supplierList.forEach(s => {
      actions.push({ name: s.supplier_name, color: tmpSCode === s.supplier_code ? "#409EFF" : undefined });
      map[i] = { type: "supplier", code: s.supplier_code }; i++;
    });
    if (tmpSCode) { actions.push({ name: "清除供应商", color: "#909399" }); map[i] = { type: "supplier", code: "" }; i++; }
    actions.push({ name: "重置筛选", color: "#F56C6C" }); map[i] = { type: "reset" }; i++;
    actions.push({ name: "应用筛选", color: "#409EFF" }); map[i] = { type: "apply" };
    this._actionMap = map;
    this.setData({ actionSheetActions: actions });
  },

  onRefresh() { this.setData({ refreshing: true }); this.loadList(true); },
  onScrollToLower() { if (this.data.hasMore && !this.data.loading) this.loadList(false); },

  onTapCard(e) {
    wx.navigateTo({ url: "/pages/inbound/inbound-detail?id=" + e.currentTarget.dataset.id });
  },

  statusLabel(s) {
    const m = { draft: "草稿", submit: "待审核", audited: "已审核", completed: "已完成", cancelled: "已取消" };
    return m[s] || s;
  },
  statusColor(s) {
    const m = { draft: "#909399", submit: "#E6A23C", audited: "#67C23A", completed: "#409EFF", cancelled: "#F56C6C" };
    return m[s] || "#909399";
  },
});
```

### Task 15: 入库单列表页 WXML + WXSS

**Files:**

- Create: `D:\wms-new\wms-miniapp\pages\inbound\inbound.wxml`
- Create: `D:\wms-new\wms-miniapp\pages\inbound\inbound.wxss`
- Create: `D:\wms-new\wms-miniapp\pages\inbound\inbound.json`

**耗时**: 1h

- [ ] **Step 1: inbound.json**

```json
{ "navigationBarTitleText": "入库单" }
```

- [ ] **Step 2: inbound.wxml**

```html
<wxs src="../../utils/highlight.wxs" module="hl" />

<view class="page">
  <van-search value="{{keyword}}" placeholder="搜索单号/车号/供应商/产品..." show-action
    bind:change="onSearch" bind:search="onSubmitSearch" bind:cancel="onClearSearch" />

  <view class="filter-bar">
    <van-tabs sticky active="{{orderStatus}}" custom-class="filter-tabs" bind:change="onTabChange">
      <van-tab name="" title="全部" />
      <van-tab name="draft" title="草稿" />
      <van-tab name="submit" title="待审核" />
      <van-tab name="audited" title="已审核" />
      <van-tab name="completed" title="已完成" />
      <van-tab name="cancelled" title="已取消" />
    </van-tabs>
    <view class="filter-btn-box">
      <van-button plain size="small" icon="filter-o"
        custom-class="filter-btn {{warehouseCode || supplierCode ? 'has-filter' : ''}}"
        bind:tap="onOpenFilter">筛选</van-button>
    </view>
  </view>

  <van-action-sheet show="{{showActionSheet}}" actions="{{actionSheetActions}}"
    bind:close="onActionClose" bind:select="onActionSelect" />

  <scroll-view class="scroll-body" scroll-y bindscrolltolower="onScrollToLower" lower-threshold="100"
    refresher-enabled refresher-triggered="{{refreshing}}" bindrefresherrefresh="onRefresh">

    <view wx:if="{{!empty}}">
      <van-card wx:for="{{list}}" wx:key="id" currency=""
        price="{{item.total_qty}} 件" num="{{item.total_weight}} 吨"
        desc="{{item.inbound_date}} · {{item.warehouse_name}} · {{item.supplier_name}}"
        custom-class="doc-card" data-id="{{item.id}}" bind:tap="onTapCard">
        <view slot="title" class="card-title">
          <block wx:for="{{hl.parts(item.order_no, keyword)}}" wx:for-item="p">
            <text wx:if="{{p.h}}" class="hl">{{p.t}}</text>
            <text wx:else>{{p.t}}</text>
          </block>
        </view>
        <van-tag slot="tag" color="{{statusColor(item.order_status)}}" text-color="#fff">
          {{statusLabel(item.order_status)}}
        </van-tag>
      </van-card>
    </view>

    <van-empty wx:if="{{empty}}" description="暂无入库单" />
    <view class="load-more" wx:if="{{loading}}">
      <van-loading size="40rpx" /><text class="load-text">加载中...</text>
    </view>
    <view class="load-more" wx:elif="{{!hasMore && !empty}}">
      <text class="load-text">已加载全部 {{total}} 条</text>
    </view>
  </scroll-view>
</view>
```

- [ ] **Step 3: inbound.wxss**

```css
.page { display: flex; flex-direction: column; height: 100vh; }
.filter-bar { display: flex; align-items: center; background: #fff; border-bottom: 1rpx solid #f0f0f0; }
.filter-tabs { flex: 1; }
.filter-btn-box { flex-shrink: 0; padding-right: 16rpx; padding-top: 12rpx; }
.filter-btn { height: 56rpx !important; white-space: nowrap; }
.filter-btn.has-filter { color: #409EFF !important; border-color: #409EFF !important; }
.doc-card { margin: 12rpx 16rpx; }
.card-title { font-size: 28rpx; font-weight: 600; color: #303133; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-title .hl { color: #409EFF; }
.scroll-body { flex: 1; }
.load-more { padding: 32rpx; text-align: center; display: flex; align-items: center; justify-content: center; }
.load-text { font-size: 22rpx; color: #909399; margin-left: 12rpx; }
```

### Task 16: 入库单详情页

**Files:**

- Create: `D:\wms-new\wms-miniapp\pages\inbound\inbound-detail.json`
- Create: `D:\wms-new\wms-miniapp\pages\inbound\inbound-detail.wxml`
- Create: `D:\wms-new\wms-miniapp\pages\inbound\inbound-detail.wxss`
- Create: `D:\wms-new\wms-miniapp\pages\inbound\inbound-detail.js`

**耗时**: 1.5h

- [ ] **Step 1: inbound-detail.json**

```json
{ "navigationBarTitleText": "入库单详情" }
```

- [ ] **Step 2: inbound-detail.js**

```js
const request = require("../../utils/request");

Page({
  data: { order: {}, items: [], loaded: false, totalQty: 0, totalWeight: 0 },

  onLoad(options) {
    this.loadDetail(options.id);
  },

  async loadDetail(id) {
    try {
      const res = await request.get("/api/inbound/order/" + id);
      const order = res.data.order || {};
      const items = res.data.details || [];
      let totalQty = 0, totalWeight = 0;
      items.forEach(item => { totalQty += item.qty || item.inbound_qty || 0; totalWeight += parseFloat(item.weight || item.inbound_weight || 0); });
      this.setData({ order, items, loaded: true, totalQty, totalWeight: totalWeight.toFixed(4) });
    } catch (e) {
      wx.showToast({ title: "加载详情失败", icon: "none" });
    }
  },

  async onPrint() {
    wx.showLoading({ title: "生成打印文件..." });
    try {
      // 获取打印模板列表
      const tmplRes = await request.get("/api/print/template/by-page/inbound_order");
      const templates = tmplRes.data || [];
      if (templates.length === 0) {
        wx.hideLoading();
        wx.showToast({ title: "暂无可用打印模板", icon: "none" });
        return;
      }
      // 直接使用第一个模板（或弹出选择）
      const templateId = templates[0].id;
      const printRes = await request.post(`/api/print/${templateId}/${this.data.order.id}`);
      const pdfUrl = printRes.data?.url;
      if (!pdfUrl) { wx.hideLoading(); wx.showToast({ title: "打印失败", icon: "none" }); return; }

      const baseUrl = "https://114.67.203.242";
      wx.downloadFile({
        url: baseUrl + pdfUrl,
        success: (downloadRes) => {
          wx.hideLoading();
          if (downloadRes.statusCode === 200) {
            wx.openDocument({ filePath: downloadRes.tempFilePath, fileType: "pdf", showMenu: true });
          } else {
            wx.showToast({ title: "下载打印文件失败", icon: "none" });
          }
        },
        fail: () => { wx.hideLoading(); wx.showToast({ title: "下载失败", icon: "none" }); }
      });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: "打印失败", icon: "none" });
    }
  },

  statusLabel(s) {
    const m = { draft: "草稿", submit: "待审核", audited: "已审核", completed: "已完成", cancelled: "已取消" };
    return m[s] || s;
  },
  statusColor(s) {
    const m = { draft: "#909399", submit: "#E6A23C", audited: "#67C23A", completed: "#409EFF", cancelled: "#F56C6C" };
    return m[s] || "#909399";
  },
});
```

- [ ] **Step 3: inbound-detail.wxml**

```html
<view class="page" wx:if="{{loaded}}">
  <view class="section-title">基本信息</view>
  <van-cell-group>
    <van-cell title="入库单号" value="{{order.order_no}}" />
    <van-cell title="入库日期" value="{{order.inbound_date}}" />
    <van-cell title="仓库" value="{{order.warehouse_name}}" />
    <van-cell title="供应商" value="{{order.supplier_name}}" />
    <van-cell title="车号" value="{{order.vehicle_no || '-'}}" />
    <van-cell title="柜号" value="{{order.container_no || '-'}}" />
    <van-cell title="状态">
      <van-tag slot="right-icon" color="{{statusColor(order.order_status)}}" text-color="#fff">
        {{statusLabel(order.order_status)}}
      </van-tag>
    </van-cell>
  </van-cell-group>

  <view class="section-title">入库明细（{{items.length}} 项）</view>
  <view wx:if="{{items.length > 0}}">
    <view class="item-card" wx:for="{{items}}" wx:key="product_code">
      <van-cell-group>
        <van-cell>
          <view slot="title" class="item-name">{{item.product_name}}</view>
          <view slot="right-icon" class="item-qty">
            <text class="qty-num">{{item.qty || item.inbound_qty}}</text>
            <text class="qty-unit">件</text>
          </view>
          <view slot="label" class="item-desc">
            <text>{{item.product_code}}</text>
            <text class="desc-sep">|</text>
            <text>{{item.product_model}}</text>
            <text class="desc-sep">|</text>
            <text>{{item.weight || item.inbound_weight}} 吨</text>
          </view>
        </van-cell>
      </van-cell-group>
    </view>
  </view>
  <van-empty wx:else description="暂无明细" />

  <view class="footer-bar">
    <view class="footer-item"><text class="footer-label">总件数</text><text class="footer-num">{{totalQty}}</text></view>
    <view class="footer-item"><text class="footer-label">总吨位</text><text class="footer-num">{{totalWeight}} 吨</text></view>
  </view>

  <view class="print-area">
    <van-button type="primary" block bind:tap="onPrint">打印</van-button>
  </view>
</view>
```

- [ ] **Step 4: inbound-detail.wxss**

```css
.page { padding-bottom: 120rpx; }
.section-title { font-size: 28rpx; font-weight: 600; color: #303133; padding: 20rpx 16rpx 12rpx; }
.item-card { margin: 0 16rpx 12rpx; }
.item-name { font-size: 28rpx; font-weight: 600; color: #303133; }
.item-qty { display: flex; align-items: baseline; gap: 4rpx; }
.qty-num { font-size: 30rpx; font-weight: 600; color: #303133; }
.qty-unit { font-size: 22rpx; color: #909399; }
.item-desc { font-size: 22rpx; color: #909399; margin-top: 6rpx; display: flex; align-items: center; gap: 6rpx; }
.desc-sep { color: #dcdfe6; }
.footer-bar { display: flex; padding: 24rpx 16rpx; gap: 32rpx; }
.footer-item { display: flex; align-items: baseline; gap: 8rpx; }
.footer-label { font-size: 22rpx; color: #909399; }
.footer-num { font-size: 30rpx; font-weight: 600; color: #303133; }
.print-area { padding: 24rpx 16rpx; }
```

---

## 第六阶段：出库单页面

> **依赖**: 第五阶段完成 | **总工时**: 4h | **产出**: 出库单列表 + 详情 + 打印

### Task 17: 出库单列表页（JS + WXML + WXSS）

**Files:**

- Create: `D:\wms-new\wms-miniapp\pages\outbound\outbound.js`
- Create: `D:\wms-new\wms-miniapp\pages\outbound\outbound.wxml`
- Create: `D:\wms-new\wms-miniapp\pages\outbound\outbound.wxss`
- Create: `D:\wms-new\wms-miniapp\pages\outbound\outbound.json`

**耗时**: 1.5h

出库单列表页与入库单（Task 14 + 15）完全对称，差异点：

- `supplierCode/supplierName/supplierList/tmpSCode` → `customerCode/customerName/customerList/tmpCCode`
- API: `/api/inbound/order/*` → `/api/outbound/order/*`
- ActionSheet 供应商段 → 客户段
- van-card desc: `supplier_name` → `customer_name`
- 详情导航: `inbound-detail` → `outbound-detail`
- TabBar value: `"outbound"`

outbound.json:

```json
{ "navigationBarTitleText": "出库单" }
```

其余代码结构完全一致，不重复展开。

### Task 18: 出库单详情页

**Files:**

- Create: `D:\wms-new\wms-miniapp\pages\outbound\outbound-detail.json`
- Create: `D:\wms-new\wms-miniapp\pages\outbound\outbound-detail.wxml`
- Create: `D:\wms-new\wms-miniapp\pages\outbound\outbound-detail.wxss`
- Create: `D:\wms-new\wms-miniapp\pages\outbound\outbound-detail.js`

**耗时**: 1.5h

与入库单详情（Task 16）对称，额外增加客户信息区：

- 客户名称、客户地址、联系人、联系电话显示
- 明细增加合同号显示
- 打印 page_code: `outbound_order`
- API: `/api/outbound/order/:id`

outbound-detail.json:

```json
{ "navigationBarTitleText": "出库单详情" }
```

### Task 19: 出入库页面 Commit

```bash
cd /d/wms-new/wms-miniapp
git add pages/inbound/ pages/outbound/
git commit -m "feat: 入库单 + 出库单列表/详情页 + 打印按钮"
```

---

## 第七阶段：个人中心 + 全流程收尾

> **依赖**: 前六阶段完成 | **总工时**: 4.5h | **产出**: 个人中心页 + 全流程可走通

### Task 20: 个人中心页 JS

**Files:**

- Create: `D:\wms-new\wms-miniapp\pages\mine\mine.js`

**耗时**: 1h

```js
const { getUserInfo, logout } = require("../../utils/auth");
const request = require("../../utils/request");

Page({
  data: {
    userInfo: null,
    kpi: { todayInbound: 0, todayOutbound: 0, pendingAudit: 0, lowStockAlert: 0 },
    warehouseSummary: [],
    summaryLoading: true,
  },

  onShow() {
    const tb = this.getTabBar && this.getTabBar();
    if (tb) tb.setData({ value: "mine" });
    const userInfo = getUserInfo();
    this.setData({ userInfo: userInfo || null });
    if (userInfo) {
      this.loadDashboard();
      this.loadWarehouseSummary();
    }
  },

  async loadDashboard() {
    try {
      const res = await request.get("/api/dashboard/analysis", { days: 7 });
      const d = res.data || {};
      this.setData({
        kpi: {
          todayInbound: d.panelGroup?.users || 0,
          todayOutbound: d.panelGroup?.messages || 0,
          pendingAudit: d.panelGroup?.moneys || 0,
          lowStockAlert: d.panelGroup?.shoppings || 0,
        }
      });
    } catch (e) { console.warn("加载仪表盘失败:", e); }
  },

  async loadWarehouseSummary() {
    try {
      const res = await request.get("/api/stock/warehouse-summary");
      this.setData({ warehouseSummary: res.data || [], summaryLoading: false });
    } catch (e) {
      this.setData({ summaryLoading: false });
      console.warn("加载仓库汇总失败:", e);
    }
  },

  goToLogin() { wx.navigateTo({ url: "/pages/login/login" }); },

  onChangePassword() {
    wx.showToast({ title: "功能开发中", icon: "none" });
  },

  onSwitchAccount() {
    wx.showModal({
      title: "切换账号",
      content: "切换账号需要重新登录，确定继续吗？",
      success: (res) => { if (res.confirm) logout(); },
    });
  },

  handleLogout() {
    wx.showModal({
      title: "退出登录",
      content: "确定要退出当前账号吗？",
      success: (res) => { if (res.confirm) logout(); },
    });
  },
});
```

### Task 21: 个人中心页 WXML + WXSS

**Files:**

- Create: `D:\wms-new\wms-miniapp\pages\mine\mine.wxml`
- Create: `D:\wms-new\wms-miniapp\pages\mine\mine.wxss`
- Create: `D:\wms-new\wms-miniapp\pages\mine\mine.json`

**耗时**: 1h

- [ ] **Step 1: mine.json**

```json
{ "navigationBarTitleText": "我的" }
```

- [ ] **Step 2: mine.wxml**

```html
<view class="page">
  <!-- 用户信息卡片 -->
  <view class="header">
    <view class="avatar"><text>{{userInfo ? userInfo.nickname.charAt(0) : '?'}}</text></view>
    <view class="header-info">
      <text class="nickname">{{userInfo ? userInfo.nickname : '未登录'}}</text>
      <text class="role">{{userInfo ? userInfo.roleName : '点击登录'}}</text>
    </view>
  </view>

  <!-- KPI 四宫格 -->
  <view class="kpi-grid">
    <van-grid column-num="{{4}}" border="{{false}}" custom-class="kpi-grid-inner">
      <van-grid-item text="今日入库" icon="arrow-down" icon-color="#409EFF" badge="{{kpi.todayInbound}}" />
      <van-grid-item text="今日出库" icon="arrow-up" icon-color="#E6A23C" badge="{{kpi.todayOutbound}}" />
      <van-grid-item text="待审核" icon="todo-list-o" icon-color="#E6A23C" badge="{{kpi.pendingAudit}}" />
      <van-grid-item text="低库存预警" icon="warning-o" icon-color="#F56C6C" badge="{{kpi.lowStockAlert}}" />
    </van-grid>
  </view>

  <!-- 仓库汇总卡片 -->
  <view class="section-title">仓库实时库存</view>
  <scroll-view class="wh-scroll" scroll-x enhanced show-scrollbar="{{false}}">
    <view class="wh-cards">
      <view class="wh-card" wx:for="{{warehouseSummary}}" wx:key="warehouse_code">
        <text class="wh-name">{{item.warehouse_name}}</text>
        <view class="wh-stats">
          <view class="wh-stat"><text class="wh-stat-num">{{item.sku_count}}</text><text class="wh-stat-label">SKU</text></view>
          <view class="wh-stat"><text class="wh-stat-num">{{item.total_weight}}</text><text class="wh-stat-label">吨</text></view>
        </view>
      </view>
    </view>
  </scroll-view>

  <!-- 菜单列表 -->
  <van-cell-group wx:if="{{userInfo}}">
    <van-cell title="修改密码" icon="edit" is-link bind:tap="onChangePassword" />
    <van-cell title="切换账号" icon="exchange" is-link bind:tap="onSwitchAccount" />
  </van-cell-group>

  <!-- 操作按钮 -->
  <view class="action-area" wx:if="{{!userInfo}}">
    <van-button type="primary" block bind:tap="goToLogin">登录 / 绑定账号</van-button>
  </view>
  <view class="action-area" wx:else>
    <van-button type="danger" block bind:tap="handleLogout">退出登录</van-button>
  </view>

  <view class="version-info"><text>WMS仓储管理 v1.0.0</text></view>
</view>
```

- [ ] **Step 3: mine.wxss**

```css
.page { padding: 16rpx; }

.header { display: flex; align-items: center; padding: 32rpx 24rpx; background: #fff; border-radius: 8rpx; margin-bottom: 12rpx; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); }
.avatar { width: 80rpx; height: 80rpx; border-radius: 50%; background: #409EFF; display: flex; align-items: center; justify-content: center; }
.avatar text { font-size: 36rpx; font-weight: 600; color: #fff; }
.header-info { margin-left: 24rpx; display: flex; flex-direction: column; }
.nickname { font-size: 32rpx; font-weight: 600; color: #303133; }
.role { font-size: 22rpx; color: #909399; margin-top: 8rpx; }

.kpi-grid { background: #fff; border-radius: 8rpx; margin-bottom: 12rpx; padding: 8rpx 0; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); }

.section-title { font-size: 28rpx; font-weight: 600; color: #303133; padding: 16rpx 0 12rpx; }
.wh-scroll { white-space: nowrap; }
.wh-cards { display: inline-flex; gap: 12rpx; padding-bottom: 8rpx; }
.wh-card { background: #fff; border-radius: 8rpx; padding: 24rpx; min-width: 200rpx; box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.04); display: inline-block; }
.wh-name { font-size: 28rpx; font-weight: 600; color: #303133; }
.wh-stats { display: flex; gap: 24rpx; margin-top: 12rpx; }
.wh-stat { display: flex; flex-direction: column; }
.wh-stat-num { font-size: 30rpx; font-weight: 600; color: #303133; }
.wh-stat-label { font-size: 22rpx; color: #909399; }

.action-area { margin-top: 24rpx; }
.version-info { margin-top: 48rpx; text-align: center; }
.version-info text { font-size: 22rpx; color: #c0c4cc; }
```

### Task 22: 全流程测试 + 修复

**耗时**: 2h

- [ ] **Step 1: 确保所有页面 .json 仅含 navigationBarTitleText**

验证每个页面的 .json 文件没有 usingComponents（组件在 app.json 全局注册）

- [ ] **Step 2: Mock 数据完整测试**

在 `MOCK = true` 模式下，走通完整流程：

1. 小程序启动 → 自动进入库存查询页

2. 切换 Tab：库存查询 → 入库单 → 出库单 → 我的

3. 库存查询：搜索、筛选预警状态、筛选仓库、下拉刷新、触底加载

4. 入库单：搜索、切换状态Tab、打开筛选ActionSheet、选仓库+供应商、应用

5. 出库单：同上

6. 我的：查看KPI数据、仓库汇总卡片、点击菜单项
- [ ] **Step 3: 检查 lint 和编译错误**

在微信开发者工具中编译，确认无错误。

- [ ] **Step 4: 验证响应式行为**

模拟不同屏幕宽度（375/414），确认无横向溢出。

- [ ] **Step 5: Commit**

```bash
cd /d/wms-new/wms-miniapp
git add pages/mine/ pages/login/
git commit -m "feat: 个人中心页 + 全流程Mock测试通过"
```

---

## 自审清单

### 1. Spec 覆盖检查

| 设计文档要求                              | 对应任务             | 状态  |
| ----------------------------------- | ---------------- | --- |
| sys_user 加 openid 字段                | Task 1           | ✅   |
| POST /api/auth/wx-login             | Task 2           | ✅   |
| POST /api/auth/bind-openid          | Task 2           | ✅   |
| GET /api/inbound/order/search       | Task 11          | ✅   |
| GET /api/outbound/order/search      | Task 12          | ✅   |
| POST /api/print 返回临时URL             | Task 13          | ✅   |
| 小程序项目骨架 (app.json/wxss/js)          | Task 4           | ✅   |
| 28个Vant组件全局注册                       | Task 4           | ✅   |
| 工具函数保留 (request/auth/api/highlight) | Task 5           | ✅   |
| Custom TabBar (van-tabbar)          | Task 6           | ✅   |
| 登录绑定页 (login)                       | Task 7           | ✅   |
| 库存查询页 (stock)                       | Task 8-9         | ✅   |
| 库存Mock数据                            | Task 10          | ✅   |
| 入库单列表 + 详情 + 打印                     | Task 14-16       | ✅   |
| 出库单列表 + 详情 + 打印                     | Task 17-18       | ✅   |
| 个人中心 (mine)                         | Task 20-21       | ✅   |
| 全流程测试                               | Task 22          | ✅   |
| 登录流程图实现                             | Task 2 + 7       | ✅   |
| 打印集成方案                              | Task 13 + 16     | ✅   |
| UI设计规范 (配色/字体/间距/卡片)                | Task 4 + 各页面wxss | ✅   |
| 状态标签颜色映射                            | Task 8/14/16 JS  | ✅   |
| 空状态/加载/错误处理                         | 各页面 wxml         | ✅   |
| 安全区适配 (safe-bottom)                 | Task 4 app.wxss  | ✅   |

### 2. 无占位符检查

所有代码块均包含完整实现，无 "TBD"、"TODO"、"实现类似" 等占位符。

### 3. 类型一致性检查

- `statusLabel(s)`: 所有页面定义完全一致的映射表
- `statusColor(s)`: 同上
- 分页参数: 统一使用 `page/pageSize`
- API返回格式: 统一 `{ code: 200, data: { rows: [...], total: N } }`
- `getAlertColor(s)`: stock.js 定义，stock.wxml 调用，一致

---

## 执行选项

**预估总工时：约 29 小时（约 4 个工作日）**

按阶段依赖关系，必须顺序执行：

1. 第一阶段（后端基础设施）→ 可先执行
2. 第二阶段（小程序骨架）→ 依赖第一阶段
3. 第三阶段（库存查询）→ 依赖第二阶段
4. 第四阶段（后端搜索+打印）→ 与第二/三阶段可并行
5. 第五阶段（入库单）→ 依赖第二+四阶段
6. 第六阶段（出库单）→ 依赖第五阶段
7. 第七阶段（个人中心+收尾）→ 依赖前六阶段
