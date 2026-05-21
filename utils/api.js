const request = require("./request");

module.exports = {
  // 微信登录
  wxLogin: (code) => request.post("/api/wx-login", { code }),
  // 账号密码登录（退出后重登）
  login: (username, password) => request.post("/api/login", { username, password }),
  // 绑定 openid
  bindOpenid: (openid, username, password) =>
    request.post("/api/bind-openid", { openid, username, password }),
  // 获取用户信息
  getUserProfile: () => request.get("/api/user/profile"),
  // 修改密码
  changePassword: (oldPassword, newPassword) =>
    request.post("/api/user/change-password", { oldPassword, newPassword }),
  // 库存列表
  getStockList: (params) => request.get("/api/stock/list", params),
  // 仓库汇总
  getWarehouseSummary: () => request.get("/api/stock/warehouse-summary"),
  // 仓库列表
  getWarehouseList: () => request.get("/api/warehouse/list"),
  // 供应商列表
  getSupplierList: () => request.get("/api/supplier/list"),
  // 客户列表
  getCustomerList: () => request.get("/api/customer/list"),
  // 入库单列表
  getInboundOrderList: (params) => request.get("/api/inbound/order/list", params),
  // 入库单搜索
  searchInboundOrder: (params) => request.get("/api/inbound/order/search", params),
  // 入库单详情
  getInboundOrderDetail: (id) => request.get("/api/inbound/order/" + id),
  // 出库单列表
  getOutboundOrderList: (params) => request.get("/api/outbound/order/list", params),
  // 出库单搜索
  searchOutboundOrder: (params) => request.get("/api/outbound/order/search", params),
  // 出库单详情
  getOutboundOrderDetail: (id) => request.get("/api/outbound/order/" + id),
  // Dashboard
  getDashboard: (days) => request.get("/api/dashboard/analysis", { days }),
  // 打印模板
  getPrintTemplates: (pageCode) => request.get("/api/print/template/by-page/" + pageCode),
  // 打印
  print: (templateId, businessId) => request.post("/api/print/" + templateId + "/" + businessId),
};
