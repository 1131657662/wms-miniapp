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
