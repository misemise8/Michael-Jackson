(function () {
  "use strict";

  var products = [];
  var editingId = "";

  var rows = document.getElementById("productRows");
  var form = document.getElementById("productForm");
  var statusLine = document.getElementById("statusLine");
  var formTitle = document.getElementById("formTitle");
  var saveButton = document.getElementById("saveButton");
  var cancelButton = document.getElementById("cancelButton");

  function setStatus(message) {
    statusLine.textContent = message || "";
  }

  function getFormValue() {
    return {
      name: document.getElementById("name").value.trim(),
      price: Number(document.getElementById("price").value),
      stock: Number(document.getElementById("stock").value),
      enabled: document.getElementById("enabled").checked,
      sortOrder: editingId
        ? products.find(function (product) { return product.id === editingId; }).sortOrder
        : products.length + 1
    };
  }

  function resetForm() {
    editingId = "";
    form.reset();
    document.getElementById("enabled").checked = true;
    formTitle.textContent = "商品登録";
    saveButton.textContent = "登録";
    setStatus("");
  }

  function fillForm(product) {
    editingId = product.id;
    document.getElementById("name").value = product.name;
    document.getElementById("price").value = product.price;
    document.getElementById("stock").value = product.stock;
    document.getElementById("enabled").checked = product.enabled;
    formTitle.textContent = "商品変更";
    saveButton.textContent = "変更";
    setStatus(product.name + " を編集中です。");
  }

  function render() {
    rows.innerHTML = "";
    document.getElementById("productCount").textContent = products.length + " / 9";

    products.forEach(function (product) {
      var row = document.createElement("tr");
      var name = document.createElement("td");
      var price = document.createElement("td");
      var stock = document.createElement("td");
      var enabled = document.createElement("td");
      var actions = document.createElement("td");
      var editButton = document.createElement("button");
      var deleteButton = document.createElement("button");

      name.textContent = product.name;
      price.textContent = S3Api.yen(product.price);
      stock.textContent = product.stock;
      enabled.textContent = product.enabled ? "表示" : "非表示";

      editButton.type = "button";
      editButton.textContent = "変更";
      editButton.addEventListener("click", function () {
        fillForm(product);
      });

      deleteButton.type = "button";
      deleteButton.textContent = "削除";
      deleteButton.addEventListener("click", function () {
        removeProduct(product);
      });

      actions.className = "row-actions";
      actions.appendChild(editButton);
      actions.appendChild(deleteButton);

      row.appendChild(name);
      row.appendChild(price);
      row.appendChild(stock);
      row.appendChild(enabled);
      row.appendChild(actions);
      rows.appendChild(row);
    });
  }

  async function loadProducts() {
    try {
      products = await S3Api.getProducts();
      render();
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function saveProduct(event) {
    event.preventDefault();
    setStatus("");

    try {
      var product = getFormValue();

      if (!editingId && products.length >= 9) {
        setStatus("商品は最大9個までです。");
        return;
      }

      if (editingId) {
        await S3Api.updateProduct(editingId, product);
      } else {
        await S3Api.createProduct(product);
      }

      resetForm();
      await loadProducts();
      setStatus("保存しました。");
    } catch (error) {
      setStatus(error.message);
    }
  }

  async function removeProduct(product) {
    if (!window.confirm(product.name + " を削除しますか？")) {
      return;
    }

    try {
      await S3Api.deleteProduct(product.id);
      resetForm();
      await loadProducts();
      setStatus("削除しました。");
    } catch (error) {
      setStatus(error.message);
    }
  }

  form.addEventListener("submit", saveProduct);
  cancelButton.addEventListener("click", resetForm);

  S3Api.subscribe(function (event) {
    if (event.type === "products") {
      loadProducts();
    }
  });

  loadProducts();
})();
