const request = require("../../utils/request");
const { ensureLoggedInTab, canFetchBusiness } = require("../../utils/auth");
const { responseList, responseTotal, sortOrdersByDateDesc } = require("../../utils/responseList");

Page({
  data: {
    keyword: "", orderStatus: "all",
    tabsReady: false,
    warehouseCode: "", warehouseName: "",
    supplierCode: "", supplierName: "",
    tmpWCode: "", tmpSCode: "",
    dateStart: "", dateEnd: "", dateRangeLabel: "",
    showCalendar: false,
    minDate: new Date(2020, 0, 1).getTime(),
    maxDate: new Date().getTime(),

    list: [], page: 1, pageSize: 15, total: 0,
    hasMore: true, loading: false, refreshing: false, empty: false, loadError: false, scrollTop: 0,
    warehouseList: [], supplierList: [],
    showActionSheet: false, actionSheetActions: [],
  },

  onLoad() {
    if (!canFetchBusiness()) return;
    this.loadWarehouseList();
    this.loadSupplierList();
    this.loadList(true);
  },
  onReady() {
    this.setData({ tabsReady: true });
  },

  onShow() {
    if (!ensureLoggedInTab()) return;
    const tb = this.getTabBar && this.getTabBar();
    if (tb) tb.setData({ value: "inbound" });
  },

  async loadWarehouseList() {
    try {
      const res = await request.get("/api/warehouse/list", { page: 1, pageSize: 500 });
      this.setData({ warehouseList: responseList(res.data) });
    } catch (e) { console.warn("加载仓库失败:", e); }
  },
  async loadSupplierList() {
    try {
      const res = await request.get("/api/supplier/list", { page: 1, pageSize: 500 });
      this.setData({ supplierList: responseList(res.data) });
    } catch (e) { console.warn("加载供应商失败:", e); }
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
      if (this.data.supplierCode) params.supplier_code = this.data.supplierCode;
      if (this.data.dateStart) params.date_start = this.data.dateStart;
      if (this.data.dateEnd) params.date_end = this.data.dateEnd;

      const url = (this.data.keyword || this.data.supplierCode || this.data.warehouseCode)
        ? "/api/inbound/order/search" : "/api/inbound/order/list";
      const res = await request.get(url, params);
      const rawRows = sortOrdersByDateDesc(responseList(res.data), "inbound_date");
      const rows = rawRows.map(r => ({
        ...r,
        total_qty: r.total_qty != null ? r.total_qty : r.totalQty,
        total_weight: r.total_weight != null ? r.total_weight : r.totalWeight,
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

  /** 关键词 + 状态 Tab + 仓库/供应商筛选 + 日期范围，一次恢复默认列表 */
  onClearAll() {
    wx.hideKeyboard();
    this.setData({
      keyword: "",
      orderStatus: "all",
      warehouseCode: "",
      warehouseName: "",
      supplierCode: "",
      supplierName: "",
      tmpWCode: "",
      tmpSCode: "",
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
