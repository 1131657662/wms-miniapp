const request = require("../../utils/request");
const { ensureLoggedInTab } = require("../../utils/auth");
const { responseList } = require("../../utils/responseList");

/** 解析 avatar 字段：真实头像返回完整 URL，默认头像或空值返回空 */
function parseAvatar(raw) {
  if (!raw || raw.startsWith("/public/default-avatars/")) {
    return { isRealAvatar: false, fullUrl: "" };
  }
  if (raw.startsWith("/public/avatars/")) {
    return { isRealAvatar: true, fullUrl: "https://erp.nbsmzwl.cn" + raw };
  }
  return { isRealAvatar: false, fullUrl: "" };
}

Page({
  data: {
    userInfo: {},
    isRealAvatar: false,
    avatarFullUrl: "",
    todayInbound: 0,
    todayOutbound: 0,
    totalSkuCount: 0,
    totalTonnage: 0,
    warehouseList: [],
    loaded: false,
    loadError: false,
  },

  onShow() {
    if (!ensureLoggedInTab()) return;
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
      const results = await Promise.all([
        request.get("/api/user/profile"),
        request.get("/api/dashboard/analysis"),
        request.get("/api/stock/warehouse-summary"),
      ]);
      const userRes = results[0];
      const dashRes = results[1];
      const whRes = results[2];
      const dashData = (dashRes && dashRes.data) || {};
      const whPayload = whRes && whRes.data;
      const userData = (userRes && userRes.data) || {};
      const avatarInfo = parseAvatar(userData.avatar);
      this.setData({
        userInfo: userData,
        isRealAvatar: avatarInfo.isRealAvatar,
        avatarFullUrl: avatarInfo.fullUrl,
        todayInbound: dashData.today_inbound ?? 0,
        todayOutbound: dashData.today_outbound ?? 0,
        totalSkuCount: dashData.total_sku_count ?? 0,
        totalTonnage: +Number(dashData.total_tonnage ?? 0).toFixed(2),
        warehouseList: responseList(whPayload),
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

  onShareAppMessage() {
    const { todayInbound, todayOutbound, totalSkuCount, totalTonnage } = this.data;
    return {
      title: `茂智腈纶助手 · 今日入库${todayInbound}笔 出库${todayOutbound}笔`,
      path: "/pages/mine/mine"
    };
  },
  onShareTimeline() {
    const { todayInbound, todayOutbound, totalSkuCount, totalTonnage } = this.data;
    return {
      title: `茂智腈纶助手 · 今日入库${todayInbound}笔 出库${todayOutbound}笔`,
      query: ""
    };
  },
});
