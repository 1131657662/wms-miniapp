const { logout } = require("../../utils/auth");

Page({
  data: { userInfo: {} },

  onLoad() {
    const userInfo = wx.getStorageSync("userInfo") || {};
    this.setData({ userInfo });
  },

  onChangePassword() {
    wx.showToast({ title: "请联系管理员修改密码", icon: "none" });
  },

  onSwitchAccount() {
    logout();
  },

  onLogout() {
    wx.showModal({
      title: "提示",
      content: "确定要退出登录吗？",
      success: (res) => {
        if (res.confirm) logout();
      },
    });
  },
});
