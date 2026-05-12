(function () {
  "use strict";

  async function request(path, options) {
    var response = await fetch(path, Object.assign({
      headers: {
        "Content-Type": "application/json"
      }
    }, options || {}));
    var data = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(data.error || "通信に失敗しました。");
    }

    return data;
  }

  function yen(value) {
    return "￥" + Number(value || 0).toLocaleString("ja-JP");
  }

  function formatDateTime(value) {
    var date = value ? new Date(value) : new Date();

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    var hour = String(date.getHours()).padStart(2, "0");
    var minute = String(date.getMinutes()).padStart(2, "0");

    return year + "/" + month + "/" + day + " " + hour + ":" + minute;
  }

  function subscribe(onUpdate) {
    if (!("EventSource" in window)) {
      return null;
    }

    var source = new EventSource("/api/events");
    source.addEventListener("update", function (event) {
      try {
        onUpdate(JSON.parse(event.data));
      } catch (error) {
        onUpdate({ type: "unknown" });
      }
    });
    return source;
  }

  window.S3Api = {
    request: request,
    yen: yen,
    formatDateTime: formatDateTime,
    subscribe: subscribe,
    getProducts: function () {
      return request("/api/products");
    },
    createProduct: function (product) {
      return request("/api/products", {
        method: "POST",
        body: JSON.stringify(product)
      });
    },
    updateProduct: function (id, product) {
      return request("/api/products/" + encodeURIComponent(id), {
        method: "PUT",
        body: JSON.stringify(product)
      });
    },
    deleteProduct: function (id) {
      return request("/api/products/" + encodeURIComponent(id), {
        method: "DELETE"
      });
    },
    getOrders: function () {
      return request("/api/orders");
    },
    getOrder: function (id) {
      return request("/api/orders/" + encodeURIComponent(id));
    },
    createOrder: function (items) {
      return request("/api/orders", {
        method: "POST",
        body: JSON.stringify({ items: items })
      });
    },
    updateOrderStatus: function (id, status) {
      return request("/api/orders/" + encodeURIComponent(id) + "/status", {
        method: "PUT",
        body: JSON.stringify({ status: status })
      });
    },
    updateOrderItemCheck: function (id, productId, checked) {
      return request(
        "/api/orders/" + encodeURIComponent(id) +
        "/items/" + encodeURIComponent(productId) + "/check",
        {
          method: "PUT",
          body: JSON.stringify({ checked: checked })
        }
      );
    }
  };
})();
