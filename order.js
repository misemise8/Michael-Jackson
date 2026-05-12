(function () {
  "use strict";

  var menu = [
    {
      id: "moonwalk-cola",
      name: "ムーンウォークコーラ",
      price: 200,
      description: "文化祭ドリンク"
    },
    {
      id: "thriller-popcorn",
      name: "スリラーポップコーン",
      price: 300,
      description: "軽めのおやつ"
    },
    {
      id: "beat-it-fries",
      name: "ビートイットポテト",
      price: 350,
      description: "受け取りやすい定番"
    },
    {
      id: "smoothie",
      name: "スムーススムージー",
      price: 400,
      description: "冷たい限定メニュー"
    },
    {
      id: "billie-jean-set",
      name: "ビリージーンセット",
      price: 600,
      description: "人気メニューのセット"
    },
    {
      id: "mj-ticket",
      name: "MJスペシャル",
      price: 800,
      description: "文化祭限定セット"
    }
  ];

  var cart = {};

  function yen(value) {
    return "￥" + Number(value || 0).toLocaleString("ja-JP");
  }

  function getMenuItem(id) {
    return menu.find(function (item) {
      return item.id === id;
    });
  }

  function makeOrderId() {
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, "0");
    var day = String(now.getDate()).padStart(2, "0");
    var seconds = String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    return "MJ-" + month + day + "-" + seconds;
  }

  function renderMenu() {
    var grid = document.getElementById("menuGrid");
    grid.innerHTML = "";

    menu.forEach(function (item) {
      var card = document.createElement("article");
      var title = document.createElement("h3");
      var description = document.createElement("p");
      var price = document.createElement("span");
      var button = document.createElement("button");

      card.className = "menu-card";
      title.textContent = item.name;
      description.textContent = item.description;
      price.className = "menu-price";
      price.textContent = yen(item.price);
      button.type = "button";
      button.textContent = "追加";
      button.addEventListener("click", function () {
        addItem(item.id);
      });

      card.appendChild(title);
      card.appendChild(description);
      card.appendChild(price);
      card.appendChild(button);
      grid.appendChild(card);
    });
  }

  function addItem(id) {
    cart[id] = (cart[id] || 0) + 1;
    renderCart();
    saveDraft();
  }

  function removeItem(id) {
    cart[id] = Math.max((cart[id] || 0) - 1, 0);

    if (cart[id] === 0) {
      delete cart[id];
    }

    renderCart();
    saveDraft();
  }

  function clearCart() {
    cart = {};
    renderCart();
    saveDraft();
  }

  function getOrderItems() {
    return Object.keys(cart).map(function (id) {
      var item = getMenuItem(id);
      var quantity = cart[id];

      return {
        id: id,
        name: item.name,
        quantity: quantity,
        unitPrice: item.price,
        amount: item.price * quantity
      };
    });
  }

  function getTotal(items) {
    return items.reduce(function (sum, item) {
      return sum + item.amount;
    }, 0);
  }

  function makeOrder(id) {
    var items = getOrderItems();

    return {
      id: id || makeOrderId(),
      title: "S3文化祭",
      createdAt: new Date().toISOString(),
      items: items,
      total: getTotal(items)
    };
  }

  function saveOrder(order) {
    var text = JSON.stringify(order);

    try {
      localStorage.setItem("receiptOrder", text);
    } catch (error) {
      return text;
    }

    if ("BroadcastChannel" in window) {
      var channel = new BroadcastChannel("receipt-order");
      channel.postMessage("receiptOrderUpdated");
      channel.close();
    }

    return text;
  }

  function saveDraft() {
    var order = makeOrder("MJ-PREVIEW");
    saveOrder(order);
  }

  function renderCart() {
    var list = document.getElementById("cartList");
    var empty = document.getElementById("emptyMessage");
    var total = document.getElementById("cartTotal");
    var items = getOrderItems();

    list.innerHTML = "";
    empty.hidden = items.length > 0;

    items.forEach(function (item) {
      var row = document.createElement("li");
      var detail = document.createElement("div");
      var name = document.createElement("span");
      var price = document.createElement("span");
      var controls = document.createElement("div");
      var minus = document.createElement("button");
      var count = document.createElement("span");
      var plus = document.createElement("button");

      name.className = "cart-name";
      name.textContent = item.name;
      price.className = "cart-price";
      price.textContent = yen(item.unitPrice) + " x " + item.quantity;

      minus.className = "quantity-button";
      minus.type = "button";
      minus.textContent = "-";
      minus.addEventListener("click", function () {
        removeItem(item.id);
      });

      count.className = "quantity-value";
      count.textContent = item.quantity;

      plus.className = "quantity-button";
      plus.type = "button";
      plus.textContent = "+";
      plus.addEventListener("click", function () {
        addItem(item.id);
      });

      controls.className = "quantity-controls";
      controls.appendChild(minus);
      controls.appendChild(count);
      controls.appendChild(plus);

      detail.appendChild(name);
      detail.appendChild(price);
      row.appendChild(detail);
      row.appendChild(controls);
      list.appendChild(row);
    });

    total.textContent = yen(getTotal(items));
  }

  function createReceipt() {
    var items = getOrderItems();

    if (items.length === 0) {
      return;
    }

    var order = makeOrder();
    var text = saveOrder(order);
    window.location.href = "receipt.html?order=" + encodeURIComponent(text);
  }

  document.getElementById("clearCart").addEventListener("click", clearCart);
  document.getElementById("createReceipt").addEventListener("click", createReceipt);

  renderMenu();
  renderCart();
})();
