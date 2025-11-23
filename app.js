(function () {
  // ---- Storage keys ----
  const STORAGE_KEYS = {
    USERS: "msa_users",
    POSTS: "msa_posts",
    CURRENT_USER: "msa_current_user",
    NOTIFICATIONS: "msa_notifications",
  };

  // ---- Generic localStorage helpers ----
  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ---- User helpers ----
  function getUsers() {
    return readJSON(STORAGE_KEYS.USERS, []);
  }

  function saveUsers(users) {
    writeJSON(STORAGE_KEYS.USERS, users);
  }

  function getCurrentUserId() {
    return readJSON(STORAGE_KEYS.CURRENT_USER, null);
  }

  function setCurrentUserId(id) {
    writeJSON(STORAGE_KEYS.CURRENT_USER, id);
  }

  function clearCurrentUser() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  function findUserByEmail(email) {
    const users = getUsers();
    return (
      users.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      ) || null
    );
  }

  function findUserById(id) {
    const users = getUsers();
    return users.find((u) => u.id === id) || null;
  }

  function getFollowingIds(user) {
    // Follow list stored as `user.following`
    return Array.isArray(user && user.following) ? user.following : [];
  }

  // ---- Post helpers ----
  function getPosts() {
    return readJSON(STORAGE_KEYS.POSTS, []);
  }

  function savePosts(posts) {
    writeJSON(STORAGE_KEYS.POSTS, posts);
  }

  // ---- Notification helpers ----
  function getAllNotifications() {
    return readJSON(STORAGE_KEYS.NOTIFICATIONS, {});
  }

  function saveAllNotifications(map) {
    writeJSON(STORAGE_KEYS.NOTIFICATIONS, map);
  }

  function getNotificationsForUser(userId) {
    const map = getAllNotifications();
    return map[userId] || [];
  }

  function addNotification(userId, message, type, meta) {
    if (!userId) return;
    const map = getAllNotifications();
    const list = map[userId] || [];
    const now = Date.now();
    list.unshift({
      id: "notif_" + now + "_" + Math.random().toString(36).slice(2, 8),
      message,
      type,
      createdAt: now,
      read: false,
      ...(meta || {}),
    });
    map[userId] = list;
    saveAllNotifications(map);
  }

  function markAllNotificationsRead(userId) {
    const map = getAllNotifications();
    const list = map[userId];
    if (!list || !list.length) return;
    list.forEach((n) => {
      n.read = true;
    });
    map[userId] = list;
    saveAllNotifications(map);
  }

  function clearNotifications(userId) {
    const map = getAllNotifications();
    map[userId] = [];
    saveAllNotifications(map);
  }

  // ---- Utility helpers ----
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function formatTimeAgo(ts) {
    const now = Date.now();
    const diff = Math.max(0, now - ts);
    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (day > 0) return `${day} day${day === 1 ? "" : "s"} ago`;
    if (hr > 0) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
    if (min > 0) return `${min} minute${min === 1 ? "" : "s"} ago`;
    return "Just now";
  }

  function initialsFromName(name) {
    if (!name) return "U";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function applyAvatarImage(el, photoData, name) {
    if (!el) return;
    el.textContent = initialsFromName(name || "User");
    if (photoData) {
      el.style.backgroundImage = `url(${photoData})`;
      el.classList.add("avatar--with-photo");
    } else {
      el.style.backgroundImage = "";
      el.classList.remove("avatar--with-photo");
    }
  }

  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  // ---- DOM references (shared across pages) ----
  const body = document.body;
  const pageType = body ? body.getAttribute("data-page") : "dashboard";

  // Auth
  const authOverlay = document.getElementById("auth-overlay");
  const authTabLogin = document.getElementById("auth-tab-login");
  const authTabSignup = document.getElementById("auth-tab-signup");
  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");
  const loginError = document.getElementById("login-error");
  const signupError = document.getElementById("signup-error");

  // Topbar + nav
  const navbarUsername = document.getElementById("navbar-username");
  const navbarAvatar = document.getElementById("navbar-avatar");
  const navbarProfileLink = document.getElementById("navbar-profile-link");
  const logoutButton = document.getElementById("logout-button");
  const guestbutton = document.getElementById("guest-auth-btn")
  const navHome = document.getElementById("nav-home");
  const navFeed = document.getElementById("nav-feed");
  const navSearchInput = document.getElementById("nav-search");
  const searchResults = document.getElementById("search-results");

  // Notifications
  const notifBell = document.getElementById("notif-bell");
  const notifPanel = document.getElementById("notif-panel");
  const notifList = document.getElementById("notif-list");
  const notifDot = document.getElementById("notif-dot");
  const notifClear = document.getElementById("notif-clear");

  // Dashboard-only DOM refs
  const profileName = document.getElementById("profile-name");
  const profileHandle = document.getElementById("profile-handle");
  const profileAvatar = document.getElementById("profile-avatar");
  const profilePostsCount = document.getElementById("profile-posts-count");
  const profileFollowersCount = document.getElementById("profile-followers");
  const profileFollowingCount = document.getElementById("profile-following");
  const btnMyProfile = document.getElementById("btn-my-profile");

  const composerAvatar = document.getElementById("composer-avatar");
  const composerText = document.getElementById("composer-text");
  const composerUploadBtn = document.getElementById("composer-upload-btn");
  const composerImageFileInput = document.getElementById(
    "composer-image-file"
  );
  const composerImagePreview = document.getElementById(
    "composer-image-preview"
  );
  const composerImagePreviewImg = document.getElementById(
    "composer-image-preview-img"
  );
  const composerRemoveImage = document.getElementById(
    "composer-remove-image"
  );
  const composerSubmit = document.getElementById("composer-submit");

  const sortSelect = document.getElementById("sort-select");
  const feedList = document.getElementById("feed-list");
  const emptyFeed = document.getElementById("empty-feed");
  const suggestionsList = document.getElementById("suggestions-list");

  // Profile page DOM refs
  const profileBackBtn = document.getElementById("profile-back-btn");
  const profileEditAvatar = document.getElementById("profile-edit-avatar");
  const profileChangePicBtn = document.getElementById("profile-change-pic");
  const profilePicFile = document.getElementById("profile-pic-file");
  const profileEditHeading = document.getElementById("profile-edit-heading");
  const profileEditUsername = document.getElementById(
    "profile-edit-username"
  );
  const profileEditHandle = document.getElementById("profile-edit-handle");
  const profileEditEmail = document.getElementById("profile-edit-email");
  const profileEditBio = document.getElementById("profile-edit-bio");
  const profileEditPostsCount = document.getElementById(
    "profile-edit-posts-count"
  );
  const profileEditFollowersCount = document.getElementById(
    "profile-edit-followers-count"
  );
  const profileEditFollowingCount = document.getElementById(
    "profile-edit-following-count"
  );
  const profileSaveBtn = document.getElementById("profile-save-btn");
  const profileSaveStatus = document.getElementById("profile-save-status");
  const profilePostsList = document.getElementById("profile-posts-list");
  const profileEmptyPosts = document.getElementById("profile-empty-posts");

  // Post edit modal
  const editPostOverlay = document.getElementById("edit-post-overlay");
  const editPostClose = document.getElementById("edit-post-close");
  const editPostText = document.getElementById("edit-post-text");
  const editPostUploadBtn = document.getElementById("edit-post-upload-btn");
  const editPostImageFile = document.getElementById("edit-post-image-file");
  const editPostRemoveImage = document.getElementById(
    "edit-post-remove-image"
  );
  const editPostImagePreview = document.getElementById(
    "edit-post-image-preview"
  );
  const editPostImagePreviewImg = document.getElementById(
    "edit-post-image-preview-img"
  );
  const editPostCancel = document.getElementById("edit-post-cancel");
  const editPostSave = document.getElementById("edit-post-save");

  // ---- In-memory UI state ----
  let currentUser = null;
  let postsCache = [];
  let searchTerm = "";
  let sortMode = "latest";
  let activeScope = "home"; // "home" (all posts) or "feed" (followed only)
  let composerImageDataUrl = "";
  let profilePendingPhotoData = null;
  let editingPostId = null;
  let editingPostImageDataUrl = null;

  // ---- Auth overlay helpers ----
  function setAuthMode(mode) {
    if (!authTabLogin || !authTabSignup || !loginForm || !signupForm) return;
    if (mode === "login") {
      authTabLogin.classList.add("auth-tab--active");
      authTabSignup.classList.remove("auth-tab--active");
      loginForm.classList.remove("auth-form--hidden");
      signupForm.classList.add("auth-form--hidden");
      if (loginError) loginError.textContent = "";
    } else {
      authTabSignup.classList.add("auth-tab--active");
      authTabLogin.classList.remove("auth-tab--active");
      signupForm.classList.remove("auth-form--hidden");
      loginForm.classList.add("auth-form--hidden");
      if (signupError) signupError.textContent = "";
    }
  }

  function openAuthOverlay() {
    if (authOverlay) authOverlay.classList.remove("hidden");
  }

  function closeAuthOverlay() {
    if (authOverlay) authOverlay.classList.add("hidden");
  }

  // ---- User profile + suggestions UI ----
  function updateUserProfileUI() {
    if (!currentUser) return;

    const handleValue =
      currentUser.handle ||
      currentUser.username.toLowerCase().replace(/\s+/g, "");

    if (profileName) profileName.textContent = currentUser.username;
    if (profileHandle) profileHandle.textContent = `@${handleValue}`;

    const avatarText = currentUser.username;
    applyAvatarImage(profileAvatar, currentUser.photoData, avatarText);
    applyAvatarImage(composerAvatar, currentUser.photoData, avatarText);
    applyAvatarImage(navbarAvatar, currentUser.photoData, avatarText);
    if (navbarUsername) navbarUsername.textContent = currentUser.username;

    const posts = getPosts();
    const myPostsCount = posts.filter(
      (p) => (p.userId || p.authorId) === currentUser.id
    ).length;
    if (profilePostsCount)
      profilePostsCount.textContent = String(myPostsCount);

    const users = getUsers();
    const followers = users.filter((u) =>
      getFollowingIds(u).includes(currentUser.id)
    ).length;
    const following = getFollowingIds(currentUser).length;

    if (profileFollowersCount)
      profileFollowersCount.textContent = String(followers);
    if (profileFollowingCount)
      profileFollowingCount.textContent = String(following);
  }

  function renderSuggestions() {
    if (!suggestionsList || !currentUser) return;

    const users = getUsers();
    const followingIds = getFollowingIds(currentUser);
    const others = users.filter((u) => u.id !== currentUser.id);

    suggestionsList.innerHTML = "";

    if (!others.length) {
      suggestionsList.innerHTML =
        '<li class="suggestion-item"><span class="suggestion-sub">No other users yet. Create more accounts to see suggestions.</span></li>';
      return;
    }

    others.forEach((user) => {
      const li = document.createElement("li");
      li.className = "suggestion-item";
      li.dataset.userId = user.id;

      const isFollowing = followingIds.includes(user.id);
      const initials = initialsFromName(user.username);
      const avatarClasses =
        "avatar avatar--small" +
        (user.photoData ? " avatar--with-photo" : "");
      const avatarStyle = user.photoData
        ? `style="background-image:url('${user.photoData}')"`
        : "";

      li.innerHTML = `
        <div class="${avatarClasses}" ${avatarStyle}>${initials}</div>
        <div class="suggestion-text">
          <div class="suggestion-name">${escapeHTML(user.username)}</div>
          <div class="suggestion-sub">@${escapeHTML(
            (user.handle ||
              user.username.toLowerCase().replace(/\s+/g, "")) || ""
          )}</div>
        </div>
        <button type="button" class="follow-btn follow-toggle ${
          isFollowing ? "following" : ""
        }">
          ${isFollowing ? "Following" : "Follow"}
        </button>
      `;

      suggestionsList.appendChild(li);
    });
  }

  // ---- Follow system ----
  function toggleFollow(targetUserId) {
    if (!currentUser || !targetUserId || currentUser.id === targetUserId) {
      return;
    }

    const users = getUsers();
    const meIndex = users.findIndex((u) => u.id === currentUser.id);
    const target = users.find((u) => u.id === targetUserId);
    if (meIndex === -1 || !target) return;

    const me = users[meIndex];
    if (!Array.isArray(me.following)) me.following = [];
    const idx = me.following.indexOf(targetUserId);

    let startedFollowing = false;
    if (idx === -1) {
      me.following.push(targetUserId);
      startedFollowing = true;
    } else {
      me.following.splice(idx, 1);
    }

    users[meIndex] = me;
    saveUsers(users);
    currentUser = me;

    // Notification: someone started following you
    if (startedFollowing) {
      addNotification(
        targetUserId,
        `${currentUser.username} started following you`,
        "follow",
        { fromUserId: currentUser.id }
      );
    }

    updateUserProfileUI();
    renderSuggestions();
    renderFeed();
    renderProfilePosts();
    renderNotificationsUI();
  }

  // ---- Feed computation & rendering ----
  function getFilteredSortedPosts() {
    let posts = postsCache.slice();

    // Feed scope:
    // Home  -> all posts (global)
    // Feed  -> only posts from followed users (and self)
    if (currentUser && activeScope === "feed") {
      // Requirement: use currentUser.following for filtering
      const following = getFollowingIds(currentUser);
      posts = posts.filter((p) => {
        const authorUserId = p.userId || p.authorId;
        return (
          authorUserId === currentUser.id || following.includes(authorUserId)
        );
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      posts = posts.filter((p) => {
        const text = (p.text || "").toLowerCase();
        const author = (p.authorName || "").toLowerCase();
        const comments = Array.isArray(p.comments) ? p.comments : [];
        const commentMatch = comments.some((c) => {
          const ct = (c.text || "").toLowerCase();
          const ca = (c.authorName || "").toLowerCase();
          return ct.includes(term) || ca.includes(term);
        });
        return (
          text.includes(term) ||
          author.includes(term) ||
          commentMatch
        );
      });
    }

    if (sortMode === "latest") {
      posts.sort((a, b) => b.createdAt - a.createdAt);
    } else if (sortMode === "oldest") {
      posts.sort((a, b) => a.createdAt - b.createdAt);
    } else if (sortMode === "most-liked") {
      posts.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
    }

    return posts;
  }

  function buildCommentsHTML(comments, limitToFirst) {
    if (!comments || !comments.length) return "";
    const list = limitToFirst ? comments.slice(0, 1) : comments;
    return list
      .map((c) => {
        return `
        <div class="post-comment-item">
          <span class="post-comment-author">${escapeHTML(
            c.authorName || "User"
          )}</span>
          <span class="post-comment-time">${formatTimeAgo(
            c.createdAt
          )}</span>
          <div class="post-comment-text">${escapeHTML(
            c.text || ""
          )}</div>
        </div>
      `;
      })
      .join("");
  }

  function renderFeed() {
    if (!feedList) return;
    postsCache = getPosts();
    const posts = getFilteredSortedPosts();
    feedList.innerHTML = "";

    if (!posts.length) {
      if (emptyFeed) emptyFeed.classList.remove("hidden");
      return;
    }
    if (emptyFeed) emptyFeed.classList.add("hidden");

    posts.forEach((post) => {
      const card = document.createElement("article");
      card.className = "post-card";
      card.dataset.postId = post.id;

      const authorUser =
        findUserById(post.userId || post.authorId) || null;
      const authorName = authorUser
        ? authorUser.username
        : post.authorName || "User";
      const handleValue =
        (authorUser && authorUser.handle) ||
        authorName.toLowerCase().replace(/\s+/g, "");
      const avatarInitials = initialsFromName(authorName);

      const likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
      const isLiked =
        currentUser && likedBy.indexOf(currentUser.id) !== -1;
      const likeCount = post.likeCount || 0;

      const fullText = post.text || "";
      const needsReadMore = fullText.length > 150;
      const truncatedText = needsReadMore
        ? fullText.slice(0, 150) + "…"
        : fullText;

      const timeText = formatTimeAgo(post.createdAt);
      const comments = Array.isArray(post.comments) ? post.comments : [];
      const hasComments = comments.length > 0;
      const commentsHTML = buildCommentsHTML(comments, true);
      const totalComments = comments.length;

      const imgSection =
        post.imageData && post.imageData.trim().length
          ? `<div class="post-image-wrap">
               <img src="${escapeHTML(
                 post.imageData.trim()
               )}" alt="Post image" />
             </div>`
          : "";

      const avatarClasses =
        "avatar avatar--small" +
        (authorUser && authorUser.photoData ? " avatar--with-photo" : "");
      const avatarStyle =
        authorUser && authorUser.photoData
          ? `style="background-image:url('${authorUser.photoData}')"`
          : "";

      card.innerHTML = `
        <header class="post-header">
          <div class="post-header-left">
            <div class="${avatarClasses}" ${avatarStyle}>${avatarInitials}</div>
            <div class="post-user">
              <span class="post-user-name">${escapeHTML(authorName)}</span>
              <span class="post-user-handle">@${escapeHTML(
                handleValue
              )}</span>
              <span class="post-time">${timeText}</span>
            </div>
          </div>
          ${
            currentUser && currentUser.id === (post.userId || post.authorId)
              ? '<div><button class="post-edit-btn" type="button">Edit</button><button class="post-delete-btn" type="button">Delete</button></div>'
              : ""
          }
        </header>
        <div class="post-text" data-state="${
          needsReadMore ? "collapsed" : "expanded"
        }">${escapeHTML(
        needsReadMore ? truncatedText : fullText
      )}</div>
        ${
          needsReadMore
            ? '<button class="post-read-toggle" type="button">Read more</button>'
            : ""
        }
        ${imgSection}
        <div class="post-tags" style="visibility:hidden">#</div>
        <footer class="post-footer">
          <div class="post-footer-left">
            <button class="post-like-btn ${
              isLiked ? "post-like-btn--liked" : ""
            }" type="button">
              <span>${isLiked ? "❤" : "♡"}</span>
              <span>${likeCount}</span>
            </button>
          </div>
        </footer>
        <div class="post-comments">
          <button class="post-comment-toggle" type="button">Comment</button>
          <div class="post-comments-body${hasComments ? "" : " hidden"}">
            <div class="post-comments-list ${
              totalComments > 1 ? "collapsed" : "expanded"
            }">
              ${commentsHTML}
            </div>
            ${
              totalComments > 1
                ? `<button class="post-comments-more" type="button" data-state="collapsed">
                     View more comments (${totalComments - 1})
                   </button>`
                : ""
            }
            <form class="post-comment-form">
              <input
                type="text"
                class="post-comment-input"
                placeholder="Write a comment..."
              />
              <button type="submit" class="post-comment-submit">
                Post
              </button>
            </form>
          </div>
        </div>
      `;

      feedList.appendChild(card);
    });

    updateUserProfileUI();
  }

  // Render only a given user's posts on profile page
  function renderProfilePosts(viewUserId) {
    if (!profilePostsList || !viewUserId) return;
    const allPosts = getPosts();
    const mine = allPosts.filter(
      (p) => (p.userId || p.authorId) === viewUserId
    );
    profilePostsList.innerHTML = "";

    if (!mine.length) {
      if (profileEmptyPosts) profileEmptyPosts.classList.remove("hidden");
      return;
    }
    if (profileEmptyPosts) profileEmptyPosts.classList.add("hidden");

    mine
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .forEach((post) => {
        const card = document.createElement("article");
        card.className = "post-card";
        card.dataset.postId = post.id;

        const isOwner = currentUser && currentUser.id === viewUserId;

        const fullText = post.text || "";
        const needsReadMore = fullText.length > 150;
        const truncatedText = needsReadMore
          ? fullText.slice(0, 150) + "…"
          : fullText;

        const timeText = formatTimeAgo(post.createdAt);
        const comments = Array.isArray(post.comments) ? post.comments : [];
        const totalComments = comments.length;
        const commentsHTML = buildCommentsHTML(comments, true);
        const hasComments = comments.length > 0;

        const imgSection =
          post.imageData && post.imageData.trim().length
            ? `<div class="post-image-wrap">
                 <img src="${escapeHTML(
                   post.imageData.trim()
                 )}" alt="Post image" />
               </div>`
            : "";

        const likeCount = post.likeCount || 0;

        card.innerHTML = `
          <header class="post-header">
            <div class="post-header-left">
              <div class="avatar avatar--small">${initialsFromName(
                currentUser ? currentUser.username : "User"
              )}</div>
              <div class="post-user">
                <span class="post-user-name">${escapeHTML(
                  currentUser ? currentUser.username : "User"
                )}</span>
                <span class="post-user-handle">@${escapeHTML(
                  (currentUser &&
                    (currentUser.handle ||
                      currentUser.username
                        .toLowerCase()
                        .replace(/\s+/g, ""))) ||
                    "user"
                )}</span>
                <span class="post-time">${timeText}</span>
              </div>
            </div>
            ${
              isOwner
                ? '<div><button class="post-edit-btn" type="button">Edit</button><button class="post-delete-btn" type="button">Delete</button></div>'
                : ""
            }
          </header>
          <div class="post-text" data-state="${
            needsReadMore ? "collapsed" : "expanded"
          }">${escapeHTML(
          needsReadMore ? truncatedText : fullText
        )}</div>
          ${
            needsReadMore
              ? '<button class="post-read-toggle" type="button">Read more</button>'
              : ""
          }
          ${imgSection}
          <footer class="post-footer">
            <div class="post-footer-left">
              <span>${likeCount} like${likeCount === 1 ? "" : "s"}</span>
            </div>
          </footer>
          <div class="post-comments">
            <button class="post-comment-toggle" type="button">Comment</button>
            <div class="post-comments-body${hasComments ? "" : " hidden"}">
              <div class="post-comments-list ${
                totalComments > 1 ? "collapsed" : "expanded"
              }">
                ${commentsHTML}
              </div>
              ${
                totalComments > 1
                  ? `<button class="post-comments-more" type="button" data-state="collapsed">
                       View more comments (${totalComments - 1})
                     </button>`
                  : ""
              }
              <form class="post-comment-form">
                <input
                  type="text"
                  class="post-comment-input"
                  placeholder="Write a comment..."
                />
                <button type="submit" class="post-comment-submit">
                  Post
                </button>
              </form>
            </div>
          </div>
        `;
        profilePostsList.appendChild(card);
      });

    if (profileEditPostsCount)
      profileEditPostsCount.textContent = String(mine.length);
  }

  // ---- Post creation & interactions ----
  function createPost(text, imageData) {
    if (!currentUser) return;

    const posts = getPosts();
    const now = Date.now();
    const newPost = {
      id: "post_" + now + "_" + Math.floor(Math.random() * 1000),
      userId: currentUser.id,
      authorId: currentUser.id,
      authorName: currentUser.username,
      text,
      imageData: imageData || "",
      createdAt: now,
      updatedAt: null,
      likeCount: 0,
      likedBy: [],
      comments: [],
    };
    posts.push(newPost);
    savePosts(posts);
    postsCache = posts;

    // Notification: followers see that we posted a new update
    const users = getUsers();
    users.forEach((u) => {
      if (u.id === currentUser.id) return;
      const follows = getFollowingIds(u);
      if (follows.includes(currentUser.id)) {
        addNotification(
          u.id,
          `${currentUser.username} posted a new update`,
          "post",
          { fromUserId: currentUser.id, postId: newPost.id }
        );
      }
    });

    renderFeed();
    if (pageType === "profile") {
      renderProfilePosts(currentUser.id);
    }
    renderNotificationsUI();
  }

  function toggleLike(postId) {
    if (!currentUser) return;
    const posts = getPosts();
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    if (!Array.isArray(post.likedBy)) post.likedBy = [];
    if (typeof post.likeCount !== "number") post.likeCount = 0;

    const idx = post.likedBy.indexOf(currentUser.id);
    let nowLiked = false;
    if (idx === -1) {
      post.likedBy.push(currentUser.id);
      post.likeCount += 1;
      nowLiked = true;
    } else {
      post.likedBy.splice(idx, 1);
      post.likeCount = Math.max(0, post.likeCount - 1);
    }

    savePosts(posts);
    postsCache = posts;

    // Notification: like
    if (nowLiked && post.userId && post.userId !== currentUser.id) {
      addNotification(
        post.userId,
        `${currentUser.username} liked your post`,
        "like",
        { fromUserId: currentUser.id, postId: post.id }
      );
    }

    renderFeed();
    if (pageType === "profile") {
      const viewedId = getQueryParam("userId") || currentUser.id;
      renderProfilePosts(viewedId);
    }
    renderNotificationsUI();
  }

  function deletePost(postId) {
    if (!currentUser) return;
    const posts = getPosts();
    const filtered = posts.filter((p) =>
      p.id === postId ? (p.userId || p.authorId) !== currentUser.id : true
    );
    savePosts(filtered);
    postsCache = filtered;
    renderFeed();
    if (pageType === "profile") {
      const viewedId = getQueryParam("userId") || currentUser.id;
      renderProfilePosts(viewedId);
    }
  }

  function addComment(postId, text) {
    if (!currentUser) {
      openAuthOverlay();
      return;
    }
    const posts = getPosts();
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    if (!Array.isArray(post.comments)) post.comments = [];
    const now = Date.now();
    post.comments.push({
      id: "c_" + now + "_" + Math.random().toString(36).slice(2, 6),
      authorId: currentUser.id,
      authorName: currentUser.username,
      text,
      createdAt: now,
    });

    savePosts(posts);
    postsCache = posts;

    // Notification: comment
    if (post.userId && post.userId !== currentUser.id) {
      addNotification(
        post.userId,
        `${currentUser.username} commented on your post`,
        "comment",
        { fromUserId: currentUser.id, postId: post.id }
      );
    }

    renderFeed();
    if (pageType === "profile") {
      const viewedId = getQueryParam("userId") || currentUser.id;
      renderProfilePosts(viewedId);
    }
    renderNotificationsUI();
  }

  // ---- Edit post modal ----
  function openEditModal(postId) {
    const posts = getPosts();
    const post = posts.find((p) => p.id === postId);
    if (!post || !currentUser || (post.userId || post.authorId) !== currentUser.id)
      return;

    editingPostId = postId;
    editingPostImageDataUrl = post.imageData || "";
    if (editPostText) editPostText.value = post.text || "";

    if (editingPostImageDataUrl) {
      if (editPostImagePreviewImg)
        editPostImagePreviewImg.src = editingPostImageDataUrl;
      if (editPostImagePreview)
        editPostImagePreview.classList.remove("hidden");
    } else if (editPostImagePreview) {
      editPostImagePreview.classList.add("hidden");
    }

    if (editPostOverlay) editPostOverlay.classList.remove("hidden");
  }

  function closeEditModal() {
    editingPostId = null;
    editingPostImageDataUrl = null;
    if (editPostText) editPostText.value = "";
    if (editPostImageFile) editPostImageFile.value = "";
    if (editPostImagePreview) editPostImagePreview.classList.add("hidden");
    if (editPostOverlay) editPostOverlay.classList.add("hidden");
  }

  function handleEditImageFileChange(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      const res = ev.target && ev.target.result;
      if (typeof res === "string") {
        editingPostImageDataUrl = res;
        if (editPostImagePreviewImg) editPostImagePreviewImg.src = res;
        if (editPostImagePreview)
          editPostImagePreview.classList.remove("hidden");
      }
    };
    reader.readAsDataURL(file);
  }

  function saveEditedPost() {
    if (!editingPostId || !currentUser) return;
    const posts = getPosts();
    const post = posts.find((p) => p.id === editingPostId);
    if (!post || (post.userId || post.authorId) !== currentUser.id) return;

    const newText = editPostText ? editPostText.value.trim() : post.text;
    post.text = newText;
    post.imageData = editingPostImageDataUrl || "";
    post.updatedAt = Date.now();
    post.isEdited = true;

    savePosts(posts);
    postsCache = posts;
    closeEditModal();
    renderFeed();
    if (pageType === "profile") {
      const viewedId = getQueryParam("userId") || currentUser.id;
      renderProfilePosts(viewedId);
    }
  }

  // ---- Notification UI ----
  function renderNotificationsUI() {
    if (!currentUser || !notifList) return;

    const items = getNotificationsForUser(currentUser.id);
    notifList.innerHTML = "";

    if (!items.length) {
      notifList.innerHTML =
        '<div class="search-empty">No notifications yet.</div>';
      if (notifDot) notifDot.classList.add("hidden");
      return;
    }

    const hasUnread = items.some((n) => !n.read);
    if (notifDot) {
      if (hasUnread) {
        notifDot.classList.remove("hidden");
      } else {
        notifDot.classList.add("hidden");
      }
    }

    items.forEach((n) => {
      const div = document.createElement("div");
      div.className = "notif-item" + (n.read ? "" : " unread");
      div.innerHTML = `
        <div class="notif-dot-inline"></div>
        <div>
          <div class="notif-message">${escapeHTML(n.message)}</div>
          <div class="notif-time">${formatTimeAgo(n.createdAt)}</div>
        </div>
      `;
      notifList.appendChild(div);
    });
  }

  // ---- Global search system (users, posts, comments) ----
  function renderSearchResults(term) {
    if (!searchResults) return;
    const q = term.trim().toLowerCase();
    if (!q) {
      searchResults.classList.add("hidden");
      searchResults.innerHTML = "";
      return;
    }

    const users = getUsers();
    const posts = getPosts();

    const userMatches = users.filter((u) => {
      const username = (u.username || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const handle = (u.handle || "")
        .toString()
        .toLowerCase();
      return (
        username.includes(q) || email.includes(q) || handle.includes(q)
      );
    });

    const postMatches = posts.filter((p) =>
      (p.text || "").toLowerCase().includes(q)
    );

    const commentsMatches = [];
    posts.forEach((p) => {
      const comments = Array.isArray(p.comments) ? p.comments : [];
      comments.forEach((c) => {
        if (
          (c.text || "").toLowerCase().includes(q) ||
          (c.authorName || "").toLowerCase().includes(q)
        ) {
          commentsMatches.push({ comment: c, post: p });
        }
      });
    });

    let html = "";

    if (userMatches.length) {
      html += '<div class="search-section">';
      html +=
        '<div class="search-section-title">Users</div>';
      userMatches.slice(0, 6).forEach((u) => {
        const following = currentUser ? getFollowingIds(currentUser) : [];
        const isFollowing =
          currentUser && following.includes(u.id);
        const initials = initialsFromName(u.username);
        const avatarClasses =
          "avatar avatar--small" +
          (u.photoData ? " avatar--with-photo" : "");
        const avatarStyle = u.photoData
          ? `style="background-image:url('${u.photoData}')"`
          : "";

        html += `
          <div class="search-item" data-user-id="${u.id}">
            <div class="${avatarClasses}" ${avatarStyle}>${initials}</div>
            <div class="search-item-main">
              <div class="search-item-title">${escapeHTML(
                u.username
              )}</div>
              <div class="search-item-sub">@${escapeHTML(
                (u.handle ||
                  u.username.toLowerCase().replace(/\s+/g, "")) || ""
              )}</div>
            </div>
            ${
              currentUser && currentUser.id !== u.id
                ? `<button type="button" class="follow-btn follow-toggle ${
                    isFollowing ? "following" : ""
                  }">${isFollowing ? "Following" : "Follow"}</button>`
                : ""
            }
          </div>
        `;
      });
      html += "</div>";
    }

    if (postMatches.length) {
      html += '<div class="search-section">';
      html +=
        '<div class="search-section-title">Posts</div>';
      postMatches.slice(0, 4).forEach((p) => {
        html += `
          <div class="search-item">
            <div class="search-item-main">
              <div class="search-item-title">${escapeHTML(
                (p.authorName || "User") + " · " + formatTimeAgo(p.createdAt)
              )}</div>
              <div class="search-item-sub">${escapeHTML(
                (p.text || "").slice(0, 60)
              )}</div>
            </div>
          </div>
        `;
      });
      html += "</div>";
    }

    if (commentsMatches.length) {
      html += '<div class="search-section">';
      html +=
        '<div class="search-section-title">Comments</div>';
      commentsMatches.slice(0, 4).forEach(({ comment, post }) => {
        html += `
          <div class="search-item">
            <div class="search-item-main">
              <div class="search-item-title">${escapeHTML(
                comment.authorName || "User"
              )}</div>
              <div class="search-item-sub">${escapeHTML(
                (comment.text || "").slice(0, 60)
              )} · on ${escapeHTML(post.authorName || "post")}</div>
            </div>
          </div>
        `;
      });
      html += "</div>";
    }

    if (!html) {
      html =
        '<div class="search-empty">No results found.</div>';
    }

    searchResults.innerHTML = html;
    searchResults.classList.remove("hidden");
  }

// FIXED Signup Handler for signup.html page
function handleSignupSubmit(e) {
  e.preventDefault();
  signupError.textContent = "";

  const username = document.getElementById("signup-username").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;
  const confirm = document.getElementById("signup-password-confirm").value;

  if (!username || !email || !password || !confirm) {
    signupError.textContent = "All fields are required.";
    return;
  }

  if (password !== confirm) {
    signupError.textContent = "Passwords do not match.";
    return;
  }

  if (findUserByEmail(email)) {
    signupError.textContent = "Email already exists.";
    return;
  }

  const users = getUsers();
  const now = Date.now();

  users.push({
    id: "user_" + now,
    username,
    email,
    password,
    createdAt: now,
    photoData: "",
    bio: "",
    following: []
  });

  saveUsers(users);

  // SUCCESS → redirect to login page
  window.location.href = "login.html";
}



// FIXED Login Handler for login.html page
function handleLoginSubmit(e) {
  e.preventDefault();
  loginError.textContent = "";

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    loginError.textContent = "Please enter your email and password.";
    return;
  }

  const user = findUserByEmail(email);
  if (!user || user.password !== password) {
    loginError.textContent = "Invalid login credentials.";
    return;
  }

  setCurrentUserId(user.id);
  currentUser = user;

  // SUCCESS → Go to dashboard
  window.location.href = "index.html"; // OR dashboard.html (your main page)
}


  // ---- Composer image upload ----
  function resetComposerImage() {
    composerImageDataUrl = "";
    if (composerImageFileInput) composerImageFileInput.value = "";
    if (composerImagePreview) composerImagePreview.classList.add("hidden");
    if (composerImagePreviewImg) composerImagePreviewImg.src = "";
  }

  function handleImageFileChange(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      const result = ev.target && ev.target.result;
      if (typeof result === "string") {
        composerImageDataUrl = result;
        if (composerImagePreviewImg)
          composerImagePreviewImg.src = result;
        if (composerImagePreview)
          composerImagePreview.classList.remove("hidden");
      }
    };
    reader.readAsDataURL(file);
  }

  // ---- Profile page logic ----
  function initProfilePage() {
    if (pageType !== "profile") return;
    if (!currentUser) {
      openAuthOverlay();
      return;
    }

    const viewedUserId = getQueryParam("userId") || currentUser.id;
    const viewedUser = findUserById(viewedUserId) || currentUser;
    const isSelf = viewedUser.id === currentUser.id;

    if (profileEditHeading) {
      profileEditHeading.textContent = isSelf
        ? "Edit Profile"
        : "Profile";
    }

    const handleValue =
      viewedUser.handle ||
      viewedUser.username.toLowerCase().replace(/\s+/g, "");

    if (profileEditUsername)
      profileEditUsername.value = viewedUser.username || "";
    if (profileEditHandle) profileEditHandle.value = handleValue;
    if (profileEditEmail) profileEditEmail.value = viewedUser.email || "";
    if (profileEditBio) profileEditBio.value = viewedUser.bio || "";

    const posts = getPosts();
    const myPostsCount = posts.filter(
      (p) => (p.userId || p.authorId) === viewedUser.id
    ).length;
    const users = getUsers();
    const followers = users.filter((u) =>
      getFollowingIds(u).includes(viewedUser.id)
    ).length;
    const following = getFollowingIds(viewedUser).length;

    if (profileEditPostsCount)
      profileEditPostsCount.textContent = String(myPostsCount);
    if (profileEditFollowersCount)
      profileEditFollowersCount.textContent = String(followers);
    if (profileEditFollowingCount)
      profileEditFollowingCount.textContent = String(following);

    applyAvatarImage(
      profileEditAvatar,
      viewedUser.photoData,
      viewedUser.username
    );

    renderProfilePosts(viewedUser.id);

    // If viewing someone else, disable editing UI
    if (!isSelf) {
      if (profileChangePicBtn) profileChangePicBtn.classList.add("hidden");
      if (profileSaveBtn) profileSaveBtn.classList.add("hidden");
      if (profilePicFile) profilePicFile.disabled = true;

      [profileEditUsername, profileEditHandle, profileEditEmail, profileEditBio]
        .filter(Boolean)
        .forEach((el) => {
          el.readOnly = true;
        });
    }

    if (profileBackBtn) {
      profileBackBtn.addEventListener("click", () => {
        window.location.href = "index.html";
      });
    }

    if (isSelf && profileChangePicBtn && profilePicFile) {
      profileChangePicBtn.addEventListener("click", () => {
        profilePicFile.click();
      });

      profilePicFile.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
          alert("Please select a PNG, JPG, JPEG, or WEBP image.");
          e.target.value = "";
          return;
        }
        const reader = new FileReader();
        reader.onload = function (ev) {
          const res = ev.target && ev.target.result;
          if (typeof res === "string") {
            profilePendingPhotoData = res;
            applyAvatarImage(
              profileEditAvatar,
              res,
              currentUser.username
            );
          }
        };
        reader.readAsDataURL(file);
      });
    }

    if (isSelf && profileSaveBtn) {
      profileSaveBtn.addEventListener("click", () => {
        if (!currentUser) return;

        const newUsername = profileEditUsername
          ? profileEditUsername.value.trim()
          : currentUser.username;
        const newHandleRaw = profileEditHandle
          ? profileEditHandle.value.trim()
          : "";
        const newHandle =
          newHandleRaw || newUsername.toLowerCase().replace(/\s+/g, "");
        const newEmail = profileEditEmail
          ? profileEditEmail.value.trim()
          : currentUser.email;
        const newBio = profileEditBio
          ? profileEditBio.value.trim()
          : currentUser.bio;

        if (!newUsername || !newEmail) {
          if (profileSaveStatus)
            profileSaveStatus.textContent =
              "Username and email are required.";
          return;
        }

        const usersArr = getUsers();
        const idx = usersArr.findIndex((u) => u.id === currentUser.id);
        if (idx === -1) return;

        const updatedUser = {
          ...currentUser,
          username: newUsername,
          email: newEmail,
          bio: newBio,
          handle: newHandle,
          photoData:
            profilePendingPhotoData != null
              ? profilePendingPhotoData
              : currentUser.photoData,
        };
        usersArr[idx] = updatedUser;
        saveUsers(usersArr);
        currentUser = updatedUser;
        profilePendingPhotoData = null;

        // Update posts to reflect new author name
        const postsAll = getPosts();
        postsAll.forEach((p) => {
          if ((p.userId || p.authorId) === currentUser.id) {
            p.authorName = currentUser.username;
          }
        });
        savePosts(postsAll);
        postsCache = postsAll;

        updateUserProfileUI();
        renderSuggestions();
        renderFeed();
        renderProfilePosts(currentUser.id);
        renderNotificationsUI();

        if (profileSaveStatus) {
          profileSaveStatus.textContent = "Profile saved.";
          setTimeout(() => {
            profileSaveStatus.textContent = "";
          }, 2000);
        }
      });
    }
  }

  // ---- Event wiring ----
  function initEventListeners() {
    // Auth tabs + forms
    if (authTabLogin && authTabSignup) {
      authTabLogin.addEventListener("click", () => setAuthMode("login"));
      authTabSignup.addEventListener("click", () => setAuthMode("signup"));
    }
    if (signupForm) signupForm.addEventListener("submit", handleSignupSubmit);
    if (loginForm) loginForm.addEventListener("submit", handleLoginSubmit);

    // Logout
  logoutButton.addEventListener("click", () => {
  clearCurrentUser();
  currentUser = null;

  // Remove any cached form values
  localStorage.removeItem("login-email");
  localStorage.removeItem("login-password");

  // Redirect to login page
  window.location.href = "login.html";
});

    

    // Navbar profile link -> profile page
    if (navbarProfileLink) {
      navbarProfileLink.addEventListener("click", () => {
        window.location.href = "profile.html";
      });
    }
    if (btnMyProfile) {
      btnMyProfile.addEventListener("click", () => {
        window.location.href = "profile.html";
      });
    }

    // Nav scope switching: Home (all posts) vs Feed (followed users)
    function setScope(scope) {
      activeScope = scope;
      if (navHome && navFeed) {
        if (scope === "home") {
          navHome.classList.add("topbar-link--active");
          navFeed.classList.remove("topbar-link--active");
        } else {
          navFeed.classList.add("topbar-link--active");
          navHome.classList.remove("topbar-link--active");
        }
      }
      renderFeed();
    }

    if (navHome) {
      navHome.addEventListener("click", (e) => {
        e.preventDefault();
        setScope("home");
      });
    }

    if (navFeed) {
      navFeed.addEventListener("click", (e) => {
        e.preventDefault();
        setScope("feed");
      });
    }

    // Composer (dashboard only)
    if (composerUploadBtn && composerImageFileInput) {
      composerUploadBtn.addEventListener("click", () => {
        composerImageFileInput.click();
      });

      composerImageFileInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
          alert("Please select a PNG, JPG, JPEG, or WEBP image.");
          e.target.value = "";
          return;
        }
        handleImageFileChange(file);
      });
    }

    if (composerRemoveImage) {
      composerRemoveImage.addEventListener("click", () => {
        resetComposerImage();
      });
    }

    if (composerSubmit) {
      composerSubmit.addEventListener("click", (e) => {
        e.preventDefault();
        if (!currentUser) {
          openAuthOverlay();
          return;
        }

        const text = composerText ? composerText.value.trim() : "";
        if (!text && !composerImageDataUrl) return;

        createPost(text, composerImageDataUrl);
        if (composerText) composerText.value = "";
        resetComposerImage();
      });
    }

    // Search bar
    if (navSearchInput) {
      navSearchInput.addEventListener("input", (e) => {
        searchTerm = e.target.value;
        renderFeed();
        renderSearchResults(searchTerm);
      });
    }

    // Hide search dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (
        searchResults &&
        !searchResults.contains(e.target) &&
        navSearchInput &&
        !navSearchInput.contains(e.target)
      ) {
        searchResults.classList.add("hidden");
      }
    });

    // Search result interactions: follow or open profile
    if (searchResults) {
      searchResults.addEventListener("click", (e) => {
        const followBtn = e.target.closest(".follow-toggle");
        if (followBtn) {
          const item = followBtn.closest(".search-item");
          if (!item) return;
          const userId = item.dataset.userId;
          if (!userId) return;
          toggleFollow(userId);
          return;
        }
        const item = e.target.closest(".search-item[data-user-id]");
        if (item) {
          const userId = item.dataset.userId;
          if (userId) {
            window.location.href =
              "profile.html?userId=" + encodeURIComponent(userId);
          }
        }
      });
    }

    // Sort select
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        sortMode = e.target.value || "latest";
        renderFeed();
      });
    }

    // Feed interactions: like, delete, comment toggle, comment submit, read more, comments more, edit
    if (feedList) {
      feedList.addEventListener("click", (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;

        const card = target.closest(".post-card");
        if (!card) return;
        const postId = card.dataset.postId;
        if (!postId) return;

        if (target.closest(".post-like-btn")) {
          toggleLike(postId);
          return;
        }

        if (target.closest(".post-read-toggle")) {
          const textEl = card.querySelector(".post-text");
          if (!textEl) return;
          const state = textEl.getAttribute("data-state") || "collapsed";
          const posts = getPosts();
          const post = posts.find((p) => p.id === postId);
          if (!post) return;
          if (state === "collapsed") {
            textEl.textContent = post.text || "";
            textEl.setAttribute("data-state", "expanded");
            target.textContent = "Read less";
          } else {
            const fullText = post.text || "";
            const needsReadMore = fullText.length > 150;
            const truncatedText = needsReadMore
              ? fullText.slice(0, 150) + "…"
              : fullText;
            textEl.textContent = truncatedText;
            textEl.setAttribute("data-state", "collapsed");
            target.textContent = "Read more";
          }
          return;
        }

        if (target.closest(".post-comments-more")) {
          const btn = target.closest(".post-comments-more");
          const list = card.querySelector(".post-comments-list");
          if (!btn || !list) return;
          const state = btn.getAttribute("data-state") || "collapsed";
          if (state === "collapsed") {
            list.classList.remove("collapsed");
            list.classList.add("expanded");
            btn.textContent = "Hide comments";
            btn.setAttribute("data-state", "expanded");
          } else {
            list.classList.remove("expanded");
            list.classList.add("collapsed");
            const posts = getPosts();
            const post = posts.find((p) => p.id === postId);
            const total = post && Array.isArray(post.comments)
              ? post.comments.length
              : 0;
            btn.textContent =
              total > 1
                ? `View more comments (${total - 1})`
                : "View more comments";
            btn.setAttribute("data-state", "collapsed");
          }
          return;
        }

        if (target.closest(".post-comment-toggle")) {
          const bodyEl = card.querySelector(".post-comments-body");
          if (bodyEl) bodyEl.classList.toggle("hidden");
          return;
        }

        if (
          target.closest(".post-delete-btn") ||
          target.closest(".post-menu-btn.post-delete-btn")
        ) {
          const ok = window.confirm("Delete this post?");
          if (ok) deletePost(postId);
          return;
        }

        if (target.closest(".post-edit-btn")) {
          openEditModal(postId);
          return;
        }
      });

      feedList.addEventListener("submit", (e) => {
        const form = e.target;
        if (
          !(form instanceof HTMLFormElement) ||
          !form.classList.contains("post-comment-form")
        )
          return;
        e.preventDefault();
        const card = form.closest(".post-card");
        if (!card) return;
        const postId = card.dataset.postId;
        if (!postId) return;
        const input = form.querySelector(".post-comment-input");
        const text = input.value.trim();
        if (!text) return;
        addComment(postId, text);
      });
    }

    // Profile-page comments and edit/delete (reuse handler)
    if (profilePostsList) {
      profilePostsList.addEventListener("click", (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        const card = target.closest(".post-card");
        if (!card) return;
        const postId = card.dataset.postId;
        if (!postId) return;

        if (target.closest(".post-read-toggle")) {
          const textEl = card.querySelector(".post-text");
          if (!textEl) return;
          const state = textEl.getAttribute("data-state") || "collapsed";
          const posts = getPosts();
          const post = posts.find((p) => p.id === postId);
          if (!post) return;
          if (state === "collapsed") {
            textEl.textContent = post.text || "";
            textEl.setAttribute("data-state", "expanded");
            target.textContent = "Read less";
          } else {
            const fullText = post.text || "";
            const needsReadMore = fullText.length > 150;
            const truncatedText = needsReadMore
              ? fullText.slice(0, 150) + "…"
              : fullText;
            textEl.textContent = truncatedText;
            textEl.setAttribute("data-state", "collapsed");
            target.textContent = "Read more";
          }
          return;
        }

        if (target.closest(".post-comments-more")) {
          const btn = target.closest(".post-comments-more");
          const list = card.querySelector(".post-comments-list");
          if (!btn || !list) return;
          const state = btn.getAttribute("data-state") || "collapsed";
          if (state === "collapsed") {
            list.classList.remove("collapsed");
            list.classList.add("expanded");
            btn.textContent = "Hide comments";
            btn.setAttribute("data-state", "expanded");
          } else {
            list.classList.remove("expanded");
            list.classList.add("collapsed");
            const posts = getPosts();
            const post = posts.find((p) => p.id === postId);
            const total = post && Array.isArray(post.comments)
              ? post.comments.length
              : 0;
            btn.textContent =
              total > 1
                ? `View more comments (${total - 1})`
                : "View more comments";
            btn.setAttribute("data-state", "collapsed");
          }
          return;
        }

        if (target.closest(".post-comment-toggle")) {
          const bodyEl = card.querySelector(".post-comments-body");
          if (bodyEl) bodyEl.classList.toggle("hidden");
          return;
        }

        if (
          target.closest(".post-delete-btn") ||
          target.closest(".post-menu-btn")
        ) {
          const ok = window.confirm("Delete this post?");
          if (ok) deletePost(postId);
          return;
        }

        if (target.closest(".post-edit-btn")) {
          openEditModal(postId);
        }
      });

      profilePostsList.addEventListener("submit", (e) => {
        const form = e.target;
        if (
          !(form instanceof HTMLFormElement) ||
          !form.classList.contains("post-comment-form")
        )
          return;
        e.preventDefault();
        const card = form.closest(".post-card");
        if (!card) return;
        const postId = card.dataset.postId;
        if (!postId) return;
        const input = form.querySelector(".post-comment-input");
        const text = input.value.trim();
        if (!text) return;
        addComment(postId, text);
      });
    }

    // Suggestions follow buttons (dashboard)
    if (suggestionsList) {
      suggestionsList.addEventListener("click", (e) => {
        const btn = e.target.closest(".follow-toggle");
        if (!btn) return;
        const item =
          btn.closest(".suggestion-item") || btn.closest(".search-item");
        if (!item) return;
        const userId = item.dataset.userId;
        if (!userId) return;
        toggleFollow(userId);
      });
    }

    // Notifications
    if (notifBell && notifPanel) {
      notifBell.addEventListener("click", () => {
        const isHidden = notifPanel.classList.contains("hidden");
        if (isHidden) {
          notifPanel.classList.remove("hidden");
          if (currentUser) {
            markAllNotificationsRead(currentUser.id);
            renderNotificationsUI();
          }
        } else {
          notifPanel.classList.add("hidden");
        }
      });
    }

    if (notifClear) {
      notifClear.addEventListener("click", () => {
        if (!currentUser) return;
        clearNotifications(currentUser.id);
        renderNotificationsUI();
      });
    }

    // Close notifications on outside click
    document.addEventListener("click", (e) => {
      if (
        notifPanel &&
        notifBell &&
        !notifPanel.contains(e.target) &&
        !notifBell.contains(e.target)
      ) {
        notifPanel.classList.add("hidden");
      }
    });

    // Edit modal controls
    if (editPostClose) {
      editPostClose.addEventListener("click", closeEditModal);
    }
    if (editPostCancel) {
      editPostCancel.addEventListener("click", closeEditModal);
    }
    if (editPostOverlay) {
      editPostOverlay.addEventListener("click", (e) => {
        if (e.target === editPostOverlay) {
          closeEditModal();
        }
      });
    }
    if (editPostUploadBtn && editPostImageFile) {
      editPostUploadBtn.addEventListener("click", () => {
        editPostImageFile.click();
      });
      editPostImageFile.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
          alert("Please select a PNG, JPG, JPEG, or WEBP image.");
          e.target.value = "";
          return;
        }
        handleEditImageFileChange(file);
      });
    }
    if (editPostRemoveImage) {
      editPostRemoveImage.addEventListener("click", () => {
        editingPostImageDataUrl = "";
        if (editPostImageFile) editPostImageFile.value = "";
        if (editPostImagePreview)
          editPostImagePreview.classList.add("hidden");
      });
    }
    if (editPostSave) {
      editPostSave.addEventListener("click", saveEditedPost);
    }
  }

  // ADDED — Close popup button
const authCloseBtn = document.getElementById("auth-close-btn");
if (authCloseBtn) {
  authCloseBtn.addEventListener("click", () => {
    closeAuthOverlay();
  });
}

  // ---- App initialization ----
function initApp() {
  const storedId = getCurrentUserId();

  if (storedId) {
    const user = findUserById(storedId);

    if (user) {
      if (!Array.isArray(user.following)) user.following = [];
      currentUser = user;
      closeAuthOverlay();
    } else {
      clearCurrentUser();
      openAuthOverlay();
    }
  } else {
    openAuthOverlay();
  }

  initEventListeners();

  if (currentUser) {
    updateUserProfileUI();
    if (pageType === "dashboard") renderSuggestions();
  }

  postsCache = getPosts();

  if (pageType === "profile") {
    initProfilePage();
  } else {
    renderFeed();
  }

  renderNotificationsUI();
}


  document.addEventListener("DOMContentLoaded", initApp);
})();
