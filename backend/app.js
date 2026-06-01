import {
  addCommunityComment,
  createBackendSave,
  downloadCommunitySave,
  exportBackendSave,
  getBackendAdminSave,
  getBackendAdminOverview,
  getBackendSave,
  getCommunitySave,
  hideBackendComment,
  isLocalBackendRuntimeAvailable,
  listBackendSaves,
  listCommunitySaves,
  loginBackendUser,
  logoutBackendUser,
  publishBackendSave,
  refreshBackendSession,
  registerBackendUser,
  reportCommunitySave,
  reviewBackendReport,
  seedBackendDemoCommunity,
  setBackendSaveComments,
  setBackendSaveImage,
  setBackendSaveVisibility,
  updateBackendUser,
} from "../js/api/backend_client.js";

const state = {
  locale: localStorage.getItem("backendConsoleLocale") || "zh",
  view: "community",
  authMode: "login",
  session: null,
  community: [],
  mySaves: [],
  admin: null,
  detailPayload: null,
  detailFilename: "mapcreator-save.json",
};

const $ = (id) => document.getElementById(id);
const el = {
  languageToggle: $("languageToggle"),
  sessionDot: $("sessionDot"),
  sessionLabel: $("sessionLabel"),
  openLogin: $("openLoginBtn"),
  openRegister: $("openRegisterBtn"),
  logout: $("logoutBtn"),
  authDialog: $("authDialog"),
  authTitle: $("authTitle"),
  displayNameField: $("displayNameField"),
  authSubmit: $("authSubmitBtn"),
  username: $("usernameInput"),
  password: $("passwordInput"),
  displayName: $("displayNameInput"),
  communityFeed: $("communityFeed"),
  refreshCommunity: $("refreshCommunityBtn"),
  seedDemo: $("seedDemoBtn"),
  accountGate: $("accountGate"),
  accountContent: $("accountContent"),
  createSample: $("createSampleBtn"),
  manualSaveForm: $("manualSaveForm"),
  saveTitle: $("saveTitleInput"),
  saveDescription: $("saveDescriptionInput"),
  saveImage: $("saveImageInput"),
  mySavesList: $("mySavesList"),
  adminGate: $("adminGate"),
  adminContent: $("adminContent"),
  metricGrid: $("metricGrid"),
  refreshAdmin: $("refreshAdminBtn"),
  adminSavesList: $("adminSavesList"),
  commentsList: $("commentsList"),
  usersList: $("usersList"),
  reportsList: $("reportsList"),
  activityList: $("activityList"),
  detailDialog: $("detailDialog"),
  detailImage: $("detailImage"),
  detailTitle: $("detailTitle"),
  detailMeta: $("detailMeta"),
  detailPayload: $("detailPayload"),
  closeDetail: $("closeDetailBtn"),
  downloadDetail: $("downloadDetailBtn"),
  toast: $("toast"),
};

const I18N = {
  zh: {
    productKicker: "地图社区平台",
    productTitle: "Scenario Forge 社区与后台",
    productCopy: "玩家看到社区、存档和评论；管理员看到审核队列、用户状态、权限和社区动态。",
    openEditor: "打开编辑器",
    communityView: "公开社区",
    accountView: "用户中心",
    adminView: "管理员后台",
    login: "登录",
    register: "注册",
    logout: "登出",
    communityKicker: "玩家视角",
    communityTitle: "社区帖子流",
    refreshCommunity: "刷新社区",
    seedDemo: "生成样例帖子",
    accountGateTitle: "登录后查看用户中心",
    accountGateCopy: "用户中心只展示当前用户自己的存档、发布状态和导出操作。",
    accountKicker: "用户视角",
    myLibrary: "我的存档库",
    createSample: "创建示例存档",
    newPost: "发布前草稿",
    title: "标题",
    description: "描述",
    imageUrl: "封面图片 URL",
    saveDraft: "保存为私有草稿",
    adminGateTitle: "管理员权限后进入后台",
    adminGateCopy: "后台入口只给 admin 或 moderator 显示，所有管理动作都经过后端权限校验。",
    metricUsers: "用户",
    metricSaves: "帖子",
    metricPublic: "公开",
    metricReports: "待审举报",
    metricComments: "评论",
    metricBanned: "封禁",
    refreshAdmin: "刷新后台",
    activityTab: "动态",
    contentTab: "内容",
    commentsTab: "评论",
    usersTab: "用户",
    reportsTab: "举报",
    activityTitle: "社区动态",
    contentTitle: "内容与图片管理",
    commentsTitle: "评论管理",
    usersTitle: "用户与权限",
    reportsTitle: "举报审核",
    username: "用户名",
    password: "密码",
    displayName: "显示名称",
    downloadJson: "下载 JSON",
    languageButton: "English",
    loggedOut: "未登录",
    noCommunity: "还没有社区帖子。管理员可先生成样例帖子。",
    noSaves: "你还没有存档。",
    noAdmin: "后台数据暂不可用。",
    noItems: "暂无内容。",
    detail: "详情",
    publish: "发布",
    export: "导出",
    download: "下载",
    comment: "评论",
    report: "举报",
    save: "存档",
    private: "私有",
    public: "公开",
    active: "正常",
    banned: "封禁",
    visible: "可见",
    hidden: "已隐藏",
    open: "待处理",
    reviewed: "已审核",
    member: "成员",
    moderator: "版主",
    admin: "管理员",
    commentsOpen: "评论开放",
    commentsClosed: "评论关闭",
    closeComments: "关闭评论",
    openComments: "开放评论",
    hideComment: "隐藏评论",
    reviewReport: "标记已审核",
    makePrivate: "设为私有",
    makePublic: "设为公开",
    clearImage: "清除图片",
    banUser: "封禁用户",
    unbanUser: "解除封禁",
    promoteModerator: "设为版主",
    promoteAdmin: "设为管理员",
    demoteMember: "设为成员",
    loginRequired: "请先登录。",
    adminRequired: "需要管理员或版主权限。",
    saved: "已保存。",
    registered: "已注册并登录。",
    loggedIn: "已登录。",
    loggedOutToast: "已登出。",
    demoSeeded: "样例帖子已生成。",
    actionDone: "操作完成。",
    backendUnavailable: "请从本地 dev server 打开这个页面。",
    unknown: "未知",
    by: "作者",
    comments: "评论",
    reports: "举报",
    imageManaged: "图片已更新。",
  },
  en: {
    productKicker: "Map Community Platform",
    productTitle: "Scenario Forge Community and Admin",
    productCopy: "Players see community posts, saves, and comments; admins see review queues, users, roles, and activity.",
    openEditor: "Open editor",
    communityView: "Public community",
    accountView: "User center",
    adminView: "Admin backend",
    login: "Login",
    register: "Register",
    logout: "Logout",
    communityKicker: "Player view",
    communityTitle: "Community feed",
    refreshCommunity: "Refresh community",
    seedDemo: "Create sample posts",
    accountGateTitle: "Login to view user center",
    accountGateCopy: "The user center only shows your own saves, publish state, and exports.",
    accountKicker: "User view",
    myLibrary: "My save library",
    createSample: "Create sample save",
    newPost: "Draft before publishing",
    title: "Title",
    description: "Description",
    imageUrl: "Cover image URL",
    saveDraft: "Save private draft",
    adminGateTitle: "Admin permission required",
    adminGateCopy: "The backend appears only for admins or moderators; every action is checked by the backend.",
    metricUsers: "Users",
    metricSaves: "Posts",
    metricPublic: "Public",
    metricReports: "Open reports",
    metricComments: "Comments",
    metricBanned: "Banned",
    refreshAdmin: "Refresh admin",
    activityTab: "Activity",
    contentTab: "Content",
    commentsTab: "Comments",
    usersTab: "Users",
    reportsTab: "Reports",
    activityTitle: "Community activity",
    contentTitle: "Content and image management",
    commentsTitle: "Comment management",
    usersTitle: "Users and roles",
    reportsTitle: "Report review",
    username: "Username",
    password: "Password",
    displayName: "Display name",
    downloadJson: "Download JSON",
    languageButton: "中文",
    loggedOut: "Logged out",
    noCommunity: "No community posts yet. Admins can create sample posts.",
    noSaves: "No saves yet.",
    noAdmin: "Admin data unavailable.",
    noItems: "No items.",
    detail: "Detail",
    publish: "Publish",
    export: "Export",
    download: "Download",
    comment: "Comment",
    report: "Report",
    save: "Save",
    private: "private",
    public: "public",
    active: "active",
    banned: "banned",
    visible: "visible",
    hidden: "hidden",
    open: "open",
    reviewed: "reviewed",
    member: "member",
    moderator: "moderator",
    admin: "admin",
    commentsOpen: "Comments open",
    commentsClosed: "Comments closed",
    closeComments: "Close comments",
    openComments: "Open comments",
    hideComment: "Hide comment",
    reviewReport: "Mark reviewed",
    makePrivate: "Make private",
    makePublic: "Make public",
    clearImage: "Clear image",
    banUser: "Ban user",
    unbanUser: "Unban user",
    promoteModerator: "Make moderator",
    promoteAdmin: "Make admin",
    demoteMember: "Make member",
    loginRequired: "Login first.",
    adminRequired: "Admin or moderator permission required.",
    saved: "Saved.",
    registered: "Registered and logged in.",
    loggedIn: "Logged in.",
    loggedOutToast: "Logged out.",
    demoSeeded: "Sample posts created.",
    actionDone: "Done.",
    backendUnavailable: "Open this page from the local dev server.",
    unknown: "Unknown",
    by: "by",
    comments: "comments",
    reports: "reports",
    imageManaged: "Image updated.",
  },
};

function t(key, vars = {}) {
  const template = I18N[state.locale]?.[key] || I18N.zh[key] || key;
  return Object.entries(vars).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);
}

function renderStaticText() {
  document.documentElement.lang = state.locale === "zh" ? "zh-Hans" : "en";
  document.title = state.locale === "zh" ? "Scenario Forge 社区与后台" : "Scenario Forge Community and Admin";
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  el.languageToggle.textContent = t("languageButton");
}

function sampleProjectPayload(label = "console") {
  return {
    schemaVersion: 21,
    paintMode: "visual",
    mapSemanticMode: "scenario",
    activePaletteId: label,
    layerVisibility: { political: true, transport: true },
    timestamp: new Date().toISOString(),
  };
}

function setView(view) {
  state.view = view;
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === view);
  });
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.viewPanel === view);
  });
  renderGates();
}

function setAdminTab(tab) {
  document.querySelectorAll("[data-admin-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.adminTab === tab);
  });
  document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.adminPanel === tab);
  });
}

function renderSession() {
  const user = state.session?.user;
  el.sessionDot.classList.toggle("online", Boolean(user));
  el.sessionLabel.textContent = user
    ? `${user.displayName || user.username} (${t(user.role || "member")})`
    : t("loggedOut");
  el.openLogin.hidden = Boolean(user);
  el.openRegister.hidden = Boolean(user);
  el.logout.hidden = !user;
}

function renderGates() {
  const user = state.session?.user;
  const staff = ["admin", "moderator"].includes(user?.role);
  el.accountGate.hidden = Boolean(user);
  el.accountContent.hidden = !user;
  el.adminGate.hidden = staff;
  el.adminContent.hidden = !staff;
  el.seedDemo.hidden = user?.role !== "admin";
  document.querySelectorAll("[data-admin-only]").forEach((node) => {
    node.hidden = user?.role !== "admin";
  });
  if (user?.role !== "admin" && document.querySelector("[data-admin-tab='users']")?.classList.contains("active")) {
    setAdminTab("activity");
  }
}

function renderCommunity() {
  el.communityFeed.replaceChildren();
  if (!state.community.length) {
    el.communityFeed.appendChild(emptyCard(t("noCommunity")));
    return;
  }
  state.community.forEach((post) => el.communityFeed.appendChild(postCard(post)));
}

function postCard(post) {
  const node = document.createElement("article");
  node.className = "post-card";
  const imageStyle = post.imageUrl ? `style="background-image:url('${escapeAttr(post.imageUrl)}')"` : "";
  node.innerHTML = `
    <div class="post-image" ${imageStyle}></div>
    <div class="post-body">
      <p class="post-title">${escapeHtml(post.title)}</p>
      <p class="post-meta">${t("by")} ${escapeHtml(post.owner?.displayName || post.owner?.username || t("unknown"))} · ${formatDate(post.publishedAt || post.updatedAt)}</p>
      <p>${escapeHtml(post.description || "")}</p>
      <p class="post-meta">${post.commentCount || 0} ${t("comments")} · ${post.openReportCount || 0} ${t("reports")} · ${post.commentsEnabled ? t("commentsOpen") : t("commentsClosed")}</p>
      <div class="item-actions">
        <button data-action="community-detail" data-id="${escapeAttr(post.id)}">${t("detail")}</button>
        <button data-action="community-download" data-id="${escapeAttr(post.id)}">${t("download")}</button>
        <button data-action="community-comment" data-id="${escapeAttr(post.id)}">${t("comment")}</button>
        <button data-action="community-report" data-id="${escapeAttr(post.id)}">${t("report")}</button>
      </div>
    </div>
  `;
  return node;
}

function renderMySaves() {
  el.mySavesList.replaceChildren();
  if (!state.mySaves.length) {
    el.mySavesList.appendChild(emptyItem(t("noSaves")));
    return;
  }
  state.mySaves.forEach((save) => {
    el.mySavesList.appendChild(listItem({
      title: save.title,
      meta: `${t(save.visibility)} · ${formatDate(save.updatedAt)}`,
      body: save.description,
      pill: t(save.visibility),
      actions: [
        ["preview-save", save.id, t("detail")],
        ["export-save", save.id, t("export")],
        ["publish-save", save.id, t("publish")],
      ],
    }));
  });
}

function renderAdmin() {
  const stats = state.admin?.stats || {};
  [...el.metricGrid.querySelectorAll("strong")].forEach((node, index) => {
    const values = [stats.users, stats.saves, stats.publicSaves, stats.openReports, stats.comments, stats.bannedUsers];
    node.textContent = String(values[index] ?? "-");
  });
  renderAdminActivity();
  renderAdminSaves();
  renderAdminComments();
  renderAdminUsers();
  renderAdminReports();
}

function renderAdminActivity() {
  fillList(el.activityList, state.admin?.activity, (item) => listItem({
    title: `${t(item.type)} · ${item.label}`,
    meta: `${item.actor} · ${formatDate(item.createdAt)}`,
    body: item.id,
  }));
}

function renderAdminSaves() {
  fillList(el.adminSavesList, state.admin?.saves, (save) => {
    const actions = [
      ["admin-toggle-visibility", save.id, save.visibility === "public" ? t("makePrivate") : t("makePublic"), save.visibility === "public" ? "private" : "public"],
      ["admin-toggle-comments", save.id, save.commentsEnabled ? t("closeComments") : t("openComments"), String(!save.commentsEnabled)],
      ["admin-clear-image", save.id, t("clearImage")],
      ["admin-preview-save", save.id, t("detail")],
    ];
    return listItem({
      title: save.title,
      meta: `${save.owner?.displayName || save.owner?.username || t("unknown")} · ${save.commentCount || 0} ${t("comments")} · ${save.openReportCount || 0} ${t("reports")}`,
      body: save.description || save.imageUrl || "",
      pill: `${t(save.visibility)} · ${save.commentsEnabled ? t("commentsOpen") : t("commentsClosed")}`,
      actions,
    });
  });
}

function renderAdminComments() {
  fillList(el.commentsList, state.admin?.comments, (comment) => listItem({
    title: comment.save?.title || comment.saveId,
    meta: `${comment.author?.displayName || comment.author?.username || t("unknown")} · ${formatDate(comment.createdAt)} · ${t(comment.status)}`,
    body: comment.body,
    pill: t(comment.status),
    actions: comment.status === "visible" ? [["admin-hide-comment", comment.id, t("hideComment")]] : [],
  }));
}

function renderAdminUsers() {
  fillList(el.usersList, state.admin?.users, (user) => listItem({
    title: `${user.displayName} @${user.username}`,
    meta: `${t(user.role)} · ${t(user.status)} · ${user.saveCount} ${t("metricSaves")}`,
    body: user.id,
    pill: `${t(user.role)} · ${t(user.status)}`,
    actions: [
      ["admin-user-status", user.id, user.status === "banned" ? t("unbanUser") : t("banUser"), user.status === "banned" ? "active" : "banned"],
      ["admin-user-role", user.id, t("promoteModerator"), "moderator"],
      ["admin-user-role", user.id, t("promoteAdmin"), "admin"],
      ["admin-user-role", user.id, t("demoteMember"), "member"],
    ],
  }));
}

function renderAdminReports() {
  fillList(el.reportsList, state.admin?.reports, (report) => listItem({
    title: `${report.reason} · ${report.save?.title || report.saveId}`,
    meta: `${report.reporter?.displayName || report.reporter?.username || t("unknown")} · ${formatDate(report.createdAt)}`,
    body: report.details,
    pill: t(report.status),
    actions: report.status === "open" ? [["review-report", report.id, t("reviewReport")]] : [],
  }));
}

function fillList(container, items, renderer) {
  container.replaceChildren();
  if (!items || !items.length) {
    container.appendChild(emptyItem(t("noItems")));
    return;
  }
  items.forEach((item) => container.appendChild(renderer(item)));
}

function listItem({ title, meta = "", body = "", pill = "", actions = [] }) {
  const node = document.createElement("article");
  node.className = "list-item";
  node.innerHTML = `
    <div class="list-head">
      <div>
        <p class="item-title">${escapeHtml(title)}</p>
        <p class="item-meta">${escapeHtml(meta)}</p>
      </div>
      ${pill ? `<span class="pill ${escapeAttr(String(pill).toLowerCase())}">${escapeHtml(pill)}</span>` : ""}
    </div>
    ${body ? `<p class="body-muted">${escapeHtml(body)}</p>` : ""}
    <div class="item-actions">
      ${actions.map(([action, id, label, value = ""]) => `<button data-action="${escapeAttr(action)}" data-id="${escapeAttr(id)}" data-value="${escapeAttr(value)}">${escapeHtml(label)}</button>`).join("")}
    </div>
  `;
  return node;
}

function emptyCard(message) {
  const node = document.createElement("article");
  node.className = "post-card";
  node.innerHTML = `<div class="post-image"></div><div class="post-body"><p class="post-title">${escapeHtml(message)}</p></div>`;
  return node;
}

function emptyItem(message) {
  const node = document.createElement("article");
  node.className = "list-item";
  node.innerHTML = `<p class="body-muted">${escapeHtml(message)}</p>`;
  return node;
}

async function refreshSession() {
  try {
    state.session = await refreshBackendSession();
  } catch {
    state.session = null;
  }
  renderSession();
  renderGates();
}

async function refreshCommunity() {
  const payload = await listCommunitySaves();
  state.community = payload.saves || [];
  renderCommunity();
}

async function refreshMySaves() {
  if (!state.session?.user) {
    state.mySaves = [];
    renderMySaves();
    return;
  }
  const payload = await listBackendSaves();
  state.mySaves = payload.saves || [];
  renderMySaves();
}

async function refreshAdmin() {
  if (!["admin", "moderator"].includes(state.session?.user?.role)) {
    state.admin = null;
    renderAdmin();
    return;
  }
  state.admin = await getBackendAdminOverview();
  renderAdmin();
}

async function refreshAll() {
  await refreshSession();
  await refreshCommunity().catch(() => {});
  await refreshMySaves().catch(() => {});
  await refreshAdmin().catch(() => {});
}

async function createDraft(event) {
  event.preventDefault();
  const payload = await createBackendSave({
    title: el.saveTitle.value.trim() || "新的地图存档",
    description: el.saveDescription.value.trim(),
    imageUrl: el.saveImage.value.trim(),
    project: sampleProjectPayload("manual"),
  });
  showToast(t("saved"));
  showDetail(payload.save.title, payload, `mapcreator-save-${payload.save.id.slice(0, 8)}.json`, payload.save.imageUrl);
  await refreshAll();
}

async function runAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { action, id, value } = button.dataset;
  try {
    if (action === "community-detail") {
      const payload = await getCommunitySave(id);
      showDetail(payload.save.title, payload, `community-save-${id.slice(0, 8)}.json`, payload.save.imageUrl);
    } else if (action === "community-download") {
      const payload = await downloadCommunitySave(id);
      showDetail(payload.save.title, payload, payload.filename, payload.save.imageUrl);
      downloadJson(payload.filename, payload.save);
    } else if (action === "community-comment") {
      requireLogin();
      await addCommunityComment(id, state.locale === "zh" ? "我看过这个存档。" : "I reviewed this save.");
      showToast(t("actionDone"));
      await refreshAll();
    } else if (action === "community-report") {
      requireLogin();
      await reportCommunitySave(id, "other", state.locale === "zh" ? "需要管理员检查。" : "Needs admin review.");
      showToast(t("actionDone"));
      await refreshAll();
    } else if (action === "preview-save") {
      const payload = await getBackendSave(id);
      showDetail(payload.save.title, payload, `mapcreator-save-${id.slice(0, 8)}.json`, payload.save.imageUrl);
    } else if (action === "admin-preview-save") {
      const payload = await getBackendAdminSave(id);
      showDetail(payload.save.title, payload, `admin-save-${id.slice(0, 8)}.json`, payload.save.imageUrl);
    } else if (action === "export-save") {
      const payload = await exportBackendSave(id);
      showDetail(payload.save.title, payload, payload.filename, payload.save.imageUrl);
      downloadJson(payload.filename, payload.save);
    } else if (action === "publish-save") {
      await publishBackendSave(id);
      showToast(t("actionDone"));
      await refreshAll();
    } else if (action === "review-report") {
      await reviewBackendReport(id);
      showToast(t("actionDone"));
      await refreshAll();
    } else if (action === "admin-toggle-visibility") {
      await setBackendSaveVisibility(id, value);
      showToast(t("actionDone"));
      await refreshAll();
    } else if (action === "admin-toggle-comments") {
      await setBackendSaveComments(id, value === "true");
      showToast(t("actionDone"));
      await refreshAll();
    } else if (action === "admin-clear-image") {
      await setBackendSaveImage(id, "");
      showToast(t("imageManaged"));
      await refreshAll();
    } else if (action === "admin-hide-comment") {
      await hideBackendComment(id);
      showToast(t("actionDone"));
      await refreshAll();
    } else if (action === "admin-user-status") {
      await updateBackendUser(id, { status: value });
      showToast(t("actionDone"));
      await refreshAll();
    } else if (action === "admin-user-role") {
      await updateBackendUser(id, { role: value });
      showToast(t("actionDone"));
      await refreshAll();
    }
  } catch (error) {
    showToast(error.message || t("actionDone"));
  }
}

function showDetail(title, payload, filename, imageUrl = "") {
  state.detailPayload = payload;
  state.detailFilename = filename;
  el.detailTitle.textContent = title;
  el.detailMeta.textContent = filename;
  el.detailPayload.textContent = JSON.stringify(payload, null, 2);
  el.detailImage.style.backgroundImage = imageUrl ? `url('${imageUrl}')` : "";
  el.detailDialog.showModal();
}

function downloadJson(filename, payload) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function requireLogin() {
  if (!state.session?.user) {
    openAuth("login");
    throw new Error(t("loginRequired"));
  }
}

function openAuth(mode) {
  state.authMode = mode;
  el.authTitle.textContent = t(mode);
  el.authSubmit.textContent = t(mode);
  el.displayNameField.hidden = mode !== "register";
  el.authDialog.showModal();
}

function bindEvents() {
  el.languageToggle.addEventListener("click", () => {
    state.locale = state.locale === "zh" ? "en" : "zh";
    localStorage.setItem("backendConsoleLocale", state.locale);
    renderStaticText();
    renderSession();
    renderCommunity();
    renderMySaves();
    renderAdmin();
  });
  document.querySelector(".mode-nav").addEventListener("click", (event) => {
    const target = event.target.closest("[data-view]");
    if (target) setView(target.dataset.view);
  });
  document.querySelector(".admin-tabs").addEventListener("click", (event) => {
    const target = event.target.closest("[data-admin-tab]");
    if (target) setAdminTab(target.dataset.adminTab);
  });
  el.openLogin.addEventListener("click", () => openAuth("login"));
  el.openRegister.addEventListener("click", () => openAuth("register"));
  el.authSubmit.addEventListener("click", async (event) => {
    event.preventDefault();
    if (state.authMode === "register") {
      state.session = await registerBackendUser({
        username: el.username.value.trim(),
        password: el.password.value,
        displayName: el.displayName.value.trim(),
      });
      showToast(t("registered"));
    } else {
      state.session = await loginBackendUser({
        username: el.username.value.trim(),
        password: el.password.value,
      });
      showToast(t("loggedIn"));
    }
    el.authDialog.close();
    await refreshAll();
  });
  el.logout.addEventListener("click", async () => {
    await logoutBackendUser().catch(() => {});
    state.session = null;
    state.mySaves = [];
    state.admin = null;
    showToast(t("loggedOutToast"));
    await refreshAll();
  });
  el.refreshCommunity.addEventListener("click", refreshCommunity);
  el.refreshAdmin.addEventListener("click", refreshAdmin);
  el.seedDemo.addEventListener("click", async () => {
    if (!state.session?.user) {
      openAuth("login");
      return;
    }
    await seedBackendDemoCommunity();
    showToast(t("demoSeeded"));
    await refreshAll();
  });
  el.createSample.addEventListener("click", async () => {
    const payload = await createBackendSave({
      title: state.locale === "zh" ? "我的示例存档" : "My sample save",
      description: state.locale === "zh" ? "用户中心创建的私有草稿。" : "Private draft created from user center.",
      imageUrl: "/backend/assets/demo-plains.svg",
      project: sampleProjectPayload("sample"),
    });
    showDetail(payload.save.title, payload, `mapcreator-save-${payload.save.id.slice(0, 8)}.json`, payload.save.imageUrl);
    await refreshAll();
  });
  el.manualSaveForm.addEventListener("submit", createDraft);
  el.downloadDetail.addEventListener("click", () => {
    if (state.detailPayload) downloadJson(state.detailFilename, state.detailPayload);
  });
  el.closeDetail.addEventListener("click", () => el.detailDialog.close());
  document.body.addEventListener("click", runAction);
}

function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.toast.classList.remove("visible"), 2600);
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]
  ));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

async function boot() {
  renderStaticText();
  bindEvents();
  if (!isLocalBackendRuntimeAvailable()) {
    showToast(t("backendUnavailable"));
    return;
  }
  await refreshAll();
}

boot();
