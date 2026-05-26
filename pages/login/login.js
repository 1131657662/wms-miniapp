const { setToken, setUserInfo, getToken, clearLogoutFlag, getLogoutFlag } = require("../../utils/auth");
const request = require("../../utils/request");

Page({
  data: {
    mode: "bind",          // "bind" = 绑定模式（新用户）, "login" = 登录模式（退出后重登）
    username: "",
    password: "",
    loading: false,
    autoChecking: true,    // 绑定模式下静默检查中
  },

  onLoad() {
    // 已登录用户误入 → 直接进首页
    if (getToken()) {
      wx.switchTab({ url: "/pages/stock/stock" });
      return;
    }

    if (getLogoutFlag()) {
      // 登录模式：用户主动退出，不静默登录，直接展示登录表单
      this.setData({ mode: "login", autoChecking: false });
    } else {
      // 绑定模式：尝试静默微信登录
      this.setData({ mode: "bind", autoChecking: true });
      this.tryWxAlreadyBound();
    }
  },

  /**
   * 绑定模式：该微信若已绑定过系统用户，wx-login 直接返回 token，无需手动填写表单。
   */
  async tryWxAlreadyBound() {
    this.setData({ autoChecking: true });
    try {
      const loginRes = await new Promise((resolve, reject) => {
        wx.login({ success: resolve, fail: reject });
      });
      if (!loginRes.code) return;

      const res = await request.post("/api/wx-login", { code: loginRes.code });
      const data = res.data || {};

      if (data.token && data.userInfo) {
        setToken(data.token);
        setUserInfo(data.userInfo);
        wx.removeStorageSync("openid");
        wx.showToast({ title: "已自动登录", icon: "success", duration: 1200 });
        setTimeout(() => {
          wx.switchTab({ url: "/pages/stock/stock" });
        }, 400);
        return;
      }

      if (data.needBind && data.openid) {
        wx.setStorageSync("openid", data.openid);
      }
    } catch (e) {
      console.warn("tryWxAlreadyBound:", e);
    } finally {
      this.setData({ autoChecking: false });
    }
  },

  onUsernameInput(e) { this.setData({ username: e.detail }); },
  onPasswordInput(e) { this.setData({ password: e.detail }); },

  /** 提交按钮：登录模式走 /api/login，绑定模式走 /api/bind-openid */
  async handleSubmit() {
    const { username, password, mode } = this.data;
    if (!username.trim()) { wx.showToast({ title: "请输入用户名", icon: "none" }); return; }
    if (!password) { wx.showToast({ title: "请输入密码", icon: "none" }); return; }

    this.setData({ loading: true });
    try {
      let res;

      if (mode === "login") {
        // 登录模式：用户名 + 密码直接登录
        res = await request.post("/api/login", {
          username: username.trim(),
          password,
        });
      } else {
        // 绑定模式：openid + 用户名 + 密码 绑定
        let openid = wx.getStorageSync("openid") || "";
        let code = "";
        if (!openid) {
          const loginRes = await new Promise((resolve, reject) => {
            wx.login({ success: resolve, fail: reject });
          });
          if (!loginRes.code) {
            wx.showToast({ title: "获取微信授权码失败", icon: "none" });
            this.setData({ loading: false });
            return;
          }
          code = loginRes.code;
        }

        const body = { username: username.trim(), password };
        if (openid) body.openid = openid;
        else body.code = code;
        res = await request.post("/api/bind-openid", body);
      }

      setToken(res.data.token);
      setUserInfo(res.data.userInfo);
      clearLogoutFlag();
      wx.removeStorageSync("openid");

      wx.showToast({ title: mode === "login" ? "登录成功" : "绑定成功", icon: "success" });
      setTimeout(() => { wx.switchTab({ url: "/pages/stock/stock" }); }, 800);
    } catch (e) {
      const msg = e.message || "操作失败，请重试";
      wx.showToast({ title: msg, icon: "none", duration: 2500 });
      if (String(msg).includes("已绑定其他")) {
        wx.showModal({
          title: "提示",
          content: "该微信已绑定其它系统账号。若需使用当前输入的账号，请先在电脑端后台解绑原账号的微信，或使用原账号用户名登录。",
          showCancel: false,
        });
      }
    } finally {
      this.setData({ loading: false });
    }
  },

  onShareAppMessage() {
    return {
      title: "茂智腈纶助手",
      path: "/pages/login/login"
    };
  },
  onShareTimeline() {
    return { title: "茂智腈纶助手", query: "" };
  },
});
