// Admin panel: Auth + CRUD for products
;(function(){
  const allowedEmails = [
    // Add the emails that should have admin access
    // "owner@example.com",
  ];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Firebase
  firebase.initializeApp(window.firebaseConfig);
  const auth = firebase.auth();
  const db = firebase.firestore();
  const storage = firebase.storage();

  // UI Elements
  const authSection = $("#authSection");
  const consoleSection = $("#consoleSection");
  const loginForm = $("#loginForm");
  const email = $("#email");
  const password = $("#password");
  const logoutBtn = $("#logoutBtn");

  const productForm = $("#productForm");
  const pName = $("#pName");
  const pPrice = $("#pPrice");
  const pCategory = $("#pCategory");
  const pBest = $("#pBest");
  const pImage = $("#pImage");

  const adminProducts = $("#adminProducts");
  const adminEmpty = $("#adminEmpty");
  const adminLoading = $("#adminLoading");
  const adminSearch = $("#adminSearch");

  // Auth UI
  function showConsole(show){
    if(show){
      authSection.classList.add("hidden");
      consoleSection.classList.remove("hidden");
    } else {
      authSection.classList.remove("hidden");
      consoleSection.classList.add("hidden");
    }
  }

  auth.onAuthStateChanged(user=>{
    if(!user){ showConsole(false); return; }
    // Restrict by email list if any are set
    if(allowedEmails.length && !allowedEmails.includes(user.email)){
      alert("You do not have admin access with this account.");
      auth.signOut();
      return;
    }
    showConsole(true);
  });

  loginForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    try {
      await auth.signInWithEmailAndPassword(email.value.trim(), password.value);
    } catch (err) {
      alert(err.message);
    }
  });

  logoutBtn.addEventListener("click", ()=> auth.signOut());

  // Create product
  productForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const file = pImage.files[0];
    if(!file){ alert("Please select an image."); return; }
    try {
      // Create doc first
      const docRef = await db.collection("products").add({
        name: pName.value.trim(),
        price: Number(pPrice.value || 0),
        category: pCategory.value.trim(),
        bestSelling: !!pBest.checked,
        imageUrl: "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      // Upload image
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `products/${docRef.id}.${ext}`;
      const snap = await storage.ref().child(path).put(file);
      const url = await snap.ref.getDownloadURL();
      await docRef.update({ imageUrl: url, imagePath: path });
      productForm.reset();
      alert("Product saved.");
    } catch (err) {
      console.error(err);
      alert("Failed to save product: " + err.message);
    }
  });

  // List + live query
  let all = [];
  db.collection("products").orderBy("createdAt","desc").onSnapshot(snap=>{
    adminLoading.classList.add("hidden");
    all = snap.docs.map(d=>({ id:d.id, ...d.data() }));
    render();
  }, err => {
    adminLoading.textContent = "Failed to load.";
    console.error(err);
  });

  function render(){
    const term = (adminSearch.value || "").toLowerCase().trim();
    const items = all.filter(p => !term || [p.name, p.category].filter(Boolean).join(" ").toLowerCase().includes(term));
    adminProducts.innerHTML = items.map(p => `
      <div class="admin-item" data-id="${p.id}">
        <img src="${p.imageUrl || ""}" alt="${p.name}">
        <div>
          <strong>${p.name}</strong>
          <div class="muted small">MUR ${Number(p.price).toFixed(2)} • ${p.category || "-"}</div>
          ${p.bestSelling ? '<span class="badge">Best Seller</span>' : ''}
        </div>
        <div class="admin-actions">
          <button class="btn subtle" data-action="toggleBest">${p.bestSelling ? 'Unmark Best' : 'Mark Best'}</button>
          <label class="btn subtle" for="file-${p.id}">Change Image<input hidden type="file" id="file-${p.id}" data-action="changeImage" data-id="${p.id}" accept="image/*"/></label>
          <button class="btn subtle" data-action="edit">Edit</button>
          <button class="btn subtle danger" data-action="delete">Delete</button>
        </div>
      </div>
    `).join("");
    adminEmpty.classList.toggle("hidden", items.length !== 0);
  }

  adminSearch.addEventListener("input", render);

  adminProducts.addEventListener("click", async (e)=>{
    const action = e.target.getAttribute("data-action");
    if(!action) return;
    const item = e.target.closest(".admin-item");
    const id = item?.getAttribute("data-id");
    if(!id) return;
    const ref = db.collection("products").doc(id);
    try{
      if(action === "toggleBest"){
        const snap = await ref.get();
        const cur = snap.data()?.bestSelling;
        await ref.update({ bestSelling: !cur });
      }
      if(action === "edit"){
        const name = prompt("Name:", item.querySelector("strong").textContent);
        if(name===null) return;
        const price = prompt("Price (MUR):", "");
        if(price===null) return;
        const category = prompt("Category:", "");
        await ref.update({ name: name.trim(), price: Number(price || 0), category: category.trim() });
      }
      if(action === "delete"){
        if(!confirm("Delete this product?")) return;
        const doc = await ref.get();
        const path = doc.data()?.imagePath;
        await ref.delete();
        if(path){ await storage.ref().child(path).delete().catch(()=>{}); }
      }
    }catch(err){
      alert(err.message);
    }
  });

  // Change image (delegate change)
  adminProducts.addEventListener("change", async (e)=>{
    const input = e.target;
    if(input.getAttribute("data-action") !== "changeImage") return;
    const id = input.getAttribute("data-id");
    const file = input.files[0];
    if(!file) return;
    try{
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `products/${id}.${ext}`;
      const snap = await storage.ref().child(path).put(file);
      const url = await snap.ref.getDownloadURL();
      await db.collection("products").doc(id).update({ imageUrl: url, imagePath: path });
      alert("Image updated.");
    }catch(err){
      alert(err.message);
    }finally{
      input.value = "";
    }
  });

})();
