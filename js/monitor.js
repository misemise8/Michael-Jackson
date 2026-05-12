(function () {
  "use strict";

  var preparingNumbers = document.getElementById("preparingNumbers");
  var callingNumbers = document.getElementById("callingNumbers");
  var statusLine = document.getElementById("statusLine");

  function setStatus(message) {
    statusLine.textContent = message || "";
  }

  function makeNumber(order) {
    var item = document.createElement("div");
    item.className = "number";
    item.textContent = order.ticketNo;
    return item;
  }

  function makeEmpty(text) {
    var item = document.createElement("p");
    item.className = "empty";
    item.textContent = text;
    return item;
  }

  function render(orders) {
    var preparing = orders.filter(function (order) {
      return order.status === "preparing";
    });
    var calling = orders.filter(function (order) {
      return order.status === "calling";
    });

    preparingNumbers.innerHTML = "";
    callingNumbers.innerHTML = "";

    if (preparing.length === 0) {
      preparingNumbers.appendChild(makeEmpty("まだありません"));
    }

    if (calling.length === 0) {
      callingNumbers.appendChild(makeEmpty("まだありません"));
    }

    preparing.forEach(function (order) {
      preparingNumbers.appendChild(makeNumber(order));
    });

    calling.forEach(function (order) {
      callingNumbers.appendChild(makeNumber(order));
    });
  }

  async function loadOrders() {
    try {
      var orders = await S3Api.getOrders();
      render(orders);
      setStatus("");
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
