(() => {
  "use strict";

  const CONFIG_URL = "data/config.json";
  const PRODUCTS_URL = "data/products.json";
  const CART_KEY = "eidon-store-cart-v1";
  const CUSTOMER_KEY = "eidon-store-customer-v1";

  const state = {
    config: null,
    products: [],
    cart: new Map(),
    query: "",
    category: "all"
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function safeText(value, fallback = "") {
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  }

  function safePrice(value) {
    const price = Number(value);
    return Number.isFinite(price) && price >= 0 ? price : 0;
  }

  function safeImage(value) {
    if (typeof value !== "string" || !value.trim()) return "";
    try {
      const url = new URL(value, document.baseURI);
      return url.protocol === "https:" || url.origin === location.origin ? url.href : "";
    } catch {
      return "";
    }
  }

  function visibleProduct(item) {
    return item && typeof item === "object" && item.visible === true && safeText(item.id) && safeText(item.title);
  }

  function itemOrder(item) {
    const order = Number(item.order);
    return Number.isFinite(order) ? order : Number.MAX_SAFE_INTEGER;
  }

  function formatMoney(value) {
    const locale = state.config?.locale || "es-PE";
    const currency = state.config?.currency || "PEN";
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(safePrice(value));
  }

  async function readJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.json();
  }

  function loadLocalState() {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
      if (Array.isArray(saved)) {
        saved.forEach((item) => {
          if (item && typeof item.id === "string" && Number.isInteger(item.quantity) && item.quantity > 0) {
            state.cart.set(item.id, Math.min(item.quantity, 99));
          }
        });
      }
    } catch {
      localStorage.removeItem(CART_KEY);
    }

    try {
      const customer = JSON.parse(localStorage.getItem(CUSTOMER_KEY) || "{}");
      if (customer && typeof customer === "object") {
        $("[data-customer-name]").value = safeText(customer.name);
        $("[data-customer-district]").value = safeText(customer.district);
        $("[data-customer-address]").value = safeText(customer.address);
        $("[data-customer-notes]").value = safeText(customer.notes);
      }
    } catch {
      localStorage.removeItem(CUSTOMER_KEY);
    }
  }

  function saveCart() {
    const serializable = [...state.cart.entries()].map(([id, quantity]) => ({ id, quantity }));
    localStorage.setItem(CART_KEY, JSON.stringify(serializable));
  }

  function saveCustomer() {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customerData()));
  }

  function customerData() {
    return {
      name: safeText($("[data-customer-name]").value),
      district: safeText($("[data-customer-district]").value),
      address: safeText($("[data-customer-address]").value),
      notes: safeText($("[data-customer-notes]").value)
    };
  }

  function productById(id) {
    return state.products.find((product) => product.id === id) || null;
  }

  function cartLines() {
    return [...state.cart.entries()]
      .map(([id, quantity]) => ({ product: productById(id), quantity }))
      .filter((line) => line.product && line.quantity > 0);
  }

  function cartQuantity() {
    return cartLines().reduce((total, line) => total + line.quantity, 0);
  }

  function cartTotal() {
    return cartLines().reduce((total, line) => total + safePrice(line.product.price) * line.quantity, 0);
  }

  function setQuantity(id, quantity) {
    const product = productById(id);
    if (!product || product.available !== true) return;
    const next = Math.max(0, Math.min(99, Math.trunc(quantity)));
    if (next === 0) state.cart.delete(id);
    else state.cart.set(id, next);
    saveCart();
    renderCart();
  }

  function renderCategories() {
    const select = $("[data-category]");
    const categories = [...new Set(state.products.map((item) => safeText(item.category, "Otros")))].sort();
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      select.append(option);
    });
  }

  function filteredProducts() {
    const query = state.query.toLowerCase();
    return state.products.filter((product) => {
      const category = safeText(product.category, "Otros");
      const matchesCategory = state.category === "all" || category === state.category;
      const haystack = `${product.title} ${product.description || ""} ${category}`.toLowerCase();
      return matchesCategory && (!query || haystack.includes(query));
    });
  }

  function renderProducts() {
    const grid = $("[data-product-grid]");
    const status = $("[data-catalog-status]");
    const template = $("#product-template");
    const items = filteredProducts();
    grid.replaceChildren();

    if (state.products.length === 0) {
      status.hidden = false;
      status.textContent = "Catálogo en preparación. No publicaremos productos hasta confirmar precio, stock, proveedor y entrega.";
      return;
    }

    if (items.length === 0) {
      status.hidden = false;
      status.textContent = "No hay productos que coincidan con la búsqueda.";
      return;
    }

    status.hidden = true;
    items.forEach((product) => {
      const card = template.content.firstElementChild.cloneNode(true);
      const image = $(".product-image", card);
      const placeholder = $(".product-placeholder", card);
      const imageUrl = safeImage(product.image);
      if (imageUrl) {
        image.src = imageUrl;
        image.alt = safeText(product.imageAlt, product.title);
        placeholder.hidden = true;
        image.addEventListener("error", () => {
          image.hidden = true;
          placeholder.hidden = false;
        }, { once: true });
      } else {
        image.hidden = true;
      }

      $(".stock-badge", card).textContent = product.available === true ? "Disponible" : "Consultar";
      $(".product-category", card).textContent = safeText(product.category, "Otros");
      $("h3", card).textContent = product.title;
      $(".product-description", card).textContent = safeText(product.description, "Información por confirmar.");
      $(".product-price", card).textContent = formatMoney(product.price);
      $(".product-seller", card).textContent = `Gestionado por ${safeText(product.sellerName, "proveedor por confirmar")}`;

      const add = $(".product-add", card);
      add.disabled = product.available !== true;
      add.textContent = product.available === true ? "Agregar al pedido" : "No disponible";
      add.addEventListener("click", () => setQuantity(product.id, (state.cart.get(product.id) || 0) + 1));
      grid.append(card);
    });
  }

  function renderCart() {
    const container = $("[data-cart-items]");
    const lines = cartLines();
    container.replaceChildren();

    if (lines.length === 0) {
      const empty = document.createElement("p");
      empty.className = "cart-empty";
      empty.textContent = "Todavía no agregaste productos.";
      container.append(empty);
    } else {
      lines.forEach(({ product, quantity }) => {
        const item = document.createElement("article");
        item.className = "cart-item";
        const copy = document.createElement("div");
        const title = document.createElement("h3");
        const meta = document.createElement("p");
        title.textContent = product.title;
        meta.textContent = `${formatMoney(product.price)} c/u · ${safeText(product.sellerName, "Proveedor por confirmar")}`;
        copy.append(title, meta);

        const controls = document.createElement("div");
        controls.className = "quantity-controls";
        const minus = document.createElement("button");
        const count = document.createElement("strong");
        const plus = document.createElement("button");
        minus.type = plus.type = "button";
        minus.textContent = "−";
        plus.textContent = "+";
        minus.setAttribute("aria-label", `Reducir ${product.title}`);
        plus.setAttribute("aria-label", `Aumentar ${product.title}`);
        count.textContent = String(quantity);
        minus.addEventListener("click", () => setQuantity(product.id, quantity - 1));
        plus.addEventListener("click", () => setQuantity(product.id, quantity + 1));
        controls.append(minus, count, plus);
        item.append(copy, controls);
        container.append(item);
      });
    }

    const quantity = cartQuantity();
    $("[data-cart-count]").textContent = String(quantity);
    $("[data-cart-status]").textContent = String(quantity);
    $("[data-cart-total]").textContent = formatMoney(cartTotal());
    updateOrderActions();
  }

  function orderId() {
    const prefix = safeText(state.config?.orderPrefix, "ES").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 8) || "ES";
    const date = new Date();
    const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `${prefix}-${stamp}-${random}`;
  }

  function buildOrderMessage() {
    const lines = cartLines();
    const customer = customerData();
    const id = orderId();
    const products = lines.map(({ product, quantity }, index) =>
      `${index + 1}. ${product.title}\n   Cantidad: ${quantity}\n   Precio referencial: ${formatMoney(product.price)}\n   Gestionado por: ${safeText(product.sellerName, "Proveedor por confirmar")}`
    ).join("\n\n");

    return [
      `PEDIDO ${id}`,
      "EIDON-STORE",
      "",
      products,
      "",
      `Subtotal referencial: ${formatMoney(cartTotal())}`,
      "El total, stock y envío deben confirmarse antes del pago.",
      "",
      `Cliente: ${customer.name || "No indicado"}`,
      `Distrito: ${customer.district || "No indicado"}`,
      `Dirección/referencia: ${customer.address || "No indicada"}`,
      `Nota: ${customer.notes || "Ninguna"}`,
      "",
      "Pago: por definir (Yape o Plin se configurará después)."
    ].join("\n");
  }

  function targetWhatsApp() {
    const number = safeText(state.config?.eidonWhatsApp).replace(/\D/g, "");
    return /^\d{8,15}$/.test(number) ? number : "";
  }

  function updateOrderActions() {
    const send = $("[data-send-order]");
    const hasCart = cartQuantity() > 0;
    const enabled = state.config?.ordersEnabled === true && targetWhatsApp();
    send.disabled = !hasCart || !enabled || !$("[data-consent]").checked;
    send.textContent = enabled ? "Enviar por WhatsApp" : "WhatsApp por configurar";
  }

  async function copyOrder() {
    const feedback = $("[data-order-feedback]");
    if (cartQuantity() === 0) {
      feedback.textContent = "Agrega al menos un producto.";
      return;
    }
    saveCustomer();
    try {
      await navigator.clipboard.writeText(buildOrderMessage());
      feedback.textContent = "Pedido copiado. Todavía no confirma una compra ni un pago.";
    } catch {
      feedback.textContent = "El navegador no permitió copiar el pedido.";
    }
  }

  function sendOrder() {
    const feedback = $("[data-order-feedback]");
    const number = targetWhatsApp();
    if (!number || state.config?.ordersEnabled !== true) {
      feedback.textContent = "WhatsApp todavía no está configurado.";
      return;
    }
    if (!$("[data-consent]").checked) {
      feedback.textContent = "Confirma que entiendes el proceso antes de continuar.";
      return;
    }
    saveCustomer();
    const url = new URL(`https://wa.me/${number}`);
    url.searchParams.set("text", buildOrderMessage());
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openCart() {
    const drawer = $("[data-cart-drawer]");
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    $(".icon-button", drawer).focus();
  }

  function closeCart() {
    const drawer = $("[data-cart-drawer]");
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function bindEvents() {
    $("[data-search]").addEventListener("input", (event) => {
      state.query = event.target.value.trim();
      renderProducts();
    });
    $("[data-category]").addEventListener("change", (event) => {
      state.category = event.target.value;
      renderProducts();
    });
    $("[data-cart-open]").addEventListener("click", openCart);
    $$('[data-cart-close]').forEach((button) => button.addEventListener("click", closeCart));
    $("[data-copy-order]").addEventListener("click", copyOrder);
    $("[data-send-order]").addEventListener("click", sendOrder);
    $("[data-clear-cart]").addEventListener("click", () => {
      state.cart.clear();
      saveCart();
      renderCart();
    });
    $("[data-consent]").addEventListener("change", updateOrderActions);
    $$('[data-customer-name], [data-customer-district], [data-customer-address], [data-customer-notes]')
      .forEach((field) => field.addEventListener("change", saveCustomer));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCart();
    });
  }

  async function initialize() {
    $("[data-year]").textContent = String(new Date().getFullYear());
    bindEvents();
    loadLocalState();

    try {
      const [config, products] = await Promise.all([readJson(CONFIG_URL), readJson(PRODUCTS_URL)]);
      state.config = config && typeof config === "object" ? config : {};
      state.products = Array.isArray(products) ? products.filter(visibleProduct).sort((a, b) => itemOrder(a) - itemOrder(b)) : [];
      $("[data-product-count]").textContent = String(state.products.length);
      $("[data-orders-status]").textContent = state.config.ordersEnabled === true ? "ACTIVOS" : "PREPARACIÓN";
      renderCategories();
      renderProducts();
      renderCart();
    } catch (error) {
      console.error("No se pudo iniciar Eidon-Store.", error);
      $("[data-catalog-status]").textContent = "No se pudo cargar el catálogo. Intenta recargar la página.";
      renderCart();
    }
  }

  initialize();
})();
