(function () {
  "use strict";

  // 注文画面や pack 側から渡す想定:
  // localStorage.setItem("receiptOrder", JSON.stringify({ id, items, total, createdAt }));
  var sampleOrder = {
    id: "MJ-0001",
    createdAt: "2026-05-11T14:40:00",
    items: [
      { name: "A", quantity: 2, amount: 200 },
      { name: "B", quantity: 4, amount: 600 },
      { name: "C", quantity: 3, amount: 500 }
    ]
  };

  function readOrder() {
    var params = new URLSearchParams(window.location.search);
    var queryItems = params.get("items");
    var queryOrder = params.get("order");
    var storedOrder = readStoredOrder();

    if (queryOrder) {
      var parsedQueryOrder = parseOrder(queryOrder);

      if (parsedQueryOrder) {
        return parsedQueryOrder;
      }
    }

    if (queryItems) {
      return {
        id: params.get("id") || sampleOrder.id,
        createdAt: params.get("createdAt") || new Date().toISOString(),
        items: parseItems(queryItems)
      };
    }

    if (storedOrder) {
      var parsedStoredOrder = parseOrder(storedOrder);

      if (parsedStoredOrder) {
        return parsedStoredOrder;
      }
    }

    return sampleOrder;
  }

  function readStoredOrder() {
    try {
      return localStorage.getItem("receiptOrder");
    } catch (error) {
      return null;
    }
  }

  function parseOrder(value) {
    try {
      var order = JSON.parse(value);

      if (Array.isArray(order)) {
        return {
          id: sampleOrder.id,
          createdAt: new Date().toISOString(),
          items: order
        };
      }

      return order;
    } catch (error) {
      return null;
    }
  }

  function parseItems(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return sampleOrder.items;
    }
  }

  function normalizeItem(item) {
    var quantity = Number(item.quantity || item.qty || item.count || item.num || 1);
    var amount = Number(item.amount || item.total || item.price || 0);

    if (!amount && item.unitPrice) {
      amount = Number(item.unitPrice) * quantity;
    }

    return {
      name: String(item.name || item.productName || item.label || item.title || ""),
      quantity: quantity,
      amount: amount
    };
  }

  function yen(value) {
    return "￥" + Number(value || 0).toLocaleString("ja-JP");
  }

  function formatDateTime(value) {
    var date = value ? new Date(value) : new Date();

    if (Number.isNaN(date.getTime())) {
      date = new Date();
    }

    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    var hour = String(date.getHours()).padStart(2, "0");
    var minute = String(date.getMinutes()).padStart(2, "0");

    return year + "/" + month + "/" + day + " " + hour + ":" + minute;
  }

  function renderItems(items) {
    var list = document.getElementById("orderItems");
    list.innerHTML = "";

    items.forEach(function (item) {
      var row = document.createElement("li");
      var name = document.createElement("span");
      var count = document.createElement("span");
      var price = document.createElement("span");

      name.className = "item-name";
      count.className = "item-count";
      price.className = "item-price";

      name.textContent = item.name;
      count.textContent = "x " + item.quantity;
      price.textContent = yen(item.amount);

      row.appendChild(name);
      row.appendChild(count);
      row.appendChild(price);
      list.appendChild(row);
    });
  }

  function render() {
    var order = readOrder();
    var items = (order.items || sampleOrder.items).map(normalizeItem);
    var total = Number(order.total || order.amount || 0);
    var ticketId = order.id || order.orderId || order.ticketId || sampleOrder.id;
    var title = order.title || order.shopName || "S3文化祭";
    var createdAt = order.createdAt || order.dateTime || order.datetime || order.date;
    var dateTime = formatDateTime(createdAt);
    var dateTimeElement = document.getElementById("orderDateTime");

    if (!total) {
      total = items.reduce(function (sum, item) {
        return sum + item.amount;
      }, 0);
    }

    renderItems(items);
    document.getElementById("receiptTitle").textContent = title;
    document.getElementById("orderTotal").textContent = yen(total);
    document.getElementById("ticketId").textContent = ticketId;
    dateTimeElement.textContent = dateTime;
    dateTimeElement.dateTime = createdAt || new Date().toISOString();
  }

  render();

  window.addEventListener("storage", function (event) {
    if (event.key === "receiptOrder") {
      render();
    }
  });

  if ("BroadcastChannel" in window) {
    var channel = new BroadcastChannel("receipt-order");

    channel.addEventListener("message", function (event) {
      if (event.data === "receiptOrderUpdated") {
        render();
      }
    });
  }
})();
