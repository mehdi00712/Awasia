// admin.js
import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, getDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { CLOUDINARY, CLOUDINARY_UPLOAD_URL } from "./cloudinary-config.js";

// Only this UID can write:
const allowedUIDs = ["rLhRmo1MCcOcZK1J77k2CunqKtT2"];

// Elements
const yearEl = document.querySelector("#year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

const authSection   = document.querySelector("#authSection");
const consoleSection= document.querySelector("#consoleSection");
const loginForm     = document.querySelector("#loginForm");
const emailInput    = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const logoutBtn     = document.querySelector("#logoutBtn");

const productForm   = document.querySelector("#productForm");
const pName         = document.querySelector("#pName");
const pPrice        = document.querySelector("#pPrice");
const pCategory     = document.querySelector("#pCategory");
const pBest         = document.querySelector("#pBest");
const pImage        = document.querySelector("#pImage");
const uploadProgress= document.querySelector("#uploadProgress");

const adminSearch   = document.querySelector("#adminSearch");
const adminProducts = document.querySelector("#adminProducts");
const adminEmpty    = document.querySelector("#adminEmpty");
const adminLoading  = document.querySelector("#adminLoading");

// Helpers
function showConsole(show) {
  authSection.classList.toggle("hidden", show);
  consoleSection.classList.toggle("hidden", !show);
}
function requireAdmin(user) {
  return user && allowedUIDs.includes(user.uid);
}

// Auth state
onAuthStateChanged(auth, (user) => {
  if (!requireAdmin(user)) { showConsole(false); return; }
  showConsole(true);
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
  } catch (err) { alert(err.message); }
});

logoutBtn.addEventListener("click", () => signOut(auth));

// Cloudinary upload (unsigned)
async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY.uploadPreset);
  if (CLOUDINARY.folder) fd.append("folder", CLOUDINARY.folder);

  const xhr = new XMLHttpRequest();
  const p = new Promise((resolve, reject) => {
    xhr.open("POST", CLOUDINARY_UPLOAD_URL);
    xhr.onload  = () => (xhr.status >= 200 && xhr.status < 300)
      ? resolve(JSON.parse(xhr.responseText))
      : reject(new Error(`Cloudinary upload failed: ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.upload.onprogress = (e) => {
      if (uploadProgress && e.lengthComputable) {
        uploadProgress.value = Math.round((e.loaded / e.total) * 100);
      }
    };
    xhr.send(fd);
  });
  return p; // { secure_url, public_id, ... }
}

// Create product
productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!requireAdmin(user)) return alert("Not authorized.");

  const file = pImage.files[0];
  if (!file) return alert("Please select an image.");

  try {
    uploadProgress.value = 0;
    const res = await uploadToCloudinary(file);
    await addDoc(collection(db, "products"), {
      name: pName.value.trim(),
      price: Number(pPrice.value || 0),
      category: pCategory.value.trim(),
      bestSelling: !!pBest.checked,
      imageUrl: res.secure_url,
      cloudinaryPublicId: res.public_id,
      createdAt: serverTimestamp(),
      createdBy: user.uid,
    });
    productForm.reset();
    uploadProgress.value = 0;
    alert("Product saved.");
  } catch (err) { alert(err.message); }
});

// List products (live)
const qProducts = query(collection(db, "products"), orderBy("createdAt", "desc"));
onSnapshot(qProducts, (snap) => {
  adminLoading.classList.add("hidden");
  if (snap.empty) {
    adminEmpty.classList.remove("hidden");
    adminProducts.innerHTML = "";
    return;
  }
  adminEmpty.classList.add("hidden");

  const term = (adminSearch.value || "").toLowerCase().trim();
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(p => !term || [p.name, p.category].filter(Boolean).join(" ").toLowerCase().includes(term));

  adminProducts.innerHTML = items.map(p => `
    <div class="admin-item" data-id="${p.id}">
      <img src="${p.imageUrl || ""}" alt="${p.name}">
      <div>
        <strong>${p.name}</strong>
        <div class="muted small">MUR ${Number(p.price).toFixed(2)} • ${p.category || "-"}</div>
        ${p.bestSelling ? '<span class="badge">Best Seller</span>' : ''}
      </div>
      <div class="admin-actions">
        <button class="btn subtle" data-action="toggleBest">${p.bestSelling ? "Unmark Best" : "Mark Best"}</button>
        <label class="btn subtle">Change Image
          <input type="file" hidden accept="image/*" data-action="changeImage" data-id="${p.id}"/>
        </label>
        <button class="btn subtle" data-action="edit">Edit</button>
        <button class="btn subtle danger" data-action="delete">Delete</button>
      </div>
    </div>
  `).join("");
}, (err) => {
  adminLoading.textContent = "Failed to load.";
  console.error(err);
});

adminSearch.addEventListener("input", () => {/* re-renders on next snapshot */});

// Actions
adminProducts.addEventListener("click", async (e) => {
  const action = e.target.getAttribute("data-action");
  if (!action) return;

  const user = auth.currentUser;
  if (!requireAdmin(user)) return alert("Not authorized.");

  const item = e.target.closest(".admin-item");
  const id = item?.getAttribute("data-id");
  if (!id) return;

  const ref = doc(db, "products", id);
  try {
    if (action === "toggleBest") {
      const snap = await getDoc(ref);
      const cur = !!snap.data()?.bestSelling;
      await updateDoc(ref, { bestSelling: !cur });
    } else if (action === "edit") {
      const snap = await getDoc(ref);
      const p = snap.data();
      const name = prompt("Name:", p.name ?? "");
      if (name === null) return;
      const price = prompt("Price (MUR):", p.price ?? 0);
      if (price === null) return;
      const category = prompt("Category:", p.category ?? "");
      await updateDoc(ref, {
        name: name.trim(),
        price: Number(price || 0),
        category: category.trim(),
      });
    } else if (action === "delete") {
      if (!confirm("Delete this product from the site?")) return;
      await deleteDoc(ref);
      // To delete Cloudinary image, do it server-side with API key/secret.
    }
  } catch (err) { alert(err.message); }
});

// Change image
adminProducts.addEventListener("change", async (e) => {
  const input = e.target;
  if (input.getAttribute("data-action") !== "changeImage") return;

  const user = auth.currentUser;
  if (!requireAdmin(user)) return alert("Not authorized.");

  const id = input.getAttribute("data-id");
  const file = input.files[0];
  if (!file) return;

  try {
    uploadProgress.value = 0;
    const res = await uploadToCloudinary(file);
    await updateDoc(doc(db, "products", id), {
      imageUrl: res.secure_url,
      cloudinaryPublicId: res.public_id,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });
    alert("Image updated.");
  } catch (err) { alert(err.message); }
  finally { input.value = ""; uploadProgress.value = 0; }
});
