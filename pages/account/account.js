const { logout } = require("../../utils/auth");
const request = require("../../utils/request");

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
  data: { userInfo: {}, isRealAvatar: false, avatarFullUrl: "", loaded: false },

  async onLoad() {
    try {
      const res = await request.get("/api/user/profile");
      const userInfo = res.data || {};
      const avatarInfo = parseAvatar(userInfo.avatar);
      this.setData({ userInfo, isRealAvatar: avatarInfo.isRealAvatar, avatarFullUrl: avatarInfo.fullUrl, loaded: true });
    } catch (e) {
      // 接口失败时回退到本地缓存
      const userInfo = wx.getStorageSync("userInfo") || {};
      const avatarInfo = parseAvatar(userInfo.avatar);
      this.setData({ userInfo, isRealAvatar: avatarInfo.isRealAvatar, avatarFullUrl: avatarInfo.fullUrl, loaded: true });
    }
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
