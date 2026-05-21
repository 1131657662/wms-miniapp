const { getToken, setToken, setUserInfo, removeToken, getLogoutFlag, clearLogoutFlag, goLoginPage } = require("./utils/auth");

App({
  onLaunch() {
    this.checkLogin();
  },

  async checkLogin() {
    // 用户主动退出登录 → 直接跳转登录页，不做静默登录
    if (getLogoutFlag()) {
      goLoginPage();
      return;
    }

    const token = getToken();
    if (token) {
      try {
        const request = require("./utils/request");
        const res = await request.get("/api/user/profile");
        if (res.code === 200) {
          return;
        }
      } catch (e) {
        removeToken();
      }
    }
    this.wxSilentLogin();
  },

  wxSilentLogin() {
    wx.login({
      fail(err) {
        console.error("wx.login 失败:", err);
        goLoginPage();
      },
      success: async (loginRes) => {
        if (!loginRes.code) {
          console.error("wx.login 失败");
          return;
        }
        try {
          const request = require("./utils/request");
          const res = await request.post("/api/wx-login", { code: loginRes.code });
          const data = res.data || {};
          if (data.needBind) {
            wx.setStorageSync("openid", data.openid);
            goLoginPage();
          } else if (data.token) {
            clearLogoutFlag();
            setToken(data.token);
            setUserInfo(data.userInfo);
            wx.switchTab({ url: "/pages/stock/stock" });
          }
        } catch (e) {
          console.error("静默登录失败:", e);
          const pages = getCurrentPages();
          const onLogin = pages.some(p => p.route === "pages/login/login");
          if (!onLogin) {
            goLoginPage();
          }
          wx.showToast({
            title: (e && e.message) || "微信登录失败，请使用账号绑定登录",
            icon: "none",
            duration: 2500,
          });
        }
      }
    });
  }
});
