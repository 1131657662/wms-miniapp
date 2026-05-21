const TOKEN_KEY = "token";
const USER_KEY = "userInfo";
const LOGOUT_FLAG_KEY = "logoutFlag";

function getToken() { return wx.getStorageSync(TOKEN_KEY); }
function setToken(token) { wx.setStorageSync(TOKEN_KEY, token); }
function removeToken() { wx.removeStorageSync(TOKEN_KEY); }

function getUserInfo() { return wx.getStorageSync(USER_KEY); }
function setUserInfo(info) { wx.setStorageSync(USER_KEY, info); }
function removeUserInfo() { wx.removeStorageSync(USER_KEY); }

/** 退出登录标记：true 表示用户主动退出，下次启动须跳过静默登录 */
function getLogoutFlag() { return wx.getStorageSync(LOGOUT_FLAG_KEY) === true; }
function setLogoutFlag() { wx.setStorageSync(LOGOUT_FLAG_KEY, true); }
function clearLogoutFlag() { wx.removeStorageSync(LOGOUT_FLAG_KEY); }

function logout() {
  setLogoutFlag();
  removeToken();
  removeUserInfo();
  goLoginPage();
}

function isMockMode() {
  try {
    return require("./request").MOCK === true;
  } catch (_) {
    return false;
  }
}

/** 是否允许拉取业务接口（Mock 或已登录） */
function canFetchBusiness() {
  return isMockMode() || !!getToken();
}

let loginNavPending = false;

/** 统一跳转登录/绑定页，避免并发 reLaunch 导致开发者工具 timeout */
function goLoginPage() {
  const pages = getCurrentPages();
  const route = pages.length ? pages[pages.length - 1].route : "";
  if (route === "pages/login/login" || loginNavPending) return;
  loginNavPending = true;
  wx.reLaunch({
    url: "/pages/login/login",
    complete: () => {
      loginNavPending = false;
    },
  });
}

/** Tab 业务页：无 token 时强制回绑定/登录页 */
function ensureLoggedInTab() {
  if (canFetchBusiness()) return true;
  goLoginPage();
  return false;
}

module.exports = {
  getToken, setToken, removeToken, getUserInfo, setUserInfo, removeUserInfo,
  getLogoutFlag, setLogoutFlag, clearLogoutFlag,
  logout, ensureLoggedInTab, canFetchBusiness, goLoginPage,
};
