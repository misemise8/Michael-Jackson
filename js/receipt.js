(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  var statusLine = document.getElementById("statusLine");

  function setStatus(message) {
    statusLine.textContent = message || "";
  }

  function readInlineOrder() {
    var text = params.get("order");

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  }

  function render(order) {
    var list = document.getElementById("orderItems");
    var empty = document.getElementById("emptyOrder");
    var items = order.items || [];

    list.innerHTML = "";
    empty.hidden = items.length > 0;

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
      price.textContent = S3Api.yen(item.amount);

      row.appendChild(name);
      row.appendChild(count);
      row.appendChild(price);
      list.appendChild(row);
    });

    document.getElementById("orderTotal").textContent = S3Api.yen(order.total);
    document.getElementById("ticketNo").textContent = order.ticketNo || order.id || "---";
    document.getElementById("orderDateTime").textContent = S3Api.formatDateTime(order.createdAt);
    document.getElementById("orderDateTime").dateTime = order.createdAt || "";
  }

  async function loadOrder() {
    var inlineOrder = readInlineOrder();
    var id = params.get("id");

    if (inlineOrder) {
      render(inlineOrder);
      return;
    }

    if (!id) {
      setStatus("注文IDがありません。regi.html から引換券を作成してください。");
      return;
    }

    try {
      var order = await S3Api.getOrder(id);
      render(order);
      setStatus("");
    } catch (error) {
      setStatus(error.message);
    }
  }

  document.getElementById("printButton").addEventListener("click", function () {
    window.print();
  });

  S3Api.subscribe(function (event) {
    if (event.type === "orders") {
      loadOrder();
    }
  });

  loadOrder();
})();
