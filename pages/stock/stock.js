const request = require("../../utils/request");
const { ensureLoggedInTab, canFetchBusiness } = require("../../utils/auth");
const { responseList, responseTotal } = require("../../utils/responseList");

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
    scrollTop: 0, loadError: false,
  },

  onLoad() {
    if (!canFetchBusiness()) return;
    this.loadWarehouseList();
    this.loadStockList(true);
  },
  onShow() {
    if (!ensureLoggedInTab()) return;
    const tb = this.getTabBar && this.getTabBar();
    if (tb) tb.setData({ value: "stock" });
  },

  async loadWarehouseList() {
    try {
      const res = await request.get("/api/warehouse/list", { page: 1, pageSize: 500 });
      const list = responseList(res.data);
      const opts = [{ text: "全部仓库", value: "" }];
      list.forEach(w => opts.push({ text: w.warehouse_name, value: w.warehouse_code }));
      this.setData({ warehouseOptions: opts });
    } catch (e) { console.warn("加载仓库失败:", e); }
  },

  async loadStockList(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    if (reset) this.setData({ page: 1, hasMore: true, empty: false, scrollTop: 0, loadError: false });
    this.setData({ loading: true, loadError: false });
    try {
      const params = { page, pageSize: this.data.pageSize };
      if (this.data.keyword) params.keyword = this.data.keyword;
      if (this.data.warehouseCode) params.warehouse_code = this.data.warehouseCode;
      if (this.data.alertStatus) params.alert_status = this.data.alertStatus;
      const res = await request.get("/api/stock/list", params);
      const rows = responseList(res.data);
      const total = responseTotal(res.data);
      const list = reset ? rows : this.data.stockList.concat(rows);
      this.setData({
        stockList: list, page: page + 1, total,
        hasMore: list.length < total,
        loading: false, refreshing: false,
        empty: list.length === 0,
      });
    } catch (e) {
      this.setData({ loading: false, refreshing: false, loadError: true });
    }
  },

  onSearch(e) { this.setData({ keyword: e.detail || "" }); },
  onSubmitSearch() {
    wx.hideKeyboard();
    this.loadStockList(true);
  },
  onClearSearch() { this.setData({ keyword: "" }); wx.hideKeyboard(); this.loadStockList(true); },

  onStatusChange(e) { this.setData({ alertStatus: e.detail }); this.loadStockList(true); },
  onWarehouseChange(e) {
    this.setData({ warehouseCode: e.detail });
    this.loadStockList(true);
  },
  /** 清空搜索关键词 + 状态/仓库筛选，恢复全量列表 */
  onClearAll() {
    wx.hideKeyboard();
    this.setData({ keyword: "", alertStatus: "", warehouseCode: "" });
    this.loadStockList(true);
  },

  onRefresh() { this.setData({ refreshing: true }); this.loadStockList(true); },
  onScrollToLower() {
    if (this.data.hasMore && !this.data.loading) this.loadStockList(false);
  },
  onRetryLoad() { this.loadStockList(true); },

  onTapCard(e) {
    const code = e.currentTarget.dataset.code;
    const name = e.currentTarget.dataset.name || "";
    const model = e.currentTarget.dataset.model || "";
    wx.navigateTo({
      url: "/pages/stock/journal?code=" + encodeURIComponent(code) + "&name=" + encodeURIComponent(name) + "&model=" + encodeURIComponent(model)
    });
  },
  onLongPressCard(e) {
    const ds = e.currentTarget.dataset;
    const text = "【" + (ds.warehouse || "") + "】" + (ds.name || "") + "-" + (ds.code || "") + "-" + (ds.model || "") + " 当前库存：" + (ds.qty || 0) + "包 " + (ds.weight || 0) + "吨";
    wx.setClipboardData({ data: text, success: () => wx.showToast({ title: "已复制", icon: "success" }) });
  },

  getAlertType(s) {
    const m = { "零库存": "default", "低库存": "danger", "高库存": "warning", "正常": "success" };
    return m[s] || "default";
  },

  onShareAppMessage() {
    return {
      title: "茂智腈纶助手 - 库存查询",
      path: "/pages/stock/stock"
    };
  },
  onShareTimeline() {
    return { title: "茂智腈纶助手 - 库存查询", query: "" };
  },
});
