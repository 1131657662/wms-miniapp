const request = require("../../utils/request");
const { ensureLoggedInTab, canFetchBusiness } = require("../../utils/auth");
const { responseList, responseTotal, sortOrdersByDateDesc } = require("../../utils/responseList");

Page({
  data: {
    keyword: "", orderStatus: "all",
    tabsReady: false,
    warehouseCode: "", warehouseName: "",
    customerCode: "", customerName: "",
    tmpWCode: "", tmpCCode: "",
    dateStart: "", dateEnd: "", dateRangeLabel: "",
    showCalendar: false,
    minDate: new Date(2020, 0, 1).getTime(),
    maxDate: new Date().getTime(),

    list: [], page: 1, pageSize: 15, total: 0,
    hasMore: true, loading: false, refreshing: false, empty: false, loadError: false, scrollTop: 0,
    warehouseList: [], customerList: [],
    showActionSheet: false, actionSheetActions: [],
  },

  onLoad() {
    if (!canFetchBusiness()) return;
    this.loadWarehouseList();
    this.loadCustomerList();
    this.loadList(true);
  },
  onReady() {
    this.setData({ tabsReady: true });
  },

  onShow() {
    if (!ensureLoggedInTab()) return;
    const tb = this.getTabBar && this.getTabBar();
    if (tb) tb.setData({ value: "outbound" });
  },

  async loadWarehouseList() {
    try {
      const res = await request.get("/api/warehouse/list", { page: 1, pageSize: 500 });
      this.setData({ warehouseList: responseList(res.data) });
    } catch (e) { console.warn("加载仓库失败:", e); }
  },
  async loadCustomerList() {
    try {
      const res = await request.get("/api/customer/list", { page: 1, pageSize: 500 });
      this.setData({ customerList: responseList(res.data) });
    } catch (e) { console.warn("加载客户失败:", e); }
  },

  async loadList(reset) {
    if (this.data.loading) return;
    const page = reset ? 1 : this.data.page;
    if (reset) this.setData({ page: 1, hasMore: true, empty: false, loadError: false, scrollTop: 0 });
    this.setData({ loading: true, loadError: false });
    try {
      const params = { page, pageSize: this.data.pageSize };
      if (this.data.keyword) params.keyword = this.data.keyword;
      const st = this.data.orderStatus;
      if (st && st !== "all") params.order_status = st;
      if (this.data.warehouseCode) params.warehouse_code = this.data.warehouseCode;
      if (this.data.customerCode) params.customer_code = this.data.customerCode;
      if (this.data.dateStart) params.date_start = this.data.dateStart;
      if (this.data.dateEnd) params.date_end = this.data.dateEnd;

      const url = (this.data.keyword || this.data.customerCode || this.data.warehouseCode)
        ? "/api/outbound/order/search" : "/api/outbound/order/list";
      const res = await request.get(url, params);
      const rawRows = sortOrdersByDateDesc(responseList(res.data), "outbound_date");
      const rows = rawRows.map(r => ({
        ...r,
        total_qty: r.total_qty != null ? r.total_qty : r.totalQty,
        total_weight: r.total_weight != null ? r.total_weight : r.totalWeight,
        _hasProductMatch: !!(r._match && r._match.details && r._match.details.length > 0),
        _matchDetails: (r._match && r._match.details) || [],
        _matchDetailMore: (r._match && r._match.detailCount) ? r._match.detailCount - r._match.details.length : 0,
      }));
      const total = responseTotal(res.data);
      const list = reset ? rows : this.data.list.concat(rows);
      this.setData({
        list, page: page + 1, total,
        hasMore: list.length < total,
        loading: false, refreshing: false,
        empty: list.length === 0,
      });
    } catch (e) {
      this.setData({ loading: false, refreshing: false, loadError: true });
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },

  onSearch(e) { this.setData({ keyword: e.detail || "" }); },
  onSubmitSearch() {
    wx.hideKeyboard();
    this.loadList(true);
  },
  onClearSearch() {
    wx.hideKeyboard();
    this.setData({ keyword: "" });
    this.loadList(true);
  },

  /** 关键词 + 状态 Tab + 仓库/客户 + 日期 */
  onClearAll() {
    wx.hideKeyboard();
    this.setData({
      keyword: "",
      orderStatus: "all",
      warehouseCode: "",
      warehouseName: "",
      customerCode: "",
      customerName: "",
      tmpWCode: "",
      tmpCCode: "",
      dateStart: "",
      dateEnd: "",
      dateRangeLabel: "",
    });
    this.loadList(true);
  },

  onTabChange(e) {
    this.setData({ orderStatus: e.detail.name || "all" });
    this.loadList(true);
  },

  onOpenFilter() {
    this.setData({ tmpWCode: this.data.warehouseCode, tmpCCode: this.data.customerCode });
    this.buildActions();
    this.setData({ showActionSheet: true });
  },
  onActionClose() { this.setData({ showActionSheet: false }); },
  onActionSelect(e) {
    const item = this._actionMap[e.detail.index];
    if (!item) return;
    if (item.type === "reset") { this.setData({ tmpWCode: "", tmpCCode: "" }); this.buildActions(); return; }
    if (item.type === "warehouse") { this.setData({ tmpWCode: this.data.tmpWCode === item.code ? "" : item.code }); this.buildActions(); return; }
    if (item.type === "customer") { this.setData({ tmpCCode: this.data.tmpCCode === item.code ? "" : item.code }); this.buildActions(); return; }
    if (item.type === "apply") {
      const w = this.data.warehouseList.find(x => x.warehouse_code === this.data.tmpWCode);
      const c = this.data.customerList.find(x => x.customer_code === this.data.tmpCCode);
      this.setData({
        warehouseCode: this.data.tmpWCode, warehouseName: w ? w.warehouse_name : "",
        customerCode: this.data.tmpCCode, customerName: c ? c.customer_name : "",
        showActionSheet: false,
      });
      this.loadList(true);
    }
  },
  buildActions() {
    const { warehouseList, customerList, tmpWCode, tmpCCode } = this.data;
    const actions = [], map = {};
    let i = 0;
    actions.push({ name: "—— 仓库 ——", disabled: true }); i++;
    warehouseList.forEach(w => {
      actions.push({ name: w.warehouse_name, color: tmpWCode === w.warehouse_code ? "#409EFF" : undefined });
      map[i] = { type: "warehouse", code: w.warehouse_code }; i++;
    });
    if (tmpWCode) { actions.push({ name: "清除仓库", color: "#909399" }); map[i] = { type: "warehouse", code: "" }; i++; }
    actions.push({ name: "—— 客户 ——", disabled: true }); i++;
    customerList.forEach(c => {
      actions.push({ name: c.customer_name, color: tmpCCode === c.customer_code ? "#409EFF" : undefined });
      map[i] = { type: "customer", code: c.customer_code }; i++;
    });
    if (tmpCCode) { actions.push({ name: "清除客户", color: "#909399" }); map[i] = { type: "customer", code: "" }; i++; }
    actions.push({ name: "重置筛选", color: "#F56C6C" }); map[i] = { type: "reset" }; i++;
    actions.push({ name: "应用筛选", color: "#409EFF" }); map[i] = { type: "apply" };
    this._actionMap = map;
    this.setData({ actionSheetActions: actions });
  },

  onOpenCalendar() { this.setData({ showCalendar: true }); },
  onCloseCalendar() { this.setData({ showCalendar: false }); },
  onConfirmDate(e) {
    const detail = e.detail || [];
    const start = detail[0];
    const end = detail[1];
    const dateStart = this.formatDate(start);
    const dateEnd = this.formatDate(end);
    this.setData({ dateStart, dateEnd, dateRangeLabel: dateStart + " ~ " + dateEnd, showCalendar: false });
    this.loadList(true);
  },
  onClearDate() {
    this.setData({ dateStart: "", dateEnd: "", dateRangeLabel: "" });
    this.loadList(true);
  },
  formatDate(ts) {
    const d = new Date(ts);
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  },

  onRefresh() { this.setData({ refreshing: true }); this.loadList(true); },
  onScrollToLower() { if (this.data.hasMore && !this.data.loading) this.loadList(false); },
  onRetryLoad() { this.loadList(true); },

  onTapCard(e) {
    wx.navigateTo({ url: "/pages/outbound/outbound-detail?id=" + e.currentTarget.dataset.id });
  },

  statusLabel(s) {
    const m = { draft: "草稿", submit: "待审核", audited: "已审核", completed: "已完成", cancelled: "已取消" };
    return m[s] || s;
  },
  statusColor(s) {
    const m = { draft: "#909399", submit: "#E6A23C", audited: "#67C23A", completed: "#409EFF", cancelled: "#F56C6C" };
    return m[s] || "#909399";
  },

  onShareAppMessage() {
    return {
      title: "茂智腈纶助手 - 出库单",
      path: "/pages/outbound/outbound"
    };
  },
  onShareTimeline() {
    return { title: "茂智腈纶助手 - 出库单", query: "" };
  },
});
