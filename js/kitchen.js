(function () {
  "use strict";

  var preparingList = document.getElementById("preparingList");
  var callingList = document.getElementById("callingList");
  var statusLine = document.getElementById("statusLine");

  function setStatus(message) {
    statusLine.textContent = message || "";
  }

  function makeOrderCard(order) {
    var card = document.createElement("article");
    var head = document.createElement("div");
    var ticket = document.createElement("span");
    var time = document.createElement("span");
    var list = document.createElement("ul");
    var total = document.createElement("div");
    var actions = document.createElement("div");

    card.className = "order-card " + order.status;
    head.className = "order-head";
    ticket.className = "ticket-no";
    ticket.textContent = order.ticketNo;
    time.className = "order-time";
    time.textContent = S3Api.formatDateTime(order.createdAt);
    head.appendChild(ticket);
    head.appendChild(time);

    list.className = "kitchen-items";
    order.items.forEach(function (item) {
      var row = document.createElement("li");
      var check = document.createElement("input");
      var name = document.createElement("span");
      var quantity = document.createElement("strong");

      check.type = "checkbox";
      check.checked = Boolean(item.checked);
      check.disabled = order.status !== "preparing";
      check.addEventListener("change", function () {
        updateCheck(order.id, item.productId, check.checked);
      });

      name.textContent = item.name;
      if (item.checked) {
        name.className = "checked";
      }
      quantity.textContent = "x " + item.quantity;

      row.appendChild(check);
      row.appendChild(name);
      row.appendChild(quantity);
      list.appendChild(row);
    });

    total.className = "order-total";
    total.innerHTML = "<span>合計</span><strong>" + S3Api.yen(order.total) + "</strong>";

    actions.className = "card-actions";
    if (order.status === "preparing") {
      var callButton = document.createElement("button");
      var allChecked = order.items.every(function (item) {
        return item.checked;
      });

      callButton.type = "button";
      callButton.className = "call-button";
      callButton.textContent = "提供・呼出へ";
      callButton.disabled = !allChecked;
      callButton.addEventListener("click", function () {
        updateStatus(order.id, "calling");
      });
      actions.appendChild(callButton);
    }

    if (order.status === "calling") {
      var completeButton = document.createElement("button");
      completeButton.type = "button";
      completeButton.className = "complete-button";
      completeButton.textContent = "受け渡し完了";
      completeButton.addEventListener("click", function () {
        updateStatus(order.id, "completed");
      });
      actions.appendChild(completeButton);
    }

    card.appendChild(head);
    card.appendChild(list);
    card.appendChild(total);
    card.appendChild(actions);
    return card;
  }

  function renderOrders(orders) {
    var preparing = orders.filter(function (order) {
      return order.status === "preparing";
    });
    var calling = orders.filter(function (order) {
      return order.status === "calling";
    });

    preparingList.innerHTML = "";
    callingList.innerHTML = "";

    if (preparing.length === 0) {
      preparingList.appendChild(makeEmpty("準備中の注文はありません"));
    }

    if (calling.length === 0) {
      callingList.appendChild(makeEmpty("呼出中の注文はありません"));
    }

    preparing.forEach(function (order) {
      preparingList.appendChild(makeOrderCard(order));
    });

    calling.forEach(function (order) {
      callingList.appendChild(makeOrderCard(order));
    });
  }

  function makeEmpty(text) {
    var empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = text;
    return empty;
  }

  async function loadOrders() {
    try {
      var orders = await S3Api.getOrders();
      renderOrders(orders);
      setStatus("");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function updateCheck(orderId, productId, checked) {
    try {
      await S3Api.updateOrderItemCheck(orderId, productId, checked);
      await loadOrders();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function updateStatus(orderId, status) {
    try {
      await S3Api.updateOrderStatus(orderId, status);
      await loadOrders();
    } catch (error) {
      setStatus(error.message);
    }
  }

  S3Api.subscribe(function (event) {
    if (event.type === "orders") {
      loadOrders();
    }
  });

  loadOrders();
})();
