import "./styles.css";

const STORAGE_KEY = "my-custom-menu-board-v1";
const EMOJIS = [
  "🍴", "🥄", "🍽️",
  "🍜", "🍕", "🍔", "🌮", "🍣", "🍛", "🥗", "🥘", "🍝", "🥟",
  "🍦", "🍧", "🍨", "🍩", "🍪", "🎂", "🍰", "🧁", "🥐", "🥞",
  "🍓", "🍒", "🍋", "🍊", "🍇", "🥤", "🧋", "☕", "🍵", "🧃",
  "🌍", "✈️", "✨", "🌈", "🌸", "⭐", "🏫", "🎉", "❤️", "😋",
];

const DEFAULT_STATE = {
  settings: {
    storeName: "세계 한 바퀴 식당",
    boardName: "오늘의 세계 음식 메뉴판",
    description: "교실에서 만나는 맛있는 세계 여행",
    emoji: "🍴",
    image: "",
    mediaType: "emoji",
    primaryColor: "#ef6a45",
    secondaryColor: "#ffd87a",
  },
  menus: [
    {
      id: crypto.randomUUID(),
      name: "이탈리아 마르게리타",
      price: 4500,
      description: "토마토와 치즈가 어우러진 이탈리아 대표 피자",
      category: "유럽",
      mediaType: "emoji",
      emoji: "🍕",
      image: "",
    },
    {
      id: crypto.randomUUID(),
      name: "일본 연어 초밥",
      price: 4000,
      description: "부드러운 연어를 올린 한입 초밥",
      category: "아시아",
      mediaType: "emoji",
      emoji: "🍣",
      image: "",
    },
    {
      id: crypto.randomUUID(),
      name: "멕시코 타코",
      price: 3500,
      description: "채소와 고기를 가득 담은 바삭한 타코",
      category: "아메리카",
      mediaType: "emoji",
      emoji: "🌮",
      image: "",
    },
  ],
  categories: [],
  orders: [],
};

let state = loadState();
let currentCategory = "전체";
let showingOrders = false;
let cart = [];
let adminTab = "menus";
let editingMenuId = null;
let menuDraftImage = "";
let settingDraftImage = "";
let toastTimer;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(DEFAULT_STATE);
    const menus = Array.isArray(saved.menus) ? saved.menus : [];
    const menuCategories = menus.map((menu) => menu.category).filter(Boolean);
    const categories = [...new Set([
      ...(Array.isArray(saved.categories) ? saved.categories : []),
      ...menuCategories,
    ])];
    const settings = { ...DEFAULT_STATE.settings, ...saved.settings };
    if (settings.emoji === "🌍") settings.emoji = "🍴";
    return {
      settings,
      menus,
      categories,
      orders: Array.isArray(saved.orders) ? saved.orders : [],
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("기기 저장소에 데이터를 저장하지 못했습니다.", error);
    showToast("기기 저장 공간이 부족해 저장하지 못했어요.");
    return false;
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPrice(value) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}

function safeColor(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(value || "") ? value : fallback;
}

function applyTheme() {
  const { primaryColor, secondaryColor, storeName } = state.settings;
  document.documentElement.style.setProperty("--primary", safeColor(primaryColor, "#ef6a45"));
  document.documentElement.style.setProperty("--secondary", safeColor(secondaryColor, "#ffd87a"));
  document.title = storeName || "나만의 메뉴판";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", primaryColor);
}

function mediaMarkup(item, className = "menu-visual") {
  if (item.mediaType === "photo" && item.image) {
    return `<div class="${className}"><img src="${item.image}" alt="${escapeHtml(item.name || "업로드한 사진")}" /></div>`;
  }
  return `<div class="${className}" aria-hidden="true">${escapeHtml(item.emoji || "✨")}</div>`;
}

function brandMarkup(className = "brand-mark") {
  const settings = state.settings;
  if (settings.mediaType === "photo" && settings.image) {
    return `<div class="${className}"><img src="${settings.image}" alt="${escapeHtml(settings.storeName)} 로고" /></div>`;
  }
  return `<div class="${className}" aria-hidden="true">${escapeHtml(settings.emoji || "🍴")}</div>`;
}

function headerMarkup(isAdmin = false) {
  return `
    <header class="topbar">
      <div class="topbar-inner">
        <div class="brand">
          ${brandMarkup()}
          <div class="brand-copy">
            <p class="brand-title">${escapeHtml(state.settings.storeName)}</p>
            <p class="brand-subtitle">${isAdmin ? "메뉴판 관리실" : escapeHtml(state.settings.boardName)}</p>
          </div>
        </div>
        <button class="icon-button" data-action="${isAdmin ? "home" : "admin"}" aria-label="${isAdmin ? "메뉴판으로 돌아가기" : "설정 및 관리 열기"}">
          ${isAdmin ? "←" : "⚙"}
        </button>
      </div>
    </header>
  `;
}

function footerMarkup() {
  return `
    <footer class="site-footer">
      <img src="/gemidain-logo.png" alt="Gemidain" />
    </footer>
  `;
}

function homeView() {
  const categories = ["전체", ...state.categories];
  if (!categories.includes(currentCategory)) currentCategory = "전체";
  const visibleMenus = currentCategory === "전체"
    ? state.menus
    : state.menus.filter((menu) => menu.category === currentCategory);
  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);

  return `
    <div class="app-shell">
      ${headerMarkup()}
      <main class="page">
        <section class="hero">
          ${brandMarkup("hero-mark")}
          <div>
            <p class="eyebrow">${escapeHtml(state.settings.storeName)}</p>
            <h1>${escapeHtml(state.settings.boardName)}</h1>
            <p>${escapeHtml(state.settings.description)}</p>
          </div>
        </section>

        <div class="toolbar">
          <h2>${showingOrders ? "주문 현황" : "메뉴를 골라보세요"}</h2>
          <span>${showingOrders ? `${state.orders.filter((order) => order.status === "pending").length}건 준비 중` : `${state.menus.length}개의 메뉴`}</span>
        </div>

        <nav class="category-list" aria-label="메뉴와 주문 보기">
          <button class="chip ${!showingOrders && currentCategory === "전체" ? "active" : ""}" data-category="전체">전체</button>
          <button class="chip order-status-chip ${showingOrders ? "active" : ""}" data-action="show-orders">🧾 주문 현황</button>
          ${state.categories.map((category) => `
            <button class="chip ${!showingOrders && category === currentCategory ? "active" : ""}" data-category="${escapeHtml(category)}">
              ${escapeHtml(category)}
            </button>
          `).join("")}
        </nav>

        ${showingOrders ? `<div class="customer-orders">${ordersPanel()}</div>` : `
        <section class="menu-grid" aria-label="메뉴 목록">
          ${visibleMenus.length ? visibleMenus.map((menu) => `
            <article class="menu-card">
              ${mediaMarkup(menu)}
              <div class="menu-body">
                <div class="menu-meta">
                  <h3>${escapeHtml(menu.name)}</h3>
                  <span class="price">${formatPrice(menu.price)}</span>
                </div>
                <p class="description">${escapeHtml(menu.description || "맛있는 메뉴를 즐겨보세요.")}</p>
                <button class="primary-button wide" data-add-cart="${menu.id}">담기</button>
              </div>
            </article>
          `).join("") : `
            <div class="empty-state">
              <span class="big-emoji">🍽️</span>
              <h3>아직 준비된 메뉴가 없어요</h3>
              <p>설정 및 관리에서 첫 메뉴를 추가해 주세요.</p>
            </div>
          `}
        </section>
        `}
      </main>
      ${footerMarkup()}
      ${cartQuantity ? `
        <button class="floating-cart" data-action="open-cart" aria-label="장바구니 열기">
          <span>🛒 주문하기</span>
          <span class="cart-count">${cartQuantity}</span>
        </button>
      ` : ""}
    </div>
  `;
}

function adminView() {
  return `
    <div class="app-shell">
      ${headerMarkup(true)}
      <main class="page">
        <div class="page-heading">
          <div>
            <p class="eyebrow">OWNER'S DESK</p>
            <h1>${escapeHtml(state.settings.storeName)} 관리</h1>
            <p>메뉴와 메뉴판 디자인을 한곳에서 관리하세요.</p>
          </div>
          <button class="secondary-button" data-action="home">메뉴판 보기</button>
        </div>

        <nav class="admin-tabs" aria-label="관리 메뉴">
          <button class="tab-button ${adminTab === "menus" ? "active" : ""}" data-admin-tab="menus">메뉴 관리</button>
          <button class="tab-button ${adminTab === "settings" ? "active" : ""}" data-admin-tab="settings">메뉴판 설정</button>
        </nav>

        <div id="admin-content">
          ${adminTab === "settings" ? settingsPanel() : menuPanel()}
        </div>
      </main>
      ${footerMarkup()}
    </div>
  `;
}

function categoryManager() {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>카테고리 관리</h2>
          <p class="hint">카테고리를 먼저 만들어 두면 메뉴를 추가하거나 수정할 때 바로 선택할 수 있어요.</p>
        </div>
      </div>
      <form id="category-add-form" class="category-add">
        <div class="field">
          <label for="new-category">새 카테고리</label>
          <input id="new-category" name="categoryName" required maxlength="20" placeholder="예: 음료, 디저트, 한식" />
        </div>
        <button class="primary-button" type="submit">추가</button>
      </form>
      <div class="category-manage-list">
        ${state.categories.length ? state.categories.map((category) => `
          <form class="category-edit-row" data-category-edit="${escapeHtml(category)}">
            <span class="category-handle" aria-hidden="true">🏷️</span>
            <input name="categoryName" required maxlength="20" value="${escapeHtml(category)}" aria-label="${escapeHtml(category)} 카테고리 이름" />
            <button class="secondary-button" type="submit">이름 저장</button>
            <button class="danger-button" type="button" data-delete-category="${escapeHtml(category)}">삭제</button>
          </form>
        `).join("") : `<p class="empty-category-message">현재 카테고리가 없어요. 필요할 때만 위에서 추가하세요.</p>`}
      </div>
    </section>
  `;
}

function menuPanel() {
  const editing = state.menus.find((menu) => menu.id === editingMenuId);
  const menu = editing || {
    name: "",
    price: "",
    description: "",
    category: "",
    mediaType: "emoji",
    emoji: "🍽️",
    image: "",
  };
  menuDraftImage = editing?.image || menuDraftImage;

  return `
    ${categoryManager()}
    <section class="panel">
      <div class="panel-header">
        <h2>${editing ? "메뉴 수정" : "새 메뉴 추가"}</h2>
        ${editing ? `<button class="secondary-button" data-action="cancel-edit">수정 취소</button>` : ""}
      </div>
      <form id="menu-form">
        <div class="form-grid">
          <div class="field">
            <label for="menu-name">메뉴 이름</label>
            <input id="menu-name" name="name" required maxlength="40" value="${escapeHtml(menu.name)}" placeholder="예: 프랑스 크루아상" />
          </div>
          <div class="field">
            <label for="menu-price">가격 (원)</label>
            <input id="menu-price" name="price" required min="0" step="100" type="number" value="${escapeHtml(menu.price)}" placeholder="3500" />
          </div>
          <div class="field">
            <label for="menu-category">카테고리</label>
            <select id="menu-category" name="category">
              <option value="">카테고리 없음</option>
              ${state.categories.map((category) => `
                <option value="${escapeHtml(category)}" ${category === menu.category ? "selected" : ""}>${escapeHtml(category)}</option>
              `).join("")}
            </select>
            <p class="hint">원하는 항목이 없다면 위의 카테고리 관리에서 먼저 추가하세요.</p>
          </div>
          <div class="field">
            <label for="menu-description">메뉴 설명</label>
            <input id="menu-description" name="description" maxlength="100" value="${escapeHtml(menu.description)}" placeholder="메뉴의 매력을 적어주세요" />
          </div>
          <div class="field full">
            <label>메뉴 이미지 방식</label>
            <div class="media-switch">
              <label>
                <input type="radio" name="mediaType" value="emoji" ${menu.mediaType !== "photo" ? "checked" : ""} />
                <span>😊 이모티콘으로 표시</span>
              </label>
              <label>
                <input type="radio" name="mediaType" value="photo" ${menu.mediaType === "photo" ? "checked" : ""} />
                <span>📷 찍은 사진 사용</span>
              </label>
            </div>
          </div>
          <div class="field full" data-menu-media="emoji" ${menu.mediaType === "photo" ? "hidden" : ""}>
            <label for="menu-emoji">메뉴 이모티콘</label>
            <input id="menu-emoji" name="emoji" maxlength="12" value="${escapeHtml(menu.emoji || "🍽️")}" placeholder="원하는 이모티콘을 입력하세요" />
            <p class="hint">입력란을 누른 뒤 Windows 키 + 마침표(.)를 함께 누르면 원하는 이모티콘을 직접 추가할 수 있어요.</p>
            <div class="emoji-picker">
              ${EMOJIS.map((emoji) => `
                <button type="button" class="emoji-choice ${emoji === menu.emoji ? "active" : ""}" data-menu-emoji="${emoji}" aria-label="${emoji} 선택">${emoji}</button>
              `).join("")}
            </div>
          </div>
          <div class="field full" data-menu-media="photo" ${menu.mediaType !== "photo" ? "hidden" : ""}>
            <label for="menu-photo">메뉴 사진</label>
            <div class="upload-box">
              ${menuDraftImage
                ? `<img class="upload-preview" src="${menuDraftImage}" alt="메뉴 사진 미리보기" />`
                : `<div><strong>📷 사진을 눌러 선택하세요</strong><p class="hint">휴대폰으로 찍은 사진도 바로 사용할 수 있어요.</p></div>`}
              <input id="menu-photo" type="file" accept="image/*" data-image-upload="menu" aria-label="메뉴 사진 업로드" />
            </div>
          </div>
        </div>
        <div class="action-row">
          <button class="primary-button" type="submit">${editing ? "수정 내용 저장" : "메뉴판에 추가"}</button>
        </div>
      </form>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h2>현재 메뉴판 리스트</h2>
        <span>${state.menus.length}개</span>
      </div>
      <div class="manage-list">
        ${state.menus.length ? state.menus.map((item) => `
          <div class="manage-item">
            ${mediaMarkup(item, "manage-thumb")}
            <div class="manage-copy">
              <strong>${escapeHtml(item.name)}</strong>
              <span>${escapeHtml(item.category || "카테고리 없음")} · ${formatPrice(item.price)}</span>
            </div>
            <div class="small-actions">
              <button type="button" data-edit-menu="${item.id}">수정</button>
              <button type="button" class="delete" data-delete-menu="${item.id}">삭제</button>
            </div>
          </div>
        `).join("") : `
          <div class="empty-state">
            <span class="big-emoji">📝</span>
            <h3>등록된 메뉴가 없어요</h3>
            <p>위 입력란에서 첫 메뉴를 만들어 보세요.</p>
          </div>
        `}
      </div>
    </section>
  `;
}

function settingsPanel() {
  const settings = state.settings;
  settingDraftImage = settings.image || settingDraftImage;
  return `
    <form id="settings-form">
      <section class="panel">
        <div class="panel-header">
          <h2>가게와 메뉴판 이름</h2>
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="store-name">가게 이름</label>
            <input id="store-name" name="storeName" required maxlength="40" value="${escapeHtml(settings.storeName)}" placeholder="예: 세계 여러 나라 음식점" />
          </div>
          <div class="field">
            <label for="board-name">메뉴판 이름</label>
            <input id="board-name" name="boardName" required maxlength="50" value="${escapeHtml(settings.boardName)}" placeholder="예: 세계 음식 여행 메뉴판" />
          </div>
          <div class="field full">
            <label for="board-description">한 줄 소개</label>
            <input id="board-description" name="description" maxlength="80" value="${escapeHtml(settings.description)}" placeholder="메뉴판 아래에 표시할 소개 문구" />
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>앱 로고와 제목 아이콘</h2>
        </div>
        <div class="field">
          <label>표시 방식</label>
          <div class="media-switch">
            <label>
              <input type="radio" name="mediaType" value="emoji" ${settings.mediaType !== "photo" ? "checked" : ""} />
              <span>😊 이모티콘 사용</span>
            </label>
            <label>
              <input type="radio" name="mediaType" value="photo" ${settings.mediaType === "photo" ? "checked" : ""} />
              <span>📷 찍은 사진 사용</span>
            </label>
          </div>
        </div>
        <div class="field" data-setting-media="emoji" ${settings.mediaType === "photo" ? "hidden" : ""}>
          <label for="board-emoji">앱 로고·제목 이모티콘</label>
          <input id="board-emoji" name="emoji" maxlength="12" value="${escapeHtml(settings.emoji || "🍴")}" placeholder="원하는 이모티콘을 붙여넣으세요" />
          <p class="hint">기본값은 수저와 포크(🍴)이며, 직접 입력하거나 아래에서 마음대로 골라 주세요.</p>
          <div class="emoji-picker">
            ${EMOJIS.map((emoji) => `
              <button type="button" class="emoji-choice ${emoji === settings.emoji ? "active" : ""}" data-setting-emoji="${emoji}" aria-label="${emoji} 선택">${emoji}</button>
            `).join("")}
          </div>
        </div>
        <div class="field" data-setting-media="photo" ${settings.mediaType !== "photo" ? "hidden" : ""}>
          <label for="board-photo">가게 또는 메뉴판 사진</label>
          <div class="upload-box">
            ${settingDraftImage
              ? `<img class="upload-preview" src="${settingDraftImage}" alt="대표 사진 미리보기" />`
              : `<div><strong>📷 사진을 눌러 선택하세요</strong><p class="hint">이 사진은 상단 로고와 메뉴판 소개에 표시됩니다.</p></div>`}
            <input id="board-photo" type="file" accept="image/*" data-image-upload="settings" aria-label="대표 사진 업로드" />
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>메뉴판 색상</h2>
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="primary-color">대표 색상</label>
            <div class="color-row">
              <input id="primary-color" name="primaryColor" type="color" value="${safeColor(settings.primaryColor, "#ef6a45")}" />
              <input name="primaryColorText" value="${safeColor(settings.primaryColor, "#ef6a45")}" aria-label="대표 색상 코드" />
            </div>
          </div>
          <div class="field">
            <label for="secondary-color">포인트 색상</label>
            <div class="color-row">
              <input id="secondary-color" name="secondaryColor" type="color" value="${safeColor(settings.secondaryColor, "#ffd87a")}" />
              <input name="secondaryColorText" value="${safeColor(settings.secondaryColor, "#ffd87a")}" aria-label="포인트 색상 코드" />
            </div>
          </div>
        </div>
        <div class="settings-preview" style="margin-top: 20px">
          ${brandMarkup()}
          <div>
            <strong>${escapeHtml(settings.storeName)}</strong>
            <div>${escapeHtml(settings.boardName)}</div>
          </div>
        </div>
        <div class="action-row">
          <button class="secondary-button" type="button" data-action="reset-settings">기본값으로</button>
          <button class="primary-button" type="submit">설정 저장</button>
        </div>
      </section>
    </form>
  `;
}

function ordersPanel() {
  const pending = state.orders.filter((order) => order.status === "pending");
  const completed = state.orders.filter((order) => order.status === "completed");
  const orderCard = (order, done = false) => `
    <div class="order-card">
      <div class="order-number">#${order.number}</div>
      <div class="manage-copy">
        <strong>${order.items.map((item) => `${escapeHtml(item.name)} × ${item.quantity}`).join(", ")}</strong>
        <span>${formatPrice(order.total)} · ${escapeHtml(order.time)}</span>
      </div>
      ${done
        ? `<button class="secondary-button" data-delete-order="${order.id}">내역 지우기</button>`
        : `<button class="primary-button" data-complete-order="${order.id}">준비 완료</button>`}
    </div>
  `;
  return `
    <section class="panel">
      <div class="panel-header">
        <h2>들어온 주문</h2>
        <span>${pending.length}건 대기 중</span>
      </div>
      <div class="order-list">
        ${pending.length ? pending.map((order) => orderCard(order)).join("") : `
          <div class="empty-state">
            <span class="big-emoji">☕</span>
            <h3>새 주문이 없어요</h3>
            <p>주문이 들어오면 이곳에 나타납니다.</p>
          </div>
        `}
      </div>
    </section>
    <section class="panel">
      <div class="panel-header"><h2>준비된 주문 내역</h2></div>
      <div class="order-list">
        ${completed.length ? completed.map((order) => orderCard(order, true)).join("") : `<p class="hint">완료된 주문이 여기에 나타나요.</p>`}
      </div>
    </section>
  `;
}

function cartModal() {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return `
    <div class="modal-backdrop" data-action="close-modal">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div class="panel-header">
          <h2 id="cart-title">내 주문</h2>
          <button class="secondary-button" data-action="close-modal">닫기</button>
        </div>
        ${cart.map((item) => `
          <div class="cart-line">
            <span>${escapeHtml(item.emoji || "🍽️")}</span>
            <strong>${escapeHtml(item.name)}</strong>
            <button class="qty-button" data-cart-minus="${item.id}" aria-label="${escapeHtml(item.name)} 수량 줄이기">−</button>
            <span>${item.quantity}</span>
            <button class="qty-button" data-cart-plus="${item.id}" aria-label="${escapeHtml(item.name)} 수량 늘리기">+</button>
          </div>
        `).join("")}
        <div class="cart-total"><span>총 금액</span><span>${formatPrice(total)}</span></div>
        <button class="primary-button wide" data-action="place-order">주문 보내기</button>
      </section>
    </div>
  `;
}

function render() {
  applyTheme();
  const isAdmin = location.hash.startsWith("#admin");
  document.querySelector("#app").innerHTML = isAdmin ? adminView() : homeView();
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function navigate(hash) {
  location.hash = hash;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function readImage(file, callback) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("이미지 파일만 선택할 수 있어요.");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("사진은 5MB 이하로 선택해 주세요.");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const maxSize = 1200;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL("image/jpeg", 0.82));
    };
    image.onerror = () => callback(reader.result);
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
}

async function enablePersistentStorage() {
  try {
    if (navigator.storage?.persist) {
      await navigator.storage.persist();
    }
  } catch (error) {
    console.info("브라우저가 영구 저장 요청을 지원하지 않습니다.", error);
  }
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.action === "admin") {
    adminTab = "settings";
    navigate("#admin");
    return;
  }
  if (button.dataset.action === "home") {
    showingOrders = false;
    navigate("#home");
    return;
  }
  if (button.dataset.adminTab) {
    adminTab = button.dataset.adminTab;
    editingMenuId = null;
    menuDraftImage = "";
    render();
    return;
  }
  if (button.dataset.category) {
    showingOrders = false;
    currentCategory = button.dataset.category;
    render();
    return;
  }
  if (button.dataset.action === "show-orders") {
    showingOrders = true;
    render();
    return;
  }
  if (button.dataset.addCart) {
    const menu = state.menus.find((item) => item.id === button.dataset.addCart);
    if (!menu) return;
    const existing = cart.find((item) => item.id === menu.id);
    if (existing) existing.quantity += 1;
    else cart.push({ ...menu, quantity: 1 });
    render();
    showToast(`${menu.name}을(를) 담았어요.`);
    return;
  }
  if (button.dataset.action === "open-cart") {
    document.body.insertAdjacentHTML("beforeend", cartModal());
    return;
  }
  if (button.dataset.action === "close-modal") {
    if (event.target === button || button.closest(".modal")) {
      document.querySelector(".modal-backdrop")?.remove();
    }
    return;
  }
  if (button.dataset.cartPlus || button.dataset.cartMinus) {
    const id = button.dataset.cartPlus || button.dataset.cartMinus;
    const item = cart.find((line) => line.id === id);
    if (!item) return;
    item.quantity += button.dataset.cartPlus ? 1 : -1;
    if (item.quantity <= 0) cart = cart.filter((line) => line.id !== id);
    document.querySelector(".modal-backdrop")?.remove();
    render();
    if (cart.length) document.body.insertAdjacentHTML("beforeend", cartModal());
    return;
  }
  if (button.dataset.action === "place-order") {
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    state.orders.unshift({
      id: crypto.randomUUID(),
      number: (Math.max(0, ...state.orders.map((order) => order.number || 0)) + 1),
      items: cart.map(({ id, name, price, quantity }) => ({ id, name, price, quantity })),
      total,
      time: new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date()),
      status: "pending",
    });
    cart = [];
    saveState();
    document.querySelector(".modal-backdrop")?.remove();
    showingOrders = true;
    render();
    showToast("주문이 주방으로 전송되었어요!");
    return;
  }
  if (button.dataset.menuEmoji) {
    const form = document.querySelector("#menu-form");
    form.elements.emoji.value = button.dataset.menuEmoji;
    form.querySelectorAll("[data-menu-emoji]").forEach((item) => item.classList.toggle("active", item === button));
    return;
  }
  if (button.dataset.settingEmoji) {
    const form = document.querySelector("#settings-form");
    form.elements.emoji.value = button.dataset.settingEmoji;
    form.querySelectorAll("[data-setting-emoji]").forEach((item) => item.classList.toggle("active", item === button));
    return;
  }
  if (button.dataset.editMenu) {
    editingMenuId = button.dataset.editMenu;
    menuDraftImage = state.menus.find((menu) => menu.id === editingMenuId)?.image || "";
    render();
    window.scrollTo({ top: 180, behavior: "smooth" });
    return;
  }
  if (button.dataset.deleteMenu) {
    const menu = state.menus.find((item) => item.id === button.dataset.deleteMenu);
    if (menu && confirm(`"${menu.name}" 메뉴를 삭제할까요?`)) {
      state.menus = state.menus.filter((item) => item.id !== menu.id);
      saveState();
      render();
      showToast("메뉴를 삭제했어요.");
    }
    return;
  }
  if (button.dataset.deleteCategory) {
    const category = button.dataset.deleteCategory;
    if (confirm(`"${category}" 카테고리를 삭제할까요?\n이 카테고리의 메뉴는 '카테고리 없음'으로 변경됩니다.`)) {
      state.categories = state.categories.filter((item) => item !== category);
      state.menus.forEach((menu) => {
        if (menu.category === category) menu.category = "";
      });
      if (currentCategory === category) currentCategory = "전체";
      saveState();
      render();
      showToast("카테고리를 삭제했어요.");
    }
    return;
  }
  if (button.dataset.action === "cancel-edit") {
    editingMenuId = null;
    menuDraftImage = "";
    render();
    return;
  }
  if (button.dataset.completeOrder) {
    const order = state.orders.find((item) => item.id === button.dataset.completeOrder);
    if (order) order.status = "completed";
    saveState();
    render();
    showToast("준비 완료로 변경했어요.");
    return;
  }
  if (button.dataset.deleteOrder) {
    state.orders = state.orders.filter((item) => item.id !== button.dataset.deleteOrder);
    saveState();
    render();
    return;
  }
  if (button.dataset.action === "reset-settings") {
    if (confirm("가게와 메뉴판 설정을 기본값으로 되돌릴까요?")) {
      state.settings = structuredClone(DEFAULT_STATE.settings);
      settingDraftImage = "";
      saveState();
      render();
      showToast("기본 설정으로 되돌렸어요.");
    }
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.matches('#menu-form input[name="mediaType"]')) {
    document.querySelector("[data-menu-media='emoji']").hidden = target.value !== "emoji";
    document.querySelector("[data-menu-media='photo']").hidden = target.value !== "photo";
  }
  if (target.matches('#settings-form input[name="mediaType"]')) {
    document.querySelector("[data-setting-media='emoji']").hidden = target.value !== "emoji";
    document.querySelector("[data-setting-media='photo']").hidden = target.value !== "photo";
  }
  if (target.dataset.imageUpload === "menu") {
    readImage(target.files[0], (result) => {
      menuDraftImage = result;
      const upload = target.closest(".upload-box");
      upload.querySelector(":scope > div, :scope > img")?.remove();
      upload.insertAdjacentHTML("afterbegin", `<img class="upload-preview" src="${result}" alt="메뉴 사진 미리보기" />`);
    });
  }
  if (target.dataset.imageUpload === "settings") {
    readImage(target.files[0], (result) => {
      settingDraftImage = result;
      const upload = target.closest(".upload-box");
      upload.querySelector(":scope > div, :scope > img")?.remove();
      upload.insertAdjacentHTML("afterbegin", `<img class="upload-preview" src="${result}" alt="대표 사진 미리보기" />`);
    });
  }
  if (target.type === "color" && target.form) {
    const textName = `${target.name}Text`;
    if (target.form.elements[textName]) target.form.elements[textName].value = target.value;
  }
});

document.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);

  if (form.id === "category-add-form") {
    const categoryName = data.get("categoryName").trim();
    if (!categoryName) {
      showToast("카테고리 이름을 입력해 주세요.");
      return;
    }
    if (state.categories.some((category) => category.toLowerCase() === categoryName.toLowerCase())) {
      showToast("이미 있는 카테고리예요.");
      return;
    }
    state.categories.push(categoryName);
    saveState();
    render();
    showToast(`"${categoryName}" 카테고리를 추가했어요.`);
    return;
  }

  if (form.dataset.categoryEdit) {
    const oldName = form.dataset.categoryEdit;
    const newName = data.get("categoryName").trim();
    if (!newName) {
      showToast("카테고리 이름을 입력해 주세요.");
      return;
    }
    if (newName !== oldName && state.categories.some((category) => category.toLowerCase() === newName.toLowerCase())) {
      showToast("같은 이름의 카테고리가 이미 있어요.");
      return;
    }
    state.categories = state.categories.map((category) => category === oldName ? newName : category);
    state.menus.forEach((menu) => {
      if (menu.category === oldName) menu.category = newName;
    });
    if (currentCategory === oldName) currentCategory = newName;
    saveState();
    render();
    showToast("카테고리 이름을 변경했어요.");
    return;
  }

  if (form.id === "menu-form") {
    const mediaType = data.get("mediaType");
    if (mediaType === "photo" && !menuDraftImage) {
      showToast("메뉴 사진을 선택해 주세요.");
      return;
    }
    const menuData = {
      name: data.get("name").trim(),
      price: Number(data.get("price")),
      description: data.get("description").trim(),
      category: data.get("category") || "",
      mediaType,
      emoji: data.get("emoji") || "🍽️",
      image: mediaType === "photo" ? menuDraftImage : "",
    };
    const wasEditing = Boolean(editingMenuId);
    if (editingMenuId) {
      const index = state.menus.findIndex((menu) => menu.id === editingMenuId);
      if (index >= 0) state.menus[index] = { ...state.menus[index], ...menuData };
    } else {
      state.menus.push({ id: crypto.randomUUID(), ...menuData });
    }
    saveState();
    editingMenuId = null;
    menuDraftImage = "";
    render();
    showToast(wasEditing ? "메뉴를 수정했어요." : "새 메뉴를 추가했어요.");
    return;
  }

  if (form.id === "settings-form") {
    const mediaType = data.get("mediaType");
    if (mediaType === "photo" && !settingDraftImage) {
      showToast("대표 사진을 선택해 주세요.");
      return;
    }
    const primary = safeColor(data.get("primaryColorText"), data.get("primaryColor"));
    const secondary = safeColor(data.get("secondaryColorText"), data.get("secondaryColor"));
    state.settings = {
      storeName: data.get("storeName").trim(),
      boardName: data.get("boardName").trim(),
      description: data.get("description").trim(),
      mediaType,
      emoji: data.get("emoji").trim() || "🍴",
      image: mediaType === "photo" ? settingDraftImage : "",
      primaryColor: primary,
      secondaryColor: secondary,
    };
    settingDraftImage = state.settings.image;
    saveState();
    render();
    showToast("메뉴판 설정을 저장했어요.");
  }
});

window.addEventListener("hashchange", render);
if (!location.hash) location.hash = "#home";
enablePersistentStorage();
render();
