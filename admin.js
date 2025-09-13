// admin.js
import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { CLOUDINARY, CLOUDINARY_UPLOAD_URL } from "./cloudinary-config.js";

const allowedUIDs = ["rLhRmo1MCcOcZK1J77k2CunqKtT2"]; // YOU

// Elements
const authSection = document.querySelector("#authSection");
const consoleSection = document.querySelector("#consoleSection");
const loginForm = document.querySelector("#loginForm");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const logoutBtn = document.querySelector("#logoutBtn");

const productForm = document.querySelector("#productForm");
const pName = document.querySelector("#pName");
const pPrice = document.querySelector("#pPrice");
const pCategory = document.querySelector("#pCategory");
const pBest = document.querySelector("#pBest");
const pImage = document.querySelector("#pImage");
const uploadProgress = document.querySelector("#uploadProgress");

const adminSearch = document.querySelector("#adminSearch");
const adminProducts = document.querySelector("#adminProducts");
const adminEmpty = document.querySelector("#adminEmpty");
const adminLoading = document.querySelector("#adminLoading");

onAuthStateChanged(auth, (user) => {
  if (!user) return showConsole(false);
  if (!allowedUIDs.includes(user.uid)) {
    alert("You do not have admin rights.");
    return signOut(auth);
  }
  showConsole(true);
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await signInWithEmailAndPassword(
      auth,
      emailInput.value.trim(),
      passwordInput.value
    );
  } catch (err) {
    alert(err.message);
  }
});

logoutBtn?.addEventListener("click", () => signOut(auth));

function showConsole(show) {
  authSection.classList.toggle("hidden", show);
  consoleSection.classList.toggle("hidden", !show);
}

// ---- Cloudinary Upload (unsigned) ----
async function uploadToCloudinary(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY.uploadPreset);
  if (CLOUDINARY.folder) fd.append("folder", CLOUDINARY.folder);

  // Optional: show progress using xhr (fetch doesn't expose progress)
  const xhr = new XMLHttpRequest();
  const promise = new Promise((resolve, reject) => {
    xhr.open("POST", CLOUDINARY_UPLOAD_URL);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Cloudinary upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.upload.onprogress = (e) => {
      if (!uploadProgress) return;
      if (e.lengthComputable) {
        uploadProgress.value = Math.round((e.loaded / e.total) * 100);
      }
    };
    xhr.send(fd);
  });

  const res = await promise; // { secure_url, public_id, ... }
  return { url: res.secure_url, publicId: res.public_id };
}

// ---- Create product ----
productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const file = pImage.files[0];
  if (!file) {
    alert("Please select an image.");
    return;
  }

  try {
    uploadProgress.value = 0;
    const { url, publicId } = await uploadToCloudinary(file);

    await addDoc(collection(db, "products"), {
      name: pName.value.trim(),
      price: Number(pPrice.value || 0),
      category: pCategory.value.trim(),
      bestSelling: !!pBest.checked,
      imageUrl: url,
      cloudinaryPublicId: publicId,
      createdAt: serverTimestamp(),
    });

    productForm.reset();
    uploadProgress.value = 0;
    alert("Product saved.");
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

// ---- List products ----
const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
onSnapshot(
  q,
  (snap) => {
    adminLoading.classList.add("hidden");
    if (snap.empty) {
      adminEmpty.classList.remove("hidden");
      adminProducts.innerHTML = "";
      return;
    }
    adminEmpty.classList.add("hidden");

    const term = (adminSearch.value || "").toLowerCase().trim();
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => {
        if (!term) return true;
        return [p.name, p.category].filter(Boolean).join(" ").toLowerCase().includes(term);
      });

    adminProducts.innerHTML = items
      .map(
        (p) => `
      <div class="admin-item" data-id="${p.id}">
        <img src="${p.imageUrl || ""}" alt="${p.name}">
        <div>
          <strong>${p.name}</strong>
          <div class="muted small">MUR ${Number(p.price).toFixed(2)} • ${p.category || "-"}</div>
          ${p.bestSelling ? '<span class="badge">Best Seller</span>' : ""}
        </div>
        <div class="admin-actions">
          <button class="btn subtle" data-action="toggleBest">${p.bestSelling ? "Unmark Best" : "Mark Best"}</button>
          <label class="btn subtle">Change Image
            <input type="file" hidden accept="image/*" data-action="changeImage" data-id="${p.id}"/>
          </label>
          <button class="btn subtle" data-action="edit">Edit</button>
          <button class="btn subtle danger" data-action="delete">Delete</button>
        </div>
      </div>`
      )
      .join("");
  },
  (err) => {
    adminLoading.textContent = "Failed to load.";
    console.error(err);
  }
);

adminSearch.addEventListener("input", () => {
  // triggers re-render on next snapshot; simple approach for brevity
});

// ---- Item actions ----
adminProducts.addEventListener("click", async (e) => {
  const action = e.target.getAttribute("data-action");
  if (!action) return;

  const item = e.target.closest(".admin-item");
  const id = item?.getAttribute("data-id");
  if (!id) return;
  const ref = doc(db, "products", id);

  try {
    if (action === "toggleBest") {
      const snap = await getDoc(ref);
      const cur = !!snap.data()?.bestSelling;
      await updateDoc(ref, { bestSelling: !cur });
    }

    if (action === "edit") {
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
    }

    if (action === "delete") {
      if (!confirm("Delete this product from the site?")) return;
      // NOTE: This deletes from Firestore ONLY.
      // Deleting the image from Cloudinary requires a secure server-side call (API key/secret).
      await deleteDoc(ref);
    }
  } catch (err) {
    alert(err.message);
  }
});

// ---- Change image (re-upload to Cloudinary, update Firestore URL) ----
adminProducts.addEventListener("change", async (e) => {
  const input = e.target;
  if (input.getAttribute("data-action") !== "changeImage") return;
  const id = input.getAttribute("data-id");
  const file = input.files[0];
  if (!file) return;

  try {
    uploadProgress.value = 0;
    const { url, publicId } = await uploadToCloudinary(file);
    await updateDoc(doc(db, "products", id), {
      imageUrl: url,
      cloudinaryPublicId: publicId,
    });
    alert("Image updated.");
  } catch (err) {
    alert(err.message);
  } finally {
    input.value = "";
    uploadProgress.value = 0;
  }
});
