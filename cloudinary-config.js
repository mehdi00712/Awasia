// cloudinary-config.js
export const CLOUDINARY = {
  cloudName: "awasia",
  uploadPreset: "dlwk13ady", // unsigned preset
  folder: "products",        // optional
};

export const CLOUDINARY_UPLOAD_URL =
  `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`;
