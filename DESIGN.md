# WMS 微信小程序重制版——设计与实施方案

> 版本：v1.0 | 日期：2026-05-09 | 状态：待评审

---

## 一、现有系统分析总结

### 1.1 系统架构

```
┌─────────────────────┐     ┌──────────────────────────────┐     ┌─────────┐
│  微信小程序 (新)      │────▶│  Express + Sequelize + MySQL   │     │ 积木报表  │
│  Vant Weapp 1.11.7  │     │  (京东云 114.67.203.242)       │     │ JimuReport│
└─────────────────────┘     └──────────────────────────────┘     └─────────┘
                                       ▲
┌─────────────────────┐               │
│  PC 端 (已存在)      │───────────────┘
│  vue-pure-admin      │
│  Element Plus        │
└─────────────────────┘
```

### 1.2 现有后端 API 清单

#### 可完整复用的 API

| 路径 | 方法 | 用途 | 小程序使用场景 |
|------|------|------|---------------|
| `/api/warehouse/list` | GET | 仓库列表 | 库存查询、出入库单的仓库筛选 |
| `/api/supplier/list` | GET | 供应商列表 | 入库单的供应商筛选 |
| `/api/customer/list` | GET | 客户列表 | 出库单的客户筛选 |
| `/api/stock/list` | GET | 库存分页列表 | 库存查询 Tab 核心接口 |
| `/api/stock/warehouse-summary` | GET | 各仓库汇总(数量/吨位/SKU) | "我的"页仓库汇总卡片 |
| `/api/stock/journal/list` | GET | 库存流水分页列表 | 点击商品查看库存流水 |
| `/api/dashboard/analysis?days=7` | GET | Dashboard 分析数据 | "我的"页 KPI 卡片 + 趋势图 |
| `/api/inbound/order/list` | GET | 入库单分页列表 | 入库单查询 Tab |
| `/api/inbound/order/:id` | GET | 入库单详情 | 入库单详情页 |
| `/api/outbound/order/list` | GET | 出库单分页列表 | 出库单查询 Tab |
| `/api/outbound/order/:id` | GET | 出库单详情 | 出库单详情页 |
| `/api/print/template/by-page/:pageCode` | GET | 获取页面可用打印模板列表 | 详情页打印按钮 |
| `/api/print/:templateId/:businessId` | POST | 生成 PDF 返回文件流 | 详情页点击打印 |
| `/api/user/profile` | GET | 获取用户信息 | token 验证 + "我的"页展示 |
| `/api/user/change-password` | POST | 修改密码 | "我的"页修改密码菜单 |

#### 需要新增的后端 API

| 路径 | 方法 | 说明 | 小程序需求 |
|------|------|------|-----------|
| `POST /api/auth/wx-login` | POST | 微信静默登录 | 传入 `code`，后端换取 openid → 查 sys_user.openid → 存在返回 JWT，不存在返回 `{needBind: true, openid}` |
| `POST /api/auth/bind-openid` | POST | 绑定微信账号 | 传入 `{openid, username, password}` → 校验账号密码 → 写入 openid → 返回 JWT |
| `GET /api/inbound/order/search` | GET | 入库单增强搜索 | 支持按入库单明细中的 product_code/product_name/product_model 模糊搜索（现有 list 接口不支持明细级搜索） |
| `GET /api/outbound/order/search` | GET | 出库单增强搜索 | 支持按出库单明细中的 product_code/product_name/product_model 模糊搜索，额外支持客户 address/contact_person/contact_phone 搜索 |

### 1.3 aggre现有接口的参数支持情况

#### 现有接口已支持的筛选参数

**入库单列表** (`GET /api/inbound/order/list`)：
| 参数 | 类型 | 说明 |
|------|------|------|
| order_no | string | 单号模糊搜索 |
| vehicle_no | string | 车号模糊搜索 |
| container_no | string | 柜号模糊搜索 |
| warehouse_code | string | 仓库编码精确筛选 |
| supplier_code | string | 供应商编码精确筛选 |
| delivery_no | string | 来货单号模糊搜索 |
| bill_type_code | string | 单据类型筛选 |
| order_status | string | 状态筛选 (draft/submit/audited/cancelled/completed) |
| inbound_date_start/end | date | 日期范围筛选 |
| audit_by | string | 审核人模糊搜索 |
| create_by | string | 创建人模糊搜索 |

**缺失**：不支持按入库单明细中的产品编码/名称/型号搜索、不支持按供应商名称搜索

**出库单列表** (`GET /api/outbound/order/list`)：
同上基本一致，额外支持按 `customer_code` 精确筛选，但同样缺失按产品明细搜索和按客户名称/地址/联系人/电话搜索

**库存列表** (`GET /api/stock/list`)：
| 参数 | 类型 | 说明 |
|------|------|------|
| keyword | string | 模糊搜索（编码/名称/型号）|
| warehouse_code | string | 仓库编码精确筛选 |
| product_code | string | 产品编码精确筛选 |
| product_name | string | 产品名称模糊搜索 |
| product_model | string | 型号模糊搜索 |
| alert | string | 预警状态 (zero/low/high/normal) |

**支持较好**，keyword 参数已支持三合一模糊搜索。需要注意的是 `warehouse_code` 是单值精确匹配，不支持多选。

#### Dashboard 分析接口已有字段映射

`GET /api/dashboard/analysis?days=7` 返回值：
| 字段 | 含义 | 小程序"我的"页用途 |
|------|------|------------------|
| `panelGroup.users` | 今日入库吨位 | KPI 卡片1 |
| `panelGroup.messages` | 今日出库吨位 | KPI 卡片2 |
| `panelGroup.moneys` | 待处理数 | KPI 卡片3（待审核单据数）|
| `panelGroup.shoppings` | 低库存预警数 | KPI 卡片4 |
| `trendData` | 近N天趋势 [{name, inboundCount, outboundCount}] | 趋势图数据 |
| `recentDocs` | 最近业务单据列表 | 可放置在"我的"页下方 |

---

## 二、功能架构图

### 2.1 页面结构与导航

```
小程序启动
    │
    ├── 登录流程 (静默登录)
    │    ├── 有 token & 有效 → 直接进入
    │    ├── 无 token → wx.login() → POST /api/auth/wx-login
    │    │    ├── openid 匹配 → 返回 JWT
    │    │    └── openid 不匹配 → 跳转绑定页面
    │    └── 绑定页面 → 输入账号密码 → POST /api/auth/bind-openid
    │
    └── 主界面 (Custom TabBar)
         ├── Tab 1: 库存查询 (pages/stock/stock)
         │    ├── 搜索 + 仓库筛选
         │    ├── 库存卡片列表 (van-cell)
         │    └── 点击 → 库存详情 + 流水弹窗
         │
         ├── Tab 2: 入库单 (pages/inbound/inbound)
         │    ├── van-search (单号/车号/供应商/产品)
         │    ├── van-tabs (状态筛选)
         │    ├── van-action-sheet (仓库+供应商组合筛选)
         │    ├── van-card 列表
         │    └── 点击 → 入库单详情 + 打印按钮
         │
         ├── Tab 3: 出库单 (pages/outbound/outbound)
         │    ├── 同上 + 客户地址/联系人/电话搜索
         │    └── 点击 → 出库单详情 + 打印按钮
         │
         └── Tab 4: 我的 (pages/mine/mine)
              ├── 用户信息卡片
              ├── KPI 四宫格 (van-grid)
              ├── 仓库汇总卡片
              ├── 菜单列表 (修改密码/切换账号/退出)
              └── 版本信息
```

### 2.2 各页面功能模块说明

| 页面 | 核心功能 | 数据来源 |
|------|---------|---------|
| stock | 库存多条件搜索、预警标签、仓库筛选 | GET /api/stock/list |
| stock-detail(弹窗) | 商品流水记录查看 | GET /api/stock/journal/list |
| inbound | 入库单搜索、状态Tab筛选、仓库+供应商组合筛选 | GET /api/inbound/order/list |
| inbound-detail | 只读详情、打印 PDF | GET /api/inbound/order/:id + POST /api/print/... |
| outbound | 出库单搜索、状态Tab筛选、仓库+客户组合筛选 | GET /api/outbound/order/list |
| outbound-detail | 只读详情、打印 PDF | GET /api/outbound/order/:id + POST /api/print/... |
| mine | 用户信息、KPI卡片、仓库汇总、菜单 | GET /api/user/profile + /api/dashboard/analysis |
| login | 账号绑定 | POST /api/auth/bind-openid |

---

## 三、各页面详细设计

### 3.1 登录与绑定流程

```
小程序启动 → App.onLaunch()
  │
  ├─ 检查 wx.getStorageSync('token')
  │   ├─ 存在 → GET /api/user/profile 验证有效性
  │   │   ├─ 有效 → 进入主界面 (switchTab 库存查询)
  │   │   └─ 无效/过期 → wx.removeStorageSync('token') → 进入 wx.login 流程
  │   └─ 不存在 → 进入 wx.login 流程
  │
  └─ wx.login 流程:
        wx.login() 获取 code
        → POST /api/auth/wx-login { code }
        → 后端: code → openid (appid+secret) → 查 sys_user.openid
          ├─ 找到 → 生成 JWT → 返回 { token, userInfo } → 存入 Storage → 进入主界面
          └─ 未找到 → 返回 { needBind: true, openid }
                → 小程序跳转绑定页面 (pages/login/login)
                → 用户输入用户名+密码
                → POST /api/auth/bind-openid { openid, username, password }
                → 后端校验 → 写入 sys_user.openid → 返回 JWT → 进入主界面
```

**绑定页面设计 (pages/login/login)：**

| 元素 | 组件 | 说明 |
|------|------|------|
| Logo | `<image>` | 应用 Logo |
| 标题 | `<text>` | "WMS仓储管理" |
| 副标题 | `<text>` | "绑定已有系统账号" |
| 用户名输入 | `<van-field left-icon="contact">` | placeholder: "请输入用户名" |
| 密码输入 | `<van-field left-icon="lock" type="password">` | placeholder: "请输入密码" |
| 绑定按钮 | `<van-button type="primary" block loading="{{loading}}">` | 绑定账号 |
| 提示文字 | `<text>` | "首次使用需将微信与 WMS 系统账号绑定" |

### 3.2 库存查询页 (pages/stock/stock)

**搜索与筛选：**

| 控件 | 组件 | 数据/选项 |
|------|------|----------|
| 搜索栏 | `<van-search show-action>` | placeholder: "搜索商品编码/名称/型号" |
| 预警状态筛选 | `<van-dropdown-item>` | 全部/低库存/零库存/高库存/正常 |
| 仓库筛选 | `<van-dropdown-item>` | 全部仓库 + 动态加载仓库列表 |

**列表展示：**

| 元素 | 组件 | 数据绑定 |
|------|------|---------|
| 库存卡片 | `<van-cell-group>` + `<van-cell>` | 每行一张卡片 |
| 状态标签(左) | `<van-tag color="..." text-color="#fff">` | item.alert_status |
| 商品名称(中) | `slot="title"` + WXS keyword 高亮 | item.product_name |
| 库存数量(右) | `value` prop | `{{item.stock_qty}}件` |
| 编码/型号/仓库 | `slot="label"` 副标题行 | product_code \| product_model \| warehouse_name |

**交互：**
- 下拉刷新 → loadStockList(true)
- 触底加载更多 → loadStockList(false)
- 点击卡片 → 弹出库存详情弹窗（商品信息 + 近期流水）
- 流水弹窗关闭后回到列表

**注意：** 此页面不包含 KPI 卡片和仓库汇总卡片（已移至"我的"页）

### 3.3 入库单查询页 (pages/inbound/inbound)

**搜索与筛选：**

| 控件 | 类型 | 数据/说明 |
|------|------|----------|
| 搜索栏 | `<van-search show-action>` | 模糊搜索：单号/车号/供应商/产品编码/型号 |
| 状态筛选 | `<van-tabs sticky>` 六个Tab | 全部/草稿/待审核/已审核/已完成/已取消 |
| 筛选按钮 | `<van-button icon="filter-o">` | 打开 ActionSheet |
| 组合筛选 | `<van-action-sheet>` | 仓库列表 + 供应商列表 + 重置 + 应用 |
| 日期范围 | 二期考虑 | MVP 阶段暂不实现，通过搜索栏+筛选满足需求 |

**列表展示（van-card）：**

| van-card prop/slot | 内容 |
|-------------------|------|
| `slot="title"` | 单号（WXS keyword 高亮） |
| `desc` | `{{inbound_date}} · {{warehouse_name}} · {{supplier_name}}` |
| `price` | `{{total_qty}} 件` |
| `num` | `{{total_weight}} 吨` |
| `slot="tag"` | `<van-tag color="statusColor(...)">{{statusLabel(...)}}</van-tag>` |

**交互：**
- 下拉刷新/触底加载
- 点筛选按钮 → ActionSheet 弹出 → 选仓库+供应商 → 点"应用筛选"
- 点卡片 → navigateTo 入库单详情页

### 3.4 入库单详情页 (pages/inbound/inbound-detail)

**基本信息区 (`<van-cell-group>`)：**
入库单号、入库日期、仓库、供应商、车号、柜号、状态(标签)、备注

**明细列表 (`<van-cell-group>` 每行)：**
产品名称(标题) + 数量(右) | 编码 | 型号 | 吨位(副标题)

**底部合计栏：** 总件数 + 总吨位

**底部按钮区：**
- `<van-button type="primary" block>` 打印
- 点击后 → 获取该页面可用模板列表 `GET /api/print/template/by-page/inbound_order`
- 如果有多个模板，弹出选择；只有一个则直接调用
- `POST /api/print/:templateId/:businessId` → 返回 PDF 临时 URL
- `wx.downloadFile` → `wx.openDocument({filePath, fileType:'pdf'})`
- 用户在 PDF 预览页点右上角三个点 → 分享给同事

### 3.5 出库单查询页 (pages/outbound/outbound)

与入库单设计完全对称，差异点：
- 供应商 → 客户
- 搜索栏 placeholder: "搜索单号/客户/产品..."
- 组合筛选：仓库 + 客户（非供应商）
- 详情页额外展示：客户名称、客户地址、联系人、联系电话
- 明细列额外显示：合同号

### 3.6 出库单详情页 (pages/outbound/outbound-detail)

与入库单详情结构一致，增加客户信息区（客户名称/地址/联系人/电话）。

### 3.7 个人中心页 (pages/mine/mine)

**用户信息卡片：**
- 圆形头像（显示昵称首字，蓝色背景）
- 昵称 + 角色名称

**KPI 四宫格 (`<van-grid column-num="4">`)：**

| 格子 | 图标 | 颜色 | 数据 |
|------|------|------|------|
| 今日入库 | arrow-down | #409EFF | panelGroup.users (吨) |
| 今日出库 | arrow-up | #E6A23C | panelGroup.messages (吨) |
| 待审核 | todo-list-o | #E6A23C | panelGroup.moneys (个) |
| 低库存预警 | warning-o | #F56C6C | panelGroup.shoppings (个) |

**仓库实时库存汇总卡片：**
- API: `GET /api/stock/warehouse-summary`
- 横向可滑动卡片，每张显示：仓库名称 | SKU数 | 总吨位

**菜单列表 (`<van-cell-group>`)：**
- 修改密码 → wx.showModal / 跳转修改密码页
- 切换账号 → wx.showModal 确认 → logout → 重新登录
- 退出登录 → wx.showModal 确认 → logout

**底部：** 版本号 "WMS仓储管理 v1.0.0"

### 3.8 页面 .json 配置

所有页面的 `.json` 文件仅保留 `navigationBarTitleText`，组件通过 `app.json` 全局注册：

| 页面 | navigationBarTitleText |
|------|----------------------|
| stock | 库存查询 |
| inbound | 入库单 |
| inbound-detail | 入库单详情 |
| outbound | 出库单 |
| outbound-detail | 出库单详情 |
| mine | 我的 |
| login | 绑定账号 |

---

## 四、打印与积木报表集成方案

### 4.1 现有打印机制

PC 端已集成积木报表，流程如下：

```
PC端: PrintDropdown组件
  → GET /api/print/template/by-page/{pageCode}  (获取可用模板列表)
  → POST /api/print/{templateId}/{businessId}   (生成PDF)
  → 返回 PDF blob → URL.createObjectURL → window.open
```

后端 `POST /api/print/:templateId/:businessId` 的处理：
1. 查询 print_template 表（必须 enabled）
2. 构建积木报表 API 调用参数：
   ```json
   { reportId, exportType: "pdf", queryParam: { orderNo: "RK..." } }
   ```
3. 拼接 URL：`{api_url}?token={jimu_token}&exportParams={JSON}`
4. axios 代理请求积木报表，将 stream 直接 pipe 给客户端

### 4.2 小程序端适配方案

```
小程序详情页点击"打印"
  → GET /api/print/template/by-page/{pageCode}
    → 获取可用模板列表 [{ id, template_name, output_format }]
    → 单个模板直接调用，多个模板弹出选择
  → POST /api/print/{templateId}/{businessId}
    → 后端返回 PDF 文件流
    → 小程序接收二进制数据
    → wx.getFileSystemManager().writeFile 写入临时文件
    → wx.openDocument({ filePath, fileType: 'pdf', showMenu: true })
    → 用户可在预览页右上角 "..." 菜单中转发/分享
```

### 4.3 后端改造点

现有 `POST /api/print/:templateId/:businessId` 返回的是 HTTP 文件流，小程序端无法直接消费（需要先下载到本地）。有两种方案：

**方案 A（推荐）：返回临时下载 URL**
- 后端将 PDF 流保存到服务器临时目录（如 `public/temp/print/`）
- 返回 JSON: `{ success: true, data: { url: "https://domain.com/temp/print/xxx.pdf" } }`
- 小程序用 `wx.downloadFile` 下载 → `wx.openDocument` 打开
- 定时任务清理超过 10 分钟的临时文件

**方案 B：调整 HTTP 流响应**
- 确保响应头包含正确的 `Content-Type: application/pdf` + `Content-Disposition`
- 小程序用 `wx.request` + `responseType: 'arraybuffer'` 接收
- 写入本地临时文件 → `wx.openDocument` 打开

推荐方案 A，因为更稳定且可利用微信分享能力。

### 4.4 模板 page_code 对照

| 小程序页面 | page_code | business_param 值 |
|-----------|-----------|-------------------|
| 入库单详情 | inbound_order | orderNo |
| 出库单详情 | outbound_order | orderNo |

业务模板的具体绑定，后续在 PC 端打印配置页面（PrintConfig.vue）中管理。

---

## 五、UI 设计规范

### 5.1 配色方案（与 PC 端一致）

| 角色 | 色值 | 用途 |
|------|------|------|
| 主色 | #409EFF | 标签、按钮、链接、选中态 |
| 成功 | #67C23A | 正常状态、已审核、已确认 |
| 警告 | #E6A23C | 待审核、高库存 |
| 危险 | #F56C6C | 已取消、低库存、零库存 |
| 默认灰 | #909399 | 草稿、辅助文字 |
| 背景色 | #F0F2F5 | 页面全局背景 |
| 卡片白 | #FFFFFF | 所有卡片背景 |

### 5.2 卡片规范

```css
/* 标准卡片 */
.card {
  background: #fff;
  border-radius: 8rpx;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin: 16rpx 24rpx;
}

/* 页面背景 */
.page {
  background-color: #F0F2F5;
  min-height: 100vh;
}
```

### 5.3 字体层级

| 层级 | 字号 | 粗细 | 用途 |
|------|------|------|------|
| 大标题 | 36rpx | 700 | KPI 数字 |
| 页面标题 | 32rpx | 600 | 页面主标题、用户昵称 |
| 卡片标题 | 28rpx | 600 | 商品名、单号 |
| 正文 | 28rpx | 400 | 一般文字 |
| 辅助文字 | 24rpx | 400 | 描述、标签、副标题 |
| 小字 | 22rpx | 400 | 时间、备注、说明 |

### 5.4 间距规范

| 场景 | 值 |
|------|-----|
| 卡片内边距 | 24rpx |
| 卡片间距 | 16rpx |
| 页面边距 | 24rpx |
| 元素内间距 | 12rpx |

### 5.5 交互反馈

- 所有可点击元素：`:active` 时轻微降低不透明度 (opacity: 0.8)
- 卡片点击：通过 `hover-class` 或 Vant 自带反馈
- 加载态：`<van-loading>` 居中显示
- 空状态：`<van-empty description="...">`
- Toast 提示：操作成功/失败使用 `wx.showToast`

### 5.6 Vant 主题覆盖

在 `app.wxss` 中通过 CSS 自定义属性强制覆盖 Vant 默认主题：

```css
page {
  --van-primary-color: #409EFF;
  --van-success-color: #67C23A;
  --van-warning-color: #E6A23C;
  --van-danger-color: #F56C6C;
  --van-text-color: #303133;
  --van-text-color-weak: #909399;
  /* ...更多组件级变量 */
}
```

---

## 六、后端接口改造清单

### 6.1 必须新增的接口

#### 1. 微信登录

```
POST /api/auth/wx-login
Body: { code: string }
Response (openid 匹配成功): { code: 200, data: { token, userInfo: { id, username, nickname, roleName, avatar } } }
Response (openid 不存在): { code: 200, data: { needBind: true, openid: "xxx" } }

逻辑：
1. 用 code 调微信 jscode2session 获取 openid
2. 查 sys_user WHERE openid = ?
3. 找到 → 生成 JWT → 返回
4. 没找到 → 返回 { needBind: true, openid }
```

#### 2. 微信绑定账号

```
POST /api/auth/bind-openid
Body: { openid: string, username: string, password: string }
Response: { code: 200, data: { token, userInfo: {...} } }

逻辑：
1. 查 sys_user WHERE username = ?
2. bcrypt 比对密码
3. 校验通过 → UPDATE sys_user SET openid = ? WHERE username = ?
4. 生成 JWT → 返回
```

### 6.2 需要增强的接口

#### 3. 入库单搜索增强

```
GET /api/inbound/order/search

新增参数（在现有 list 接口基础上）:
- keyword: 搜索单号/车号/柜号/供应商名称/产品编码/产品名称/产品型号（多字段 OR LIKE）
- supplier_name: 供应商名称模糊搜索
- product_code: 明细表产品编码模糊搜索
- product_name: 明细表产品名称模糊搜索
- product_model: 明细表产品型号模糊搜索

查询逻辑：
- 搜索流程：先通过明细表 JOIN 筛出匹配的 order_no，再与主表 JOIN
- 当传入 product_code/product_name/product_model 时，先查 inbound_order_detail 获取匹配的 order_no 列表
- 再按常规分页逻辑查 inbound_order
```

#### 4. 出库单搜索增强

```
GET /api/outbound/order/search

新增参数（在现有基础上）:
- keyword: 多字段 OR LIKE (同入库)
- customer_name: 客户名称模糊搜索
- customer_address: 客户地址模糊搜索
- contact_person: 联系人模糊搜索
- contact_phone: 联系电话模糊搜索
- product_code/name/model: 明细表产品搜索

查询逻辑同入库单搜索增强。
```

### 6.3 可能需要改造的接口

| 接口 | 改造点 | 优先级 |
|------|--------|--------|
| `POST /api/print/:templateId/:businessId` | 返回临时下载 URL 而非 stream（适配小程序） | P0 |
| `GET /api/stock/list` | 支持 warehouse_code 传数组（多选仓库） | P1 |
| `GET /api/warehouse/list` | 保持不变，已满足需求 | - |
| `GET /api/supplier/list` | 保持不变，已满足需求 | - |
| `GET /api/customer/list` | 保持不变，已满足需求 | - |

---

## 七、数据库改动

### 7.1 sys_user 表新增字段

```sql
ALTER TABLE sys_user ADD COLUMN openid VARCHAR(64) DEFAULT NULL COMMENT '微信openid',
                      ADD UNIQUE INDEX idx_openid (openid);
```

`openid` 字段：
- 类型：VARCHAR(64)
- 唯一索引（一个 openid 只能绑定一个账号）
- 可空（未绑定的用户为 NULL）
- 微信 openid 长度一般为 28 字符，64 足够

### 7.2 无需其他数据库改动

- print_template 表已存在，page_code 字段已在之前的迁移中添加
- 所有业务表结构满足需求
- 不需要为小程序单独建表

---

## 八、分阶段实施计划

### 第一阶段：基础框架 + 登录（1天）

| 任务 | 工时 | 产出 |
|------|------|------|
| 初始化小程序项目结构 | 1h | package.json, app.json, app.wxss, app.js |
| 安装 Vant Weapp 1.11.7 + 构建 npm | 0.5h | miniprogram_npm |
| 配置全局 28 个 Vant 组件 + 主题变量 | 0.5h | app.json, app.wxss |
| 保留工具函数（request.js, auth.js, api.js, highlight.wxs）| 0.5h | utils/ |
| 配置 Custom TabBar（4 Tab）| 0.5h | custom-tab-bar/ |
| **后端：sys_user 加 openid 字段** | 0.5h | 数据库迁移脚本 |
| **后端：实现 POST /api/auth/wx-login** | 2h | auth 路由 + 控制器 |
| **后端：实现 POST /api/auth/bind-openid** | 1h | auth 路由 + 控制器 |
| 小程序登录页（login 页面）| 2h | login.js/wxml/wxss/json |
| App.onLaunch 登录流程逻辑 | 1h | app.js |

### 第二阶段：库存查询页（1天）

| 任务 | 工时 | 产出 |
|------|------|------|
| stock.js 业务逻辑 | 2h | 搜索/筛选/分页/刷新 |
| stock.wxml UI 实现 | 2h | van-search + van-dropdown-menu + van-cell |
| stock.wxss 样式 | 1h | Vercel 风格卡片 |
| 库存流水弹窗 | 1h | 弹窗UI + 数据加载 |
| 联调测试 | 1h | |

### 第三阶段：入库单 + 出库单页面（2天）

| 任务 | 工时 | 产出 |
|------|------|------|
| **后端：入库单搜索增强接口** | 2h | GET /api/inbound/order/search |
| **后端：出库单搜索增强接口** | 2h | GET /api/outbound/order/search |
| **后端：打印接口适配** | 1h | POST /api/print 返回临时URL |
| inbound.js 逻辑 | 2h | van-tabs + van-action-sheet 模式 |
| inbound.wxml/wxss | 2h | van-card 列表 |
| inbound-detail 页面开发 | 2h | 详情 + 打印按钮 |
| outbound.js/wxml/wxss | 2h | 对称开发，客户字段 |
| outbound-detail 页面开发 | 1.5h | 详情 + 客户信息 + 打印按钮 |
| 联调测试 | 2h | |

### 第四阶段：个人中心 + 收尾（1天）

| 任务 | 工时 | 产出 |
|------|------|------|
| mine.js 逻辑 | 1.5h | 用户信息 + KPI + 仓库汇总 |
| mine.wxml/wxss | 2h | van-grid + van-cell-group |
| 修改密码功能 | 1h | 弹窗 + API 调用 |
| 全流程测试 + 修复 | 2h | |
| 真机预览 + 打印功能验证 | 1h | |

**总预估工时：约 5 天**

### 可延期至二期的功能

- 盘点单查询小程序页面
- 近7天出入库趋势图（uCharts）
- 仓库筛选多选支持
- 日期范围筛选
- 库存详情独立页面（MVP 用弹窗）
- 微信消息推送（库存预警通知）

---

## 九、风险点与注意事项

### 9.1 技术风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 微信 code → openid 依赖 AppID/AppSecret，需在微信公众平台配置 | 登录流程阻断 | 提前确认小程序已注册，后端配置 appid/secret 环境变量 |
| 积木报表 PDF 生成依赖网络，超时/失败会影响打印体验 | 打印功能不可用 | 后端设置合理的超时时间(15s)，前端给出加载提示，失败可重试 |
| 积木报表 API URL 可能不可从云服务器访问 | 打印失败 | 确认积木报表部署在可公网访问的地址或与后端同内网 |
| Vant Weapp 1.11.7 的 slot 行为可能与预期不同 | UI 异常 | 每个页面开发后立即真机验证 |
| van-card 组件在小程序中的样式限制 | 卡片布局不理想 | 备选方案：用 van-cell-group + 自定义 slot 实现卡片布局 |
| 小程序包体积限制（主包 2MB） | 超出限制 | 28 个全局组件数量可控，Vant 1.x 体积较小，必要时启用 lazyCodeLoading |

### 9.2 业务风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| sys_user 当前无 openid 字段，需要 ALTER TABLE（生产数据库） | 登录功能不可用 | ALTER TABLE 是低风险操作，在低峰期执行，预留回滚方案 |
| 现有接口筛选参数不够灵活（如无法多选仓库） | 移动端体验不如 PC 端 | MVP 阶段用单仓库筛选 + 模糊搜索弥补，二期增强 |
| 按明细搜索的功能需要新建后端接口 | 入库/出库查询功能受限 | 优先实现基础搜索，明细级搜索设为 P1 |
| 小程序审核可能被拒（需要明确隐私政策、用户协议等） | 无法上架 | 提前准备隐私政策页面，首次提交前检查合规项 |

### 9.3 前后端对接注意事项

1. **van-search 事件：** bind:change 返回 `e.detail`（字符串），不是 `e.detail.value`
2. **van-field 事件：** bind:change 返回 `e.detail`（字符串），与原生 input 的 `e.detail.value` 不同
3. **van-tabs bind:change：** 返回 `{ detail: { index, name, title } }`，使用 `e.detail.name`
4. **van-action-sheet bind:select：** 返回 `{ detail: { index } }`，需通过 `_actionMap` 对象映射索引
5. **van-dropdown-item bind:change：** 返回 `e.detail` 即选中项的 value
6. **打印 PDF：** `wx.openDocument` 的 `filePath` 必须是本地临时路径，不支持远程 URL，需先用 `wx.downloadFile`
7. **Custom TabBar：** 每个 Tab 页面的 `onShow` 中需调用 `this.getTabBar().setData({ value: "xxx" })`，否则切换 Tab 后选中态不更新
8. **Mock 数据：** 开发阶段 `utils/request.js` 默认使用 Mock 模式（`MOCK = true`），上线前改为 `MOCK = false` 并设置正确的 `BASE_URL`

---

## 附录

### A. app.json 全局注册组件清单

```json
{
  "van-search", "van-dropdown-menu", "van-dropdown-item",
  "van-tag", "van-popup", "van-cell", "van-cell-group",
  "van-card", "van-tabs", "van-tab", "van-action-sheet",
  "van-button", "van-empty", "van-loading", "van-icon",
  "van-grid", "van-grid-item", "van-field",
  "van-tabbar", "van-tabbar-item", "van-dialog", "van-toast",
  "van-divider", "van-switch"
}
```

### B. 保留文件清单

以下文件从现有项目中保留，不做修改：

| 文件 | 说明 |
|------|------|
| `utils/request.js` | 请求封装 + Mock 数据层 |
| `utils/auth.js` | Token/用户信息管理 |
| `utils/api.js` | API 调用函数 |
| `utils/highlight.wxs` | WXS 关键词高亮 |
| `app.js` | 小程序入口 |
| `static/*` | 图标、图片等静态资源 |

### C. 微信公众平台配置清单

| 配置项 | 说明 |
|--------|------|
| 合法域名 request | `https://114.67.203.242` |
| 合法域名 downloadFile | `https://114.67.203.242` |
| AppID | 需在管理后台查看 |
| AppSecret | 后端配置，小程序端不暴露 |
| 隐私接口 | 需在用户隐私保护指引中申明 |
