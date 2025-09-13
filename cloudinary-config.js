// cloudinary-config.js (DL environment)
export const CLOUDINARY = {
  cloudName: "awasia", // e.g., "dl-123abc" (copy from the DL env page)
  uploadPreset: "dlwk13ady",       // your unsigned preset in DL env
  // folder: "products",            // optional; only if your preset allows it
};

export const CLOUDINARY_UPLOAD_URL =
  `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`;
