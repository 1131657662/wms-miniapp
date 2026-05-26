const request = require("../../utils/request");
const { BASE_URL } = request;
const orderPrint = require("../../utils/orderDetailPrint");

Page({
  data: {
    detailId: "",
    order: {},
    items: [],
    loaded: false,
    loadError: false,
    totalQty: 0,
    totalWeight: 0,
    printSheetShow: false,
    printSheetActions: [],
  },

  onLoad(options) {
    const id = options.id;
    this.setData({ detailId: id || "" });
    if (!id) {
      wx.showToast({ title: "缺少单据参数", icon: "none" });
      this.setData({ loaded: true, loadError: true });
      return;
    }
    this.loadDetail(id);
  },

  onReloadDetail() {
    const id = this.data.detailId;
    if (!id) {
      wx.navigateBack({ delta: 1 });
      return;
    }
    this.setData({ loaded: false, loadError: false });
    this.loadDetail(id);
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  async loadDetail(id) {
    try {
      const res = await request.get("/api/outbound/order/" + id);
      const order = res.data.order || {};
      const items = (res.data.details || []).map(d => ({
        ...d,
        remark: d.remark || d.detail_remark || "",
      }));
      let totalQty = 0, totalWeight = 0;
      items.forEach(item => {
        totalQty += item.outbound_qty || 0;
        totalWeight += parseFloat(item.outbound_weight || 0);
      });
      this.setData({
        order,
        items,
        loaded: true,
        loadError: false,
        totalQty,
        totalWeight: totalWeight.toFixed(4),
      });
    } catch (e) {
      wx.showToast({ title: "加载详情失败", icon: "none" });
      this.setData({ loaded: true, loadError: true });
    }
  },

  async onPrint() {
    wx.showLoading({ title: "加载模板..." });
    try {
      const templates = await orderPrint.fetchTemplates(request, "outbound_order");
      if (templates.length === 0) {
        wx.hideLoading();
        wx.showToast({ title: "暂无可用打印模板", icon: "none" });
        return;
      }
      if (templates.length === 1) {
        wx.hideLoading();
        await this.doPrintWithTemplate(templates[0]);
        return;
      }
      this._printTemplates = templates;
      wx.hideLoading();
      this.setData({
        printSheetActions: orderPrint.buildPrintSheetActions(templates),
        printSheetShow: true,
      });
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: "打印失败", icon: "none" });
    }
  },

  onPrintSheetClose() {
    this.setData({ printSheetShow: false });
  },

  async onPrintSheetSelect(e) {
    const item = e.detail || {};
    const idx = item.templateIndex;
    const list = this._printTemplates || [];
    const tmpl = list[idx];
    if (!tmpl) return;
    this.setData({ printSheetShow: false });
    await this.doPrintWithTemplate(tmpl);
  },

  async doPrintWithTemplate(tmpl) {
    wx.showLoading({ title: "生成打印文件..." });
    try {
      await orderPrint.printWithTemplate(request, BASE_URL, this.data.order, tmpl);
    } catch (e) {
      wx.showToast({ title: "打印失败", icon: "none" });
    } finally {
      wx.hideLoading();
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

  onShareAppMessage() {
    const { order, detailId } = this.data;
    const orderNo = order.order_no || order.outbound_no || detailId || "";
    return {
      title: `出库单 ${orderNo}`,
      path: `/pages/outbound/outbound-detail?id=${detailId}`
    };
  },
  onShareTimeline() {
    const { order, detailId } = this.data;
    const orderNo = order.order_no || order.outbound_no || detailId || "";
    return {
      title: `出库单 ${orderNo}`,
      query: `id=${detailId}`
    };
  },
});
