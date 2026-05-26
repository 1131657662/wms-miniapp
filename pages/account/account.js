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

  onShareAppMessage() {
    const userInfo = this.data.userInfo || {};
    const name = userInfo.realname || userInfo.username || "";
    return {
      title: name ? `${name} - 茂智腈纶助手` : "茂智腈纶助手 - 账户设置",
      path: "/pages/account/account"
    };
  },
  onShareTimeline() {
    const userInfo = this.data.userInfo || {};
    const name = userInfo.realname || userInfo.username || "";
    return {
      title: name ? `${name} - 茂智腈纶助手` : "茂智腈纶助手 - 账户设置",
      query: ""
    };
  },
});
