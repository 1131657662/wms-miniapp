const request = require("../../utils/request");
const { responseList } = require("../../utils/responseList");

function safeDecode(v) {
  if (v == null || v === "") return "";
  var s = String(v);
  try {
    return decodeURIComponent(s.replace(/\+/g, " "));
  } catch (e) {
    return s;
  }
}

Page({
  data: { productCode: "", productName: "", productModel: "", journalList: [], loading: true, empty: false },

  onLoad(options) {
    const code = safeDecode(options.code || "");
    const name = safeDecode(options.name || "");
    const model = safeDecode(options.model || "");
    wx.setNavigationBarTitle({ title: "库存流水" });
    this.setData({ productCode: code, productName: name, productModel: model });
    this.loadJournal(code);
  },

  async loadJournal(code) {
    try {
      const res = await request.get("/api/stock/journal/list", { product_code: code });
      const rows = responseList(res.data);
      this.setData({ journalList: rows, loading: false, empty: rows.length === 0 });
    } catch (e) {
      wx.showToast({ title: "加载失败", icon: "none" });
      this.setData({ loading: false });
    }
  },
});
