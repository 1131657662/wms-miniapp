const request = require("../../utils/request");

Page({
  data: {
    userInfo: {},
    todayInbound: 0,
    todayOutbound: 0,
    totalSkuCount: 0,
    totalTonnage: 0,
    warehouseList: [],
    loaded: false,
    loadError: false,
  },

  onShow() {
    const tb = this.getTabBar && this.getTabBar();
    if (tb) tb.setData({ value: "mine" });
    const silent = this.data.loaded === true;
    this.loadData({ silent });
  },

  onPullDownRefresh() {
    this.loadData({ silent: true }).finally(() => wx.stopPullDownRefresh());
  },

  onRetryLoad() {
    wx.showNavigationBarLoading();
    this.loadData({ silent: true }).finally(() => wx.hideNavigationBarLoading());
  },

  async loadData(options = {}) {
    const silent = options.silent === true;
    try {
      const [userRes, dashRes, whRes] = await Promise.all([
        request.get("/api/user/profile"),
        request.get("/api/dashboard/analysis"),
        request.get("/api/stock/warehouse-summary"),
      ]);
      const dashData = (dashRes && dashRes.data) || {};
      const whPayload = whRes && whRes.data;
      const whData = Array.isArray(whPayload)
        ? whPayload
        : whPayload && Array.isArray(whPayload.list)
          ? whPayload.list
          : [];
      this.setData({
        userInfo: (userRes && userRes.data) || {},
        todayInbound: dashData.today_inbound ?? 0,
        todayOutbound: dashData.today_outbound ?? 0,
        totalSkuCount: dashData.total_sku_count ?? 0,
        totalTonnage: +(dashData.total_tonnage ?? 0).toFixed(2),
        warehouseList: Array.isArray(whData) ? whData : [],
        loaded: true,
        loadError: false,
      });
    } catch (e) {
      if (!this.data.loaded) {
        this.setData({ loaded: true, loadError: true });
      }
      if (!silent) wx.showToast({ title: "加载失败", icon: "none" });
    }
  },

  onTapUser() {
    wx.navigateTo({ url: "/pages/account/account" });
  },
});
