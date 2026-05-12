(function () {
  "use strict";

  var products = [];
  var cart = {};

  var menuGrid = document.getElementById("menuGrid");
  var cartList = document.getElementById("cartList");
  var cartTotal = document.getElementById("cartTotal");
  var emptyMessage = document.getElementById("emptyMessage");
  var confirmButton = document.getElementById("confirmOrder");
  var statusLine = document.getElementById("statusLine");
  var lastOrder = document.getElementById("lastOrder");

  function setStatus(message) {
    statusLine.textContent = message || "";
  }

  function getProduct(id) {
    return products.find(function (product) {
      return product.id === id;
    });
  }

  function getCartQuantity(id) {
    return Number(cart[id] || 0);
  }

  function getDisplayStock(product) {
    return Math.max(product.stock - getCartQuantity(product.id), 0);
  }

  function getOrderItems() {
    return Object.keys(cart).map(function (id) {
      return {
        productId: id,
        quantity: cart[id]
      };
    });
  }

  function getCartRows() {
    return Object.keys(cart).map(function (id) {
      var product = getProduct(id);
      var quantity = cart[id];

      return {
        product: product,
        quantity: quantity,
        amount: product.price * quantity
      };
    });
  }

  function renderProducts() {
    menuGrid.innerHTML = "";

    products.filter(function (product) {
      return product.enabled;
    }).forEach(function (product) {
      var button = document.createElement("button");
      var stock = document.createElement("span");
      var name = document.createElement("span");
      var price = document.createElement("span");
      var displayStock = getDisplayStock(product);

      button.type = "button";
      button.className = "product-button";
      button.disabled = displayStock <= 0;
      button.addEventListener("click", function () {
        addItem(product.id);
      });

      stock.className = "stock-badge";
      stock.textContent = "在庫 " + displayStock;
      name.className = "product-name";
      name.textContent = product.name;
      price.className = "product-price";
      price.textContent = S3Api.yen(product.price);

      button.appendChild(stock);
      button.appendChild(name);
      button.appendChild(price);
      menuGrid.appendChild(button);
    });
  }

  function renderCart() {
    var rows = getCartRows();
    var total = rows.reduce(function (sum, row) {
      return sum + row.amount;
    }, 0);

    cartList.innerHTML = "";
    emptyMessage.hidden = rows.length > 0;
    confirmButton.disabled = rows.length === 0;

    rows.forEach(function (row) {
      var li = document.createElement("li");
      var detail = document.createElement("div");
      var name = document.createElement("span");
      var price = document.createElement("span");
      var controls = document.createElement("div");
      var up = document.createElement("button");
      var value = document.createElement("span");
      var down = document.createElement("button");

      name.className = "cart-name";
      name.textContent = row.product.name;
      price.className = "cart-price";
      price.textContent = S3Api.yen(row.product.price) + " x " + row.quantity;

      up.type = "button";
      up.className = "quantity-button";
      up.textContent = "▲";
      up.disabled = getDisplayStock(row.product) <= 0;
      up.addEventListener("click", function () {
        addItem(row.product.id);
      });

      value.className = "quantity-value";
      value.textContent = row.quantity;

      down.type = "button";
      down.className = "quantity-button";
      down.textContent = row.quantity === 1 ? "×" : "▼";
      down.addEventListener("click", function () {
        removeItem(row.product.id);
      });

      detail.appendChild(name);
      detail.appendChild(price);
      controls.className = "quantity-controls";
      controls.appendChild(up);
      controls.appendChild(value);
      controls.appendChild(down);
      li.appendChild(detail);
      li.appendChild(controls);
      cartList.appendChild(li);
    });

    cartTotal.textContent = S3Api.yen(total);
    renderProducts();
  }

  function addItem(id) {
    var product = getProduct(id);

    if (!product || getDisplayStock(product) <= 0) {
      return;
    }

    cart[id] = getCartQuantity(id) + 1;
    renderCart();
  }

  function removeItem(id) {
    if (!cart[id]) {
      return;
    }

    cart[id] -= 1;

    if (cart[id] <= 0) {
      delete cart[id];
    }

    renderCart();
  }

  function clearCart() {
    cart = {};
    renderCart();
    setStatus("");
  }

  async function loadProducts() {
    try {
      products = await S3Api.getProducts();
      Object.keys(cart).forEach(function (id) {
        if (!getProduct(id)) {
          delete cart[id];
        }
      });
      renderCart();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function confirmOrder() {
    setStatus("");

    try {
      var order = await S3Api.createOrder(getOrderItems());
      clearCart();
      await loadProducts();
      lastOrder.innerHTML = "作成: <a href=\"receipt.html?id=" +
        encodeURIComponent(order.id) + "\" target=\"_blank\">" +
        order.ticketNo + "</a>";
      window.open("receipt.html?id=" + encodeURIComponent(order.id), "_blank");
    } catch (error) {
      setStatus(error.message);
    }
  }

  document.getElementById("clearCart").addEventListener("click", clearCart);
  confirmButton.addEventListener("click", confirmOrder);

  S3Api.subscribe(function (event) {
    if (event.type === "products") {
      loadProducts();
    }
  });

  loadProducts();
})();
