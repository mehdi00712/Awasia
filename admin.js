import { auth, db, storage } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// Restrict admin access by UID
const allowedUIDs = ["rLhRmo1MCcOcZK1J77k2CunqKtT2"];

// Elements
const loginForm = document.querySelector("#loginForm");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const logoutBtn = document.querySelector("#logoutBtn");
const authSection = document.querySelector("#authSection");
const consoleSection = document.querySelector("#consoleSection");

const productForm = document.querySelector("#productForm");
const adminProducts = document.querySelector("#adminProducts");
const adminEmpty = document.querySelector("#adminEmpty");
const adminLoading = document.querySelector("#adminLoading");

// Auth state
onAuthStateChanged(auth, (user) => {
  if (!user) {
    showConsole(false);
    return;
  }
  if (!allowedUIDs.includes(user.uid)) {
    alert("You do not have admin rights.");
    signOut(auth);
    return;
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

logoutBtn.addEventListener("click", () => signOut(auth));

function showConsole(show) {
  if (show) {
    authSection.classList.add("hidden");
    consoleSection.classList.remove("hidden");
  } else {
    authSection.classList.remove("hidden");
    consoleSection.classList.add("hidden");
  }
}

// Add product
productForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.querySelector("#pName").value.trim();
  const price = Number(document.querySelector("#pPrice").value);
  const category = document.querySelector("#pCategory").value.trim();
  const bestSelling = document.querySelector("#pBest").checked;
  const file = document.querySelector("#pImage").files[0];

  if (!file) {
    alert("Please select an image.");
    return;
  }

  try {
    const docRef = await addDoc(collection(db, "products"), {
      name,
      price,
      category,
      bestSelling,
      imageUrl: "",
      createdAt: serverTimestamp()
    });

    const fileRef = ref(storage, `products/${docRef.id}-${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    await updateDoc(docRef, { imageUrl: url, imagePath: `products/${docRef.id}-${file.name}` });
    alert("Product saved!");
    productForm.reset();
  } catch (err) {
    console.error(err);
    alert("Failed to save product: " + err.message);
  }
});

// Load products live
onSnapshot(collection(db, "products"), (snapshot) => {
  adminLoading.classList.add("hidden");
  if (snapshot.empty) {
    adminEmpty.classList.remove("hidden");
    adminProducts.innerHTML = "";
    return;
  }
  adminEmpty.classList.add("hidden");
  adminProducts.innerHTML = snapshot.docs.map((docSnap) => {
    const p = docSnap.data();
    return `
      <div class="admin-item" data-id="${docSnap.id}">
        <img src="${p.imageUrl}" alt="${p.name}">
        <div>
          <strong>${p.name}</strong><br>
          <span>MUR ${p.price}</span> • ${p.category || ""}
          ${p.bestSelling ? '<span class="badge">Best Seller</span>' : ""}
        </div>
        <button data-action="delete">Delete</button>
      </div>
    `;
  }).join("");
});

// Delete product
adminProducts.addEventListener("click", async (e) => {
  if (e.target.dataset.action === "delete") {
    const id = e.target.closest(".admin-item").dataset.id;
    if (!confirm("Delete this product?")) return;

    const productRef = doc(db, "products", id);
    const productSnap = await getDoc(productRef);
    const product = productSnap.data();

    await deleteDoc(productRef);
    if (product.imagePath) {
      const imgRef = ref(storage, product.imagePath);
      await deleteObject(imgRef).catch(() => {});
    }
  }
});
