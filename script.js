// script.js
import { db } from "./firebase-config.js";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";

const $ = (s) => document.querySelector(s);
document.getElementById("year").textContent = new Date().getFullYear();

const productsGrid = $("#productsGrid");
const bestGrid = $("#bestGrid");
const productsEmpty = $("#productsEmpty");
const bestEmpty = $("#bestEmpty");
const productsLoading = $("#productsLoading");
const bestLoading = $("#bestLoading");
const categoryFilter = $("#categoryFilter");
const searchInput = $("#searchInput");

let allProducts = [];

function productCard(p) {
  const div = document.createElement("div");
  div.className = "product-card";
  div.innerHTML = `
    <img src="${p.imageUrl}" alt="${p.name}">
    <div class="content">
      <h3>${p.name}</h3>
      <div class="price">MUR ${Number(p.price).toFixed(2)}</div>
      <div class="muted small">${p.category || ""}</div>
      ${p.bestSelling ? '<span class="badge">Best Seller</span>' : ""}
    </div>`;
  return div;
}

function hydrateCategories(products) {
  const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean))).sort();
  categoryFilter.innerHTML =
    `<option value="">All Categories</option>` +
    cats.map(c => `<option value="${c}">${c}</option>`).join("");
}

function renderProducts() {
  const term = (searchInput.value || "").toLowerCase().trim();
  const cat = categoryFilter.value;

  const filtered = allProducts.filter(p => {
    const matchesTerm = !term || [p.name, p.category].filter(Boolean).join(" ").toLowerCase().includes(term);
    const matchesCat = !cat || p.category === cat;
    return matchesTerm && matchesCat;
  });

  productsGrid.innerHTML = "";
  filtered.forEach(p => productsGrid.appendChild(productCard(p)));
  productsEmpty.classList.toggle("hidden", filtered.length !== 0);
}

// All products
onSnapshot(query(collection(db, "products"), orderBy("createdAt", "desc")), (snap) => {
  productsLoading.classList.add("hidden");
  allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  hydrateCategories(allProducts);
  renderProducts();
});

// Best selling
onSnapshot(
  query(collection(db, "products"), where("bestSelling", "==", true), orderBy("createdAt", "desc")),
  (snap) => {
    bestLoading.classList.add("hidden");
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    bestGrid.innerHTML = "";
    items.forEach(p => bestGrid.appendChild(productCard(p)));
    bestEmpty.classList.toggle("hidden", items.length !== 0);
  }
);

searchInput.addEventListener("input", renderProducts);
categoryFilter.addEventListener("change", renderProducts);
